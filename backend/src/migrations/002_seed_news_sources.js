/**
 * Migration 002: Seed the NewsSource collection with default multi-language sources.
 * Uses $setOnInsert so existing entries are not overwritten on re-run.
 */
module.exports = {
  version: 2,
  name: 'seed_news_sources',
  async up() {
    const NewsSource = require('../models/NewsSource');

    const sources = [
      // English
      { url: 'https://www.bbc.com/news',      language: 'en', name: 'BBC News',    maxItems: 20 },
      { url: 'https://www.reuters.com/world/', language: 'en', name: 'Reuters',     maxItems: 20 },
      { url: 'https://www.aljazeera.com/news/', language: 'en', name: 'Al Jazeera', maxItems: 20 },
      // Hindi
      { url: 'https://www.bbc.com/hindi',     language: 'hi', name: 'BBC Hindi',   maxItems: 20 },
      { url: 'https://www.ndtv.com/hindi-news',language: 'hi', name: 'NDTV Hindi', maxItems: 20 },
      // Bengali
      { url: 'https://www.bbc.com/bengali',   language: 'bn', name: 'BBC Bengali', maxItems: 15 },
      // Marathi
      { url: 'https://www.bbc.com/marathi',   language: 'mr', name: 'BBC Marathi', maxItems: 15 },
      // Telugu
      { url: 'https://www.bbc.com/telugu',    language: 'te', name: 'BBC Telugu',  maxItems: 15 },
      // Tamil
      { url: 'https://www.bbc.com/tamil',     language: 'ta', name: 'BBC Tamil',   maxItems: 15 },
      // Gujarati
      { url: 'https://www.bbc.com/gujarati',  language: 'gu', name: 'BBC Gujarati', maxItems: 15 }
    ];

    for (const source of sources) {
      await NewsSource.findOneAndUpdate(
        { url: source.url },
        { $setOnInsert: source },
        { upsert: true }
      );
    }

    console.log(`[migration-002] Seeded ${sources.length} news sources.`);
  }
};
