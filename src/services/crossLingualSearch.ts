// Cross-Lingual Search, Phonetic Semantic Matcher & Relevance Ranking for Marketly
// Supports English, Bengali (বাংলা script), and Banglish (phonetic Romanized Bengali)

export interface SearchSuggestion {
  text: string;
  category?: string;
  matchedLang: 'en' | 'bn' | 'banglish';
  translation?: string;
}

// Comprehensive bilingual semantic dictionary
export const BILINGUAL_DICTIONARY: Record<string, { en: string[]; bn: string[]; category?: string }> = {
  books: {
    en: ['book', 'books', 'literature', 'read', 'reading', 'author', 'publication', 'paperback', 'hardcover'],
    bn: ['বই', 'বইয়ের', 'পুস্তক', 'গ্রন্থ', 'সাহিত্য', 'পাঠক', 'কিতাব'],
    category: 'Books',
  },
  motivational: {
    en: [
      'motivational',
      'motivation',
      'self-help',
      'self-improvement',
      'self help',
      'personal development',
      'habits',
      'inspiration',
      'inspiring',
      'success',
      'mindset',
    ],
    bn: [
      'মোটিভেশনাল',
      'মোটিভেশন',
      'আত্মউন্নয়ন',
      'আত্মউন্নয়নের বই',
      'আত্মউন্নয়ন',
      'অনুপ্রেরণা',
      'অনুপ্রেরণামূলক',
      'সাফল্য',
      'উৎসাহ',
      'অভ্যাস',
    ],
    category: 'Books',
  },
  novels: {
    en: ['novel', 'novels', 'fiction', 'story', 'literature', 'classic', 'thriller', 'adventure'],
    bn: ['উপন্যাস', 'উপন্যাসের', 'উপন্যাসিক', 'ফিকশন', 'গল্প', 'রোমাঞ্চ', 'অ্যাডভেঞ্চার', 'সাহিত্য'],
    category: 'Books',
  },
  bangla_novel: {
    en: ['bangla novel', 'bangla novels', 'bengali novel', 'bangla uponnash'],
    bn: ['বাংলা উপন্যাস', 'বাংলা উপন্যাসসমূহ', 'বাংলা বই', 'বাংলা ক্লাসিক'],
    category: 'Books',
  },
  english_novel: {
    en: ['english novel', 'english novels', 'english literature', 'classic novel'],
    bn: ['ইংরেজি উপন্যাস', 'ইংলিশ উপন্যাস', 'ইংরেজি সাহিত্য'],
    category: 'Books',
  },
  phone: {
    en: ['phone', 'phones', 'smartphone', 'smartphones', 'mobile', 'mobile phone', 'cellphone', 'iphone', 'galaxy', 'android'],
    bn: ['মোবাইল', 'মোবাইল ফোন', 'ফোন', 'স্মার্টফোন', 'মুঠোফোন', 'সেলফোন'],
    category: 'Electronics',
  },
  laptop: {
    en: ['laptop', 'laptops', 'notebook', 'notebooks', 'macbook', 'computer', 'ultrabook', 'pc', 'workstation'],
    bn: ['ল্যাপটপ', 'নোটবুক', 'কম্পিউটার', 'ম্যাকবুক'],
    category: 'Computing',
  },
  watch: {
    en: ['watch', 'watches', 'chronograph', 'timepiece', 'tourbillon', 'rolex', 'automatic', 'wrist', 'smartwatch', 'smart watch'],
    bn: ['ঘড়ি', 'ঘড়ি', 'হাতঘড়ি', 'হাতঘড়ি', 'রিস্টওয়াচ', 'টাইমপিস', 'স্মার্টওয়াচ'],
    category: 'Watches',
  },
  clothing: {
    en: ['shirt', 'knit', 'sweater', 'blazer', 'jacket', 'wool', 'merino', 'polo', 'apparel', 'fashion', 'coat', 'cotton', 'dress', 't-shirt'],
    bn: ['শার্ট', 'জামা', 'পোশাক', 'সোয়েটার', 'ব্লেজার', 'জ্যাকেট', 'ফ্যাশন', 'উল', 'সুতি', 'টি-শার্ট'],
    category: 'Fashion',
  },
  audio: {
    en: ['headphone', 'headphones', 'earphones', 'earbuds', 'audio', 'sound', 'wireless', 'noise cancelling', 'speaker', 'anc'],
    bn: ['হেডফোন', 'ইয়ারফোন', 'অডিও', 'সাউন্ড', 'স্পিকার', 'ইয়ারবাডস'],
    category: 'Electronics',
  },
  bag: {
    en: ['bag', 'duffle', 'backpack', 'tote', 'wallet', 'purse', 'leather', 'luggage', 'briefcase'],
    bn: ['ব্যাগ', 'ডাফেল', 'পার্স', 'মানিব্যাগ', 'ওয়ালেট', 'লেদার', 'চামড়া'],
    category: 'Fashion',
  },
  sunglasses: {
    en: ['sunglasses', 'shades', 'eyewear', 'glasses', 'optical', 'aviator', 'polarized'],
    bn: ['চশমা', 'সানগ্লাস', 'গ্লাস'],
    category: 'Accessories',
  },
  fragrance: {
    en: ['perfume', 'fragrance', 'scent', 'cologne', 'parfum', 'eau de parfum', 'attar'],
    bn: ['পারফিউম', 'সুগন্ধি', 'আতরের', 'সেন্ট', 'কলোন'],
    category: 'Beauty',
  },
  jewelry: {
    en: ['jewelry', 'bracelet', 'necklace', 'ring', 'diamond', 'gold', 'titanium', 'chain', 'silver'],
    bn: ['গহনা', 'জুয়েলারি', 'আংটি', 'ব্রেসলেট', 'নেকলেস', 'স্বর্ণ', 'হীরা', 'সোনার'],
    category: 'Accessories',
  },
  shoes: {
    en: ['shoes', 'sneakers', 'boots', 'loafers', 'leather shoes', 'footwear', 'running shoes'],
    bn: ['জুতা', 'স্নিকার্স', 'বুট', 'জুতো', 'কেডস'],
    category: 'Fashion',
  },
  furniture: {
    en: ['furniture', 'sofa', 'couch', 'chair', 'table', 'decor', 'living room'],
    bn: ['আসবাবপত্র', 'সোফা', 'চেয়ার', 'টেবিল', 'ফার্নিচার'],
    category: 'Home Decor',
  },
  discount: {
    en: ['sale', 'discount', 'deal', 'offer', 'clearance', 'promo', 'save', 'cheap'],
    bn: ['ছাড়', 'অফার', 'ডিসকাউন্ট', 'ডিল', 'কম দাম', 'সেল', 'কমদামে'],
  },
};

// Phonetic Banglish to English and Bengali semantic mappings
export const BANGLISH_PHONETIC_MAP: Record<string, string[]> = {
  uponnash: ['novel', 'উপন্যাস', 'fiction'],
  upannash: ['novel', 'উপন্যাস'],
  uponash: ['novel', 'উপন্যাস'],
  boi: ['book', 'বই', 'books'],
  boiy: ['book', 'বই', 'books'],
  boier: ['book', 'বই'],
  motivational: ['motivational', 'মোটিভেশনাল', 'self-help'],
  motivation: ['motivational', 'মোটিভেশনাল'],
  atmoonnoyon: ['self-help', 'আত্মউন্নয়ন', 'personal development'],
  attounnoyon: ['self-help', 'আত্মউন্নয়ন'],
  atmoonnoyoner: ['self-help', 'আত্মউন্নয়ন'],
  mobail: ['phone', 'mobile', 'মোবাইল'],
  mobile: ['phone', 'mobile', 'মোবাইল'],
  mobil: ['phone', 'মোবাইল'],
  phon: ['phone', 'ফোন'],
  fone: ['phone', 'ফোন'],
  leptop: ['laptop', 'ল্যাপটপ', 'notebook'],
  laptop: ['laptop', 'ল্যাপটপ'],
  ghori: ['watch', 'ঘড়ি', 'timepiece'],
  ghari: ['watch', 'ঘড়ি'],
  shart: ['shirt', 'knit', 'শার্ট'],
  sart: ['shirt', 'শার্ট'],
  jama: ['dress', 'shirt', 'clothing', 'জামা'],
  kapor: ['fashion', 'apparel', 'fabric', 'পোশাক'],
  choshma: ['sunglasses', 'eyewear', 'চশমা'],
  cosma: ['sunglasses', 'চশমা'],
  juta: ['shoes', 'sneakers', 'loafers', 'জুতা'],
  juto: ['shoes', 'জুতো'],
  sniker: ['sneakers', 'স্নিকার্স'],
  bag: ['bag', 'backpack', 'ব্যাগ'],
  manibag: ['wallet', 'মানিব্যাগ'],
  komputer: ['computer', 'laptop', 'কম্পিউটার'],
  hedfon: ['headphones', 'audio', 'হেডফোন'],
  parfium: ['perfume', 'fragrance', 'পারফিউম'],
  sugondhi: ['perfume', 'scent', 'সুগন্ধি'],
  gohona: ['jewelry', 'ring', 'bracelet', 'গহনা'],
  char: ['discount', 'sale', 'ছাড়'],
  chhar: ['discount', 'sale', 'ছাড়'],
  dam: ['price', 'দাম'],
  kalo: ['black', 'onyx', 'কালো'],
  shada: ['white', 'সাদা'],
  neel: ['blue', 'নীল'],
  lal: ['red', 'লাল'],
};

/**
 * Normalizes query string for robust cross-lingual comparison
 */
export function normalizeQuery(raw: string): string {
  if (!raw) return '';
  return raw
    .normalize('NFC')
    .toLowerCase()
    .replace(/[?,!.:;"'`~#@$%^&*()_+=\\[\]{}|/<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Expand search query into semantic search tokens covering English, Bengali & Banglish
 */
export function expandCrossLingualTokens(query: string): string[] {
  const clean = normalizeQuery(query);
  if (!clean) return [];

  const tokens = new Set<string>();
  tokens.add(clean);

  // Split words if multi-word query
  const words = clean.split(/\s+/).filter(Boolean);
  words.forEach((w) => tokens.add(w));

  // Check multi-word phrase combinations
  if (words.length > 1) {
    const joined = words.join(' ');
    tokens.add(joined);
  }

  // Check Banglish phonetic dictionary
  words.forEach((word) => {
    if (BANGLISH_PHONETIC_MAP[word]) {
      BANGLISH_PHONETIC_MAP[word].forEach((target) => tokens.add(target.toLowerCase()));
    }
  });

  // Check whole phrase in Banglish phonetic map
  if (BANGLISH_PHONETIC_MAP[clean]) {
    BANGLISH_PHONETIC_MAP[clean].forEach((target) => tokens.add(target.toLowerCase()));
  }

  // Check Bengali & English bilingual dictionary
  for (const [, entry] of Object.entries(BILINGUAL_DICTIONARY)) {
    const matchesBn = entry.bn.some(
      (bnWord) => clean.includes(bnWord.toLowerCase()) || words.includes(bnWord.toLowerCase())
    );
    const matchesEn = entry.en.some(
      (enWord) => clean.includes(enWord.toLowerCase()) || words.includes(enWord.toLowerCase())
    );

    if (matchesBn) {
      entry.en.forEach((enWord) => tokens.add(enWord.toLowerCase()));
    }
    if (matchesEn) {
      entry.bn.forEach((bnWord) => tokens.add(bnWord.toLowerCase()));
    }
  }

  return Array.from(tokens);
}

export function expandCrossLingualTokenGroups(query: string): string[][] {
  const clean = normalizeQuery(query);
  if (!clean) return [];

  const hasPhraseAssociation =
    Object.values(BILINGUAL_DICTIONARY).some((entry) =>
      [...entry.en, ...entry.bn].some((alias) => normalizeQuery(alias) === clean)
    ) || Object.hasOwn(BANGLISH_PHONETIC_MAP, clean);
  const terms = hasPhraseAssociation ? [clean] : clean.split(/\s+/);

  return terms.map((term) => expandCrossLingualTokens(term));
}

/**
 * Calculate multi-signal relevance score for a product given a query and user personalization signals
 */
export function scoreProductRelevance(
  product: {
    name: string;
    description?: string;
    shortDescription?: string;
    category: string;
    subcategory?: string;
    brand: string;
    tags?: string[];
    sku?: string;
    rating?: number;
    reviewCount?: number;
    inventory?: number;
  },
  rawQuery: string,
  userAffinities: { categories?: string[]; tags?: string[] } = {}
): number {
  const cleanQuery = normalizeQuery(rawQuery);
  if (!cleanQuery) {
    // Default baseline score for blank query (popularity + rating)
    return (product.rating || 4.5) * 10 + Math.min(product.reviewCount || 0, 500) * 0.05;
  }

  const expandedTokens = expandCrossLingualTokens(rawQuery);
  const prodName = normalizeQuery(product.name);
  const prodDesc = normalizeQuery((product.description || '') + ' ' + (product.shortDescription || ''));
  const prodCategory = normalizeQuery(product.category + ' ' + (product.subcategory || ''));
  const prodBrand = normalizeQuery(product.brand);
  const prodTags = (product.tags || []).map((t) => normalizeQuery(t));

  let score = 0;

  // 1. Exact query match in title, tags, or category
  if (prodName === cleanQuery) {
    score += 120;
  } else if (prodName.includes(cleanQuery)) {
    score += 85;
  }

  if (prodTags.some((t) => t === cleanQuery)) {
    score += 110;
  } else if (prodTags.some((t) => t.includes(cleanQuery))) {
    score += 60;
  }

  if (prodCategory === cleanQuery || prodCategory.includes(cleanQuery)) {
    score += 75;
  }

  // 2. Token matches across product fields
  for (const token of expandedTokens) {
    if (!token) continue;

    if (prodName.includes(token)) {
      score += 45;
    }
    if (prodBrand.includes(token)) {
      score += 30;
    }
    if (prodTags.some((tag) => tag.includes(token))) {
      score += 35;
    }
    if (prodDesc.includes(token)) {
      score += 15;
    }
  }

  // 3. User personalization affinity boost (controlled weight, never swamps relevance)
  if (userAffinities.categories && userAffinities.categories.some((c) => prodCategory.includes(normalizeQuery(c)))) {
    score += 10;
  }
  if (userAffinities.tags && userAffinities.tags.some((t) => prodTags.some((pt) => pt.includes(normalizeQuery(t))))) {
    score += 8;
  }

  // 4. Inventory factor
  if (typeof product.inventory === 'number' && product.inventory <= 0) {
    score -= 25; // penalize out of stock
  }

  // 5. Popularity tie-breaker
  score += Math.min((product.reviewCount || 0) * 0.01, 5);

  return score;
}

/**
 * Determine if a product matches a cross-lingual search query
 */
export function matchesCrossLingualSearch(
  product: {
    name: string;
    description?: string;
    shortDescription?: string;
    category: string;
    subcategory?: string;
    brand: string;
    tags?: string[];
    sku?: string;
  },
  rawQuery: string
): boolean {
  if (!rawQuery.trim()) return true;

  const cleanQuery = normalizeQuery(rawQuery);
  const searchableFields = [
    product.name,
    product.description || '',
    product.shortDescription || '',
    product.category,
    product.subcategory || '',
    product.brand,
    product.sku || '',
    ...(product.tags || []),
  ]
    .map(normalizeQuery);
  if (searchableFields.some((field) => field.includes(cleanQuery))) return true;

  const translatedSearchFields = [
    product.name,
    product.subcategory || '',
    product.brand,
    product.sku || '',
    ...(product.tags || []),
  ].map(normalizeQuery);
  return expandCrossLingualTokenGroups(rawQuery).every((group) =>
    group.some((token) => translatedSearchFields.some((field) => field.includes(token)))
  );
}

/**
 * Filter and rank products according to cross-lingual query relevance and personalization
 */
export function rankProductsWithCrossLingual<T extends {
  name: string;
  description?: string;
  shortDescription?: string;
  category: string;
  subcategory?: string;
  brand: string;
  tags?: string[];
  sku?: string;
  rating?: number;
  reviewCount?: number;
  inventory?: number;
}>(
  products: T[],
  query: string,
  userAffinities: { categories?: string[]; tags?: string[] } = {}
): T[] {
  if (!query.trim()) {
    return products;
  }

  // Score each product
  const scored = products
    .map((p) => ({
      product: p,
      score: scoreProductRelevance(p, query, userAffinities),
    }))
    .filter((item) => item.score > 0);

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((item) => item.product);
}

/**
 * Generate intelligent autocomplete suggestions for user input
 */
export function getCrossLingualSuggestions(query: string): SearchSuggestion[] {
  const clean = normalizeQuery(query);
  if (!clean) return [];

  const suggestions: SearchSuggestion[] = [];

  // 1. Check for Bengali matches
  for (const [, entry] of Object.entries(BILINGUAL_DICTIONARY)) {
    const matchedBn = entry.bn.find((w) => w.startsWith(clean) || clean.includes(w.toLowerCase()));
    if (matchedBn) {
      suggestions.push({
        text: matchedBn,
        category: entry.category,
        matchedLang: 'bn',
        translation: entry.en[0],
      });
    }

    const matchedEn = entry.en.find((w) => w.toLowerCase().startsWith(clean) || clean.includes(w.toLowerCase()));
    if (matchedEn) {
      suggestions.push({
        text: matchedEn,
        category: entry.category,
        matchedLang: 'en',
        translation: entry.bn[0],
      });
    }
  }

  // 2. Check for Banglish phonetic matches
  for (const [phonetic, targets] of Object.entries(BANGLISH_PHONETIC_MAP)) {
    if (phonetic.startsWith(clean) || clean.startsWith(phonetic)) {
      suggestions.push({
        text: phonetic,
        category: targets[0],
        matchedLang: 'banglish',
        translation: targets.join(', '),
      });
    }
  }

  // Remove duplicates
  const seen = new Set<string>();
  return suggestions
    .filter((s) => {
      const lower = s.text.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    })
    .slice(0, 5);
}
