const cheerio = require('cheerio');

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

async function fetchNewsCards(sourceUrl, language = 'en', maxItems = 20) {
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
      language,
      publishedAt,
      rawMetadata: {
        selectorMatched: true
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

      if (title.length < 25) {
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
        language,
        publishedAt: null,
        rawMetadata: {
          selectorMatched: false
        }
      });
    });
  }

  return {
    sourceUrl: normalizedUrl,
    language,
    totalFound: cards.length,
    cards
  };
}

module.exports = {
  fetchNewsCards
};
