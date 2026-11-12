import mongoose from 'mongoose';
import { CodingProblem } from '../../models/CodingProblem.js';
import { CodingTestCase } from '../../models/CodingTestCase.js';
import { CodingSubmission } from '../../models/CodingSubmission.js';
import { CodingProgress } from '../../models/CodingProgress.js';
import { RoadmapTask } from '../../models/RoadmapTask.js';
import { getExecutionProvider } from './execution.service.js';
import {
  DEFAULT_EXECUTION_LIMITS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  compareOutputs,
} from './executionValidation.js';
import {
  LanguageNotSupportedError,
  ProviderNotConfiguredError,
  SourceCodeLimitExceededError,
} from './executionErrors.js';
import type { ExecutionResult, ExecutionVerdict } from './executionProvider.interface.js';

export async function runCodeAgainstSampleCases(params: {
  userId: string;
  problemId: string;
  sourceCode: string;
  language: string;
}) {
  const { problemId, sourceCode, language } = params;

  if (sourceCode.length > DEFAULT_EXECUTION_LIMITS.maxSourceBytes) {
    throw new SourceCodeLimitExceededError(sourceCode.length, DEFAULT_EXECUTION_LIMITS.maxSourceBytes);
  }

  const lang = language.toLowerCase() as SupportedLanguage;
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    throw new LanguageNotSupportedError(language);
  }

  const problem = await CodingProblem.findById(problemId).lean();
  if (!problem || problem.status !== 'Published') {
    throw new Error('Coding problem not found or not published');
  }

  const provider = getExecutionProvider();
  if (!provider.isConfigured()) {
    throw new ProviderNotConfiguredError();
  }

  // Fetch only sample test cases
  const sampleTestCases = await CodingTestCase.find({
    problemId,
    visibility: 'sample',
  })
    .sort({ order: 1 })
    .lean();

  if (sampleTestCases.length === 0) {
    throw new Error('No sample test cases configured for this problem');
  }

  const results = [];
  let compileOutput: string | null = null;

  for (const tc of sampleTestCases) {
    const execRes: ExecutionResult = await provider.execute({
      sourceCode,
      language: lang,
      stdin: tc.input,
      expectedOutput: tc.expectedOutput,
      timeLimitMs: problem.timeLimitMs || DEFAULT_EXECUTION_LIMITS.defaultTimeLimitMs,
      memoryLimitKb: problem.memoryLimitKb || DEFAULT_EXECUTION_LIMITS.defaultMemoryLimitKb,
    });

    if (execRes.compileOutput) {
      compileOutput = execRes.compileOutput;
    }

    results.push({
      testCaseId: String(tc._id),
      visibility: 'sample',
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: execRes.stdout,
      status: execRes.status,
      executionTimeMs: execRes.executionTimeMs,
      memoryUsedKb: execRes.memoryUsedKb,
      errorMessage: execRes.stderr,
    });

    // If compilation fails, stop running subsequent cases
    if (execRes.status === 'compilation_error') {
      break;
    }
  }

  return {
    results,
    compileOutput,
    providerName: provider.name,
  };
}

export async function submitCodeSolution(params: {
  userId: string;
  problemId: string;
  sourceCode: string;
  language: string;
}) {
  const { userId, problemId, sourceCode, language } = params;

  if (sourceCode.length > DEFAULT_EXECUTION_LIMITS.maxSourceBytes) {
    throw new SourceCodeLimitExceededError(sourceCode.length, DEFAULT_EXECUTION_LIMITS.maxSourceBytes);
  }

  const lang = language.toLowerCase() as SupportedLanguage;
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    throw new LanguageNotSupportedError(language);
  }

  const problem = await CodingProblem.findById(problemId).lean();
  if (!problem || problem.status !== 'Published') {
    throw new Error('Coding problem not found or not published');
  }

  const provider = getExecutionProvider();
  if (!provider.isConfigured()) {
    throw new ProviderNotConfiguredError();
  }

  // 1. Create a queued submission record
  const submission = await CodingSubmission.create({
    userId,
    problemId,
    language: lang,
    sourceCode,
    verdict: 'running',
    executionProvider: provider.name,
    submittedAt: new Date(),
  });

  try {
    // 2. Fetch all test cases (samples + hidden)
    const allTestCases = await CodingTestCase.find({ problemId }).sort({ order: 1 }).lean();

    if (allTestCases.length === 0) {
      throw new Error('Problem has no test cases configured');
    }

    let passedCount = 0;
    let finalVerdict: ExecutionVerdict = 'accepted';
    let maxTimeMs = 0;
    let maxMemoryKb = 0;
    let compileOutput: string | null = null;
    const testCaseResults = [];

    for (const tc of allTestCases) {
      const execRes: ExecutionResult = await provider.execute({
        sourceCode,
        language: lang,
        stdin: tc.input,
        expectedOutput: tc.expectedOutput,
        timeLimitMs: problem.timeLimitMs || DEFAULT_EXECUTION_LIMITS.defaultTimeLimitMs,
        memoryLimitKb: problem.memoryLimitKb || DEFAULT_EXECUTION_LIMITS.defaultMemoryLimitKb,
      });

      if (execRes.compileOutput) {
        compileOutput = execRes.compileOutput;
      }

      if (execRes.executionTimeMs && execRes.executionTimeMs > maxTimeMs) {
        maxTimeMs = execRes.executionTimeMs;
      }
      if (execRes.memoryUsedKb && execRes.memoryUsedKb > maxMemoryKb) {
        maxMemoryKb = execRes.memoryUsedKb;
      }

      const isSample = tc.visibility === 'sample';
      const tcResult: any = {
        testCaseId: tc._id,
        status: execRes.status,
        visibility: tc.visibility,
        executionTimeMs: execRes.executionTimeMs,
        memoryUsedKb: execRes.memoryUsedKb,
      };

      // Disclose inputs/outputs ONLY for sample test cases; hidden tests remain confidential
      if (isSample) {
        tcResult.input = tc.input;
        tcResult.expectedOutput = tc.expectedOutput;
        tcResult.actualOutput = execRes.stdout;
        tcResult.errorMessage = execRes.stderr;
      }

      testCaseResults.push(tcResult);

      if (execRes.status === 'accepted') {
        passedCount++;
      } else {
        // First failing verdict dictates overall verdict
        if (finalVerdict === 'accepted') {
          finalVerdict = execRes.status;
        }

        // Fast-fail on compilation or internal errors
        if (execRes.status === 'compilation_error' || execRes.status === 'internal_error') {
          break;
        }
      }
    }

    // 3. Update Submission record
    const mappedVerdict = finalVerdict === 'internal_error' ? 'system_error' : finalVerdict;
    submission.verdict = mappedVerdict;
    submission.passedTestCases = passedCount;
    submission.totalTestCases = allTestCases.length;
    submission.executionTimeMs = maxTimeMs > 0 ? maxTimeMs : null;
    submission.memoryUsedKb = maxMemoryKb > 0 ? maxMemoryKb : null;
    submission.compileOutput = compileOutput;
    submission.testCaseResults = testCaseResults as any;
    submission.completedAt = new Date();
    await submission.save();

    // 4. Update Coding Progress
    const isAccepted = finalVerdict === 'accepted';
    const progress = await CodingProgress.findOne({ userId, problemId });

    if (!progress) {
      await CodingProgress.create({
        userId,
        problemId,
        status: isAccepted ? 'solved' : 'attempted',
        attemptCount: 1,
        bestVerdict: finalVerdict,
        firstAcceptedAt: isAccepted ? new Date() : null,
        lastAttemptedAt: new Date(),
        languagesUsed: [lang],
      });
    } else {
      const wasAlreadySolved = progress.status === 'solved';
      progress.attemptCount += 1;
      progress.lastAttemptedAt = new Date();
      if (!progress.languagesUsed.includes(lang)) {
        progress.languagesUsed.push(lang);
      }
      if (isAccepted) {
        progress.status = 'solved';
        progress.bestVerdict = 'accepted';
        if (!progress.firstAcceptedAt) {
          progress.firstAcceptedAt = new Date();
        }
      } else if (!wasAlreadySolved && progress.bestVerdict !== 'accepted') {
        progress.status = 'attempted';
        progress.bestVerdict = finalVerdict;
      }
      await progress.save();
    }

    // 5. Integrate with Roadmap Task if eligible
    if (isAccepted) {
      await RoadmapTask.updateMany(
        {
          userId,
          topicId: { $in: problem.topicIds },
          taskType: { $in: ['coding_practice', 'practice'] },
          status: { $in: ['pending', 'in_progress'] },
        },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            notes: `Auto-completed via verified solved coding problem: "${problem.title}"`,
          },
        }
      );
    }

    return submission;
  } catch (error: any) {
    submission.verdict = 'system_error';
    submission.completedAt = new Date();
    await submission.save();
    throw error;
  }
}
