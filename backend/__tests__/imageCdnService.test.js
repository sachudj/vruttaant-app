const { rewriteImageUrl, rewriteImageUrls } = require('../src/services/imageCdnService');

function restoreEnvValue(name, value) {
  if (value == null) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

describe('imageCdnService', () => {
  const originalEnv = {
    IMAGE_CDN_BASE_URL: process.env.IMAGE_CDN_BASE_URL,
    IMAGE_CDN_URL_TEMPLATE: process.env.IMAGE_CDN_URL_TEMPLATE,
    IMAGE_CDN_DEFAULT_WIDTH: process.env.IMAGE_CDN_DEFAULT_WIDTH,
    IMAGE_CDN_DEFAULT_QUALITY: process.env.IMAGE_CDN_DEFAULT_QUALITY
  };

  afterEach(() => {
    restoreEnvValue('IMAGE_CDN_BASE_URL', originalEnv.IMAGE_CDN_BASE_URL);
    restoreEnvValue('IMAGE_CDN_URL_TEMPLATE', originalEnv.IMAGE_CDN_URL_TEMPLATE);
    restoreEnvValue('IMAGE_CDN_DEFAULT_WIDTH', originalEnv.IMAGE_CDN_DEFAULT_WIDTH);
    restoreEnvValue('IMAGE_CDN_DEFAULT_QUALITY', originalEnv.IMAGE_CDN_DEFAULT_QUALITY);
  });

  it('returns original URL when no CDN config is set', () => {
    delete process.env.IMAGE_CDN_BASE_URL;
    delete process.env.IMAGE_CDN_URL_TEMPLATE;

    expect(rewriteImageUrl('https://images.example.com/story.jpg')).toBe('https://images.example.com/story.jpg');
  });

  it('rewrites using base URL config', () => {
    process.env.IMAGE_CDN_BASE_URL = 'https://cdn.example.com/fetch';
    process.env.IMAGE_CDN_DEFAULT_WIDTH = '900';
    process.env.IMAGE_CDN_DEFAULT_QUALITY = '70';
    delete process.env.IMAGE_CDN_URL_TEMPLATE;

    expect(rewriteImageUrl('https://images.example.com/story.jpg')).toBe(
      'https://cdn.example.com/fetch?url=https%3A%2F%2Fimages.example.com%2Fstory.jpg&w=900&q=70'
    );
  });

  it('rewrites using URL template config', () => {
    delete process.env.IMAGE_CDN_BASE_URL;
    process.env.IMAGE_CDN_URL_TEMPLATE = 'https://img.example.com/{width}/{quality}/{url}';
    process.env.IMAGE_CDN_DEFAULT_WIDTH = '1200';
    process.env.IMAGE_CDN_DEFAULT_QUALITY = '80';

    expect(rewriteImageUrl('https://images.example.com/story.jpg')).toBe(
      'https://img.example.com/1200/80/https%3A%2F%2Fimages.example.com%2Fstory.jpg'
    );
  });

  it('does not rewrite invalid or empty URLs', () => {
    process.env.IMAGE_CDN_BASE_URL = 'https://cdn.example.com/fetch';

    expect(rewriteImageUrl('')).toBe('');
    expect(rewriteImageUrl('not-a-url')).toBe('not-a-url');
  });

  it('does not double rewrite URLs already on the CDN', () => {
    process.env.IMAGE_CDN_BASE_URL = 'https://cdn.example.com/fetch';

    expect(rewriteImageUrl('https://cdn.example.com/fetch?url=https%3A%2F%2Fimages.example.com%2Fstory.jpg')).toBe(
      'https://cdn.example.com/fetch?url=https%3A%2F%2Fimages.example.com%2Fstory.jpg'
    );
  });

  it('rewrites arrays of image-bearing items', () => {
    process.env.IMAGE_CDN_BASE_URL = 'https://cdn.example.com/fetch';
    process.env.IMAGE_CDN_DEFAULT_WIDTH = '1200';
    process.env.IMAGE_CDN_DEFAULT_QUALITY = '80';

    const result = rewriteImageUrls([
      { title: 'Card 1', imageUrl: 'https://images.example.com/a.jpg' },
      { title: 'Card 2', imageUrl: '' }
    ]);

    expect(result[0].imageUrl).toBe(
      'https://cdn.example.com/fetch?url=https%3A%2F%2Fimages.example.com%2Fa.jpg&w=1200&q=80'
    );
    expect(result[1].imageUrl).toBe('');
  });
});