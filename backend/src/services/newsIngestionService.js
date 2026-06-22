const cheerio = require('cheerio');
const { normalizeToTaxonomy } = require('../constants/categories');
const { computeTitleFingerprint } = require('../utils/fingerprint');
const { logAuditEvent } = require('../observability/auditLogger');

const DEFAULT_LLM_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_LLM_MODEL = 'gpt-4o-mini';
const SUPPORTED_LANGUAGE_ALIASES = {
  en: 'en',
  english: 'en',
  hi: 'hi',
  hindi: 'hi',
  bn: 'bn',
  bengali: 'bn',
  mr: 'mr',
  marathi: 'mr',
  te: 'te',
  telugu: 'te',
  ta: 'ta',
  tamil: 'ta',
  gu: 'gu',
  gujarati: 'gu',
  ur: 'ur',
  urdu: 'ur',
  kn: 'kn',
  kannada: 'kn',
  or: 'or',
  od: 'or',
  odia: 'or',
  ml: 'ml',
  malayalam: 'ml'
};

const LANGUAGE_LABELS = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  mr: 'Marathi',
  te: 'Telugu',
  ta: 'Tamil',
  gu: 'Gujarati',
  ur: 'Urdu',
  kn: 'Kannada',
  or: 'Odia',
  ml: 'Malayalam'
};

const QUALITY_RULES = {
  minTitleLength: 15,
  maxTitleLength: 180
};

const SUMMARY_WORD_TARGET = 60;
const SUMMARY_WORD_MIN = Number(process.env.LLM_SUMMARY_MIN_WORDS || 45);
const SUMMARY_WORD_MAX = Number(process.env.LLM_SUMMARY_MAX_WORDS || 75);

function tokenizeWords(value) {
  return cleanText(value)
    .split(/\s+/)
    .filter(Boolean);
}

function enforceSummaryWordRange(summary, fallbackText = '') {
  const minWords = Math.max(10, SUMMARY_WORD_MIN);
  const maxWords = Math.max(minWords, SUMMARY_WORD_MAX);

  let words = tokenizeWords(summary);

  if (words.length > maxWords) {
    words = words.slice(0, maxWords);
  }

  if (words.length >= minWords) {
    return words.join(' ');
  }

  const fallbackWords = tokenizeWords(fallbackText);
  const needed = minWords - words.length;
  if (needed > 0 && fallbackWords.length) {
    words = [...words, ...fallbackWords.slice(0, needed)];
  }

  if (words.length > maxWords) {
    words = words.slice(0, maxWords);
  }

  return cleanText(words.join(' '));
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveUrl(baseUrl, rawUrl) {
  if (!rawUrl) {
    return '';
  }

  try {
    return new URL(rawUrl, baseUrl).toString();
  } catch {
    return '';
  }
}

function cleanText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function getFirstNonEmpty(values) {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) {
      return cleaned;
    }
  }
  return '';
}

function extractFirstSrcFromSrcset(srcset) {
  const normalized = String(srcset || '').trim();
  if (!normalized) {
    return '';
  }

  const first = normalized.split(',')[0] || '';
  return first.trim().split(/\s+/)[0] || '';
}

function extractImageUrl(node, $, baseUrl) {
  const imgNode = node.find('img').first();
  const pictureSourceNode = node.find('picture source').first();

  const fromImageNode = getFirstNonEmpty([
    imgNode.attr('src'),
    imgNode.attr('data-src'),
    imgNode.attr('data-lazy-src'),
    imgNode.attr('data-original'),
    extractFirstSrcFromSrcset(imgNode.attr('srcset')),
    extractFirstSrcFromSrcset(imgNode.attr('data-srcset')),
    extractFirstSrcFromSrcset(pictureSourceNode.attr('srcset'))
  ]);

  if (fromImageNode) {
    return resolveUrl(baseUrl, fromImageNode);
  }

  const fromMeta = getFirstNonEmpty([
    $('meta[property="og:image"]').first().attr('content'),
    $('meta[name="twitter:image"]').first().attr('content')
  ]);

  return resolveUrl(baseUrl, fromMeta);
}

function extractPrimaryTitle(node) {
  return getFirstNonEmpty([
    node.find('h1').first().text(),
    node.find('h2').first().text(),
    node.find('h3').first().text(),
    node.find('a[title]').first().attr('title'),
    node.find('a').first().text()
  ]);
}

function extractPrimarySummary(node) {
  return getFirstNonEmpty([
    node.find('p').first().text(),
    node.find('[class*="summary"]').first().text(),
    node.find('[class*="excerpt"]').first().text(),
    node.find('[class*="description"]').first().text()
  ]);
}

function extractPrimaryLink(node, baseUrl) {
  const link = getFirstNonEmpty([
    node.find('a[href]').first().attr('href'),
    node.attr('href')
  ]);
  return resolveUrl(baseUrl, link);
}

function normalizeLanguage(language) {
  const normalized = String(language || 'en').trim().toLowerCase();
  return SUPPORTED_LANGUAGE_ALIASES[normalized] || 'en';
}

function toLanguageLabel(language) {
  return LANGUAGE_LABELS[language] || 'English';
}

function normalizeCategory(category) {
  return normalizeToTaxonomy(category);
}

function hasValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateCardQuality(card) {
  const title = cleanText(card?.title);
  const url = cleanText(card?.url);
  const imageUrl = cleanText(card?.imageUrl);
  const reasons = [];

  if (
    title.length < QUALITY_RULES.minTitleLength ||
    title.length > QUALITY_RULES.maxTitleLength
  ) {
    reasons.push('title_length');
  }

  if (!hasValidHttpUrl(url)) {
    reasons.push('invalid_url');
  }

  if (imageUrl && !hasValidHttpUrl(imageUrl)) {
    reasons.push('missing_image');
  }

  return {
    pass: reasons.length === 0,
    reasons
  };
}

async function summarizeWithLlm(card, language) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return {
      aiSummary: '',
      category: 'General'
    };
  }

  const apiUrl = process.env.LLM_API_URL || DEFAULT_LLM_API_URL;
  const model = process.env.LLM_MODEL || DEFAULT_LLM_MODEL;
  const normalizedLanguage = normalizeLanguage(language);
  const languageLabel = toLanguageLabel(normalizedLanguage);
  const prompt = `Summarize this news in ${languageLabel} in a neutral tone. Keep the summary between ${SUMMARY_WORD_MIN} and ${SUMMARY_WORD_MAX} words (target around ${SUMMARY_WORD_TARGET} words). Also classify it into one short category label (examples: Tech, Politics, Sports, Business, World, Health, Entertainment, Science, Education). Return ONLY valid JSON with keys "summary" and "category".`;

  const articlePayload = [
    `Title: ${card.title || ''}`,
    `Summary: ${card.summary || ''}`,
    `Source: ${card.source || ''}`,
    `URL: ${card.url || ''}`
  ].join('\n');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You are a concise neutral news editor.'
        },
        {
          role: 'user',
          content: `${prompt}\n\n${articlePayload}`
        }
      ]
    })
  });

  if (!response.ok) {
    logAuditEvent('llm_summary_category_provider_error', {
      statusCode: response.status,
      source: card?.source || '',
      url: card?.url || '',
      language: normalizedLanguage
    });
    return {
      aiSummary: '',
      category: 'General'
    };
  }

  const payload = await response.json();
  const rawContent = cleanText(payload?.choices?.[0]?.message?.content || '');

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    logAuditEvent('llm_summary_category_invalid_json', {
      source: card?.source || '',
      url: card?.url || '',
      language: normalizedLanguage,
      rawPreview: rawContent.slice(0, 200)
    });
    parsed = {
      summary: rawContent,
      category: 'General'
    };
  }

  const fallbackSummaryText = `${card?.title || ''} ${card?.summary || ''}`;

  return {
    aiSummary: enforceSummaryWordRange(parsed?.summary || '', fallbackSummaryText),
    category: normalizeCategory(parsed?.category)
  };
}

async function translateStoryContent(card, sourceLanguage = 'en', targetLanguage = 'en') {
  const normalizedSourceLanguage = normalizeLanguage(sourceLanguage);
  const normalizedTargetLanguage = normalizeLanguage(targetLanguage);

  const title = cleanText(card?.title || '');
  const summary = cleanText(card?.summary || '');

  if (!title && !summary) {
    throw new Error('title or summary is required for translation.');
  }

  if (normalizedSourceLanguage === normalizedTargetLanguage) {
    return {
      translated: false,
      title,
      summary,
      language: normalizedSourceLanguage,
      sourceLanguage: normalizedSourceLanguage,
      targetLanguage: normalizedTargetLanguage,
      fallbackReason: 'already_in_target_language'
    };
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return {
      translated: false,
      title,
      summary,
      language: normalizedSourceLanguage,
      sourceLanguage: normalizedSourceLanguage,
      targetLanguage: normalizedTargetLanguage,
      fallbackReason: 'translation_unavailable'
    };
  }

  const apiUrl = process.env.LLM_API_URL || DEFAULT_LLM_API_URL;
  const model = process.env.LLM_MODEL || DEFAULT_LLM_MODEL;
  const sourceLabel = toLanguageLabel(normalizedSourceLanguage);
  const targetLabel = toLanguageLabel(normalizedTargetLanguage);

  const prompt = [
    `Translate the following news content from ${sourceLabel} to ${targetLabel}.`,
    'Preserve factual meaning and neutral tone.',
    'Return ONLY valid JSON with keys "title" and "summary".'
  ].join(' ');

  const articlePayload = [
    `Title: ${title}`,
    `Summary: ${summary}`,
    `Source: ${cleanText(card?.source || '')}`,
    `URL: ${cleanText(card?.url || '')}`
  ].join('\n');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: 'You are a precise news translation assistant.'
        },
        {
          role: 'user',
          content: `${prompt}\n\n${articlePayload}`
        }
      ]
    })
  });

  if (!response.ok) {
    return {
      translated: false,
      title,
      summary,
      language: normalizedSourceLanguage,
      sourceLanguage: normalizedSourceLanguage,
      targetLanguage: normalizedTargetLanguage,
      fallbackReason: 'provider_unavailable'
    };
  }

  const payload = await response.json();
  const rawContent = cleanText(payload?.choices?.[0]?.message?.content || '');

  try {
    const parsed = JSON.parse(rawContent);
    const translatedTitle = cleanText(parsed?.title || '') || title;
    const translatedSummary = cleanText(parsed?.summary || '') || summary;

    return {
      translated: true,
      title: translatedTitle,
      summary: translatedSummary,
      language: normalizedTargetLanguage,
      sourceLanguage: normalizedSourceLanguage,
      targetLanguage: normalizedTargetLanguage,
      fallbackReason: null
    };
  } catch {
    return {
      translated: false,
      title,
      summary,
      language: normalizedSourceLanguage,
      sourceLanguage: normalizedSourceLanguage,
      targetLanguage: normalizedTargetLanguage,
      fallbackReason: 'invalid_provider_payload'
    };
  }
}

function validateUrlForIngestion(targetUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    throw new Error('Invalid source URL');
  }

  // SSRF Mitigation
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Invalid URL protocol. Only HTTP and HTTPS are allowed.');
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  
  const isLocalhost = hostname === 'localhost' || hostname.endsWith('.local');
  const isLoopback = /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || hostname === '[::1]';
  const isPrivateIPv4 = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/.test(hostname);
  const isAwsMetadata = hostname === '169.254.169.254';
  const isZeroAddress = hostname === '0.0.0.0' || hostname === '[::]';

  if (isLocalhost || isLoopback || isPrivateIPv4 || isAwsMetadata || isZeroAddress) {
    throw new Error('Requests to internal or private networks are not allowed.');
  }

  return parsedUrl.toString();
}

function isBoilerplateText(text) {
  if (!text) {
    return true;
  }
  const normalized = text.toLowerCase();

  const keywords = [
    'read latest',
    'news headlines',
    'live news updates',
    'stay updated',
    'follow us on',
    'subscribe to',
    'get latest news',
    'latest updates on',
    'click here to read',
    'catch all live',
    'breaking news updates'
  ];

  const matchCount = keywords.filter((kw) => normalized.includes(kw)).length;
  if (matchCount > 0) {
    return true;
  }

  const categoryKeywords = [
    'politics',
    'weather',
    'crime',
    'education',
    'business',
    'sports',
    'entertainment',
    'science',
    'health'
  ];
  const categoryMatches = categoryKeywords.filter((kw) => normalized.includes(kw)).length;
  if (categoryMatches >= 3) {
    return true;
  }

  return false;
}

function hasKeywordOverlap(title, summary, minOverlapCount = 1) {
  if (!title || !summary) {
    return false;
  }

  const stopwords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
    'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from',
    'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here',
    'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in',
    'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor',
    'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that',
    'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd',
    'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
    'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres',
    'which', 'while', 'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd',
    'youll', 'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves'
  ]);

  const titleWords = title
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'–—]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopwords.has(word));

  if (titleWords.length === 0) {
    return true; // If title is empty or has only stopwords/short words, skip overlap validation
  }

  const summaryLower = summary.toLowerCase();
  const matches = titleWords.filter((word) => summaryLower.includes(word));

  return matches.length >= minOverlapCount;
}

async function fetchArticleSummary(url, title = '') {
  try {
    const normalizedUrl = validateUrlForIngestion(url);
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9,hi-IN;q=0.8',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      },
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) {
      return '';
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Try og:description, description, or twitter:description meta tags
    let desc = $('meta[property="og:description"]').attr('content') ||
               $('meta[name="description"]').attr('content') ||
               $('meta[property="twitter:description"]').attr('content');

    if (desc) {
      desc = cleanText(desc);
      if (desc && desc.length > 25 && !isBoilerplateText(desc)) {
        if (!title || hasKeywordOverlap(title, desc)) {
          return desc;
        }
      }
    }

    // 2. Fallback to first paragraph of article body (which is not boilerplate and is relevant)
    let firstP = '';
    $('article p, .article-body p, .story-body p, .entry-content p, p').each((_, el) => {
      const text = cleanText($(el).text());
      if (text.length > 80 && text.length < 400 && !isBoilerplateText(text)) {
        if (!title || hasKeywordOverlap(title, text)) {
          firstP = text;
          return false; // Break loop
        }
      }
    });

    return firstP;
  } catch {
    return '';
  }
}

async function enrichCardsWithDetailedSummaries(cards, maxConcurrency = 5) {
  const enriched = [...cards];
  for (let i = 0; i < enriched.length; i += maxConcurrency) {
    const chunk = enriched.slice(i, i + maxConcurrency);
    await Promise.all(
      chunk.map(async (card, chunkIndex) => {
        if (!card.summary) {
          const index = i + chunkIndex;
          const detailed = await fetchArticleSummary(card.url, card.title);
          if (detailed) {
            enriched[index].summary = detailed;
          }
        }
      })
    );
  }
  return enriched;
}

async function fetchNewsCards(sourceUrl, language = 'en', maxItems = 20) {
  const normalizedLanguage = normalizeLanguage(language);

  const normalizedUrl = validateUrlForIngestion(sourceUrl);

  const response = await fetch(normalizedUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-IN,en;q=0.9,hi-IN;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache'
    }
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch source. Status: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const cards = [];
  const seenKeys = new Set();

  const candidateSelectors = [
    'article',
    '.news-item',
    '.news-card',
    '.card',
    '.story',
    '.post'
  ];

  $(candidateSelectors.join(',')).each((_, element) => {
    if (cards.length >= maxItems) {
      return false;
    }

    const node = $(element);
    const title = extractPrimaryTitle(node);
    const summary = extractPrimarySummary(node);
    const link = extractPrimaryLink(node, normalizedUrl);
    const imageUrl = extractImageUrl(node, $, normalizedUrl);
    const source = cleanText(node.find('.source, .publisher, [data-source]').first().text());
    const publishedAt = parseDate(
      node.find('time').first().attr('datetime') || node.find('time').first().text()
    );

    if (!title || !link) {
      return;
    }

    const quality = validateCardQuality({ title, url: link, imageUrl });
    if (!quality.pass) {
      return;
    }

    const key = `${title.toLowerCase()}::${link}`;
    if (seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    cards.push({
      title,
      summary,
      url: link,
      imageUrl,
      source,
      language: normalizedLanguage,
      publishedAt,
      titleFingerprint: computeTitleFingerprint(title),
      rawMetadata: {
        selectorMatched: true,
        qualityChecks: quality.reasons
      }
    });
  });

  if (!cards.length) {
    $('a').each((_, element) => {
      if (cards.length >= maxItems) {
        return false;
      }

      const node = $(element);
      const title = cleanText(node.text());
      const link = resolveUrl(normalizedUrl, node.attr('href'));

      if (!title || !link) {
        return;
      }

      const quality = validateCardQuality({ title, url: link, imageUrl: '' });
      if (!quality.pass) {
        return;
      }

      const key = `${title.toLowerCase()}::${link}`;
      if (seenKeys.has(key)) {
        return;
      }

      seenKeys.add(key);
      cards.push({
        title,
        summary: '',
        url: link,
        imageUrl: '',
        source: '',
        language: normalizedLanguage,
        publishedAt: null,
        titleFingerprint: computeTitleFingerprint(title),
        rawMetadata: {
          selectorMatched: false,
          qualityChecks: quality.reasons
        }
      });
    });
  }

  const enrichedCards = await enrichCardsWithDetailedSummaries(cards);

  const cardsWithAiSummary = await Promise.all(
    enrichedCards.map(async (card) => {
      try {
        const llmOutput = await summarizeWithLlm(card, normalizedLanguage);
        return {
          ...card,
          aiSummary: llmOutput.aiSummary,
          category: llmOutput.category
        };
      } catch (error) {
        logAuditEvent('llm_summary_category_enrichment_failed', {
          source: card?.source || '',
          url: card?.url || '',
          language: normalizedLanguage,
          error: error?.message || 'Unknown error'
        });
        return {
          ...card,
          aiSummary: '',
          category: 'General'
        };
      }
    })
  );

  return {
    sourceUrl: normalizedUrl,
    language: normalizedLanguage,
    totalFound: cardsWithAiSummary.length,
    cards: cardsWithAiSummary
  };
}

module.exports = {
  fetchNewsCards,
  // Exported for testing
  normalizeLanguage,
  normalizeCategory,
  parseDate,
  resolveUrl,
  cleanText,
  validateCardQuality,
  toLanguageLabel,
  summarizeWithLlm,
  enforceSummaryWordRange,
  translateStoryContent,
  validateUrlForIngestion,
  fetchArticleSummary,
  enrichCardsWithDetailedSummaries,
  isBoilerplateText,
  hasKeywordOverlap
};
