/**
 * Canonical category taxonomy for Vruttaant news cards.
 * All ingested cards must have their category mapped to one of these values.
 * The fallback for any unrecognized or empty category is 'General'.
 */

const TAXONOMY = [
  'Tech',
  'Politics',
  'Sports',
  'Business',
  'World',
  'Health',
  'Entertainment',
  'Science',
  'Education',
  'General'
];

/**
 * Keyword-based fallback map for common LLM-produced category variants.
 * Keys are lowercase words; values are canonical taxonomy labels.
 * Evaluated in order — first keyword match wins.
 */
const FALLBACK_MAP = [
  { keywords: ['technology', 'tech', 'artificial intelligence', 'machine learning', 'software', 'hardware', 'gadget', 'digital', 'cyber', 'internet', 'app', 'computing', 'robotics', 'blockchain', 'crypto'], canonical: 'Tech' },
  { keywords: ['politics', 'political', 'government', 'election', 'parliament', 'senate', 'policy', 'democracy', 'vote', 'legislation', 'diplomat', 'foreign minister'], canonical: 'Politics' },
  { keywords: ['sport', 'sports', 'cricket', 'football', 'soccer', 'tennis', 'basketball', 'hockey', 'athletics', 'olympics', 'championship', 'tournament', 'match', 'league', 'player', 'coach', 'stadium'], canonical: 'Sports' },
  { keywords: ['business', 'economy', 'economic', 'market', 'trade', 'commerce', 'startup', 'company', 'corporate', 'investment', 'finance', 'financial', 'stock', 'banking', 'gdp', 'revenue', 'profit', 'merger'], canonical: 'Business' },
  { keywords: ['world', 'international', 'global', 'foreign', 'geopolitics', 'warfare', 'armed conflict', 'conflict', 'treaty', 'united nations', 'nato', 'diplomacy'], canonical: 'World' },
  { keywords: ['health', 'medicine', 'medical', 'hospital', 'wellness', 'mental health', 'fitness', 'disease', 'vaccine', 'covid', 'cancer', 'drug', 'pharmacy', 'surgery', 'nutrition', 'diet'], canonical: 'Health' },
  { keywords: ['entertainment', 'celebrity', 'movie', 'film', 'music', 'television', 'tv', 'cinema', 'actor', 'actress', 'singer', 'band', 'album', 'box office', 'award', 'oscars', 'grammy', 'streaming'], canonical: 'Entertainment' },
  { keywords: ['science', 'research', 'space', 'nasa', 'astronomy', 'physics', 'biology', 'chemistry', 'climate', 'environment', 'energy', 'evolution', 'genetics', 'discovery', 'experiment'], canonical: 'Science' },
  { keywords: ['education', 'school', 'university', 'college', 'student', 'teacher', 'learning', 'academic', 'exam', 'curriculum', 'scholarship', 'campus', 'literacy'], canonical: 'Education' }
];

/**
 * Normalize a raw category string to the canonical taxonomy.
 *
 * Resolution order:
 *   1. Exact match against taxonomy (case-insensitive) → canonical label.
 *   2. Any FALLBACK_MAP keyword contained in the lowercased raw string → canonical label.
 *   3. Default → 'General'.
 *
 * @param {string} raw - Raw category string from LLM or source.
 * @returns {string} A canonical taxonomy label.
 */
function normalizeToTaxonomy(raw) {
  const cleaned = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return 'General';
  }

  const lower = cleaned.toLowerCase();

  // 1. Exact match against taxonomy (case-insensitive)
  const exactMatch = TAXONOMY.find((t) => t.toLowerCase() === lower);
  if (exactMatch) {
    return exactMatch;
  }

  // 2. Keyword fallback
  for (const entry of FALLBACK_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.canonical;
    }
  }

  // 3. Default
  return 'General';
}

module.exports = { TAXONOMY, FALLBACK_MAP, normalizeToTaxonomy };
