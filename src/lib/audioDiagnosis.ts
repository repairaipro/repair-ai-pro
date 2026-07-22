/**
 * Sound-based defect diagnosis — powered by GPT-4o's audio-input model.
 * Same shape and pattern as awsRekognition.ts's photo analysis, so the
 * job page can render audio and photo findings identically.
 */

import { openai } from './openaiClient';

export type SoundDefect = {
  defectType: string;   // e.g. "worn_bearing", "clogged_drain", "loose_belt"
  confidence: number;   // 0-100
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendations: string[];
};

export type AudioDiagnosisResult = {
  detectedDefects: SoundDefect[];
  soundDescription: string; // plain description of what the sound is (e.g. "rhythmic metallic knocking")
  estimatedSeverity: 'low' | 'medium' | 'high';
  summary: string;
  requiresVideoConsultation: boolean;
};

const SYSTEM_PROMPT = `You are an expert home-repair inspector AI. The user message includes an attached audio recording (input_audio content) of a noise their home appliance, plumbing, HVAC, or mechanical system is making. The audio IS attached and available to you right now — never ask the user to provide, upload, or describe it; analyze the attached clip directly.
Your response MUST be valid JSON matching this exact schema, and nothing else:
{
  "detectedDefects": [
    {
      "defectType": string,       // e.g. "worn_bearing", "clogged_drain", "loose_belt", "compressor_failure", "air_in_pipes"
      "confidence": number,       // 0-100
      "severity": "low"|"medium"|"high",
      "description": string,
      "recommendations": string[] // 2-4 actionable items
    }
  ],
  "soundDescription": string,   // plain description of the sound itself, e.g. "rhythmic metallic knocking, roughly once per second"
  "estimatedSeverity": "low"|"medium"|"high",
  "summary": string,
  "requiresVideoConsultation": boolean
}
If the clip is silent, too short, or the sound is unclear, still return this exact JSON shape — set detectedDefects to an empty array and explain what you actually heard (or didn't) in summary and soundDescription.
Return ONLY the JSON object. No markdown, no prose before or after, no questions back to the user.`;

function emptyResult(reason: string): AudioDiagnosisResult {
  return {
    detectedDefects: [],
    soundDescription: '',
    estimatedSeverity: 'low',
    summary: reason,
    requiresVideoConsultation: false,
  };
}

/**
 * Analyze a WAV audio recording (base64-encoded, no data: URI prefix).
 */
export async function analyzeAudioDefect(base64Wav: string): Promise<AudioDiagnosisResult> {
  let raw = '';
  try {
    const completion = await openai.chat.completions.create({
      // Verified against the live account: gpt-4o-audio-preview does not
      // exist on this account (404 model_not_found) — gpt-audio-mini is
      // the actual available audio-input model. Confirmed working via a
      // direct API test (usage.prompt_tokens_details.audio_tokens > 0).
      model: 'gpt-audio-mini',
      modalities: ['text'],
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Diagnose this home repair sound and return the JSON analysis.' },
            { type: 'input_audio', input_audio: { data: base64Wav, format: 'wav' } },
          ] as any,
        },
      ],
    });

    raw = completion.choices[0]?.message?.content?.trim() ?? '';

    // The model occasionally wraps its JSON in prose or code fences despite
    // instructions — extract the JSON object rather than requiring the
    // entire response to be strictly valid JSON (same defensive pattern
    // used for the text-diagnosis prompts elsewhere in this app).
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object in response');
    return JSON.parse(match[0]) as AudioDiagnosisResult;
  } catch (err) {
    console.error('GPT-4o audio diagnosis error:', err, raw ? `raw: ${raw.slice(0, 300)}` : '');
    // If the model responded with real text but not our JSON shape, surface
    // that text rather than a generic dead-end — it's still useful signal.
    if (raw) return emptyResult(raw);
    return emptyResult('Could not analyze the recording. Please try again with a clearer clip.');
  }
}
