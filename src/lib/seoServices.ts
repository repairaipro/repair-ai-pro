/**
 * Static data for trade-by-city SEO landing pages (/services/[trade]/[city]).
 * Price ranges are realistic Houston-metro defaults; pages overlay live
 * platform pricing data when enough completed jobs exist.
 */

export type ServiceTrade = {
  slug: string;
  name: string;            // "Water Heater & Plumbing Repair"
  short: string;           // "Plumbing"
  emoji: string;
  /** matches the lowercase `trade` value stored in pricingHistory */
  pricingKey: string;
  typicalLow: number;
  typicalHigh: number;
  commonJobs: { job: string; range: string }[];
  faqs: { q: string; a: string }[];
};

export type ServiceCity = {
  slug: string;
  name: string;
  state: string;
};

export const SERVICE_CITIES: ServiceCity[] = [
  { slug: 'houston',       name: 'Houston',       state: 'TX' },
  { slug: 'katy',          name: 'Katy',          state: 'TX' },
  { slug: 'spring',        name: 'Spring',        state: 'TX' },
  { slug: 'cypress',       name: 'Cypress',       state: 'TX' },
  { slug: 'sugar-land',    name: 'Sugar Land',    state: 'TX' },
  { slug: 'pearland',      name: 'Pearland',      state: 'TX' },
  { slug: 'the-woodlands', name: 'The Woodlands', state: 'TX' },
  { slug: 'pasadena',      name: 'Pasadena',      state: 'TX' },
];

export const SERVICE_TRADES: ServiceTrade[] = [
  {
    slug: 'plumbing',
    name: 'Plumbing Repair',
    short: 'Plumbing',
    emoji: '🔧',
    pricingKey: 'plumbing',
    typicalLow: 150,
    typicalHigh: 450,
    commonJobs: [
      { job: 'Unclog drain or toilet', range: '$100–$275' },
      { job: 'Faucet repair or replacement', range: '$125–$350' },
      { job: 'Water heater repair', range: '$150–$600' },
      { job: 'Water heater replacement', range: '$1,000–$2,800' },
      { job: 'Leak detection & pipe repair', range: '$200–$850' },
    ],
    faqs: [
      { q: 'How much does a plumber cost per hour?', a: 'Most plumbers charge $75–$150 per hour, with a typical service-call minimum of $100–$200. Emergency or after-hours calls usually add $100–$200.' },
      { q: 'Should I repair or replace my water heater?', a: 'If your water heater is over 10 years old or the tank itself is leaking, replacement is usually the smarter investment. For heating-element, thermostat, or valve issues on a younger unit, a repair at $150–$600 typically makes sense.' },
      { q: 'What causes slow drains and gurgling pipes?', a: 'Usually a partial blockage from grease, hair, or debris in the drain line or a blocked vent stack. Left alone it can become a full blockage with water backup, so it is worth addressing early.' },
    ],
  },
  {
    slug: 'electrical',
    name: 'Electrical Repair',
    short: 'Electrical',
    emoji: '⚡',
    pricingKey: 'electrical',
    typicalLow: 150,
    typicalHigh: 500,
    commonJobs: [
      { job: 'Replace outlet or switch', range: '$85–$200' },
      { job: 'Install ceiling fan or light fixture', range: '$150–$350' },
      { job: 'Circuit breaker replacement', range: '$150–$400' },
      { job: 'Panel upgrade (200 amp)', range: '$1,800–$3,500' },
      { job: 'EV charger installation', range: '$500–$1,400' },
    ],
    faqs: [
      { q: 'How much does an electrician cost per hour?', a: 'Licensed electricians typically charge $80–$160 per hour. Simple jobs like outlet replacement often have flat rates from $85.' },
      { q: 'Why does my breaker keep tripping?', a: 'Common causes are an overloaded circuit, a short, or a failing breaker. Frequent trips are a safety signal that deserves a professional diagnosis — repeated resetting can hide a fire risk.' },
      { q: 'Do I need a permit for electrical work?', a: 'In the Houston area, permits are generally required for panel changes, new circuits, and service upgrades. Small like-for-like replacements usually do not. A licensed pro will handle permitting when needed.' },
    ],
  },
  {
    slug: 'hvac',
    name: 'AC & Heating Repair',
    short: 'HVAC',
    emoji: '❄️',
    pricingKey: 'hvac',
    typicalLow: 150,
    typicalHigh: 650,
    commonJobs: [
      { job: 'AC tune-up / seasonal service', range: '$80–$200' },
      { job: 'Capacitor or contactor replacement', range: '$150–$400' },
      { job: 'Refrigerant leak repair + recharge', range: '$250–$1,500' },
      { job: 'Blower motor replacement', range: '$400–$1,500' },
      { job: 'Full AC system replacement', range: '$5,000–$12,000' },
    ],
    faqs: [
      { q: 'Why is my AC running but not cooling?', a: 'In Houston heat the usual suspects are a dirty filter, low refrigerant from a leak, a failed capacitor, or a frozen evaporator coil. A diagnostic visit typically runs $75–$150 and is often credited toward the repair.' },
      { q: 'How often should I service my AC in Texas?', a: 'Twice a year ideally — cooling service in spring and heating check in fall. Houston systems work hard 8+ months a year, so maintenance pays for itself in efficiency and avoided breakdowns.' },
      { q: 'Repair or replace my AC unit?', a: 'A common rule: if the repair cost × the system age (years) exceeds $5,000, replacement is usually smarter. A 12-year-old system needing a $1,000 repair is a strong replacement candidate.' },
    ],
  },
  {
    slug: 'roofing',
    name: 'Roof Repair',
    short: 'Roofing',
    emoji: '🏠',
    pricingKey: 'roofing',
    typicalLow: 300,
    typicalHigh: 1200,
    commonJobs: [
      { job: 'Shingle repair (small area)', range: '$150–$600' },
      { job: 'Roof leak repair', range: '$300–$1,100' },
      { job: 'Flashing repair', range: '$200–$500' },
      { job: 'Full roof replacement (asphalt)', range: '$8,000–$18,000' },
    ],
    faqs: [
      { q: 'How do I know if my roof leak is urgent?', a: 'Any active drip, ceiling stain that grows, or sagging drywall needs attention within days — water damage compounds fast. Small stains that appear only after heavy storms still deserve an inspection within a few weeks.' },
      { q: 'Will insurance cover my roof repair?', a: 'If damage came from a storm event (hail, wind), homeowners insurance often covers it minus your deductible. Documenting damage with photos and a professional inspection report strengthens your claim significantly.' },
      { q: 'How long does a roof last in Texas?', a: 'Asphalt shingles last 15–25 years in the Houston climate; heat and storms push most roofs toward the lower end. Annual inspections after hail season help catch problems early.' },
    ],
  },
  {
    slug: 'appliance',
    name: 'Appliance Repair',
    short: 'Appliance',
    emoji: '🔌',
    pricingKey: 'appliance',
    typicalLow: 100,
    typicalHigh: 350,
    commonJobs: [
      { job: 'Refrigerator repair', range: '$200–$500' },
      { job: 'Washer or dryer repair', range: '$150–$400' },
      { job: 'Dishwasher repair', range: '$130–$350' },
      { job: 'Oven / range repair', range: '$150–$450' },
    ],
    faqs: [
      { q: 'Is it worth repairing a 10-year-old appliance?', a: 'The 50% rule works well: if a repair costs more than half the price of a comparable new unit, replace it. Refrigerators and washers older than 10 years usually fall on the replace side.' },
      { q: 'Why is my refrigerator not cooling?', a: 'Most often dirty condenser coils, a failed evaporator fan, or a faulty start relay. Coil cleaning is cheap; compressor failures on older units usually mean replacement time.' },
    ],
  },
  {
    slug: 'handyman',
    name: 'Handyman Services',
    short: 'Handyman',
    emoji: '🔨',
    pricingKey: 'general',
    typicalLow: 75,
    typicalHigh: 300,
    commonJobs: [
      { job: 'TV mounting', range: '$75–$200' },
      { job: 'Drywall patch & paint', range: '$100–$350' },
      { job: 'Door repair or replacement', range: '$125–$400' },
      { job: 'Furniture assembly', range: '$60–$180' },
      { job: 'Fence repair', range: '$150–$600' },
    ],
    faqs: [
      { q: 'How much does a handyman charge per hour?', a: 'Houston-area handymen typically charge $50–$100 per hour, often with a 2-hour minimum. Many price small jobs flat — sharing photos up front gets you an accurate quote.' },
      { q: 'Handyman vs. licensed contractor — which do I need?', a: 'Handymen are great for repairs, assembly, patching, and small installs. Anything involving gas lines, new electrical circuits, or structural changes needs a licensed specialty contractor.' },
    ],
  },
  {
    slug: 'painting',
    name: 'Painting Services',
    short: 'Painting',
    emoji: '🎨',
    pricingKey: 'painting',
    typicalLow: 200,
    typicalHigh: 800,
    commonJobs: [
      { job: 'Single room (walls only)', range: '$200–$500' },
      { job: 'Interior whole-home refresh', range: '$2,500–$7,000' },
      { job: 'Exterior repaint (single story)', range: '$3,000–$7,500' },
      { job: 'Cabinet painting', range: '$900–$3,000' },
    ],
    faqs: [
      { q: 'How much does it cost to paint a room?', a: 'A standard 12×12 room runs $200–$500 for walls, more with ceilings, trim, or repairs. Paint quality and wall condition drive most of the variance.' },
      { q: 'How often should I repaint my home exterior in Texas?', a: 'Every 5–8 years for most siding in the Houston climate — sun exposure on south and west faces ages paint fastest. Annual touch-ups extend the cycle.' },
    ],
  },
  {
    slug: 'auto-mechanic',
    name: 'Mobile Auto Repair',
    short: 'Auto Mechanic',
    emoji: '🚗',
    pricingKey: 'car mechanic',
    typicalLow: 100,
    typicalHigh: 500,
    commonJobs: [
      { job: 'Brake pads & rotors (per axle)', range: '$150–$450' },
      { job: 'Battery replacement', range: '$150–$350' },
      { job: 'CV axle replacement', range: '$250–$600' },
      { job: 'Diagnostic (check engine light)', range: '$60–$150' },
    ],
    faqs: [
      { q: 'Are mobile mechanics cheaper than shops?', a: 'Often 20–30% cheaper for common repairs since there is no shop overhead — and you skip the tow. Complex jobs requiring a lift still belong in a shop.' },
      { q: 'What does a clicking noise when turning mean?', a: 'Classic symptom of a worn CV joint. Caught early it is a $250–$600 axle replacement; ignored, it can leave you stranded.' },
    ],
  },
];

export function getTrade(slug: string): ServiceTrade | undefined {
  return SERVICE_TRADES.find((t) => t.slug === slug);
}

export function getCity(slug: string): ServiceCity | undefined {
  return SERVICE_CITIES.find((c) => c.slug === slug);
}
