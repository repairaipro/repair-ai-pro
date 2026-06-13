/**
 * Consumer financing estimates (provider-agnostic).
 *
 * Big-ticket repairs (roofs, HVAC replacement, repipes) are where the real
 * revenue is — a financed $12k job beats fifty $200 matches. Showing "as low
 * as $X/mo" at the point of sticker shock is the single biggest conversion
 * lever for those jobs.
 *
 * This computes the monthly-payment math only. When a real lender is wired
 * (Wisetack, Affirm, Synchrony), swap `financingApplyUrl` for their flow —
 * the display math here stays the same.
 */

/** Below this, financing isn't worth surfacing (adds friction, not value). */
export const FINANCING_MIN_USD = 500;

/** Representative APR shown in estimates (real rate set at application). */
const REPRESENTATIVE_APR = 0.099; // 9.9%

/** Term options offered, longest-first for the lowest headline payment. */
const TERM_MONTHS = [60, 36, 24, 12];

export type FinancingEstimate = {
  eligible: boolean;
  total: number;
  /** Lowest monthly payment across offered terms (the headline number). */
  monthlyLow: number;
  termMonths: number;
  apr: number;
  /** All term options, for an expanded "see plans" view. */
  plans: { months: number; monthly: number }[];
};

/** Standard amortized monthly payment. */
function monthlyPayment(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function getFinancingEstimate(totalUsd: number): FinancingEstimate {
  const eligible = totalUsd >= FINANCING_MIN_USD;

  const plans = TERM_MONTHS.map((months) => ({
    months,
    monthly: Math.round(monthlyPayment(totalUsd, REPRESENTATIVE_APR, months)),
  }));

  // Longest term = lowest monthly = the headline
  const headline = plans[0];

  return {
    eligible,
    total: totalUsd,
    monthlyLow: headline.monthly,
    termMonths: headline.months,
    apr: REPRESENTATIVE_APR,
    plans,
  };
}

/** Where "Apply" sends the user. Wire a real lender here later. */
export function financingApplyUrl(totalUsd: number): string {
  return `/financing?amount=${Math.round(totalUsd)}`;
}
