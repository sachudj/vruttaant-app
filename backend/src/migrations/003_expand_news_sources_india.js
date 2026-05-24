/**
 * Migration 003: Expand NewsSource catalog with reliable India-focused sources
 * across all supported app languages.
 * Uses $setOnInsert so existing entries are not overwritten on re-run.
 */
module.exports = {
  version: 3,
  name: 'expand_news_sources_india',
  async up() {
    const NewsSource = require('../models/NewsSource');

    const sources = [
      // English
      { url: 'https://www.thehindu.com/', language: 'en', name: 'The Hindu', maxItems: 20 },
      { url: 'https://indianexpress.com/', language: 'en', name: 'The Indian Express', maxItems: 20 },
      { url: 'https://www.hindustantimes.com/', language: 'en', name: 'Hindustan Times', maxItems: 20 },
      { url: 'https://www.ndtv.com/', language: 'en', name: 'NDTV', maxItems: 20 },

      // Hindi
      { url: 'https://www.bbc.com/hindi', language: 'hi', name: 'BBC Hindi', maxItems: 20 },
      { url: 'https://www.ndtv.com/hindi-news', language: 'hi', name: 'NDTV Hindi', maxItems: 20 },
      { url: 'https://www.aajtak.in/', language: 'hi', name: 'Aaj Tak', maxItems: 20 },
      { url: 'https://www.amarujala.com/', language: 'hi', name: 'Amar Ujala', maxItems: 20 },

      // Bengali
      { url: 'https://www.anandabazar.com/', language: 'bn', name: 'Anandabazar Patrika', maxItems: 20 },
      { url: 'https://eisamay.com/', language: 'bn', name: 'Ei Samay', maxItems: 20 },
      { url: 'https://tv9bangla.com/', language: 'bn', name: 'TV9 Bangla', maxItems: 20 },

      // Marathi
      { url: 'https://www.loksatta.com/', language: 'mr', name: 'Loksatta', maxItems: 20 },
      { url: 'https://maharashtratimes.com/', language: 'mr', name: 'Maharashtra Times', maxItems: 20 },
      { url: 'https://www.bbc.com/marathi', language: 'mr', name: 'BBC Marathi', maxItems: 20 },

      // Telugu
      { url: 'https://www.eenadu.net/', language: 'te', name: 'Eenadu', maxItems: 20 },
      { url: 'https://www.sakshi.com/', language: 'te', name: 'Sakshi Telugu', maxItems: 20 },
      { url: 'https://www.andhrajyothy.com/', language: 'te', name: 'Andhra Jyothy', maxItems: 20 },

      // Tamil
      { url: 'https://tamil.thehindu.com/', language: 'ta', name: 'The Hindu Tamil', maxItems: 20 },
      { url: 'https://www.dailythanthi.com/', language: 'ta', name: 'Daily Thanthi', maxItems: 20 },
      { url: 'https://www.dinamalar.com/', language: 'ta', name: 'Dinamalar', maxItems: 20 },

      // Gujarati
      { url: 'https://www.bbc.com/gujarati', language: 'gu', name: 'BBC Gujarati', maxItems: 20 },
      { url: 'https://www.gujaratsamachar.com/', language: 'gu', name: 'Gujarat Samachar', maxItems: 20 },
      { url: 'https://sandesh.com/', language: 'gu', name: 'Sandesh', maxItems: 20 },

      // Urdu
      { url: 'https://urdu.siasat.com/', language: 'ur', name: 'Siasat Urdu', maxItems: 20 },
      { url: 'https://www.inquilab.com/', language: 'ur', name: 'Inquilab', maxItems: 20 },
      { url: 'https://www.urdupoint.com/', language: 'ur', name: 'UrduPoint', maxItems: 20 },

      // Kannada
      { url: 'https://www.prajavani.net/', language: 'kn', name: 'Prajavani', maxItems: 20 },
      { url: 'https://vijaykarnataka.com/', language: 'kn', name: 'Vijaya Karnataka', maxItems: 20 },
      { url: 'https://www.kannadaprabha.com/', language: 'kn', name: 'Kannada Prabha', maxItems: 20 },

      // Odia
      { url: 'https://sambad.in/', language: 'or', name: 'Sambad', maxItems: 20 },
      { url: 'https://www.dharitri.com/', language: 'or', name: 'Dharitri', maxItems: 20 },
      { url: 'https://www.prameya.com/', language: 'or', name: 'Prameya', maxItems: 20 },

      // Malayalam
      { url: 'https://www.manoramaonline.com/', language: 'ml', name: 'Malayala Manorama', maxItems: 20 },
      { url: 'https://www.mathrubhumi.com/', language: 'ml', name: 'Mathrubhumi', maxItems: 20 },
      { url: 'https://www.deshabhimani.com/', language: 'ml', name: 'Deshabhimani', maxItems: 20 }
    ];

    for (const source of sources) {
      await NewsSource.findOneAndUpdate(
        { url: source.url },
        { $setOnInsert: source },
        { upsert: true }
      );
    }

    console.log(`[migration-003] Ensured ${sources.length} India-focused news sources.`);
  }
};
