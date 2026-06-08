/**
 * AI Smart Invoice Generator
 * Analyzes job photos + data to generate accurate, market-priced invoices
 * Beats Invoice Fly by using full job context — not just photos alone
 */

import { openai } from './openaiClient';

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit: string; // "hours", "units", "flat"
  unitPrice: number;
  total: number;
  category: 'labor' | 'parts' | 'materials' | 'travel' | 'misc';
};

export type InvoiceData = {
  jobSummary: string;
  lineItems: InvoiceLineItem[];
  laborSubtotal: number;
  partsSubtotal: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentTerms: string;
  notes: string;
  warrantyStatement: string;
  confidence: number; // 0–100, how confident AI is in pricing
  pricingInsight: string; // e.g. "Based on typical rates in your area"
};

export type GenerateInvoiceParams = {
  jobDescription: string;
  trade: string;
  zipCode?: string;
  completionPhotoUrls?: string[];
  beforePhotoUrls?: string[];
  defects?: Array<{ defectType: string; description: string }>;
  questionnaire?: Record<string, string>;
  productsUsed?: Array<{ name: string; price: number; quantity?: number }>;
  contractorName?: string;
  timeSpentHours?: number;
  budget?: number;
};

export async function generateInvoiceFromJobData(
  params: GenerateInvoiceParams
): Promise<InvoiceData> {
  const {
    jobDescription,
    trade,
    zipCode,
    completionPhotoUrls = [],
    beforePhotoUrls = [],
    defects = [],
    questionnaire = {},
    productsUsed = [],
    contractorName,
    timeSpentHours,
    budget,
  } = params;

  // Build context for AI
  const defectSummary = defects
    .map((d) => `- ${d.defectType}: ${d.description}`)
    .join('\n');

  const questionnaireText = Object.entries(questionnaire)
    .map(([q, a]) => `${q}: ${a}`)
    .join('\n');

  const productsText =
    productsUsed.length > 0
      ? productsUsed
          .map((p) => `- ${p.name}: $${p.price.toFixed(2)} × ${p.quantity || 1}`)
          .join('\n')
      : 'None recorded';

  // Build vision message with photos
  const imageMessages: any[] = [];

  // Include completion photos (after) first — most relevant
  for (const url of completionPhotoUrls.slice(0, 4)) {
    imageMessages.push({
      type: 'image_url',
      image_url: { url, detail: 'high' },
    });
  }

  // Include before photos for context
  for (const url of beforePhotoUrls.slice(0, 2)) {
    imageMessages.push({
      type: 'image_url',
      image_url: { url, detail: 'low' },
    });
  }

  const systemPrompt = `You are an expert home repair cost estimator and invoice generator.
You analyze completed repair work and generate accurate, itemized invoices based on:
- What the work actually shows in photos
- Industry-standard labor rates for the trade
- Material/parts costs
- Location-based pricing adjustments

Always return valid JSON. Be specific in line item descriptions.
Labor rates: Plumbing $85-150/hr, Electrical $90-180/hr, HVAC $80-160/hr,
General repair $60-120/hr, Appliance $75-140/hr, Roofing $70-130/hr.
Add 15-20% materials markup as standard industry practice.`;

  const userContent: any[] = [
    {
      type: 'text',
      text: `Analyze this completed repair job and generate an invoice.

TRADE: ${trade}
LOCATION: ${zipCode || 'Unknown'}
JOB DESCRIPTION: ${jobDescription}
${timeSpentHours ? `TIME ON SITE: ${timeSpentHours} hours` : ''}
${budget ? `CLIENT BUDGET: $${budget}` : ''}

DEFECTS FOUND IN INITIAL ANALYSIS:
${defectSummary || 'Not provided'}

QUESTIONNAIRE ANSWERS:
${questionnaireText || 'Not provided'}

PRODUCTS/PARTS USED:
${productsText}

${imageMessages.length > 0 ? `I'm including ${completionPhotoUrls.length} completion photos and ${beforePhotoUrls.length} before photos.` : 'No photos provided — estimate based on job description.'}

Generate a detailed invoice JSON with this exact structure:
{
  "jobSummary": "1-2 sentence description of work completed",
  "lineItems": [
    {
      "description": "Specific task description",
      "quantity": 2.5,
      "unit": "hours",
      "unitPrice": 120,
      "total": 300,
      "category": "labor"
    }
  ],
  "laborSubtotal": 300,
  "partsSubtotal": 150,
  "subtotal": 450,
  "taxRate": 0,
  "taxAmount": 0,
  "total": 450,
  "paymentTerms": "Due upon completion",
  "notes": "Any special notes",
  "warrantyStatement": "90-day warranty on parts and labor",
  "confidence": 85,
  "pricingInsight": "Based on standard ${trade} rates for your area"
}

Rules:
- Break labor into specific tasks (not just "Labor")
- Separate parts/materials line items from labor
- If photos show more work than described, include it
- Confidence 90-100: clear photos + full context. 70-89: good estimate. 50-69: limited info.
- Don't include tax if taxRate is 0`,
    },
    ...imageMessages,
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    const invoice = JSON.parse(content) as InvoiceData;

    // Validate and fix totals
    invoice.laborSubtotal = invoice.lineItems
      .filter((i) => i.category === 'labor')
      .reduce((sum, i) => sum + i.total, 0);

    invoice.partsSubtotal = invoice.lineItems
      .filter((i) => i.category !== 'labor')
      .reduce((sum, i) => sum + i.total, 0);

    invoice.subtotal = invoice.laborSubtotal + invoice.partsSubtotal;
    invoice.taxAmount = Math.round(invoice.subtotal * (invoice.taxRate || 0) * 100) / 100;
    invoice.total = invoice.subtotal + invoice.taxAmount;

    return invoice;
  } catch {
    // Fallback: basic estimate if parsing fails
    const hourlyRate = getBaseRate(trade);
    const hours = timeSpentHours || 2;
    const labor = hours * hourlyRate;

    return {
      jobSummary: `${trade} repair: ${jobDescription}`,
      lineItems: [
        {
          description: `${trade} labor`,
          quantity: hours,
          unit: 'hours',
          unitPrice: hourlyRate,
          total: labor,
          category: 'labor',
        },
      ],
      laborSubtotal: labor,
      partsSubtotal: 0,
      subtotal: labor,
      taxRate: 0,
      taxAmount: 0,
      total: labor,
      paymentTerms: 'Due upon completion',
      notes: '',
      warrantyStatement: '30-day workmanship warranty',
      confidence: 50,
      pricingInsight: 'Estimated based on standard rates',
    };
  }
}

function getBaseRate(trade: string): number {
  const rates: Record<string, number> = {
    plumbing: 125,
    electrical: 135,
    hvac: 120,
    appliance: 110,
    roofing: 100,
    general: 90,
    carpentry: 95,
    painting: 75,
  };
  const key = trade.toLowerCase();
  return rates[key] || 100;
}

export function formatInvoiceNumber(id: string): string {
  const num = id.slice(-6).toUpperCase();
  const date = new Date();
  return `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${num}`;
}
