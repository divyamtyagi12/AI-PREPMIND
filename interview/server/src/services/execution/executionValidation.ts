export const SUPPORTED_LANGUAGES = ['cpp', 'java', 'python', 'javascript'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const JUDGE0_LANGUAGE_IDS: Record<SupportedLanguage, number> = {
  cpp: 54, // C++ (GCC 9.2.0)
  java: 62, // Java (OpenJDK 13.0.1)
  python: 71, // Python (3.8.1)
  javascript: 63, // JavaScript (Node.js 12.14.0)
};

export const DEFAULT_EXECUTION_LIMITS = {
  maxSourceBytes: 50000, // 50 KB
  defaultTimeLimitMs: 2000, // 2s
  maxTimeLimitMs: 10000,
  defaultMemoryLimitKb: 262144, // 256 MB
  maxMemoryLimitKb: 524288, // 512 MB
  dailyUserExecutionLimit: 50,
};

export function normalizeOutput(output: string | null | undefined): string {
  if (!output) return '';
  return output
    .replace(/\r\n/g, '\n') // Normalize CRLF to LF
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd()) // Strip trailing line spaces
    .join('\n')
    .trim(); // Trim leading/trailing blank lines
}

export function compareOutputs(actual: string | null | undefined, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}

