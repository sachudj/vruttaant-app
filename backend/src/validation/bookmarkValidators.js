/**
 * Bookmark payload validation utilities
 * Validates create, list, and delete bookmark requests
 */

function isUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isLanguageCode(value) {
  // Common language codes: en, hi, bn, mr, te, ta, gu, ur, kn, od, ml
  const validCodes = ['en', 'hi', 'bn', 'mr', 'te', 'ta', 'gu', 'ur', 'kn', 'od', 'ml'];
  return validCodes.includes(value.toLowerCase());
}

function isMongoId(value) {
  return /^[0-9a-fA-F]{24}$/.test(value);
}

function validateCreateBookmarkPayload(payload) {
  const errors = [];

  // Title required and non-empty
  if (!payload?.title || typeof payload.title !== 'string' || !payload.title.trim()) {
    errors.push('title is required and must be a non-empty string');
  }

  // URL required and valid
  if (!payload?.url || typeof payload.url !== 'string' || !isUrl(payload.url)) {
    errors.push('url is required and must be a valid URL');
  }

  // Summary optional but must be string if provided
  if (payload?.summary !== undefined && typeof payload.summary !== 'string') {
    errors.push('summary must be a string');
  }

  // Category optional but must be string if provided
  if (payload?.category !== undefined && typeof payload.category !== 'string') {
    errors.push('category must be a string');
  }

  // ImageUrl optional but must be valid URL if provided
  if (payload?.imageUrl !== undefined && payload.imageUrl !== '' && !isUrl(payload.imageUrl)) {
    errors.push('imageUrl must be a valid URL or empty string');
  }

  // Source optional but must be string if provided
  if (payload?.source !== undefined && typeof payload.source !== 'string') {
    errors.push('source must be a string');
  }

  // Language optional but must be valid code if provided
  if (payload?.language !== undefined && !isLanguageCode(payload.language)) {
    errors.push('language must be a valid language code');
  }

  // Notes optional but must be string if provided
  if (payload?.notes !== undefined && typeof payload.notes !== 'string') {
    errors.push('notes must be a string');
  }

  const value = errors.length === 0 ? {
    title: (payload?.title || '').trim(),
    url: (payload?.url || '').trim(),
    summary: (payload?.summary || '').trim(),
    category: (payload?.category || 'General').trim(),
    imageUrl: (payload?.imageUrl || '').trim(),
    source: (payload?.source || '').trim(),
    language: (payload?.language || 'en').toLowerCase(),
    notes: (payload?.notes || '').trim()
  } : null;

  return {
    valid: errors.length === 0,
    value,
    errors: errors.length > 0 ? errors : undefined
  };
}

function validateListBookmarksQuery(query) {
  const errors = [];

  // Category optional but must be string if provided
  if (query?.category !== undefined && typeof query.category !== 'string') {
    errors.push('category must be a string');
  }

  // Language optional but must be valid code if provided
  if (query?.language !== undefined && !isLanguageCode(query.language)) {
    errors.push('language must be a valid language code');
  }

  // Page optional, must be integer >= 1
  let page = 1;
  if (query?.page !== undefined) {
    const parsedPage = Number(query.page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      errors.push('page must be an integer >= 1');
    } else {
      page = parsedPage;
    }
  }

  // Limit optional, must be integer between 1 and 100
  let limit = 20;
  if (query?.limit !== undefined) {
    const parsedLimit = Number(query.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      errors.push('limit must be an integer between 1 and 100');
    } else {
      limit = parsedLimit;
    }
  }

  const value = errors.length === 0 ? {
    category: query?.category ? (query.category || '').trim() : undefined,
    language: query?.language ? (query.language || '').toLowerCase() : undefined,
    page,
    limit
  } : null;

  return {
    valid: errors.length === 0,
    value,
    errors: errors.length > 0 ? errors : undefined
  };
}

function validateDeleteBookmarkParams(params) {
  const errors = [];

  // ID required and valid MongoDB ObjectId
  if (!params?.id || typeof params.id !== 'string' || !isMongoId(params.id)) {
    errors.push('id must be a valid MongoDB ObjectId');
  }

  const value = errors.length === 0 ? { id: params.id } : null;

  return {
    valid: errors.length === 0,
    value,
    errors: errors.length > 0 ? errors : undefined
  };
}

module.exports = {
  validateCreateBookmarkPayload,
  validateListBookmarksQuery,
  validateDeleteBookmarkParams,
  isUrl,
  isLanguageCode,
  isMongoId
};
