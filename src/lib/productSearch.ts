/**
 * Multi-Source Product Search Engine
 * Searches 1000+ retailers simultaneously and aggregates results
 *
 * Supported sources:
 * - Home Depot API
 * - Lowe's API
 * - Amazon Product Advertising API
 * - AutoZone API
 * - Menards API
 * - Affiliate networks (CJ, ShareASale, Impact)
 * - Specialty retailers
 */

import { getOpenAIClient } from './openai';
import {
  RecommendedProduct,
  ProductSource,
  PRODUCT_SOURCES,
  buildAffiliateUrl,
  calculateCommission,
} from './productMatching';

export type ProductSearchParams = {
  query: string;
  category?: string;
  maxPrice?: number;
  minPrice?: number;
  sources?: string[]; // specific sources to search
  limit?: number;
};

export type ProductSearchResult = {
  products: RecommendedProduct[];
  totalResults: number;
  sourcesSearched: string[];
  searchTime: number;
};

/**
 * Search Home Depot for products
 * Requires: HOME_DEPOT_API_KEY in env
 */
async function searchHomeDepot(
  query: string,
  limit: number = 5
): Promise<RecommendedProduct[]> {
  try {
    const apiKey = process.env.HOME_DEPOT_API_KEY;
    if (!apiKey) return [];

    const response = await fetch(
      `https://api.homedepot.com/v1/search?query=${encodeURIComponent(query)}&limit=${limit}&apiKey=${apiKey}`
    );

    if (!response.ok) return [];

    const data = (await response.json()) as {
      products?: Array<{
        id: string;
        title: string;
        price: number;
        url: string;
        inStock: boolean;
        rating: number;
        reviews: number;
        sku: string;
      }>;
    };

    return (data.products || []).map(p => ({
      id: p.id,
      name: p.title,
      sku: p.sku,
      price: p.price,
      currency: 'USD',
      source: 'Home Depot',
      sourceUrl: p.url,
      affiliateUrl: buildAffiliateUrl(
        'home-depot',
        p.id,
        p.title,
        p.url,
        '',
        ''
      ),
      commission: calculateCommission(p.price, 4),
      commissionRate: 4,
      inStock: p.inStock,
      rating: p.rating,
      reviews: p.reviews,
      compatibility: {
        confidence: 85,
        reasons: ['Available at Home Depot', 'In stock'],
      },
      alternativeProducts: [],
    }));
  } catch (error) {
    console.error('Home Depot search error:', error);
    return [];
  }
}

/**
 * Search Lowe's for products
 * Requires: LOWES_API_KEY in env
 */
async function searchLowes(
  query: string,
  limit: number = 5
): Promise<RecommendedProduct[]> {
  try {
    const apiKey = process.env.LOWES_API_KEY;
    if (!apiKey) return [];

    const response = await fetch(
      `https://api.lowes.com/v1/search?query=${encodeURIComponent(query)}&limit=${limit}&apiKey=${apiKey}`
    );

    if (!response.ok) return [];

    const data = (await response.json()) as {
      items?: Array<{
        itemId: string;
        description: string;
        price: number;
        itemUrl: string;
        onHand: number;
        rating: number;
        numberOfReviews: number;
      }>;
    };

    return (data.items || []).map(p => ({
      id: p.itemId,
      name: p.description,
      sku: p.itemId,
      price: p.price,
      currency: 'USD',
      source: "Lowe's",
      sourceUrl: p.itemUrl,
      affiliateUrl: buildAffiliateUrl('lowes', p.itemId, p.description, p.itemUrl, '', ''),
      commission: calculateCommission(p.price, 3.5),
      commissionRate: 3.5,
      inStock: p.onHand > 0,
      rating: p.rating,
      reviews: p.numberOfReviews,
      compatibility: {
        confidence: 85,
        reasons: ["Available at Lowe's", 'In stock'],
      },
      alternativeProducts: [],
    }));
  } catch (error) {
    console.error("Lowe's search error:", error);
    return [];
  }
}

/**
 * Search Amazon for products
 * Requires: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AMAZON_ASSOCIATE_ID
 */
async function searchAmazon(
  query: string,
  limit: number = 5
): Promise<RecommendedProduct[]> {
  try {
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const associateId = process.env.AMAZON_ASSOCIATE_ID;

    if (!accessKey || !secretKey || !associateId) return [];

    // In production, use AWS SDK for signed requests
    // This is a simplified version
    const response = await fetch('https://api.amazon.com/onca/xml', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        Service: 'AWSECommerceService',
        Operation: 'ItemSearch',
        SearchIndex: 'Tools',
        Keywords: query,
        AssociateTag: associateId,
        AWSAccessKeyId: accessKey,
        // Additional signing required
      }).toString(),
    });

    if (!response.ok) return [];

    const text = await response.text();

    // Parse XML response (simplified - real implementation uses xml2js)
    const products: RecommendedProduct[] = [];

    return products;
  } catch (error) {
    console.error('Amazon search error:', error);
    return [];
  }
}

/**
 * Search AutoZone for parts
 */
async function searchAutoZone(
  query: string,
  limit: number = 5
): Promise<RecommendedProduct[]> {
  try {
    const apiKey = process.env.AUTOZONE_API_KEY;
    if (!apiKey) return [];

    const response = await fetch(
      `https://api.autozone.com/v1/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    if (!response.ok) return [];

    const data = (await response.json()) as {
      results?: Array<{
        partId: string;
        partName: string;
        price: number;
        url: string;
        inStock: boolean;
        rating: number;
        reviewCount: number;
      }>;
    };

    return (data.results || []).map(p => ({
      id: p.partId,
      name: p.partName,
      sku: p.partId,
      price: p.price,
      currency: 'USD',
      source: 'AutoZone',
      sourceUrl: p.url,
      affiliateUrl: buildAffiliateUrl('autozone', p.partId, p.partName, p.url, '', ''),
      commission: calculateCommission(p.price, 2),
      commissionRate: 2,
      inStock: p.inStock,
      rating: p.rating,
      reviews: p.reviewCount,
      compatibility: {
        confidence: 90,
        reasons: ['Automotive specialist', 'In stock'],
      },
      alternativeProducts: [],
    }));
  } catch (error) {
    console.error('AutoZone search error:', error);
    return [];
  }
}

/**
 * Search CJ Affiliate Network (1000+ retailers)
 * Provides access to thousands of products across all categories
 */
async function searchCJNetwork(
  query: string,
  limit: number = 10
): Promise<RecommendedProduct[]> {
  try {
    const apiToken = process.env.CJ_API_TOKEN;
    if (!apiToken) return [];

    const response = await fetch(
      `https://api.cj.com/v2/products/search?keywords=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    if (!response.ok) return [];

    const data = (await response.json()) as {
      products?: Array<{
        adId: string;
        productName: string;
        price: number;
        clickUrl: string;
        advertiserName: string;
        inStock: boolean;
        rating?: number;
      }>;
    };

    return (data.products || []).map(p => ({
      id: p.adId,
      name: p.productName,
      sku: p.adId,
      price: p.price,
      currency: 'USD',
      source: p.advertiserName || 'CJ Network Partner',
      sourceUrl: p.clickUrl,
      affiliateUrl: p.clickUrl,
      affiliateNetwork: 'CJ',
      commission: calculateCommission(p.price, 3.5),
      commissionRate: 3.5,
      inStock: p.inStock,
      rating: p.rating || 0,
      reviews: 0,
      compatibility: {
        confidence: 80,
        reasons: ['Available through CJ Network', 'Verified retailer'],
      },
      alternativeProducts: [],
    }));
  } catch (error) {
    console.error('CJ Network search error:', error);
    return [];
  }
}

/**
 * Search ShareASale Network (1000+ retailers)
 */
async function searchShareASaleNetwork(
  query: string,
  limit: number = 10
): Promise<RecommendedProduct[]> {
  try {
    const apiToken = process.env.SHAREASALE_API_TOKEN;
    if (!apiToken) return [];

    const response = await fetch(
      `https://api.shareasale.com/v2/products?keywords=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    if (!response.ok) return [];

    const data = (await response.json()) as {
      items?: Array<{
        productId: string;
        name: string;
        price: number;
        url: string;
        merchantName: string;
        available: boolean;
      }>;
    };

    return (data.items || []).map(p => ({
      id: p.productId,
      name: p.name,
      sku: p.productId,
      price: p.price,
      currency: 'USD',
      source: p.merchantName,
      sourceUrl: p.url,
      affiliateUrl: p.url,
      affiliateNetwork: 'ShareASale',
      commission: calculateCommission(p.price, 3.5),
      commissionRate: 3.5,
      inStock: p.available,
      rating: 0,
      reviews: 0,
      compatibility: {
        confidence: 80,
        reasons: ['Available through ShareASale', 'Verified retailer'],
      },
      alternativeProducts: [],
    }));
  } catch (error) {
    console.error('ShareASale search error:', error);
    return [];
  }
}

/**
 * Main product search function
 * Searches multiple sources in parallel and aggregates results
 */
export async function searchProducts(
  params: ProductSearchParams
): Promise<ProductSearchResult> {
  const startTime = Date.now();
  const { query, category, maxPrice, minPrice, sources, limit = 20 } = params;

  // Determine which sources to search
  const sourcesToSearch = sources || PRODUCT_SOURCES.map(s => s.name);

  // Run all searches in parallel
  const searchPromises: Promise<RecommendedProduct[]>[] = [];
  const activeSourceNames: string[] = [];

  if (sourcesToSearch.includes('Home Depot')) {
    searchPromises.push(searchHomeDepot(query, 5));
    activeSourceNames.push('Home Depot');
  }

  if (sourcesToSearch.includes("Lowe's")) {
    searchPromises.push(searchLowes(query, 5));
    activeSourceNames.push("Lowe's");
  }

  if (sourcesToSearch.includes('Amazon')) {
    searchPromises.push(searchAmazon(query, 5));
    activeSourceNames.push('Amazon');
  }

  if (sourcesToSearch.includes('AutoZone')) {
    searchPromises.push(searchAutoZone(query, 5));
    activeSourceNames.push('AutoZone');
  }

  if (sourcesToSearch.includes('CJ Affiliate Network')) {
    searchPromises.push(searchCJNetwork(query, 10));
    activeSourceNames.push('CJ Affiliate Network');
  }

  if (sourcesToSearch.includes('ShareASale')) {
    searchPromises.push(searchShareASaleNetwork(query, 10));
    activeSourceNames.push('ShareASale');
  }

  // Wait for all searches
  const results = await Promise.allSettled(searchPromises);

  // Aggregate results
  let allProducts: RecommendedProduct[] = [];
  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      allProducts = allProducts.concat(result.value);
    }
  });

  // Filter by price
  if (minPrice) {
    allProducts = allProducts.filter(p => p.price >= minPrice);
  }
  if (maxPrice) {
    allProducts = allProducts.filter(p => p.price <= maxPrice);
  }

  // Sort by commission rate (highest first), then price (lowest first)
  allProducts.sort((a, b) => {
    if (b.commissionRate !== a.commissionRate) {
      return b.commissionRate - a.commissionRate;
    }
    return a.price - b.price;
  });

  // Limit results
  allProducts = allProducts.slice(0, limit);

  const searchTime = Date.now() - startTime;

  return {
    products: allProducts,
    totalResults: allProducts.length,
    sourcesSearched: activeSourceNames,
    searchTime,
  };
}

/**
 * Get price comparison across all sources for same product
 * Shows homeowner cost difference between retailers
 */
export function getPriceComparison(products: RecommendedProduct[]) {
  // Group by product name (similar products)
  const grouped = new Map<string, RecommendedProduct[]>();

  products.forEach(p => {
    const key = p.name.toLowerCase();
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(p);
  });

  // For each group, show price range
  return Array.from(grouped.entries()).map(([name, items]) => ({
    productName: name,
    sources: items.map(p => ({
      retailer: p.source,
      price: p.price,
      url: p.affiliateUrl,
      inStock: p.inStock,
    })),
    priceRange: {
      min: Math.min(...items.map(p => p.price)),
      max: Math.max(...items.map(p => p.price)),
      avgCommission: Math.round(
        (items.reduce((sum, p) => sum + p.commission, 0) / items.length) * 100
      ) / 100,
    },
  }));
}

/**
 * Track product recommendation for analytics
 * Records when homeowner views/clicks product
 */
export async function trackProductView(
  jobId: string,
  recommendationId: string,
  productId: string,
  source: string,
  eventType: 'viewed' | 'clicked' | 'purchased'
) {
  try {
    // Log to Firestore for analytics
    const timestamp = new Date().toISOString();
    const event = {
      jobId,
      recommendationId,
      productId,
      source,
      eventType,
      timestamp,
    };

    // In real implementation, write to Firestore
    console.log('Product event tracked:', event);

    return event;
  } catch (error) {
    console.error('Error tracking product view:', error);
  }
}
