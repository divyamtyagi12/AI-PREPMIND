/**
 * Gemini client (FUTURE PHASES - not used in Phase 1).
 *
 * Preserved from the original interview-agent project as the foundation for the
 * Phase 6 AI tutor and Phase 8 mock interviews. Nothing in the Phase 1 request
 * path (register, login, onboarding, dashboard) imports this module.
 *
 * The API key is only read lazily inside getApiKey(), so importing this file
 * never requires GEMINI_API_KEY. Prompts and responses are intentionally NOT
 * logged (they will contain student data).
 */

import { GoogleGenAI } from '@google/genai';

export interface Message {
  role: 'user' | 'model';
  content: string;
}

export interface LLMResponse {
  text: string;
  finishReason?: string;
}

export interface ChatOptions {
  temperature?: number;
  maxOutputTokens?: number;
  json?: boolean;
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY ?? '';
  if (!key || key === 'REPLACE_ME') {
    throw new Error('GEMINI_API_KEY is not set. Add it to your .env file.');
  }
  return key;
}

function getModelName(): string {
  return process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
}

async function callWithRetry(
  systemPrompt: string,
  messages: Message[],
  { temperature = 0.7, maxOutputTokens = 600, json = true }: ChatOptions,
): Promise<LLMResponse> {
  const MAX_RETRIES = 2;
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const model = getModelName();
  const contents = messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] }));

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature,
          maxOutputTokens,
          ...(json && { responseMimeType: 'application/json' }),
        },
      });
      return {
        text: (response.text ?? '').trim(),
        finishReason: response.candidates?.[0]?.finishReason,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      if (is429 && attempt < MAX_RETRIES - 1) {
        const match = msg.match(/retry in ([0-9.]+)s/);
        const suggestedMs = match ? parseFloat(match[1]) * 1000 : 1000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, Math.min(Math.max(suggestedMs, 1000), 2000)));
        continue;
      }
      throw err;
    }
  }
  throw new Error('LLM call failed after retries');
}

/** Multi-turn call: the last message is the new user prompt. */
export function chat(
  systemPrompt: string,
  messages: Message[],
  options: ChatOptions = {},
): Promise<LLMResponse> {
  return callWithRetry(systemPrompt, messages, options);
}

/** Single-turn convenience call. */
export async function complete(
  systemPrompt: string,
  userPrompt: string,
  options: ChatOptions = {},
): Promise<string> {
  const result = await chat(systemPrompt, [{ role: 'user', content: userPrompt }], options);
  return result.text;
}
