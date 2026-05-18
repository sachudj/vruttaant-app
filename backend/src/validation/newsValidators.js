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

function normalizeLanguage(value) {
  const normalized = String(value || 'en').trim().toLowerCase();
  return SUPPORTED_LANGUAGE_ALIASES[normalized] || 'en';
}

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null) {
    return { valid: true, value: defaultValue };
  }

  if (typeof value === 'boolean') {
    return { valid: true, value };
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return { valid: true, value: true };
    }
    if (normalized === 'false') {
      return { valid: true, value: false };
    }
  }

  return { valid: false, error: 'persist must be a boolean.' };
}

function validateIngestPayload(payload) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const errors = [];

  const url = String(body.url || '').trim();
  if (!url) {
    errors.push('url is required.');
  }

  if (url) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        errors.push('url must use http or https protocol.');
      }
    } catch {
      errors.push('url must be a valid absolute URL.');
    }
  }

  const language = normalizeLanguage(body.language);

  let maxItems = 20;
  if (body.maxItems !== undefined && body.maxItems !== null && body.maxItems !== '') {
    const parsedMaxItems = Number(body.maxItems);
    if (!Number.isFinite(parsedMaxItems)) {
      errors.push('maxItems must be a number.');
    } else {
      maxItems = Math.min(Math.max(Math.floor(parsedMaxItems), 1), 50);
    }
  }

  const parsedPersist = parseBoolean(body.persist, true);
  if (!parsedPersist.valid) {
    errors.push(parsedPersist.error);
  }

  if (errors.length) {
    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    value: {
      url,
      language,
      maxItems,
      persist: parsedPersist.value
    }
  };
}

function validateCardsQuery(payload) {
  const query = payload && typeof payload === 'object' ? payload : {};
  const errors = [];

  const language = normalizeLanguage(query.language);

  let page = 1;
  if (query.page !== undefined && query.page !== null && query.page !== '') {
    const parsedPage = Number(query.page);
    if (!Number.isFinite(parsedPage)) {
      errors.push('page must be a number.');
    } else {
      page = Math.max(Math.floor(parsedPage), 1);
    }
  }

  let limit = 20;
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const parsedLimit = Number(query.limit);
    if (!Number.isFinite(parsedLimit)) {
      errors.push('limit must be a number.');
    } else {
      limit = Math.min(Math.max(Math.floor(parsedLimit), 1), 100);
    }
  }

  const category = String(query.category || '').trim().slice(0, 40);
  const q = String(query.q || '').trim().slice(0, 120);

  const normalizedSort = String(query.sort || 'latest').trim().toLowerCase();
  const allowedSorts = new Set(['latest', 'relevance', 'trending']);
  if (!allowedSorts.has(normalizedSort)) {
    errors.push('sort must be one of: latest, relevance, trending.');
  }

  if (errors.length) {
    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    value: {
      language,
      page,
      limit,
      category: category || undefined,
      q: q || undefined,
      sort: normalizedSort
    }
  };
}

function validateTranslatePayload(payload) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const errors = [];

  const title = String(body.title || '').trim().slice(0, 240);
  const summary = String(body.summary || '').trim().slice(0, 4000);

  if (!title && !summary) {
    errors.push('title or summary is required.');
  }

  const rawTargetLanguage = String(body.targetLanguage || '').trim();
  if (!rawTargetLanguage) {
    errors.push('targetLanguage is required.');
  }

  const targetLanguage = normalizeLanguage(rawTargetLanguage || 'en');
  const sourceLanguage = normalizeLanguage(body.sourceLanguage || body.language || 'en');
  const source = String(body.source || '').trim().slice(0, 120);
  const url = String(body.url || '').trim();

  if (url) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        errors.push('url must use http or https protocol.');
      }
    } catch {
      errors.push('url must be a valid absolute URL.');
    }
  }

  if (errors.length) {
    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    value: {
      title,
      summary,
      source,
      url: url || undefined,
      sourceLanguage,
      targetLanguage
    }
  };
}

function validateRecommendedQuery(payload) {
  const query = payload && typeof payload === 'object' ? payload : {};
  const errors = [];

  const language = normalizeLanguage(query.language);

  let page = 1;
  if (query.page !== undefined && query.page !== null && query.page !== '') {
    const parsedPage = Number(query.page);
    if (!Number.isFinite(parsedPage)) {
      errors.push('page must be a number.');
    } else {
      page = Math.max(Math.floor(parsedPage), 1);
    }
  }

  let limit = 20;
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const parsedLimit = Number(query.limit);
    if (!Number.isFinite(parsedLimit)) {
      errors.push('limit must be a number.');
    } else {
      limit = Math.min(Math.max(Math.floor(parsedLimit), 1), 100);
    }
  }

  // recentlyShown is optional; just validate format if present
  const recentlyShown = String(query.recentlyShown || '').trim();
  if (recentlyShown && !/^[a-zA-Z0-9:,\s]*$/.test(recentlyShown)) {
    errors.push('recentlyShown format must be "category:count,category2:count2".');
  }

  if (errors.length) {
    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    value: {
      language,
      page,
      limit,
      recentlyShown: recentlyShown || undefined
    }
  };
}

module.exports = {
  validateIngestPayload,
  validateCardsQuery,
  validateRecommendedQuery,
  validateTranslatePayload
};
