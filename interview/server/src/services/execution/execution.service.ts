import type { IExecutionProvider } from './executionProvider.interface.js';
import { Judge0ExecutionProvider } from './judge0.provider.js';

let currentProvider: IExecutionProvider = new Judge0ExecutionProvider();

export function getExecutionProvider(): IExecutionProvider {
  return currentProvider;
}

export function setExecutionProvider(provider: IExecutionProvider): void {
  currentProvider = provider;
}

