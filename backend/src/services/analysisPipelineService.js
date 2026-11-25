import { SourceAnalysis } from '../models/SourceAnalysis.js';

// Common English stopwords to downweight/filter
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
  'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
  'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
  'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while',
  'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
  'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves', 'really', 'just', 'also', 'like', 'think', 'get'
]);

/**
 * Tokenizes text into cleaned lowercase tokens.
 */
function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

/**
 * Extracts bigrams from a list of tokens.
 */
function extractBigrams(tokens = []) {
  const bigrams = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

/**
 * Computes TF-IDF for documents.
 */
function computeTfIdf(documents) {
  const docCount = documents.length;
  if (docCount === 0) return { docTerms: [], topKeywords: [] };

  const dfMap = new Map(); // Document frequency
  const docTerms = [];

  for (const doc of documents) {
    const tokens = tokenize(doc.fullBody || doc.body || '');
    const bigrams = extractBigrams(tokens);
    const allTerms = [...tokens, ...bigrams];

    const termFreq = new Map();
    const seenInDoc = new Set();

    for (const term of allTerms) {
      termFreq.set(term, (termFreq.get(term) || 0) + 1);
      if (!seenInDoc.has(term)) {
        seenInDoc.add(term);
        dfMap.set(term, (dfMap.get(term) || 0) + 1);
      }
    }

    docTerms.push({
      item: doc,
      termFreq,
      totalTerms: allTerms.length || 1,
    });
  }

  // Calculate TF-IDF scores for all terms across documents
  const aggregateScore = new Map();

  for (const { termFreq, totalTerms } of docTerms) {
    for (const [term, freq] of termFreq.entries()) {
      const tf = freq / totalTerms;
      const df = dfMap.get(term) || 1;
      const idf = Math.log(1 + docCount / df);
      const score = tf * idf;
      aggregateScore.set(term, (aggregateScore.get(term) || 0) + score);
    }
  }

  const topKeywords = Array.from(aggregateScore.entries())
    .map(([keyword, score]) => ({ keyword, score: Math.round(score * 100) / 100 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return { docTerms, topKeywords };
}

/**
 * Runs the Zero-Cost Analysis Pipeline on a SourceSnapshot.
 */
export async function runZeroCostAnalysis({ snapshot, rawItems = [], sourceTitle = '' }) {
  // Use manifest if rawItems not passed in
  const items = rawItems.length > 0 ? rawItems : (snapshot.sourceManifest || []);

  // Stage 1: Exact Statistics
  const totalAnalyzed = items.length;
  const uniqueContributors = new Set(
    items.map((item) => (item.authorId ? item.authorId.toString() : item.authorName))
  ).size;

  let totalEngagement = 0;
  for (const it of items) {
    totalEngagement += it.voteCount || 0;
  }
  const averageEngagement = totalAnalyzed > 0 ? Math.round((totalEngagement / totalAnalyzed) * 10) / 10 : 0;

  // Stage 2 & 3: Text Preparation & Theme Discovery
  const { docTerms, topKeywords } = computeTfIdf(items);

  // Group into themes based on top keywords
  const themes = [];
  const primaryKeywords = topKeywords.slice(0, 4);

  if (primaryKeywords.length === 0) {
    // Fallback theme for empty/minimal discussions
    themes.push({
      themeId: 'theme-1',
      label: 'Core Topic Exploration',
      keywords: [sourceTitle.toLowerCase().slice(0, 20)],
      contributionCount: totalAnalyzed,
      contributorCount: uniqueContributors,
      representativeSourceIds: items.slice(0, 5).map((i) => i.sourceId),
      contrastingSourceIds: [],
      summary: `Primary community perspectives discussing "${sourceTitle}".`,
    });
  } else {
    primaryKeywords.forEach((kw, idx) => {
      // Find matching items for this theme
      const matchingItems = docTerms.filter(({ termFreq }) => termFreq.has(kw.keyword));
      const sourceIds = matchingItems.map(({ item }) => item.sourceId);
      const contributors = new Set(matchingItems.map(({ item }) => (item.authorId ? item.authorId.toString() : item.authorName)));

      // Contrasting candidates: items that mention the keyword but have words like "however", "risk", "disagree", "alternatively"
      const contrasting = matchingItems.filter(({ item }) => {
        const text = (item.fullBody || item.contentPreview || '').toLowerCase();
        return text.includes('however') || text.includes('disagree') || text.includes('problem') || text.includes('risk') || text.includes('issue');
      });

      // Capitalize label nicely
      const capitalizedLabel = kw.keyword.charAt(0).toUpperCase() + kw.keyword.slice(1);

      themes.push({
        themeId: `theme-${idx + 1}`,
        label: `${capitalizedLabel} Insights & Practices`,
        keywords: [kw.keyword],
        contributionCount: matchingItems.length || 1,
        contributorCount: contributors.size || 1,
        representativeSourceIds: sourceIds.slice(0, 5),
        contrastingSourceIds: contrasting.slice(0, 2).map((c) => c.item.sourceId),
        summary: `Perspectives centered on ${kw.keyword} and related community patterns.`,
      });
    });
  }

  // Stage 6: Generate Algorithmic Outline (Zero AI)
  const outline = [
    {
      sectionId: 'sec-intro',
      heading: '1. Problem Overview & Community Context',
      notes: `Introduction defining the core question addressed in "${sourceTitle}".`,
      suggestedFocus: 'Define the core motivation and scope.',
      mappedSourceIds: items.slice(0, 3).map((i) => i.sourceId),
      order: 1,
    },
    ...themes.map((theme, idx) => ({
      sectionId: `sec-theme-${idx + 1}`,
      heading: `${idx + 2}. ${theme.label}`,
      notes: theme.summary,
      suggestedFocus: `Synthesize findings supported by ${theme.contributionCount} community contributions.`,
      mappedSourceIds: theme.representativeSourceIds,
      order: idx + 2,
    })),
    {
      sectionId: `sec-summary`,
      heading: `${themes.length + 2}. Actionable Framework & Key Takeaways`,
      notes: 'Consolidated guidelines, trade-offs, and practical conclusions.',
      suggestedFocus: 'Distill takeaways into reusable instructions.',
      mappedSourceIds: items.slice(-3).map((i) => i.sourceId),
      order: themes.length + 2,
    },
  ];

  // Stage 7: Persist SourceAnalysis
  const analysis = await SourceAnalysis.create({
    snapshotId: snapshot._id,
    sourceType: snapshot.sourceType,
    sourceId: snapshot.sourceId,
    algorithmVersion: 'v1.0-tfidf-zero-cost',
    stats: {
      totalAnalyzed,
      uniqueContributors,
      averageEngagement,
      topKeywords,
    },
    themes,
    suggestedOutline: outline,
    status: 'ready',
  });

  return analysis;
}
