/**
 * Reading time estimation service.
 * Calculates estimated reading time based on word count.
 * 
 * Standard reading speed: ~200 words per minute (conservative estimate)
 * gives users a realistic estimate for average reading comprehension.
 */

const WORDS_PER_MINUTE = 200;
const MIN_READING_TIME = 1; // minimum 1 minute estimate

/**
 * Calculate word count from text content.
 * Strips HTML tags and counts space-separated words.
 *
 * @param {string} text - Raw text content (may contain HTML)
 * @returns {number} Word count
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;

  // Strip HTML tags if present
  const plainText = text.replace(/<[^>]*>/g, ' ');

  // Split on whitespace and filter empty strings
  const words = plainText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  return words.length;
}

/**
 * Calculate estimated reading time in minutes.
 * 
 * Combines title, summary, and AI-generated summary for comprehensive word count.
 * Returns ceiling of calculated time to always provide generous estimate.
 *
 * @param {string} title - Article title
 * @param {string} summary - Article summary/excerpt
 * @param {string} aiSummary - AI-generated summary
 * @returns {number} Reading time in minutes (minimum 1)
 */
function estimateReadingTime(title = '', summary = '', aiSummary = '') {
  const titleWords = countWords(title);
  const summaryWords = countWords(summary);
  const aiSummaryWords = countWords(aiSummary);

  const totalWords = titleWords + summaryWords + aiSummaryWords;

  if (totalWords === 0) return MIN_READING_TIME;

  // Round up to next minute and ensure minimum
  const minutes = Math.ceil(totalWords / WORDS_PER_MINUTE);
  return Math.max(minutes, MIN_READING_TIME);
}

/**
 * Enrich a card document with reading time estimate.
 * Mutates the input object to add readingTime field.
 *
 * @param {Object} card - NewsCard document
 * @param {boolean} mutate - Whether to mutate original object (default true)
 * @returns {Object} Enriched card with readingTime field
 */
function enrichCardWithReadingTime(card, mutate = true) {
  if (!card) return card;

  const readingTime = estimateReadingTime(card.title, card.summary, card.aiSummary);

  if (mutate) {
    card.readingTime = readingTime;
    return card;
  }

  return {
    ...card,
    readingTime
  };
}

/**
 * Enrich multiple cards with reading time estimates.
 *
 * @param {Array} cards - Array of NewsCard documents
 * @param {boolean} mutate - Whether to mutate original objects (default true)
 * @returns {Array} Array of enriched cards with readingTime field
 */
function enrichCardsWithReadingTime(cards = [], mutate = true) {
  if (!Array.isArray(cards)) return [];

  return cards.map((card) => enrichCardWithReadingTime(card, mutate));
}

module.exports = {
  countWords,
  estimateReadingTime,
  enrichCardWithReadingTime,
  enrichCardsWithReadingTime,
  WORDS_PER_MINUTE,
  MIN_READING_TIME
};
