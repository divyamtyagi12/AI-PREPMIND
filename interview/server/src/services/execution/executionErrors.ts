export class ExecutionError extends Error {
  constructor(message: string, public code: string = 'EXECUTION_ERROR') {
    super(message);
    this.name = 'ExecutionError';
  }
}

export class ProviderNotConfiguredError extends ExecutionError {
  constructor() {
    super(
      'Secure code execution service is not configured or offline. Run and Submit are currently disabled.',
      'PROVIDER_NOT_CONFIGURED'
    );
    this.name = 'ProviderNotConfiguredError';
  }
}

export class LanguageNotSupportedError extends ExecutionError {
  constructor(language: string) {
    super(`Language '${language}' is not supported by the execution provider.`, 'UNSUPPORTED_LANGUAGE');
    this.name = 'LanguageNotSupportedError';
  }
}

export class SourceCodeLimitExceededError extends ExecutionError {
  constructor(size: number, limit: number) {
    super(`Source code size (${size} bytes) exceeds limit of ${limit} bytes.`, 'CODE_TOO_LARGE');
    this.name = 'SourceCodeLimitExceededError';
  }
}

export class ExecutionRateLimitExceededError extends ExecutionError {
  constructor(limit: number) {
    super(`Daily code execution limit of ${limit} runs reached for today.`, 'RATE_LIMIT_EXCEEDED');
    this.name = 'ExecutionRateLimitExceededError';
  }
}

