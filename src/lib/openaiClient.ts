import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder-key',
});

export class OpenAIError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export async function handleOpenAIError(error: any): Promise<string> {
  console.error('OpenAI API Error:', error);

  if (error instanceof OpenAI.APIError) {
    if (error.status === 401) {
      return 'Invalid API key. Please check your OPENAI_API_KEY environment variable.';
    }
    if (error.code === 'insufficient_quota') {
      return 'OpenAI account is out of quota — add billing or increase the usage limit at platform.openai.com.';
    }
    if (error.status === 429) {
      return 'Rate limited by OpenAI. Please try again in a moment.';
    }
    if (error.status === 500) {
      return 'OpenAI service error. Please try again later.';
    }
    return `OpenAI API error: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error occurred while calling OpenAI API';
}
