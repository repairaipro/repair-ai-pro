'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Link as LinkIcon,
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
      <div className="p-6 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: '#818cf8', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>Finding best products...</p>
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-6 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>
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
      <div
        className="p-4 rounded-lg"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))', border: '1px solid rgba(99,102,241,0.2)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Recommended Products</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>
              From {new Set(recommendations.flatMap(r => r.sourcesFound)).size} retailers with
              real pricing & availability
            </p>
          </div>
          {isContractor && totalPotentialCommission ? (
            <div className="text-right">
              <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Potential Commission</p>
              <p className="font-bold text-lg" style={{ color: '#34d399' }}>
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
              className="rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
            >
              {/* Defect Header */}
              <button
                onClick={() => toggleDefect(rec.defectType)}
                className="w-full p-4 transition text-left flex items-center justify-between gap-3 hover:opacity-90"
                style={{ background: 'var(--color-surface-2)' }}
              >
                <div className="flex-1">
                  <p className="font-semibold capitalize" style={{ color: 'var(--color-text)' }}>{rec.defectType.replace(/_/g, ' ')}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>{rec.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
                      {rec.products.length} products found
                    </div>
                    <div className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }}>
                      ${rec.estimatedCost.low} - ${rec.estimatedCost.high}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Confidence</p>
                  <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{rec.confidence}%</p>
                  <span className="mt-2 block" style={{ color: 'var(--color-text-4)' }}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
              </button>

              {/* Products List */}
              {isExpanded && (
                <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                  {rec.products.map((product, pidx) => (
                    <div key={pidx} className="p-3 rounded-lg transition hover:opacity-90" style={{ background: 'var(--color-surface-2)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Product name and rating */}
                          <p className="font-medium text-sm line-clamp-2" style={{ color: 'var(--color-text)' }}>
                            {product.name}
                          </p>

                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className="text-xs px-2 py-1 rounded"
                              style={{
                                background: product.inStock ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                color: product.inStock ? '#6ee7b7' : '#fca5a5',
                              }}
                            >
                              {product.inStock ? '✓ In stock' : '✗ Out of stock'}
                            </span>

                            {product.rating > 0 && (
                              <span className="text-xs" style={{ color: '#fbbf24' }}>
                                ★ {product.rating.toFixed(1)} ({product.reviews} reviews)
                              </span>
                            )}
                          </div>

                          {/* Retailer & compatibility */}
                          <div className="mt-2 text-xs space-y-1">
                            <p style={{ color: 'var(--color-text-4)' }}>
                              📍 {product.source}
                            </p>
                            {product.compatibility.reasons.length > 0 && (
                              <p style={{ color: '#6ee7b7' }}>
                                ✓ {product.compatibility.reasons[0]}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Price and action */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold" style={{ color: '#818cf8' }}>
                            ${product.price.toFixed(2)}
                          </p>

                          {isContractor && (
                            <p className="text-xs font-medium mt-1" style={{ color: '#34d399' }}>
                              +${product.commission.toFixed(2)} commission
                            </p>
                          )}

                          <button
                            onClick={() => handleProductClick(product)}
                            className="btn btn-primary btn-sm mt-3 w-full"
                          >
                            <LinkIcon size={14} />
                            View & Buy
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Price summary for this defect */}
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-2)' }}>
                      💰 Cost estimate for {rec.defectType.replace(/_/g, ' ')}:
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p style={{ color: 'var(--color-text-4)' }}>Budget</p>
                        <p className="font-bold" style={{ color: 'var(--color-text)' }}>${rec.estimatedCost.low}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-text-4)' }}>Mid-range</p>
                        <p className="font-bold" style={{ color: 'var(--color-text)' }}>${rec.estimatedCost.mid}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-text-4)' }}>Premium</p>
                        <p className="font-bold" style={{ color: 'var(--color-text)' }}>${rec.estimatedCost.high}</p>
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
        <div className="p-4 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <div className="flex gap-3">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
            <div className="text-xs" style={{ color: '#fde68a' }}>{disclaimer}</div>
          </div>
        </div>
      )}

      {/* CTA for next steps */}
      <div className="p-4 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
        <h4 className="font-medium text-sm mb-2" style={{ color: '#6ee7b7' }}>Next Steps:</h4>
        <ul className="text-xs space-y-1" style={{ color: '#a7f3d0' }}>
          <li>✓ Review product options and prices</li>
          <li>✓ Click &quot;View &amp; Buy&quot; to purchase from preferred retailer</li>
          <li>✓ Share product links with contractor for approval</li>
          <li>✓ Contractors can order with professional discounts</li>
        </ul>
      </div>
    </div>
  );
}
