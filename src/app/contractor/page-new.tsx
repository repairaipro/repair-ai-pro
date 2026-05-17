'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { collection, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { TRADES } from '@/lib/constants';
import {
  Search,
  MapPin,
  Star,
  Briefcase,
  Trophy,
  DollarSign,
  MessageSquare,
  X,
  ChevronRight,
  Zap,
  Award,
  MapPinIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AnimatedFormInput,
  AnimatedFormSelect,
  PageLayout,
  PageHeader,
  GridSkeletonLoader,
  ContractorCardAnimated,
} from '@/components';

type Contractor = {
  id: string;
  name?: string;
  trade?: string;
  city?: string;
  bio?: string;
  experience?: number;
  hourly?: number;
  photoUrl?: string;
  portfolio?: string[];
  rating?: number;
  reviewCount?: number;
  jobsCompleted?: number;
  responseTimeMinutes?: number;
  subscriptionPlan?: string;
};

export default function ContractorDirectory() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [trade, setTrade] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'contractors'));
        setContractors(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((c: any) => !c.claimedByUid)
        );
      } catch (err) {
        console.error('Contractor load error:', err);
        setError('Could not load contractors. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Sort and filter
  const filtered = contractors
    .filter((c) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.trade ?? '').toLowerCase().includes(q) ||
        (c.city ?? '').toLowerCase().includes(q);
      const matchTrade = !trade || c.trade === trade;
      const matchCity = !city.trim() || (c.city ?? '').toLowerCase().includes(city.toLowerCase());
      return matchSearch && matchTrade && matchCity;
    })
    .sort((a, b) => {
      if (sort === 'experience') return (b.experience ?? 0) - (a.experience ?? 0);
      if (sort === 'price') return (a.hourly ?? 999) - (b.hourly ?? 999);
      if (sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sort === 'response') return (a.responseTimeMinutes ?? 999) - (b.responseTimeMinutes ?? 999);
      return 0;
    });

  const hasActiveFilters = search.trim() || trade || city.trim();

  return (
    <PageLayout maxWidth="6xl">
      {/* Header with hero feel */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-2 mb-6">
          <h1 className="text-4xl md:text-5xl font-bold" style={{ color: 'var(--color-text)' }}>
            Find Your Perfect Contractor
          </h1>
          <p className="text-lg" style={{ color: 'var(--color-text-3)' }}>
            {loading ? 'Loading professionals...' : `${filtered.length} of ${contractors.length} contractors available`}
          </p>
        </div>

        {/* Error state */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="rounded-xl px-4 py-3 text-sm flex justify-between items-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171',
              }}
            >
              <span>{error}</span>
              <button onClick={() => setError(null)}>
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Search bar - sticky style (Uber/Airbnb pattern) */}
      <motion.div
        className="mb-8 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Main search */}
        <div className="card p-4 md:p-6 space-y-4">
          <AnimatedFormInput
            placeholder="Search by contractor name, trade, or city..."
            value={search}
            onChange={setSearch}
            icon={<Search className="w-4 h-4" />}
          />

          {/* Mobile toggle for filters */}
          <button
            className="md:hidden w-full btn btn-ghost"
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters {(search || trade || city) && <span className="ml-auto">●</span>}
          </button>

          {/* Filters - shown always on desktop, toggle on mobile */}
          <AnimatePresence>
            {(showFilters || window.innerWidth >= 768) && (
              <motion.div
                className="grid md:grid-cols-4 gap-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AnimatedFormSelect
                  label="Trade"
                  options={[
                    { value: '', label: 'All Trades' },
                    ...TRADES.map((t) => ({ value: t, label: t })),
                  ]}
                  value={trade}
                  onChange={setTrade}
                  icon={<Briefcase className="w-4 h-4" />}
                />

                <AnimatedFormInput
                  label="City"
                  placeholder="Houston, TX"
                  value={city}
                  onChange={setCity}
                  icon={<MapPin className="w-4 h-4" />}
                />

                <AnimatedFormSelect
                  label="Sort By"
                  options={[
                    { value: 'relevance', label: 'Relevance' },
                    { value: 'rating', label: 'Highest Rated' },
                    { value: 'response', label: 'Fastest Response' },
                    { value: 'experience', label: 'Most Experienced' },
                    { value: 'price', label: 'Lowest Price' },
                  ]}
                  value={sort}
                  onChange={setSort}
                  icon={<Zap className="w-4 h-4" />}
                />

                {hasActiveFilters && (
                  <motion.button
                    className="btn btn-secondary self-end"
                    onClick={() => {
                      setSearch('');
                      setTrade('');
                      setCity('');
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-4 h-4" /> Clear
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Results grid */}
      {loading ? (
        <GridSkeletonLoader count={6} />
      ) : filtered.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-24 gap-4 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <Briefcase className="w-8 h-8" style={{ color: 'var(--color-text-4)' }} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            No contractors found
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
            Try adjusting your filters or search terms
          </p>
          {hasActiveFilters && (
            <motion.button
              className="btn btn-primary mt-4"
              onClick={() => {
                setSearch('');
                setTrade('');
                setCity('');
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Clear All Filters
            </motion.button>
          )}
        </motion.div>
      ) : (
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
        >
          {filtered.map((contractor, idx) => (
            <motion.div
              key={contractor.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { type: 'spring', stiffness: 100, damping: 20 },
                },
              }}
            >
              <ContractorCardAnimated
                id={contractor.id}
                name={contractor.name || 'Contractor'}
                trade={contractor.trade || 'General'}
                rating={contractor.rating || 4.5}
                reviewCount={contractor.reviewCount || 0}
                location={contractor.city || 'Houston, TX'}
                responseTime={
                  contractor.responseTimeMinutes
                    ? `< ${contractor.responseTimeMinutes} min`
                    : '< 2 hours'
                }
                verified={contractor.subscriptionPlan === 'pro' || contractor.subscriptionPlan === 'elite'}
                featured={contractor.subscriptionPlan === 'elite'}
                index={idx}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Footer CTA */}
      {!loading && filtered.length > 0 && (
        <motion.div
          className="mt-16 text-center py-12 rounded-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Need help finding the right contractor?
          </h3>
          <p className="mb-6" style={{ color: 'var(--color-text-3)' }}>
            Post a job and let contractors come to you
          </p>
          <Link href="/jobs/new" className="btn btn-primary">
            Post a Job <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}
    </PageLayout>
  );
}
