export interface ExecutionRequest {
  sourceCode: string;
  language: string; // 'cpp' | 'java' | 'python' | 'javascript'
  stdin: string;
  expectedOutput?: string;
  timeLimitMs: number;
  memoryLimitKb: number;
}

export type ExecutionVerdict =
  | 'accepted'
  | 'wrong_answer'
  | 'compilation_error'
  | 'runtime_error'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'internal_error';

export interface ExecutionResult {
  status: ExecutionVerdict;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
}

export interface IExecutionProvider {
  name: string;
  isConfigured(): boolean;
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}

