// ── TF-IDF Intent Engine for QuantumShield Chatbot ──────────────
// Custom implementation — no external NLP packages
// v3: Stemming + Fuzzy Matching + Synonym Expansion + TF-IDF

// ═════════════════════════════════════════════════════════════════
// 1. PORTER STEMMER (Lightweight, zero-dependency)
// ═════════════════════════════════════════════════════════════════

const step2map = {
  ational: 'ate', tional: 'tion', enci: 'ence', anci: 'ance',
  izer: 'ize', abli: 'able', alli: 'al', entli: 'ent',
  eli: 'e', ousli: 'ous', ization: 'ize', ation: 'ate',
  ator: 'ate', alism: 'al', iveness: 'ive', fulness: 'ful',
  ousness: 'ous', aliti: 'al', iviti: 'ive', biliti: 'ble',
};

const step3map = {
  icate: 'ic', ative: '', alize: 'al', iciti: 'ic',
  ical: 'ic', ful: '', ness: '',
};

function stemWord(word) {
  if (word.length < 3) return word;
  
  // Step 1a
  if (word.endsWith('sses')) word = word.slice(0, -2);
  else if (word.endsWith('ies')) word = word.slice(0, -2);
  else if (!word.endsWith('ss') && word.endsWith('s')) word = word.slice(0, -1);

  // Step 1b
  const step1bRe = /^(.+?)(eed|ed|ing)$/;
  const m = word.match(step1bRe);
  if (m) {
    if (m[2] === 'eed') {
      if (m[1].length > 1) word = word.slice(0, -1);
    } else {
      const hasVowel = /[aeiou]/.test(m[1]);
      if (hasVowel) {
        word = m[1];
        if (word.endsWith('at') || word.endsWith('bl') || word.endsWith('iz')) word += 'e';
      }
    }
  }

  // Step 1c
  if (word.endsWith('y') && /[aeiou]/.test(word.slice(0, -1))) {
    word = word.slice(0, -1) + 'i';
  }

  // Step 2
  for (const [suffix, replacement] of Object.entries(step2map)) {
    if (word.endsWith(suffix)) {
      const stem = word.slice(0, -suffix.length);
      if (stem.length > 1) word = stem + replacement;
      break;
    }
  }

  // Step 3
  for (const [suffix, replacement] of Object.entries(step3map)) {
    if (word.endsWith(suffix)) {
      const stem = word.slice(0, -suffix.length);
      if (stem.length > 1) word = stem + replacement;
      break;
    }
  }

  return word;
}

// ═════════════════════════════════════════════════════════════════
// 2. SYNONYM EXPANSION (Domain-specific thesaurus)
// ═════════════════════════════════════════════════════════════════

const synonymGroups = [
  // Security
  ['scan', 'check', 'assess', 'audit', 'probe', 'test', 'analyze', 'inspect'],
  ['vulnerability', 'weakness', 'flaw', 'risk', 'threat', 'danger', 'issue', 'problem'],
  ['safe', 'secure', 'protected', 'strong', 'robust'],
  ['unsafe', 'vulnerable', 'weak', 'exposed', 'insecure', 'risky', 'dangerous'],
  ['fix', 'remediate', 'patch', 'resolve', 'repair', 'correct', 'mitigate'],
  ['critical', 'urgent', 'severe', 'high-risk', 'emergency', 'immediate'],

  // Domain
  ['certificate', 'cert', 'ssl', 'tls'],
  ['host', 'domain', 'server', 'target', 'endpoint', 'website', 'site'],
  ['algorithm', 'cipher', 'crypto', 'encryption'],
  ['score', 'rating', 'grade', 'rank', 'level'],
  ['compliance', 'regulatory', 'regulation', 'standard', 'requirement', 'mandate'],
  ['report', 'export', 'download', 'document'],
  ['migration', 'transition', 'upgrade', 'replacement', 'update'],

  // Actions
  ['show', 'display', 'list', 'view', 'see', 'get', 'tell', 'give'],
  ['use', 'purpose', 'function', 'role', 'application', 'utility'],
  ['feature', 'capability', 'functionality', 'option', 'tool'],
  ['help', 'assist', 'guide', 'support'],
  ['create', 'add', 'new', 'make', 'setup', 'configure'],

  // Quantifiers
  ['many', 'count', 'number', 'total', 'amount', 'quantity'],
  ['latest', 'last', 'recent', 'newest', 'current'],
  ['best', 'top', 'highest', 'strongest', 'safest'],
  ['worst', 'lowest', 'weakest', 'riskiest', 'worst-performing'],
];

// Build lookup: word → canonical (first word in group)
const synonymLookup = {};
for (const group of synonymGroups) {
  const canonical = group[0];
  for (const word of group) {
    synonymLookup[word] = canonical;
  }
}

function expandSynonyms(tokens) {
  return tokens.map(t => synonymLookup[t] || t);
}

// ═════════════════════════════════════════════════════════════════
// 3. FUZZY MATCHING (Levenshtein Distance)
// ═════════════════════════════════════════════════════════════════

function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

// Build a vocabulary of all known words from training data
const trainingData = require('./trainingData');
const vocabulary = new Set();
for (const entry of trainingData) {
  for (const pattern of entry.patterns) {
    pattern.split(/\s+/).forEach(w => {
      if (w.length > 2) vocabulary.add(w.toLowerCase());
    });
  }
}
const vocabArray = [...vocabulary];

/**
 * Correct a word using fuzzy matching against vocabulary
 * Only corrects if edit distance ≤ 2 and word length > 3
 */
function fuzzyCorrect(word) {
  if (vocabulary.has(word)) return word;
  if (word.length <= 3) return word;

  const maxDist = word.length <= 5 ? 1 : 2;
  let bestMatch = word;
  let bestDist = maxDist + 1;

  for (const vocabWord of vocabArray) {
    // Quick length filter to avoid unnecessary computation
    if (Math.abs(vocabWord.length - word.length) > maxDist) continue;

    const dist = levenshtein(word, vocabWord);
    if (dist < bestDist) {
      bestDist = dist;
      bestMatch = vocabWord;
    }
  }

  return bestDist <= maxDist ? bestMatch : word;
}

// ═════════════════════════════════════════════════════════════════
// 4. ENHANCED TOKENIZER (Stem + Synonym + Fuzzy)
// ═════════════════════════════════════════════════════════════════

const STOPWORDS = new Set([
  'a','an','the','be','been','being',
  'to','of','in','for','on','with','at','by','from','as','into','between',
  'through','after','before','during','above','below','up','down','out','off',
  'over','under','then','than','too','very','just','also','nor','but',
  'and','or','so','if','that','its','me','we','our','you',
  'your','he','she','they','them','their',
  'there','here','am','is','are','was','were',
  'please','let','could','would','should','can','will','may','might',
  'do','does','did','has','have','had',
]);

/**
 * Basic tokenizer — split and filter
 */
function tokenizeRaw(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Enhanced tokenizer: fuzzy correct → stem → synonym expand
 */
function tokenize(text) {
  const raw = tokenizeRaw(text);
  // Pipeline: fuzzy correct → stem → synonym expand
  const corrected = raw.map(t => fuzzyCorrect(t));
  const stemmed = corrected.map(t => stemWord(t));
  const expanded = expandSynonyms(stemmed);
  return expanded;
}

/**
 * Tokenize for pattern matching (no fuzzy, to keep patterns clean)
 */
function tokenizePattern(text) {
  const raw = tokenizeRaw(text);
  const stemmed = raw.map(t => stemWord(t));
  const expanded = expandSynonyms(stemmed);
  return expanded;
}

// ═════════════════════════════════════════════════════════════════
// 5. TF-IDF ENGINE (Built from Training Data)
// ═════════════════════════════════════════════════════════════════

function computeTF(tokens) {
  const tf = {};
  tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
  const len = tokens.length || 1;
  Object.keys(tf).forEach(t => { tf[t] /= len; });
  return tf;
}

function cosineSimilarity(vecA, vecB) {
  const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0, magA = 0, magB = 0;
  allKeys.forEach(k => {
    const a = vecA[k] || 0;
    const b = vecB[k] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  });
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// Build TF-IDF from training data (using enhanced tokenizer for patterns)
const intentDocuments = trainingData.map(entry => {
  const allText = entry.patterns.join(' ');
  const tokens = tokenizePattern(allText);
  return { id: entry.intent, tokens, tf: computeTF(tokens) };
});

// Compute IDF
const documentCount = intentDocuments.length;
const idfMap = {};
intentDocuments.forEach(doc => {
  const uniqueTokens = new Set(doc.tokens);
  uniqueTokens.forEach(t => {
    idfMap[t] = (idfMap[t] || 0) + 1;
  });
});
Object.keys(idfMap).forEach(t => {
  idfMap[t] = Math.log(documentCount / (idfMap[t] + 1)) + 1;
});

// Build TF-IDF vectors
const intentVectors = intentDocuments.map(doc => {
  const tfidf = {};
  Object.keys(doc.tf).forEach(t => {
    tfidf[t] = doc.tf[t] * (idfMap[t] || 1);
  });
  return { id: doc.id, tfidf, tokens: doc.tokens };
});

// ═════════════════════════════════════════════════════════════════
// 6. PHRASE MATCHING (Smart boundary matching)
// ═════════════════════════════════════════════════════════════════

// Pre-compile patterns with word-boundary awareness
const compiledPatterns = trainingData.map(entry => {
  const compiled = entry.patterns.map(p => {
    const words = p.trim().split(/\s+/);
    if (words.length >= 3) {
      return { type: 'substring', value: p };
    } else {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return { type: 'regex', value: new RegExp(`(?:^|\\s|\\b)${escaped}(?:\\s|\\b|$)`, 'i') };
    }
  });
  return { intent: entry.intent, compiled };
});

/**
 * Match against phrase patterns (exact + fuzzy-corrected)
 */
function matchPhrase(question) {
  const q = question.toLowerCase().trim();

  // Try original question first
  // Pass 1: multi-word substring
  for (const entry of compiledPatterns) {
    for (const cp of entry.compiled) {
      if (cp.type === 'substring' && q.includes(cp.value)) {
        return { intent: entry.intent, confidence: 0.95 };
      }
    }
  }

  // Pass 2: word-boundary regex
  for (const entry of compiledPatterns) {
    for (const cp of entry.compiled) {
      if (cp.type === 'regex' && cp.value.test(q)) {
        return { intent: entry.intent, confidence: 0.90 };
      }
    }
  }

  // Pass 3: Try fuzzy-corrected version of the question
  const correctedTokens = tokenizeRaw(question).map(t => fuzzyCorrect(t));
  const correctedQ = correctedTokens.join(' ');
  if (correctedQ !== q) {
    for (const entry of compiledPatterns) {
      for (const cp of entry.compiled) {
        if (cp.type === 'substring' && correctedQ.includes(cp.value)) {
          return { intent: entry.intent, confidence: 0.85 };
        }
      }
    }
    for (const entry of compiledPatterns) {
      for (const cp of entry.compiled) {
        if (cp.type === 'regex' && cp.value.test(correctedQ)) {
          return { intent: entry.intent, confidence: 0.80 };
        }
      }
    }
  }

  return null;
}

// ═════════════════════════════════════════════════════════════════
// 7. PAGE CONTEXT ASSOCIATIONS
// ═════════════════════════════════════════════════════════════════

const pageAssociations = {
  'scan_count': ['dashboard', 'history'],
  'scan_status': ['history', 'dashboard'],
  'last_scan': ['history', 'dashboard'],
  'scan_duration': ['history'],
  'how_to_scan': ['scan'],
  'vulnerable_count': ['dashboard', 'risk-heatmap', 'pqc-posture'],
  'safe_count': ['dashboard', 'risk-heatmap', 'pqc-posture'],
  'pqc_score': ['dashboard', 'cyber-rating', 'pqc-posture'],
  'worst_host': ['risk-heatmap', 'dashboard'],
  'best_host': ['risk-heatmap', 'dashboard'],
  'cert_expiring': ['asset-inventory'],
  'cert_count': ['asset-inventory', 'cbom'],
  'compliance_score': ['compliance'],
  'rbi_status': ['compliance'],
  'nist_status': ['compliance'],
  'compliance_gaps': ['compliance'],
  'pending_fixes': ['remediation'],
  'remediation_progress': ['remediation'],
  'critical_actions': ['remediation', 'roadmap'],
  'domain_count': ['asset-inventory', 'dashboard'],
  'cipher_info': ['cbom', 'pqc-posture'],
  'how_to_export': ['reports'],
  'page_guide_dashboard': ['dashboard'],
  'page_guide_scan': ['scan'],
  'page_guide_history': ['history'],
  'page_guide_cbom': ['cbom'],
  'page_guide_heatmap': ['risk-heatmap'],
  'page_guide_compliance': ['compliance'],
  'page_guide_remediation': ['remediation'],
  'page_guide_roadmap': ['roadmap'],
  'page_guide_reports': ['reports'],
  'page_guide_schedules': ['schedules'],
  'page_guide_compare': ['compare'],
  'page_guide_cyber_rating': ['cyber-rating'],
  'page_guide_pqc_posture': ['pqc-posture'],
  'page_guide_admin': ['admin'],
};

// ═════════════════════════════════════════════════════════════════
// 8. INTENT CLASSIFICATION (Enhanced TF-IDF)
// ═════════════════════════════════════════════════════════════════

function classifyIntent(question, currentPage = '') {
  const questionTokens = tokenize(question);
  if (questionTokens.length === 0) {
    return [{ intent: 'greeting', confidence: 1.0 }];
  }

  const questionTF = computeTF(questionTokens);
  const questionTFIDF = {};
  Object.keys(questionTF).forEach(t => {
    questionTFIDF[t] = questionTF[t] * (idfMap[t] || 1);
  });

  const page = currentPage.replace(/^\//, '').replace(/\//g, '-') || '';

  const scored = intentVectors.map(iv => {
    let similarity = cosineSimilarity(questionTFIDF, iv.tfidf);

    // Keyword overlap bonus (stemmed + synonym-expanded matching)
    const matchCount = questionTokens.filter(t => iv.tfidf[t] && iv.tfidf[t] > 0).length;
    const keywordBonus = matchCount / (questionTokens.length || 1) * 0.3;
    similarity += keywordBonus;

    // Page context boost
    const pages = pageAssociations[iv.id] || [];
    if (page && pages.includes(page)) {
      similarity *= 1.2;
    }

    return { intent: iv.id, confidence: Math.min(similarity, 1.0) };
  });

  scored.sort((a, b) => b.confidence - a.confidence);
  return scored;
}

// ═════════════════════════════════════════════════════════════════
// 9. GLOSSARY & FAQ MATCHING
// ═════════════════════════════════════════════════════════════════

function matchGlossary(question, glossary) {
  const q = question.toLowerCase();
  const triggers = ['what is', 'what are', 'explain', 'meaning', 'define', 'tell me about', 'describe'];
  const hasTrigger = triggers.some(t => q.includes(t));
  if (!hasTrigger) return null;

  const sortedTerms = Object.entries(glossary).sort((a, b) => b[0].length - a[0].length);
  for (const [term, definition] of sortedTerms) {
    if (q.includes(term)) {
      return { term, definition };
    }
  }
  return null;
}

function matchFAQ(question, faqList) {
  const questionTokens = tokenize(question);
  const questionTF = computeTF(questionTokens);

  let best = null;
  let bestScore = 0;

  for (const entry of faqList) {
    const entryTF = computeTF(tokenize(entry.q));
    const score = cosineSimilarity(questionTF, entryTF);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return bestScore > 0.55 ? best : null;
}

// ═════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════

module.exports = { classifyIntent, matchGlossary, matchFAQ, matchPhrase, tokenize, stemWord, fuzzyCorrect };
