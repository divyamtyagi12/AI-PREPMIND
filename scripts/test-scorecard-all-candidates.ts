import * as fs from 'fs';
import * as path from 'path';
import { processOpeningTurn, processTurn } from '../src/interviewOrchestrator';
import { createSession } from '../src/sessionStore';
import { loadStore } from '../src/store';
import { CandidateProfile } from '../src/types';

interface CandidateFile {
  candidates: CandidateProfile[];
}

async function runAllCandidatesScorecardTest() {
  loadStore();

  console.log('====================================================================================================');
  console.log('  AUTOMATED SCORECARD TEST FOR ALL 20 CANDIDATES IN CANDIDATES.JSON');
  console.log('====================================================================================================\n');

  const filePath = path.join(__dirname, '../data/candidates.json');
  const rawData = fs.readFileSync(filePath, 'utf8');
  const parsedData = JSON.parse(rawData) as CandidateFile;
  const candidates = parsedData.candidates;

  console.log(`Loaded ${candidates.length} candidates from candidates.json.\n`);

  let totalPassed = 0;
  let totalFailed = 0;

  for (let idx = 0; idx < candidates.length; idx++) {
    const candidate = candidates[idx];
    const member = candidate.member;
    const sessionId = `sess-scorecard-${member.id}`;

    try {
      const session = createSession(sessionId, candidate);
      const opening = await processOpeningTurn(session);
      Object.assign(session, opening.nextState);

      // Simulate 8 turns of relevant answers grounded in their profile
      const genericAnswer = `In my cohort mission work for ${member.jobRole}, I implemented structured modules, validated technical trade-offs, and evaluated performance metrics.`;

      let feedback: any = null;
      for (let turn = 0; turn < 8; turn++) {
        const turnRes = await processTurn(session, genericAnswer);
        Object.assign(session, turnRes.nextState);
        if (turnRes.done && turnRes.feedback) {
          feedback = turnRes.feedback;
          break;
        }
      }

      // If session didn't auto-close by turn 8, force close logic to retrieve feedback
      if (!feedback) {
        const endState = session;
        endState.phase = 'done';
        const fallbackRes = await processTurn(endState, 'Wrapping up session.');
        feedback = fallbackRes.feedback;
      }

      // Verification checks
      const hasOverallScore = typeof feedback?.overallScore === 'number' && !isNaN(feedback.overallScore);
      const isOverallBounded = hasOverallScore && feedback.overallScore >= 0 && feedback.overallScore <= 100;

      const hasTopicScores = Array.isArray(feedback?.topicScores) && feedback.topicScores.length > 0;
      const allTopicScoresValid = hasTopicScores && feedback.topicScores.every((t: any) =>
        typeof t.day === 'number' &&
        typeof t.title === 'string' &&
        typeof t.score === 'number' &&
        !isNaN(t.score) &&
        t.score >= 0 &&
        t.score <= 100
      );

      const isPass = hasOverallScore && isOverallBounded && hasTopicScores && allTopicScoresValid;

      if (isPass) {
        totalPassed++;
      } else {
        totalFailed++;
      }

      console.log(`----------------------------------------------------------------------------------------------------`);
      console.log(`Candidate ${idx + 1}/20: ${member.name} (${member.id} | ${member.jobRole}) -> ${isPass ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  Overall Score : ${feedback?.overallScore}/100`);
      console.log(`  Topic Scores  : [${(feedback?.topicScores || []).map((t: any) => `Day ${t.day} (${t.title}): ${t.score}`).join(', ')}]`);
    } catch (err: any) {
      totalFailed++;
      console.error(`----------------------------------------------------------------------------------------------------`);
      console.error(`Candidate ${idx + 1}/20: ${member.name} (${member.id}) -> ❌ EXCEPTION: ${err.message}`);
    }
  }

  console.log('\n====================================================================================================');
  console.log('  SUMMARY OF ALL 20 CANDIDATES SCORECARD TEST');
  console.log('====================================================================================================');
  console.log(`Total Candidates Tested : ${candidates.length}`);
  console.log(`Total Passed            : ${totalPassed}`);
  console.log(`Total Failed            : ${totalFailed}`);
  console.log('====================================================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAllCandidatesScorecardTest();
