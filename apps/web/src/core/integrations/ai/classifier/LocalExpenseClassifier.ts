import { Category, Expense } from "./types";

/**
 * ----------------------------------------------------
 * LOCAL EXPENSE CATEGORY CLASSIFIER (Naive Bayes)
 * ----------------------------------------------------
 * Learns vocabulary patterns from the user's past transactions
 * and predicts the most likely category for new inputs.
 */
export class LocalExpenseClassifier {
  private wordCounts: Record<string, Record<string, number>> = {}; // word -> categoryId -> count
  private categoryCounts: Record<string, number> = {}; // categoryId -> count
  private totalDocs = 0;
  private vocabulary = new Set<string>();
  private trained = false;

  constructor(expenses: Expense[] = []) {
    if (Array.isArray(expenses) && expenses.length > 0) {
      this.train(expenses);
    }
  }

  private tokenize(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .split(/\s+/)
      .filter((w) => w.length > 2); // Filter out short filler words
  }

  public train(expenses: Expense[]) {
    this.wordCounts = {};
    this.categoryCounts = {};
    this.totalDocs = 0;
    this.vocabulary.clear();

    if (!Array.isArray(expenses)) {
      this.trained = false;
      return;
    }

    expenses.forEach((e) => {
      if (!e) return;
      const desc = e.description;
      // Handle both backend naming (category_id) and frontend UI representation (categoryId)
      const catId = e.category_id || e.categoryId || (e.categories && e.categories.id);
      if (!desc || !catId) return;

      this.categoryCounts[catId] = (this.categoryCounts[catId] || 0) + 1;
      this.totalDocs++;

      const tokens = this.tokenize(desc);
      tokens.forEach((token) => {
        this.vocabulary.add(token);
        if (!this.wordCounts[token]) {
          this.wordCounts[token] = {};
        }
        this.wordCounts[token][catId] = (this.wordCounts[token][catId] || 0) + 1;
      });
    });

    this.trained = this.totalDocs > 0;
  }

  public predictCategory(description: string, categories: Category[]): string | null {
    if (
      !this.trained ||
      this.totalDocs === 0 ||
      !description ||
      !description.trim() ||
      !Array.isArray(categories) ||
      categories.length === 0
    ) {
      return null;
    }

    const tokens = this.tokenize(description);
    if (tokens.length === 0) return null;

    let bestCategoryId: string | null = null;
    let maxLogProb = -Infinity;
    const validCategoryIds = new Set(categories.map((c) => c.id));

    // Calculate probability for each category
    for (const catId of Object.keys(this.categoryCounts)) {
      if (!validCategoryIds.has(catId)) continue;

      const categoryCount = this.categoryCounts[catId] || 0;
      if (categoryCount === 0) continue;

      // Prior probability: P(C) = count(C) / totalDocs
      let logProb = Math.log(categoryCount / this.totalDocs);

      // P(W|C) with Laplace smoothing
      // Total words associated with category C
      let totalWordsInCat = 0;
      for (const token of Object.keys(this.wordCounts)) {
        totalWordsInCat += this.wordCounts[token][catId] || 0;
      }

      const vocabSize = this.vocabulary.size;

      tokens.forEach((token) => {
        const wordCountInCat = this.wordCounts[token] ? this.wordCounts[token][catId] || 0 : 0;
        // Laplace smoothing: (count + 1) / (total words in cat + vocab size + 1)
        const denominator = totalWordsInCat + vocabSize + 1;
        const wordProb = denominator > 0 ? (wordCountInCat + 1) / denominator : 1 / (vocabSize + 1);
        logProb += Math.log(wordProb);
      });

      if (logProb > maxLogProb) {
        maxLogProb = logProb;
        bestCategoryId = catId;
      }
    }

    // Verify if we actually matched any known words to avoid arbitrary guesses
    const hasKnownWord = tokens.some((t) => this.wordCounts[t] !== undefined);
    if (!hasKnownWord) return null;

    return bestCategoryId;
  }

  /**
   * Returns a list of learned rules for transparency and UI presentation
   */
  public getLearnedConcepts(
    categories: Category[]
  ): { word: string; categoryName: string; confidence: number }[] {
    if (!Array.isArray(categories) || categories.length === 0) {
      return [];
    }
    const concepts: { word: string; categoryName: string; confidence: number }[] = [];
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    for (const [word, counts] of Object.entries(this.wordCounts)) {
      let maxCount = 0;
      let totalWordCount = 0;
      let topCatId = "";

      for (const [catId, count] of Object.entries(counts)) {
        totalWordCount += count;
        if (count > maxCount) {
          maxCount = count;
          topCatId = catId;
        }
      }

      const categoryName = catMap.get(topCatId);
      if (categoryName && maxCount > 0 && totalWordCount > 0) {
        const confidence = maxCount / totalWordCount;
        // Only include concepts with 2+ occurrences or high confidence
        if (maxCount >= 2 || confidence > 0.8) {
          concepts.push({
            word,
            categoryName,
            confidence: Math.round(confidence * 100),
          });
        }
      }
    }

    return concepts.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  }
}
