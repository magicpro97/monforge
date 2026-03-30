// Keyword-based sentiment classifier (no AI dependency needed)
// Based on NLP review mining research for app store optimization

const POSITIVE_WORDS = new Set([
  'love', 'great', 'amazing', 'awesome', 'excellent', 'perfect', 'best',
  'fantastic', 'wonderful', 'helpful', 'useful', 'beautiful', 'easy',
  'fast', 'reliable', 'smooth', 'intuitive', 'recommend', 'works',
  'good', 'nice', 'brilliant', 'superb', 'outstanding', 'favorite',
  'enjoy', 'impressive', 'elegant', 'solid', 'clean', 'simple',
]);

const NEGATIVE_WORDS = new Set([
  'hate', 'terrible', 'awful', 'worst', 'horrible', 'bad', 'broken',
  'crash', 'crashes', 'bug', 'bugs', 'slow', 'laggy', 'freeze',
  'freezes', 'useless', 'annoying', 'frustrating', 'disappointed',
  'waste', 'ugly', 'confusing', 'complicated', 'expensive', 'scam',
  'spam', 'ads', 'uninstall', 'deleted', 'refund', 'fix', 'issue',
  'problem', 'error', 'fail', 'failed', 'missing', 'poor', 'worse',
]);

export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface SentimentResult {
  sentiment: Sentiment;
  score: number; // -1 to 1
  positiveWords: string[];
  negativeWords: string[];
}

export interface SentimentSummary {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  topComplaints: { word: string; count: number }[];
  topPraises: { word: string; count: number }[];
  averageSentiment: number;
}

export function analyzeSentiment(text: string): SentimentResult {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  const positiveFound: string[] = [];
  const negativeFound: string[] = [];

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveFound.push(word);
    if (NEGATIVE_WORDS.has(word)) negativeFound.push(word);
  }

  const score = positiveFound.length - negativeFound.length;
  const normalizedScore = Math.max(-1, Math.min(1, score / Math.max(1, positiveFound.length + negativeFound.length)));

  let sentiment: Sentiment = 'neutral';
  if (normalizedScore > 0.1) sentiment = 'positive';
  else if (normalizedScore < -0.1) sentiment = 'negative';

  return { sentiment, score: normalizedScore, positiveWords: positiveFound, negativeWords: negativeFound };
}

export function summarizeSentiments(results: SentimentResult[]): SentimentSummary {
  const wordCounts: Record<string, number> = {};
  const praiseWordCounts: Record<string, number> = {};
  let positive = 0, negative = 0, neutral = 0;
  let totalScore = 0;

  for (const r of results) {
    if (r.sentiment === 'positive') positive++;
    else if (r.sentiment === 'negative') negative++;
    else neutral++;
    totalScore += r.score;

    for (const w of r.negativeWords) wordCounts[w] = (wordCounts[w] || 0) + 1;
    for (const w of r.positiveWords) praiseWordCounts[w] = (praiseWordCounts[w] || 0) + 1;
  }

  const topComplaints = Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  const topPraises = Object.entries(praiseWordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  return {
    total: results.length,
    positive, negative, neutral,
    topComplaints,
    topPraises,
    averageSentiment: results.length > 0 ? totalScore / results.length : 0,
  };
}
