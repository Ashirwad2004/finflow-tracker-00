// Financial Category Synonym Concepts for Advanced Matching
export const CATEGORY_CONCEPTS: Record<string, string[]> = {
    "Food": ["lunch", "dinner", "breakfast", "coffee", "tea", "snack", "restaurant", "swiggy", "zomato", "grocery", "vegetables", "milk", "burger", "pizza", "food", "eat", "drink", "dining", "cafe", "starbucks"],
    "Travel": ["uber", "ola", "taxi", "bus", "train", "flight", "petrol", "fuel", "gas", "metro", "auto", "cab", "ticket", "travel", "commute", "transport", "vehicle"],
    "Shopping": ["amazon", "flipkart", "clothes", "shoes", "mall", "market", "shop", "buy", "jeans", "shirt", "dress", "store", "purchase"],
    "Bills": ["electricity", "water", "internet", "wifi", "phone", "recharge", "rent", "subscription", "netflix", "spotify", "bill", "invoice", "light bill", "broadband", "utility", "fees", "payment"],
    "Health": ["medicine", "doctor", "hospital", "gym", "yoga", "fitness", "medical", "checkup", "pharmacy", "care"],
    "Entertainment": ["movie", "cinema", "game", "party", "concert", "ipl", "match", "fun", "outing", "entertain"],
    "Education": ["books", "course", "fees", "tuition", "school", "college", "udemy", "coursera", "learning", "learn", "book"],
};

export const CONCEPT_SYNONYMS: Record<string, string[]> = {
    "Food": ["food", "eat", "drink", "dining", "kitchen", "ration", "grocery", "snack", "restaurant", "cafe"],
    "Travel": ["travel", "transport", "fuel", "petrol", "commute", "vehicle", "taxi", "cab"],
    "Shopping": ["shop", "purchase", "store", "buy", "cloth", "fashion"],
    "Bills": ["bill", "utility", "rent", "recharge", "subscription", "fee", "payment"],
    "Health": ["health", "medic", "fitness", "gym", "care"],
    "Entertainment": ["entertain", "movie", "fun", "subscription", "game"],
    "Education": ["education", "learn", "course", "school", "college", "book"],
};

/**
 * Fuzzy matches a text term/concept to the closest available database category.
 */
export function matchCategory(term: string | undefined | null, categories: { id: string; name: string }[]): string | undefined {
    if (!term || !categories.length) return undefined;

    const lowerTerm = term.toLowerCase().trim();

    // 1. Direct match: Exact or partial name match
    const exactMatch = categories.find(c => c.name.toLowerCase() === lowerTerm);
    if (exactMatch) return exactMatch.id;

    const partialMatch = categories.find(c => 
        lowerTerm.includes(c.name.toLowerCase()) || 
        c.name.toLowerCase().includes(lowerTerm)
    );
    if (partialMatch) return partialMatch.id;

    // 2. Concept matching: Check if the term maps to a known concept
    let matchedConcept: string | null = null;
    for (const [concept, keywords] of Object.entries(CATEGORY_CONCEPTS)) {
        if (keywords.some(kw => lowerTerm.includes(kw) || kw.includes(lowerTerm))) {
            matchedConcept = concept;
            break;
        }
    }

    if (matchedConcept) {
        // Find category with direct matching concept name (e.g. "Food")
        const conceptCatMatch = categories.find(c => c.name.toLowerCase() === matchedConcept!.toLowerCase());
        if (conceptCatMatch) return conceptCatMatch.id;

        // Try fuzzy synonym match
        const synonyms = CONCEPT_SYNONYMS[matchedConcept] || [];
        const synonymCatMatch = categories.find(c => 
            synonyms.some(syn => c.name.toLowerCase().includes(syn) || syn.includes(c.name.toLowerCase()))
        );
        if (synonymCatMatch) return synonymCatMatch.id;
    }

    // Default: return undefined (the caller can fall back to a default category)
    return undefined;
}
