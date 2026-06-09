/**
 * Product Matching Engine
 * Maps detected defects → exact product recommendations from 1000+ retailers
 *
 * Strategy:
 * 1. Use affiliate networks (CJ, ShareASale) with 1000s of retailers already enrolled
 * 2. Direct APIs for major retailers (Home Depot, Lowe's, Amazon)
 * 3. Smart AI matching to find exact products
 * 4. Price aggregation across all sources
 * 5. Commission tracking per recommendation
 */

import { Timestamp } from 'firebase/firestore';

export type DefectToProductMap = {
  defectType: string; // "water_damage", "corrosion", etc.
  productCategories: string[]; // ["water heaters", "pipe repair kits"]
  fixtures: string[]; // ["sink", "shower", "main line"]
  keywords: string[];
  searchQueries: string[];
};

// Master mapping of defects to products
export const DEFECT_PRODUCT_MAP: Record<string, DefectToProductMap> = {
  water_damage: {
    defectType: 'water_damage',
    productCategories: [
      'Dehumidifiers',
      'Water pumps',
      'Water extractors',
      'Mold removal',
      'Sealants',
    ],
    fixtures: ['Pipes', 'Faucets', 'Connections'],
    keywords: [
      'leak detection',
      'water damage repair',
      'pipe repair',
      'water sealing',
    ],
    searchQueries: [
      'water heater replacement',
      'pipe repair kit',
      'faucet replacement',
      'water pump',
    ],
  },

  corrosion: {
    defectType: 'corrosion',
    productCategories: [
      'Pipes',
      'Pipe replacement kits',
      'Anti-corrosion coatings',
      'Water treatment',
    ],
    fixtures: ['Copper pipes', 'Steel pipes', 'Galvanized pipes'],
    keywords: [
      'corrosion prevention',
      'rust removal',
      'pipe replacement',
      'water filter',
    ],
    searchQueries: [
      'copper pipe replacement',
      'pipe repair coupling',
      'water conditioner',
      'corrosion inhibitor',
    ],
  },

  cracks_or_damage: {
    defectType: 'cracks_or_damage',
    productCategories: [
      'Sealants',
      'Caulk',
      'Repair epoxy',
      'Concrete repair',
      'Wood repair',
    ],
    fixtures: ['Walls', 'Floors', 'Ceilings', 'Foundations'],
    keywords: ['crack repair', 'caulking', 'sealant', 'epoxy'],
    searchQueries: [
      'silicone caulk',
      'epoxy putty',
      'concrete crack filler',
      'wall repair patch',
    ],
  },

  electrical_damage: {
    defectType: 'electrical_damage',
    productCategories: [
      'Circuit breakers',
      'Electrical wire',
      'Outlets',
      'Switches',
      'Panels',
    ],
    fixtures: ['Breaker panel', 'Outlets', 'Switches', 'Wiring'],
    keywords: ['circuit breaker', 'electrical wire', 'outlet', 'switch'],
    searchQueries: [
      '15 amp breaker',
      '20 amp breaker',
      'electrical wire 12/2',
      'GFCI outlet',
      'light switch',
    ],
  },

  roof_damage: {
    defectType: 'roof_damage',
    productCategories: ['Shingles', 'Roofing tar', 'Flashing', 'Gutters'],
    fixtures: ['Roof', 'Gutters', 'Flashing'],
    keywords: ['shingle replacement', 'roofing tar', 'gutter repair'],
    searchQueries: [
      'asphalt shingles',
      'roofing cement',
      'roof flashing',
      'gutter guard',
    ],
  },

  hvac_damage: {
    defectType: 'hvac_damage',
    productCategories: [
      'Air filters',
      'Refrigerant',
      'Thermostats',
      'Ductwork',
      'Capacitors',
    ],
    fixtures: ['Furnace', 'AC unit', 'Ductwork'],
    keywords: ['air filter', 'refrigerant', 'thermostat', 'compressor'],
    searchQueries: [
      '16x25x1 air filter',
      'R410A refrigerant',
      'smart thermostat',
      'HVAC capacitor',
    ],
  },

  appliance_failure: {
    defectType: 'appliance_failure',
    productCategories: [
      'Replacement parts',
      'Compressors',
      'Motors',
      'Heating elements',
      'Pumps',
    ],
    fixtures: ['Refrigerator', 'Washer', 'Dryer', 'Dishwasher'],
    keywords: ['replacement parts', 'compressor', 'motor', 'heating element'],
    searchQueries: [
      'refrigerator compressor',
      'washer motor',
      'dryer heating element',
      'dishwasher pump',
    ],
  },
};

export type ProductSource = {
  name: string; // "Home Depot", "Amazon", "AutoZone"
  type: 'affiliate_network' | 'direct_api' | 'scrape';
  apiEndpoint?: string;
  affiliateNetworkId?: string; // CJ, ShareASale, etc.
  commissionRate: number; // 2-8%
  priority: number; // 1 = highest priority to show
};

// All product sources integrated
export const PRODUCT_SOURCES: ProductSource[] = [
  // Direct APIs (best commission + data)
  {
    name: 'Home Depot',
    type: 'direct_api',
    apiEndpoint: 'https://api.homedepot.com/v1',
    commissionRate: 4,
    priority: 1,
  },
  {
    name: 'Lowes',
    type: 'direct_api',
    apiEndpoint: 'https://api.lowes.com/v1',
    commissionRate: 3.5,
    priority: 1,
  },
  {
    name: 'Amazon',
    type: 'direct_api',
    apiEndpoint: 'https://api.amazon.com/onca',
    commissionRate: 5,
    priority: 2,
  },

  // Affiliate Networks (1000s of retailers)
  {
    name: 'CJ Affiliate Network',
    type: 'affiliate_network',
    affiliateNetworkId: 'cj',
    commissionRate: 3.5,
    priority: 2,
  },
  {
    name: 'ShareASale',
    type: 'affiliate_network',
    affiliateNetworkId: 'shareasale',
    commissionRate: 3.5,
    priority: 2,
  },
  {
    name: 'Impact Affiliate Network',
    type: 'affiliate_network',
    affiliateNetworkId: 'impact',
    commissionRate: 4,
    priority: 2,
  },

  // Specialty Retailers
  {
    name: 'AutoZone',
    type: 'direct_api',
    apiEndpoint: 'https://api.autozone.com/v1',
    commissionRate: 2,
    priority: 1,
  },
  {
    name: 'Ace Hardware',
    type: 'affiliate_network',
    affiliateNetworkId: 'cj',
    commissionRate: 3,
    priority: 2,
  },
  {
    name: 'Menards',
    type: 'direct_api',
    apiEndpoint: 'https://api.menards.com/v1',
    commissionRate: 3.5,
    priority: 1,
  },
  {
    name: 'Walmart',
    type: 'affiliate_network',
    affiliateNetworkId: 'shareasale',
    commissionRate: 2.5,
    priority: 3,
  },

  // Specialty Plumbing/HVAC
  {
    name: 'Ferguson',
    type: 'direct_api',
    apiEndpoint: 'https://api.ferguson.com/v1',
    commissionRate: 2,
    priority: 1,
  },
  {
    name: 'Supply House',
    type: 'direct_api',
    apiEndpoint: 'https://api.supplyhouse.com/v1',
    commissionRate: 3,
    priority: 2,
  },
  {
    name: 'Air Conditioning Supply',
    type: 'affiliate_network',
    affiliateNetworkId: 'cj',
    commissionRate: 5,
    priority: 2,
  },
];

export type RecommendedProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  source: string; // retailer name
  sourceUrl: string;
  affiliateUrl: string;
  affiliateNetwork?: string;
  commission: number; // dollar amount you earn
  commissionRate: number;
  inStock: boolean;
  rating: number;
  reviews: number;
  compatibility: {
    confidence: number; // 0-100
    reasons: string[];
  };
  alternativeProducts: RecommendedProduct[]; // low/mid/high price options
};

export type ProductRecommendation = {
  defectType: string;
  products: RecommendedProduct[];
  recommendationId: string;
  generatedAt: Timestamp;
  disclaimer: string;
  estimatedTotalCost: {
    low: number;
    mid: number;
    high: number;
  };
};

/**
 * Get product categories that match a defect
 */
export function getProductCategoriesForDefect(defectType: string): string[] {
  const mapping = DEFECT_PRODUCT_MAP[defectType];
  if (!mapping) return [];
  return mapping.productCategories;
}

/**
 * Get search queries to find products for a defect
 */
export function getSearchQueriesForDefect(defectType: string): string[] {
  const mapping = DEFECT_PRODUCT_MAP[defectType];
  if (!mapping) return [];
  return mapping.searchQueries;
}

/**
 * Get all affiliate networks
 */
export function getAffiliateNetworks() {
  return PRODUCT_SOURCES.filter(s => s.type === 'affiliate_network')
    .map(s => s.affiliateNetworkId)
    .filter(Boolean);
}

/**
 * Calculate estimated commission for a product recommendation
 */
export function calculateCommission(price: number, commissionRate: number): number {
  return Math.round((price * commissionRate) / 100 * 100) / 100;
}

/**
 * Get highest-commission sources for a defect
 */
export function getTopSourcesForDefect(defectType: string, limit: number = 5) {
  return PRODUCT_SOURCES
    .filter(s => {
      // Filter by whether source carries products for this defect
      const categories = getProductCategoriesForDefect(defectType);
      return categories.length > 0;
    })
    .sort((a, b) => {
      // Sort by commission rate, then priority
      if (b.commissionRate !== a.commissionRate) {
        return b.commissionRate - a.commissionRate;
      }
      return a.priority - b.priority;
    })
    .slice(0, limit);
}

/**
 * Build affiliate URL for a product
 * Encodes tracking for commission attribution
 */
export function buildAffiliateUrl(
  sourceId: string,
  productId: string,
  productName: string,
  originalUrl: string,
  jobId: string,
  recommendationId: string
): string {
  const params = new URLSearchParams({
    ref: 'repairai',
    job: jobId,
    rec: recommendationId,
    product: productId,
  });

  // For CJ Affiliate
  if (sourceId === 'cj') {
    return `https://www.cj.com/click?sid=repairai&aid=${productId}&url=${encodeURIComponent(originalUrl)}&${params.toString()}`;
  }

  // For ShareASale
  if (sourceId === 'shareasale') {
    return `https://shareasale.com/r.cfm?b=1234567&u=repairai&m=12345&urllink=${encodeURIComponent(originalUrl)}&${params.toString()}`;
  }

  // Default: add params to original URL
  const url = new URL(originalUrl);
  params.forEach((value, key) => {
    url.searchParams.append(key, value);
  });
  return url.toString();
}
