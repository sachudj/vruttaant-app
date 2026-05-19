function getEnvValue(name) {
  const value = process.env[name];
  if (value === null || value === undefined) {
    return '';
  }

  const normalized = String(value).trim();
  return normalized === 'undefined' || normalized === 'null' ? '' : normalized;
}

function getTemplatePrefix(template) {
  const markerIndex = template.indexOf('{url}');
  return markerIndex >= 0 ? template.slice(0, markerIndex) : template;
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getConfiguredTemplate() {
  return getEnvValue('IMAGE_CDN_URL_TEMPLATE');
}

function getConfiguredBaseUrl() {
  return getEnvValue('IMAGE_CDN_BASE_URL');
}

function getDefaultWidth() {
  const width = Number(process.env.IMAGE_CDN_DEFAULT_WIDTH);
  return Number.isFinite(width) && width > 0 ? String(width) : '';
}

function getDefaultQuality() {
  const quality = Number(process.env.IMAGE_CDN_DEFAULT_QUALITY);
  return Number.isFinite(quality) && quality > 0 ? String(quality) : '';
}

function isAlreadyCdnUrl(imageUrl) {
  const template = getConfiguredTemplate();
  if (template) {
    const prefix = getTemplatePrefix(template);
    if (prefix && imageUrl.startsWith(prefix)) {
      return true;
    }
  }

  const baseUrl = getConfiguredBaseUrl();
  return Boolean(baseUrl && imageUrl.startsWith(baseUrl));
}

function rewriteImageUrl(imageUrl) {
  if (!imageUrl || !isValidHttpUrl(imageUrl)) {
    return imageUrl || '';
  }

  if (isAlreadyCdnUrl(imageUrl)) {
    return imageUrl;
  }

  const encodedUrl = encodeURIComponent(imageUrl);
  const width = getDefaultWidth();
  const quality = getDefaultQuality();
  const template = getConfiguredTemplate();

  if (template) {
    return template
      .replaceAll('{url}', encodedUrl)
      .replaceAll('{width}', width)
      .replaceAll('{quality}', quality);
  }

  const baseUrl = getConfiguredBaseUrl();
  if (!baseUrl) {
    return imageUrl;
  }

  const cdnUrl = new URL(baseUrl);
  cdnUrl.searchParams.set('url', imageUrl);
  if (width) {
    cdnUrl.searchParams.set('w', width);
  }
  if (quality) {
    cdnUrl.searchParams.set('q', quality);
  }

  return cdnUrl.toString();
}

function rewriteImageUrls(items = []) {
  return items.map((item) => ({
    ...item,
    imageUrl: rewriteImageUrl(item.imageUrl)
  }));
}

module.exports = {
  rewriteImageUrl,
  rewriteImageUrls
};