'use client';

import { RankedContractors } from '@/components/RankedContractors';

export default function MatchPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <RankedContractors />
      </div>
    </main>
  );
}
