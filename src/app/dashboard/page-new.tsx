'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  MessageSquare,
  Star,
  MapPin,
  Calendar,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PageLayout, PageHeader, ScrollReveal, StaggerContainer, StaggerItem, AnimatedButton } from '@/components';

type Job = {
  id: string;
  description: string;
  trade?: string;
  status: string;
  location?: any;
  paymentAmountUsd?: number;
  createdAt?: any;
  claimedBy?: string;
  contractorName?: string;
  rating?: number;
  avgRating?: number;
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    const q = query(collection(db, 'jobs'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    });

    return () => unsub();
  }, [user, authLoading, router]);

  const stats = {
    total: jobs.length,
    active: jobs.filter((j) => ['pending', 'accepted', 'in_progress'].includes(j.status)).length,
    completed: jobs.filter((j) => ['confirmed', 'completed'].includes(j.status)).length,
    spent: jobs
      .filter((j) => ['confirmed', 'completed'].includes(j.status))
      .reduce((sum, j) => sum + (j.paymentAmountUsd || 0), 0),
  };

  const recentJobs = jobs
    .sort((a, b) => (b.createdAt?.toDate?.() || new Date()).getTime() - (a.createdAt?.toDate?.() || new Date()).getTime())
    .slice(0, 5);

  const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
    pending: { color: '#818cf8', label: 'Looking for pros', icon: <Clock className="w-4 h-4" /> },
    accepted: { color: '#818cf8', label: 'Pro accepted', icon: <CheckCircle2 className="w-4 h-4" /> },
    in_progress: { color: '#34d399', label: 'In progress', icon: <TrendingUp className="w-4 h-4" /> },
    completed: { color: '#fb923c', label: 'Complete & pay', icon: <AlertCircle className="w-4 h-4" /> },
    confirmed: { color: '#22c55e', label: 'Paid ✓', icon: <CheckCircle2 className="w-4 h-4" /> },
    cancelled: { color: '#f87171', label: 'Cancelled', icon: <AlertCircle className="w-4 h-4" /> },
  };

  return (
    <PageLayout maxWidth="6xl">
      {/* Hero header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <PageHeader
          title="Your Jobs"
          description="Manage your home repair projects and track contractors"
          action={{
            label: 'Post New Job',
            onClick: () => router.push('/jobs/new'),
            icon: <Plus className="w-4 h-4" />,
          }}
        />
      </motion.div>

      {/* Stats grid */}
      <motion.div
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {[
          { label: 'Total Jobs', value: stats.total, color: '#818cf8' },
          { label: 'Active', value: stats.active, color: '#34d399' },
          { label: 'Completed', value: stats.completed, color: '#22c55e' },
          { label: 'Total Spent', value: `$${stats.spent}`, color: '#fbbf24' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            className="card p-6"
            whileHover={{ y: -4, borderColor: 'rgba(99,102,241,0.3)' }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-4)' }}>
              {stat.label}
            </p>
            <p className="text-3xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent jobs */}
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Recent Activity
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6 h-24 animate-pulse" style={{ background: 'var(--color-surface)' }} />
            ))}
          </div>
        ) : recentJobs.length === 0 ? (
          <motion.div
            className="card p-12 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--color-surface-2)' }}
            >
              <Briefcase className="w-8 h-8" style={{ color: 'var(--color-text-4)' }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              No jobs yet
            </h3>
            <p className="mb-6" style={{ color: 'var(--color-text-4)' }}>
              Post your first job to get matched with contractors
            </p>
            <AnimatedButton
              variant="primary"
              onClick={() => router.push('/jobs/new')}
            >
              Post a Job <Plus className="w-4 h-4" />
            </AnimatedButton>
          </motion.div>
        ) : (
          <StaggerContainer staggerDelay={0.05}>
            <div className="space-y-3">
              {recentJobs.map((job, i) => {
                const status = statusConfig[job.status] || statusConfig.pending;
                const isActive = ['pending', 'accepted', 'in_progress'].includes(job.status);

                return (
                  <StaggerItem key={job.id}>
                    <Link href={`/chat/${job.id}`}>
                      <motion.div
                        className="card p-4 md:p-6 flex items-start justify-between group cursor-pointer"
                        whileHover={{ y: -2, borderColor: 'rgba(99,102,241,0.3)' }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex-1 min-w-0">
                          {/* Service & location */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className="text-xs font-bold px-2 py-1 rounded-full"
                              style={{
                                background: isActive ? 'rgba(99,102,241,0.1)' : 'rgba(107,114,128,0.1)',
                                color: isActive ? '#818cf8' : '#6b7280',
                              }}
                            >
                              {job.trade || 'General'}
                            </span>
                            {job.location?.city && (
                              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-4)' }}>
                                <MapPin className="w-3 h-3" />
                                {job.location.city}
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-sm font-medium mb-2 line-clamp-2" style={{ color: 'var(--color-text)' }}>
                            {job.description}
                          </p>

                          {/* Status & contractor */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1" style={{ color: status.color }}>
                              {status.icon}
                              <span className="text-xs font-medium">{status.label}</span>
                            </div>

                            {job.contractorName && (
                              <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                                with <strong>{job.contractorName}</strong>
                              </span>
                            )}

                            {job.paymentAmountUsd && (
                              <span className="text-xs font-semibold" style={{ color: 'var(--color-brand)' }}>
                                ${job.paymentAmountUsd}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CTA arrow */}
                        <motion.div
                          className="flex-shrink-0 ml-4 p-2 rounded-lg transition-colors"
                          whileHover={{ background: 'var(--color-surface-2)' }}
                        >
                          <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text-4)' }} />
                        </motion.div>
                      </motion.div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </div>
          </StaggerContainer>
        )}
      </motion.div>

      {/* Browse contractors CTA */}
      {jobs.length > 0 && (
        <ScrollReveal direction="up" delay={0.3}>
          <div
            className="mt-12 p-8 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
              Want to find contractors?
            </h3>
            <p className="mb-6" style={{ color: 'var(--color-text-3)' }}>
              Browse verified professionals in your area and message them directly
            </p>
            <Link href="/contractor" className="btn btn-primary inline-flex items-center">
              Browse Contractors <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </ScrollReveal>
      )}
    </PageLayout>
  );
}
