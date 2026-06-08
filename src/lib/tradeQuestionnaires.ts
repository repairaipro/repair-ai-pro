/**
 * Trade-Specific Questionnaires
 * Each trade has 10-15 questions to narrow down scope and improve cost estimation
 */

export type Question = {
  id: string;
  type: 'single-select' | 'multi-select' | 'yes-no' | 'short-text' | 'number';
  label: string;
  description?: string;
  options?: { label: string; value: string }[];
  required: boolean;
  followUp?: string; // shows if this question is answered
};

export type TradeQuestions = Record<string, Question[]>;

export const tradeQuestionnaires: TradeQuestions = {
  plumbing: [
    {
      id: 'issue_type',
      type: 'single-select',
      label: 'What type of issue are you experiencing?',
      options: [
        { label: 'Leak or water damage', value: 'leak' },
        { label: 'Clog or drainage problem', value: 'clog' },
        { label: 'Installation or repair', value: 'installation' },
        { label: 'Inspection or maintenance', value: 'inspection' },
        { label: 'Emergency', value: 'emergency' },
      ],
      required: true,
    },
    {
      id: 'fixture_type',
      type: 'single-select',
      label: 'Which fixture is affected?',
      options: [
        { label: 'Kitchen sink', value: 'kitchen_sink' },
        { label: 'Bathroom sink', value: 'bathroom_sink' },
        { label: 'Toilet', value: 'toilet' },
        { label: 'Shower/tub', value: 'shower_tub' },
        { label: 'Main water line', value: 'main_line' },
        { label: 'Water heater', value: 'water_heater' },
        { label: 'Multiple fixtures', value: 'multiple' },
      ],
      required: true,
    },
    {
      id: 'water_active',
      type: 'yes-no',
      label: 'Is water actively leaking/flowing right now?',
      required: true,
      followUp: 'This affects urgency and cost',
    },
    {
      id: 'previous_attempts',
      type: 'yes-no',
      label: 'Have you or someone else already tried to fix this?',
      required: false,
    },
    {
      id: 'started_when',
      type: 'single-select',
      label: 'When did this problem start?',
      options: [
        { label: 'Today', value: 'today' },
        { label: 'This week', value: 'this_week' },
        { label: 'This month', value: 'this_month' },
        { label: 'Longer ago', value: 'longer' },
      ],
      required: true,
    },
    {
      id: 'house_age',
      type: 'single-select',
      label: 'When was your house built?',
      options: [
        { label: 'Before 1970 (old pipes)', value: 'pre_1970' },
        { label: '1970-2000', value: '1970_2000' },
        { label: 'After 2000', value: 'post_2000' },
        { label: 'Not sure', value: 'unknown' },
      ],
      required: true,
      followUp: 'Older homes may have more expensive issues',
    },
    {
      id: 'access_easy',
      type: 'yes-no',
      label: 'Can the contractor easily access the affected area?',
      required: false,
    },
    {
      id: 'same_day_needed',
      type: 'yes-no',
      label: 'Do you need same-day service?',
      required: false,
    },
    {
      id: 'damage_visible',
      type: 'yes-no',
      label: 'Is there visible water damage or staining?',
      required: false,
    },
  ],

  electrical: [
    {
      id: 'issue_type',
      type: 'single-select',
      label: 'What type of electrical issue?',
      options: [
        { label: 'Outlet or switch not working', value: 'outlet_switch' },
        { label: 'Breaker keeps tripping', value: 'breaker_trip' },
        { label: 'Lighting issue', value: 'lighting' },
        { label: 'New installation/wiring', value: 'installation' },
        { label: 'Inspection or safety concern', value: 'inspection' },
        { label: 'Power outage/emergency', value: 'emergency' },
      ],
      required: true,
    },
    {
      id: 'location',
      type: 'single-select',
      label: 'Where is the problem?',
      options: [
        { label: 'Single outlet/switch', value: 'single' },
        { label: 'Multiple outlets/switches', value: 'multiple' },
        { label: 'Main panel/breaker', value: 'main_panel' },
        { label: 'Entire room/floor', value: 'large_area' },
      ],
      required: true,
    },
    {
      id: 'safety_concern',
      type: 'yes-no',
      label: 'Is there a safety concern (sparks, burning smell, heat)?',
      required: true,
      followUp: 'Safety issues increase urgency',
    },
    {
      id: 'breaker_trips_frequency',
      type: 'single-select',
      label: 'If breaker trips, how often?',
      options: [
        { label: 'Occasionally', value: 'occasionally' },
        { label: 'Frequently', value: 'frequently' },
        { label: 'Constantly/every use', value: 'constantly' },
      ],
      required: false,
      followUp: 'Constant tripping suggests serious fault',
    },
    {
      id: 'house_age',
      type: 'single-select',
      label: 'When was your house built/updated?',
      options: [
        { label: 'Before 1980 (old wiring)', value: 'pre_1980' },
        { label: '1980-2000', value: '1980_2000' },
        { label: 'After 2000', value: 'post_2000' },
      ],
      required: true,
    },
    {
      id: 'ever_updated',
      type: 'yes-no',
      label: 'Has the electrical system been updated in the last 20 years?',
      required: false,
    },
    {
      id: 'same_day_needed',
      type: 'yes-no',
      label: 'Do you need same-day service?',
      required: false,
    },
    {
      id: 'power_completely_out',
      type: 'yes-no',
      label: 'Is power completely out to this area?',
      required: false,
    },
  ],

  hvac: [
    {
      id: 'issue_type',
      type: 'single-select',
      label: 'What HVAC issue are you experiencing?',
      options: [
        { label: 'AC not cooling', value: 'ac_not_cooling' },
        { label: 'Heat not working', value: 'heat_not_working' },
        { label: 'Strange noises', value: 'noise' },
        { label: 'Uneven temperature', value: 'uneven_temp' },
        { label: 'Maintenance/inspection', value: 'maintenance' },
        { label: 'Installation', value: 'installation' },
        { label: 'Emergency', value: 'emergency' },
      ],
      required: true,
    },
    {
      id: 'system_type',
      type: 'single-select',
      label: 'What type of system do you have?',
      options: [
        { label: 'Central AC/heating', value: 'central' },
        { label: 'Window unit(s)', value: 'window' },
        { label: 'Heat pump', value: 'heat_pump' },
        { label: 'Furnace', value: 'furnace' },
        { label: 'Not sure', value: 'unknown' },
      ],
      required: true,
    },
    {
      id: 'system_age',
      type: 'single-select',
      label: 'How old is your HVAC system?',
      options: [
        { label: 'Less than 5 years', value: 'new' },
        { label: '5-10 years', value: 'medium' },
        { label: '10-15 years', value: 'older' },
        { label: 'Over 15 years', value: 'very_old' },
        { label: 'Not sure', value: 'unknown' },
      ],
      required: true,
      followUp: 'Older systems may need replacement',
    },
    {
      id: 'system_runs_at_all',
      type: 'yes-no',
      label: 'Does the system run at all or completely unresponsive?',
      required: true,
    },
    {
      id: 'seasonal',
      type: 'single-select',
      label: 'When does the problem occur?',
      options: [
        { label: 'Summer only', value: 'summer' },
        { label: 'Winter only', value: 'winter' },
        { label: 'Year-round', value: 'year_round' },
      ],
      required: false,
    },
    {
      id: 'filter_changed',
      type: 'yes-no',
      label: 'When was your air filter last changed?',
      required: false,
    },
    {
      id: 'last_service',
      type: 'single-select',
      label: 'Last professional maintenance?',
      options: [
        { label: 'Less than 1 year', value: 'recent' },
        { label: '1-2 years', value: 'year_or_two' },
        { label: 'More than 2 years', value: 'old' },
        { label: 'Never', value: 'never' },
      ],
      required: false,
    },
    {
      id: 'temp_outside',
      type: 'single-select',
      label: 'What\'s the outside temperature today?',
      options: [
        { label: 'Below 0°F', value: 'very_cold' },
        { label: '0-32°F', value: 'cold' },
        { label: 'Above 32°F', value: 'above_freezing' },
        { label: 'Not applicable', value: 'n_a' },
      ],
      required: false,
      followUp: 'Temperature affects service difficulty',
    },
  ],

  appliance: [
    {
      id: 'appliance_type',
      type: 'single-select',
      label: 'Which appliance needs repair?',
      options: [
        { label: 'Refrigerator', value: 'refrigerator' },
        { label: 'Washer', value: 'washer' },
        { label: 'Dryer', value: 'dryer' },
        { label: 'Dishwasher', value: 'dishwasher' },
        { label: 'Oven/stove', value: 'oven_stove' },
        { label: 'Microwave', value: 'microwave' },
        { label: 'Garbage disposal', value: 'disposal' },
        { label: 'Water heater', value: 'water_heater' },
      ],
      required: true,
    },
    {
      id: 'issue_description',
      type: 'short-text',
      label: 'What\'s the problem?',
      description: 'E.g., "won\'t turn on", "leaking", "making noise"',
      required: true,
    },
    {
      id: 'appliance_age',
      type: 'single-select',
      label: 'How old is the appliance?',
      options: [
        { label: 'Less than 5 years', value: 'new' },
        { label: '5-10 years', value: 'medium' },
        { label: '10-15 years', value: 'older' },
        { label: 'Over 15 years', value: 'very_old' },
        { label: 'Unknown', value: 'unknown' },
      ],
      required: true,
      followUp: 'Older appliances may need replacement',
    },
    {
      id: 'repair_or_replace',
      type: 'single-select',
      label: 'Are you open to replacement if repair is too expensive?',
      options: [
        { label: 'Prefer repair', value: 'repair' },
        { label: 'Open to either', value: 'either' },
        { label: 'Already decided to replace', value: 'replace' },
      ],
      required: false,
    },
    {
      id: 'still_working',
      type: 'yes-no',
      label: 'Does the appliance work at all?',
      required: true,
    },
    {
      id: 'emergency',
      type: 'yes-no',
      label: 'Is this an emergency (e.g., no hot water, can\'t do laundry)?',
      required: false,
    },
  ],

  roofing: [
    {
      id: 'issue_type',
      type: 'single-select',
      label: 'What\'s the roofing issue?',
      options: [
        { label: 'Active leak', value: 'leak' },
        { label: 'Damaged/missing shingles', value: 'shingles' },
        { label: 'Flashing issue', value: 'flashing' },
        { label: 'Inspection/assessment', value: 'inspection' },
        { label: 'Full replacement', value: 'replacement' },
      ],
      required: true,
    },
    {
      id: 'leak_active',
      type: 'yes-no',
      label: 'Is there active leaking into your home right now?',
      required: true,
      followUp: 'Active leaks require urgent attention',
    },
    {
      id: 'roof_age',
      type: 'single-select',
      label: 'Approximately how old is your roof?',
      options: [
        { label: 'Less than 5 years', value: 'new' },
        { label: '5-15 years', value: 'medium' },
        { label: '15-25 years', value: 'older' },
        { label: 'Over 25 years', value: 'very_old' },
        { label: 'Unknown', value: 'unknown' },
      ],
      required: true,
      followUp: 'Roof lifespan is typically 15-25 years',
    },
    {
      id: 'roof_type',
      type: 'single-select',
      label: 'What type of roofing material?',
      options: [
        { label: 'Asphalt shingles', value: 'asphalt' },
        { label: 'Metal', value: 'metal' },
        { label: 'Wood shake/shingle', value: 'wood' },
        { label: 'Tile', value: 'tile' },
        { label: 'Flat/rubber', value: 'flat' },
        { label: 'Not sure', value: 'unknown' },
      ],
      required: true,
    },
    {
      id: 'weather_recent',
      type: 'yes-no',
      label: 'Did this occur after recent storm/high winds?',
      required: false,
    },
    {
      id: 'interior_damage',
      type: 'yes-no',
      label: 'Is there visible interior water damage?',
      required: false,
      followUp: 'Interior damage increases cost',
    },
    {
      id: 'size_of_area',
      type: 'single-select',
      label: 'How much of the roof is affected?',
      options: [
        { label: 'Small area (few shingles)', value: 'small' },
        { label: 'Medium area (10-20 shingles)', value: 'medium' },
        { label: 'Large area (multiple sections)', value: 'large' },
        { label: 'Entire roof', value: 'entire' },
      ],
      required: false,
    },
  ],

  general: [
    {
      id: 'service_type',
      type: 'single-select',
      label: 'What type of service do you need?',
      options: [
        { label: 'Repair', value: 'repair' },
        { label: 'Installation', value: 'installation' },
        { label: 'Maintenance/inspection', value: 'maintenance' },
        { label: 'Consultation', value: 'consultation' },
      ],
      required: true,
    },
    {
      id: 'scope_description',
      type: 'short-text',
      label: 'Describe the work you need done',
      required: true,
    },
    {
      id: 'timeline_urgent',
      type: 'yes-no',
      label: 'Is this urgent?',
      required: false,
    },
  ],
};

/**
 * Get questions for a specific trade
 */
export function getQuestionsForTrade(trade: string): Question[] {
  const normalized = trade.toLowerCase().trim();
  return tradeQuestionnaires[normalized] || tradeQuestionnaires.general;
}

/**
 * Validate questionnaire answers
 */
export function validateAnswers(
  trade: string,
  answers: Record<string, any>
): { valid: boolean; errors: string[] } {
  const questions = getQuestionsForTrade(trade);
  const errors: string[] = [];

  for (const question of questions) {
    if (question.required && !(question.id in answers)) {
      errors.push(`Question "${question.label}" is required`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get complexity score based on answers
 * Returns 0-100 where higher = more complex = higher cost
 */
export function getComplexityScore(
  trade: string,
  answers: Record<string, any>
): number {
  let score = 50; // baseline

  // Plumbing complexity factors
  if (trade.toLowerCase() === 'plumbing') {
    if (answers.issue_type === 'emergency') score += 20;
    if (answers.water_active === true) score += 15;
    if (answers.house_age === 'pre_1970') score += 15;
    if (answers.fixture_type === 'main_line') score += 20;
  }

  // Electrical complexity factors
  if (trade.toLowerCase() === 'electrical') {
    if (answers.safety_concern === true) score += 25;
    if (answers.breaker_trips_frequency === 'constantly') score += 20;
    if (answers.house_age === 'pre_1980') score += 15;
  }

  // HVAC complexity factors
  if (trade.toLowerCase() === 'hvac') {
    if (answers.system_age === 'very_old') score += 20;
    if (answers.last_service === 'never') score += 10;
    if (answers.system_type === 'heat_pump') score += 10; // more complex
  }

  // Roofing complexity factors
  if (trade.toLowerCase() === 'roofing') {
    if (answers.leak_active === true) score += 20;
    if (answers.roof_age === 'very_old') score += 20;
    if (answers.interior_damage === true) score += 15;
    if (answers.size_of_area === 'entire') score += 25;
  }

  return Math.min(100, Math.max(0, score));
}
