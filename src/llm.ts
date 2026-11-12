/**
 * LLM Client — Google GenAI SDK integration
 * ──────────────────────────────────────────────────────────────────────────
 * Uses official @google/genai SDK.
 * Supports standard Gemini API keys (including AIza... and AQ... formats)
 * without treating API keys as OAuth Bearer tokens.
 */

import { GoogleGenAI } from '@google/genai';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'model';
  content: string;
}

export interface LLMResponse {
  text: string;
  finishReason?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

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

function getClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: getApiKey() });
}

// ─── Retry wrapper ────────────────────────────────────────────────────────────

async function callWithRetry(
  systemPrompt: string,
  messages: Message[],
  temperature: number,
): Promise<LLMResponse> {
  const MAX_RETRIES = 2;
  const ai = getClient();
  const model = getModelName();

  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature,
          maxOutputTokens: 600,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text ?? '';
      const candidate = response.candidates?.[0];
      return {
        text: text.trim(),
        finishReason: candidate?.finishReason,
      };
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      const is429 = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      if (is429 && attempt < MAX_RETRIES - 1) {
        const match = msg.match(/retry in ([0-9.]+)s/);
        const suggestedMs = match ? parseFloat(match[1]) * 1000 : 1000 * Math.pow(2, attempt);
        const delayMs = Math.min(Math.max(suggestedMs, 1000), 2000);
        console.warn(
          `[LLM] 429 rate-limited. Waiting ${(delayMs / 1000).toFixed(1)}s before retry ${attempt + 1}/${MAX_RETRIES}...`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }

  throw new Error('LLM call failed after retries');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Multi-turn conversation call.
 * history = all prior turns; last message = the new user prompt.
 */
export async function chat(
  systemPrompt: string,
  messages: Message[],
  temperature = 0.7,
): Promise<LLMResponse> {
  const model = getModelName();
  console.log('\n=================== [GEMINI API REQUEST PAYLOAD] ===================');
  console.log('Model:', model);
  console.log('System Instruction:\n', systemPrompt);
  console.log('Messages Payload (Full History):\n', JSON.stringify(messages, null, 2));
  console.log('====================================================================\n');

  try {
    const response = await callWithRetry(systemPrompt, messages, temperature);
    console.log('\n=================== [GEMINI RAW RESPONSE] ===================');
    console.log(response.text);
    console.log('=============================================================\n');
    return response;
  } catch (err: any) {
    console.error('\n❌ [LLM API ERROR SURFACED]:', err?.message ?? String(err));
    if (err?.status || err?.code) {
      console.error('   Status/Code:', err.status || err.code);
    }
    if (err?.details) {
      console.error('   Details:', JSON.stringify(err.details, null, 2));
    }
    throw err;
  }
}

/**
 * Single-turn convenience call (no history).
 */
export async function complete(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.5,
): Promise<string> {
  const result = await chat(systemPrompt, [{ role: 'user', content: userPrompt }], temperature);
  return result.text;
}

