'use strict';

/**
 * Compute a normalized fingerprint for a news card title.
 *
 * The fingerprint is used for cross-source duplicate detection: two cards
 * from different URLs that cover the same story will produce the same (or
 * very similar) fingerprint and can be skipped before DB insertion.
 *
 * Normalization steps:
 *   1. Lowercase the entire string.
 *   2. Strip punctuation and special characters (keep letters, digits, spaces).
 *   3. Collapse consecutive whitespace to a single space.
 *   4. Trim leading/trailing whitespace.
 *   5. Truncate to 120 characters so minor suffixes don't break matching.
 *
 * @param {string} title - Raw article title.
 * @returns {string} Normalized fingerprint string (may be empty for blank titles).
 */
function computeTitleFingerprint(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

module.exports = { computeTitleFingerprint };
