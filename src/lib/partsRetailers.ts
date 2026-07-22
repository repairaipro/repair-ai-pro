/**
 * Trade-aware parts retailer links.
 *
 * Every trade used to link to Home Depot/Lowe's/Amazon regardless of
 * relevance — including car parts, which nobody buys at Home Depot. Real
 * experts in each trade shop specific retailers: mechanics use AutoZone/
 * O'Reilly/RockAuto, appliance techs use RepairClinic/PartSelect, etc.
 *
 * A note on link reliability: AutoZone, O'Reilly, RockAuto, Advance Auto
 * Parts, RepairClinic, PartSelect, and SupplyHouse all run bot-detection
 * (Akamai/PerimeterX-style walls) that blocked direct verification of
 * their internal search URL parameters during development — guessing a
 * wrong parameter risks silently landing users on a homepage instead of
 * results (confirmed happening with a guessed AutoZone URL). Rather than
 * ship an unverified direct link that might be broken, those retailers
 * use a Google site-scoped search instead: it can never 404, always
 * shows real current results, and costs the user one extra click. Home
 * Depot, Lowe's, and Amazon use direct search URLs — verified working
 * against real production traffic earlier this session.
 *
 * IMPORTANT — this does not yet earn affiliate revenue. These are plain
 * search links with no tracking. Real affiliate income requires actually
 * enrolling in each retailer's program (most run through a network like
 * CJ Affiliate, Impact, Rakuten Advertising, ShareASale, or Amazon
 * Associates directly) and then appending the resulting tracking
 * parameter or wrapping the URL in the network's redirect link. That's a
 * business/legal step only the founder can do — once enrolled, updating
 * buildUrl() below to append the tracking param is a small follow-up.
 */

export type Retailer = {
  name: string;
  buildUrl: (query: string) => string;
};

function directSearch(name: string, urlTemplate: (q: string) => string): Retailer {
  return { name, buildUrl: (q) => urlTemplate(encodeURIComponent(q)) };
}

function googleSiteSearch(name: string, domain: string): Retailer {
  return {
    name,
    buildUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${q}`)}`,
  };
}

/* ── Verified-working direct links ── */
const HOME_DEPOT = directSearch('Home Depot', (q) => `https://www.homedepot.com/s/${q}`);
const LOWES      = directSearch("Lowe's",     (q) => `https://www.lowes.com/search?searchTerm=${q}`);
const AMAZON     = directSearch('Amazon',     (q) => `https://www.amazon.com/s?k=${q}`);

/* ── Google site-scoped search (bot-walled retailers, see file header) ── */
const AUTOZONE      = googleSiteSearch('AutoZone', 'autozone.com');
const OREILLY       = googleSiteSearch("O'Reilly Auto Parts", 'oreillyauto.com');
const ADVANCE_AUTO  = googleSiteSearch('Advance Auto Parts', 'shop.advanceautoparts.com');
const ROCKAUTO      = googleSiteSearch('RockAuto', 'rockauto.com');
const REPAIRCLINIC  = googleSiteSearch('RepairClinic', 'repairclinic.com');
const PARTSELECT    = googleSiteSearch('PartSelect', 'partselect.com');
const SUPPLYHOUSE   = googleSiteSearch('SupplyHouse', 'supplyhouse.com');
const LESLIES_POOL  = googleSiteSearch("Leslie's Pool Supply", 'lesliespool.com');
const BEST_BUY      = googleSiteSearch('Best Buy', 'bestbuy.com');

const RETAILER_SETS: Record<string, Retailer[]> = {
  automotive:    [AUTOZONE, OREILLY, ROCKAUTO, ADVANCE_AUTO],
  appliance:     [REPAIRCLINIC, PARTSELECT, AMAZON],
  plumbing_hvac: [HOME_DEPOT, LOWES, SUPPLYHOUSE],
  pool_spa:      [LESLIES_POOL, HOME_DEPOT, AMAZON],
  tech:          [AMAZON, BEST_BUY],
  general:       [HOME_DEPOT, LOWES, AMAZON],
};

/** Maps a trade name (as stored on jobs/contractors) to a retailer set. */
const TRADE_TO_SET: Record<string, keyof typeof RETAILER_SETS> = {
  'Auto Mechanic':       'automotive',
  'Auto Body & Paint':   'automotive',
  'Auto Detailing':      'automotive',
  'Tire & Wheels':       'automotive',
  'Auto Glass':          'automotive',
  'Appliance Repair':    'appliance',
  'Plumbing':            'plumbing_hvac',
  'HVAC':                'plumbing_hvac',
  'Pool & Spa':          'pool_spa',
  'IT & Tech Support':   'tech',
  'Security Systems':    'tech',
  'Smart Home':          'tech',
};

export function getRetailersForTrade(trade?: string | null): Retailer[] {
  if (!trade) return RETAILER_SETS.general;
  const key = TRADE_TO_SET[trade];
  return key ? RETAILER_SETS[key] : RETAILER_SETS.general;
}
