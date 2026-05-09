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
  minTitleLength: 25,
  maxTitleLength: 180
};

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

  if (!imageUrl || !hasValidHttpUrl(imageUrl)) {
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
  const prompt = `Summarize this news in exactly 60 words in ${languageLabel}, keeping a neutral tone. Also classify it into one short category label (examples: Tech, Politics, Sports, Business, World, Health, Entertainment, Science, Education). Return ONLY valid JSON with keys "summary" and "category".`;

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

  return {
    aiSummary: cleanText(parsed?.summary || ''),
    category: normalizeCategory(parsed?.category)
  };
}

async function fetchNewsCards(sourceUrl, language = 'en', maxItems = 20) {
  const normalizedLanguage = normalizeLanguage(language);

  let normalizedUrl;
  try {
    normalizedUrl = new URL(sourceUrl).toString();
  } catch {
    throw new Error('Invalid source URL');
  }

  const response = await fetch(normalizedUrl, {
    headers: {
      'User-Agent': 'VruttaantBot/1.0 (+https://vruttaant.app)'
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
    const title = cleanText(
      node.find('h1, h2, h3, [title], a').first().text() ||
      node.find('a').first().attr('title')
    );

    const summary = cleanText(node.find('p').first().text());
    const link = resolveUrl(normalizedUrl, node.find('a').first().attr('href'));
    const imageUrl = resolveUrl(
      normalizedUrl,
      node.find('img').first().attr('src') || node.find('img').first().attr('data-src')
    );
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

  const cardsWithAiSummary = await Promise.all(
    cards.map(async (card) => {
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
  summarizeWithLlm
};
