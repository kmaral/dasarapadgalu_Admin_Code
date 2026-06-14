/**
 * Browser-compatible advanced search algorithms
 * N-gram, Trigram, Phonetic matching, and ranking
 */

/**
 * Generate N-grams from a string
 * @param {string} text - Input text
 * @param {number} n - N-gram size (2 for bigrams, 3 for trigrams)
 * @returns {Array} Array of n-grams
 */
export function generateNGrams(text, n = 3) {
  if (!text || text.length < n) return [text];
  
  const ngrams = [];
  const normalized = text.toLowerCase().trim();
  
  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.push(normalized.substring(i, i + n));
  }
  
  return ngrams;
}

/**
 * Generate trigrams specifically (most effective for search)
 */
export function generateTrigrams(text) {
  return generateNGrams(text, 3);
}

/**
 * Generate bigrams
 */
export function generateBigrams(text) {
  return generateNGrams(text, 2);
}

/**
 * Calculate Dice coefficient (better than Jaccard for our use case)
 */
export function diceCoefficient(ngrams1, ngrams2) {
  const set1 = new Set(ngrams1);
  const set2 = new Set(ngrams2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  
  if (set1.size + set2.size === 0) return 0;
  return (2 * intersection.size) / (set1.size + set2.size);
}

/**
 * Simple Soundex algorithm implementation (phonetic matching)
 */
export function soundex(word) {
  if (!word) return '';
  
  const s = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return '';
  
  const first = s[0];
  
  // Soundex mappings
  const codes = s.slice(1).split('').map(char => {
    if ('BFPV'.includes(char)) return '1';
    if ('CGJKQSXZ'.includes(char)) return '2';
    if ('DT'.includes(char)) return '3';
    if ('L'.includes(char)) return '4';
    if ('MN'.includes(char)) return '5';
    if ('R'.includes(char)) return '6';
    return '';
  });
  
  // Remove consecutive duplicates and empty strings
  const filtered = codes.filter((code, i) => code && code !== codes[i - 1]);
  
  // Pad or truncate to 3 digits
  return (first + filtered.join('') + '000').slice(0, 4);
}

/**
 * Metaphone algorithm (simplified version)
 */
export function metaphone(word) {
  if (!word) return '';
  
  let w = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (w.length === 0) return '';
  
  // Simplified metaphone rules
  w = w.replace(/^KN/, 'N');
  w = w.replace(/^GN/, 'N');
  w = w.replace(/^PN/, 'N');
  w = w.replace(/^WR/, 'R');
  w = w.replace(/^X/, 'S');
  w = w.replace(/PH/g, 'F');
  w = w.replace(/TCH/g, 'CH');
  w = w.replace(/CK/g, 'K');
  w = w.replace(/SCH/g, 'SK');
  w = w.replace(/TH/g, 'T');
  w = w.replace(/[AEIOU]/g, '');
  
  return w.slice(0, 6);
}

/**
 * Check if two words sound similar
 */
export function soundsSimilar(word1, word2) {
  if (!word1 || !word2) return false;
  
  return soundex(word1) === soundex(word2) || 
         metaphone(word1) === metaphone(word2);
}

/**
 * Levenshtein distance (edit distance)
 */
export function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],
          dp[i][j - 1],
          dp[i - 1][j - 1]
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Advanced search scoring with multiple algorithms
 */
export function advancedScore(query, text) {
  if (!query || !text) return { total: 0, breakdown: {} };
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // 1. Exact match (highest score)
  const exactMatch = textLower === queryLower ? 1.0 : 0;
  
  // 2. Starts with (very high score)
  const startsWith = textLower.startsWith(queryLower) ? 0.9 : 0;
  
  // 3. Contains (high score)
  const contains = textLower.includes(queryLower) ? 0.7 : 0;
  
  // 4. Trigram similarity
  const queryTrigrams = generateTrigrams(queryLower);
  const textTrigrams = generateTrigrams(textLower);
  const trigramScore = diceCoefficient(queryTrigrams, textTrigrams);
  
  // 5. Bigram similarity
  const queryBigrams = generateBigrams(queryLower);
  const textBigrams = generateBigrams(textLower);
  const bigramScore = diceCoefficient(queryBigrams, textBigrams);
  
  // 6. Phonetic similarity (for English words)
  const queryWords = queryLower.split(/\s+/);
  const textWords = textLower.split(/\s+/);
  let phoneticScore = 0;
  
  for (const qWord of queryWords) {
    for (const tWord of textWords) {
      if (soundsSimilar(qWord, tWord)) {
        phoneticScore = 0.6;
        break;
      }
    }
    if (phoneticScore > 0) break;
  }
  
  // 7. Levenshtein distance
  const distance = levenshteinDistance(queryLower, textLower);
  const maxLen = Math.max(queryLower.length, textLower.length);
  const levenshteinScore = maxLen > 0 ? 1 - (distance / maxLen) : 0;
  
  // Weighted combination
  const weights = {
    exact: 10.0,
    startsWith: 5.0,
    contains: 3.0,
    trigram: 2.0,
    bigram: 1.5,
    phonetic: 1.0,
    levenshtein: 1.0
  };
  
  const totalScore = (
    exactMatch * weights.exact +
    startsWith * weights.startsWith +
    contains * weights.contains +
    trigramScore * weights.trigram +
    bigramScore * weights.bigram +
    phoneticScore * weights.phonetic +
    levenshteinScore * weights.levenshtein
  ) / (weights.exact + weights.startsWith + weights.contains + weights.trigram + weights.bigram + weights.phonetic + weights.levenshtein);
  
  return {
    total: totalScore,
    breakdown: {
      exactMatch,
      startsWith,
      contains,
      trigramScore,
      bigramScore,
      phoneticScore,
      levenshteinScore
    }
  };
}

/**
 * Search documents with advanced scoring
 */
export function advancedSearch(query, documents, searchFields) {
  if (!query || !documents || documents.length === 0) {
    return [];
  }
  
  const results = documents.map(doc => {
    let maxScore = 0;
    let bestField = null;
    const fieldScores = {};
    
    // Search in each field
    searchFields.forEach(field => {
      const value = doc[field];
      if (value && typeof value === 'string') {
        const score = advancedScore(query, value);
        fieldScores[field] = score.total;
        
        if (score.total > maxScore) {
          maxScore = score.total;
          bestField = field;
        }
      }
    });
    
    return {
      document: doc,
      score: maxScore,
      matchedField: bestField,
      fieldScores
    };
  });
  
  // Filter out documents with score below threshold
  const threshold = 0.1;
  const filtered = results.filter(r => r.score >= threshold);
  
  // Sort by score (descending)
  filtered.sort((a, b) => b.score - a.score);
  
  return filtered;
}
