'use client';

import { useEffect, useState } from 'react';
import {
  ShoppingCart,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Link as LinkIcon,
  DollarSign,
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  price: number;
  source: string;
  affiliateUrl: string;
  inStock: boolean;
  rating: number;
  reviews: number;
  commission: number;
  commissionRate: number;
  compatibility: {
    confidence: number;
    reasons: string[];
  };
};

type Recommendation = {
  defectType: string;
  description: string;
  confidence: number;
  products: Product[];
  estimatedCost: {
    low: number;
    mid: number;
    high: number;
  };
  potentialCommission: number;
  sourcesFound: string[];
};

type Props = {
  jobId: string;
  recommendations?: Recommendation[];
  isLoading?: boolean;
  isContractor?: boolean;
  disclaimer?: string;
  totalPotentialCommission?: number;
};

export default function ProductRecommendations({
  jobId,
  recommendations,
  isLoading,
  isContractor,
  disclaimer,
  totalPotentialCommission,
}: Props) {
  const [expandedDefects, setExpandedDefects] = useState<Set<string>>(
    new Set(recommendations?.[0]?.defectType ? [recommendations[0].defectType] : [])
  );

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Finding best products...</p>
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-sm text-blue-900">
          No product recommendations generated yet. Complete photo analysis to see product options.
        </p>
      </div>
    );
  }

  const toggleDefect = (defectType: string) => {
    const newSet = new Set(expandedDefects);
    if (newSet.has(defectType)) {
      newSet.delete(defectType);
    } else {
      newSet.add(defectType);
    }
    setExpandedDefects(newSet);
  };

  const handleProductClick = (product: Product) => {
    // Track click for analytics
    fetch(`/api/jobs/${jobId}/track-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        source: product.source,
        eventType: 'clicked',
      }),
    }).catch(console.error);

    // Open affiliate link
    window.open(product.affiliateUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg">Recommended Products</h3>
            <p className="text-xs text-gray-600 mt-1">
              From {new Set(recommendations.flatMap(r => r.sourcesFound)).size} retailers with
              real pricing & availability
            </p>
          </div>
          {isContractor && totalPotentialCommission ? (
            <div className="text-right">
              <p className="text-xs text-gray-600">Potential Commission</p>
              <p className="font-bold text-lg text-green-600">
                ${totalPotentialCommission.toFixed(2)}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Recommendations by defect */}
      <div className="space-y-3">
        {recommendations.map((rec, idx) => {
          const isExpanded = expandedDefects.has(rec.defectType);

          return (
            <div
              key={idx}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Defect Header */}
              <button
                onClick={() => toggleDefect(rec.defectType)}
                className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition text-left flex items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <p className="font-semibold capitalize">{rec.defectType.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {rec.products.length} products found
                    </div>
                    <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      ${rec.estimatedCost.low} - ${rec.estimatedCost.high}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Confidence</p>
                  <p className="font-bold text-sm">{rec.confidence}%</p>
                  <span className="text-gray-400 mt-2 block">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
              </button>

              {/* Products List */}
              {isExpanded && (
                <div className="p-4 space-y-3 border-t border-gray-200 bg-white">
                  {rec.products.map((product, pidx) => (
                    <div key={pidx} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Product name and rating */}
                          <p className="font-medium text-sm line-clamp-2">
                            {product.name}
                          </p>

                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className="text-xs px-2 py-1 rounded"
                              style={{
                                background: product.inStock
                                  ? '#dcfce7'
                                  : '#fee2e2',
                                color: product.inStock ? '#166534' : '#991b1b',
                              }}
                            >
                              {product.inStock ? '✓ In stock' : '✗ Out of stock'}
                            </span>

                            {product.rating > 0 && (
                              <span className="text-xs text-amber-600">
                                ★ {product.rating.toFixed(1)} ({product.reviews} reviews)
                              </span>
                            )}
                          </div>

                          {/* Retailer & compatibility */}
                          <div className="mt-2 text-xs space-y-1">
                            <p className="text-gray-600">
                              📍 {product.source}
                            </p>
                            {product.compatibility.reasons.length > 0 && (
                              <p className="text-green-700">
                                ✓ {product.compatibility.reasons[0]}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Price and action */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-blue-600">
                            ${product.price.toFixed(2)}
                          </p>

                          {isContractor && (
                            <p className="text-xs text-green-600 font-medium mt-1">
                              +${product.commission.toFixed(2)} commission
                            </p>
                          )}

                          <button
                            onClick={() => handleProductClick(product)}
                            className="mt-3 w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition flex items-center justify-center gap-2"
                          >
                            <LinkIcon size={14} />
                            View & Buy
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Price summary for this defect */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs font-medium text-blue-900 mb-2">
                      💰 Cost estimate for {rec.defectType.replace(/_/g, ' ')}:
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-600">Budget</p>
                        <p className="font-bold">${rec.estimatedCost.low}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Mid-range</p>
                        <p className="font-bold">${rec.estimatedCost.mid}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Premium</p>
                        <p className="font-bold">${rec.estimatedCost.high}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      {disclaimer && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">{disclaimer}</div>
          </div>
        </div>
      )}

      {/* CTA for next steps */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-medium text-sm text-green-900 mb-2">Next Steps:</h4>
        <ul className="text-xs text-green-800 space-y-1">
          <li>✓ Review product options and prices</li>
          <li>✓ Click "View & Buy" to purchase from preferred retailer</li>
          <li>✓ Share product links with contractor for approval</li>
          <li>✓ Contractors can order with professional discounts</li>
        </ul>
      </div>
    </div>
  );
}
