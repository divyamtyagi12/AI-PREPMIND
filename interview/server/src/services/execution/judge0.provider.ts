import axios from 'axios';
import type {
  ExecutionRequest,
  ExecutionResult,
  ExecutionVerdict,
  IExecutionProvider,
} from './executionProvider.interface.js';
import {
  JUDGE0_LANGUAGE_IDS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  compareOutputs,
} from './executionValidation.js';
import { LanguageNotSupportedError, ProviderNotConfiguredError } from './executionErrors.js';

export class Judge0ExecutionProvider implements IExecutionProvider {
  name = 'judge0';

  private baseUrl: string;
  private apiKey: string;
  private apiHost: string;

  constructor() {
    this.baseUrl = (process.env.CODE_EXECUTION_BASE_URL || process.env.JUDGE0_URL || '').replace(/\/$/, '');
    this.apiKey = process.env.CODE_EXECUTION_API_KEY || process.env.JUDGE0_API_KEY || '';
    this.apiHost = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl);
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError();
    }

    const lang = request.language.toLowerCase() as SupportedLanguage;
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      throw new LanguageNotSupportedError(request.language);
    }

    const languageId = JUDGE0_LANGUAGE_IDS[lang];
    const timeLimitSec = Math.max(1, Math.ceil(request.timeLimitMs / 1000));
    const memoryLimitKb = request.memoryLimitKb;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      // RapidAPI or self-hosted token auth
      headers['X-RapidAPI-Key'] = this.apiKey;
      headers['X-RapidAPI-Host'] = this.apiHost;
      headers['X-Auth-Token'] = this.apiKey;
    }

    try {
      // Synchronous wait=true submission
      const response = await axios.post(
        `${this.baseUrl}/submissions?wait=true`,
        {
          source_code: request.sourceCode,
          language_id: languageId,
          stdin: request.stdin,
          expected_output: request.expectedOutput,
          cpu_time_limit: timeLimitSec,
          memory_limit: memoryLimitKb,
        },
        {
          headers,
          timeout: Math.max(15000, request.timeLimitMs + 5000),
        }
      );

      const data = response.data;
      return this.mapJudge0Response(data, request.expectedOutput);
    } catch (err: any) {
      if (err.response?.status === 400 || err.response?.status === 422) {
        return {
          status: 'compilation_error',
          stdout: null,
          stderr: err.response.data?.error || err.message,
          compileOutput: err.response.data?.compile_output || null,
          executionTimeMs: null,
          memoryUsedKb: null,
        };
      }
      return {
        status: 'internal_error',
        stdout: null,
        stderr: err.message || 'Execution provider error',
        compileOutput: null,
        executionTimeMs: null,
        memoryUsedKb: null,
      };
    }
  }

  private mapJudge0Response(data: any, expectedOutput?: string): ExecutionResult {
    // Judge0 status ids:
    // 3: Accepted
    // 4: Wrong Answer
    // 5: Time Limit Exceeded
    // 6: Compilation Error
    // 7-12: Runtime Errors (SIGSEGV, SIGXFSZ, SIGFPE, SIGABRT, NZEC, other)
    // 13: Internal Error
    // 14: Exec Format Error
    const statusId = data.status?.id;
    let verdict: ExecutionVerdict = 'internal_error';

    if (statusId === 3) {
      // If client supplied expectedOutput, double check via deterministic comparer
      if (expectedOutput !== undefined) {
        verdict = compareOutputs(data.stdout, expectedOutput) ? 'accepted' : 'wrong_answer';
      } else {
        verdict = 'accepted';
      }
    } else if (statusId === 4) {
      verdict = 'wrong_answer';
    } else if (statusId === 5) {
      verdict = 'time_limit_exceeded';
    } else if (statusId === 6) {
      verdict = 'compilation_error';
    } else if (statusId >= 7 && statusId <= 12) {
      verdict = 'runtime_error';
    } else {
      verdict = 'internal_error';
    }

    const timeSec = data.time ? parseFloat(data.time) : null;
    const timeMs = timeSec !== null && !isNaN(timeSec) ? Math.round(timeSec * 1000) : null;
    const memoryKb = data.memory ? parseInt(data.memory, 10) : null;

    return {
      status: verdict,
      stdout: data.stdout || null,
      stderr: data.stderr || null,
      compileOutput: data.compile_output || null,
      executionTimeMs: timeMs,
      memoryUsedKb: memoryKb && !isNaN(memoryKb) ? memoryKb : null,
    };
  }
}

