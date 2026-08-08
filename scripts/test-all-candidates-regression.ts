import * as fs from 'fs';
import * as path from 'path';
import { parseFeedbackOutput } from '../src/prompts';
import { CandidateProfile } from '../src/types';

interface CandidateFile {
  candidates: CandidateProfile[];
}

function runAllCandidatesRegressionTest() {
  console.log('======================================================================');
  console.log('  AUTOMATED REGRESSION TEST FOR ALL 20 CANDIDATES IN CANDIDATES.JSON');
  console.log('======================================================================\n');

  const filePath = path.join(__dirname, '../data/candidates.json');
  const rawData = fs.readFileSync(filePath, 'utf8');
  const parsedData = JSON.parse(rawData) as CandidateFile;
  const candidates = parsedData.candidates;

  console.log(`Loaded ${candidates.length} candidates from candidates.json.\n`);

  let totalPassed = 0;
  let totalFailed = 0;

  // Map to track sentence uniqueness across all candidates
  // key: normalized sentence, value: candidate id + field name
  const globalSentenceMap = new Map<string, { candidateId: string; field: string }>();
  let duplicateCount = 0;

  const candidateResults: {
    id: string;
    name: string;
    completionCheck: boolean;
    completionMsg: string;
    uniquenessCheck: boolean;
    uniquenessMsg: string;
    skippedCheck: boolean;
    skippedMsg: string;
    allPassed: boolean;
  }[] = [];

  const TOTAL_COHORT_MISSIONS = 31;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const member = candidate.member;
    const signals = candidate.signals;
    const missions = candidate.missions;

    const { feedback: fb } = parseFeedbackOutput('', candidate);

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Completion Percentage Math Check
    // ──────────────────────────────────────────────────────────────────────────
    // Formula: completionRate = Math.min(100, Math.round((signals.missionsCompleted / 31) * 100))
    const expectedPct = Math.min(100, Math.round((signals.missionsCompleted / TOTAL_COHORT_MISSIONS) * 100));
    const expectedRatioStr = `completing ${signals.missionsCompleted} of ${TOTAL_COHORT_MISSIONS} assignments`;

    const strengthStr = fb.strengths[1] || '';
    const pctMatch = strengthStr.match(/(\d+)%/);
    const actualPct = pctMatch ? parseInt(pctMatch[1], 10) : -1;
    const hasRatioStr = strengthStr.includes(expectedRatioStr);

    const completionMathCorrect =
      actualPct === expectedPct &&
      hasRatioStr &&
      signals.missionsCompleted <= TOTAL_COHORT_MISSIONS;

    const completionMsg = completionMathCorrect
      ? `PASS: ${actualPct}% (${signals.missionsCompleted}/${TOTAL_COHORT_MISSIONS})`
      : `FAIL: got ${actualPct}% ("${strengthStr}"), expected ${expectedPct}% (${signals.missionsCompleted}/${TOTAL_COHORT_MISSIONS})`;

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Skipped-Day Detection Check
    // ──────────────────────────────────────────────────────────────────────────
    const actualSkippedInJson = missions.filter((m) => m.skipped);
    let skippedCheck = true;
    let skippedMsg = '';

    if (actualSkippedInJson.length > 0) {
      // Must cite at least the first skipped day number in gaps or next
      const firstSkippedDay = actualSkippedInJson[0].day;
      const firstSkippedTitle = actualSkippedInJson[0].title;
      const textToSearch = [...fb.gaps, ...fb.next].join(' ');

      const citesSkippedDay = textToSearch.includes(`Day ${firstSkippedDay}`);

      if (citesSkippedDay) {
        skippedMsg = `PASS: correctly cited skipped Day ${firstSkippedDay} ("${firstSkippedTitle}")`;
      } else {
        skippedCheck = false;
        skippedMsg = `FAIL: candidate has skipped Day ${firstSkippedDay} in JSON, but feedback did not cite Day ${firstSkippedDay}`;
      }
    } else {
      // Candidate has NO skipped missions in JSON — verify feedback doesn't claim a day was skipped
      const textToSearch = [...fb.gaps, ...fb.next].join(' ');
      const falseSkipClaim = textToSearch.includes('skipped entirely');

      if (!falseSkipClaim) {
        skippedMsg = `PASS: 0 skipped missions in JSON, no false skip claims in feedback`;
      } else {
        skippedCheck = false;
        skippedMsg = `FAIL: 0 skipped missions in JSON, but feedback claimed a day was skipped`;
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Uniqueness Check (sentence uniqueness registration)
    // ──────────────────────────────────────────────────────────────────────────
    let candidateUniquenessOk = true;
    let uniquenessDetails: string[] = [];

    const allCandidateItems = [
      ...fb.strengths.map((s, idx) => ({ field: `strengths[${idx}]`, text: s })),
      ...fb.gaps.map((g, idx) => ({ field: `gaps[${idx}]`, text: g })),
      ...fb.next.map((n, idx) => ({ field: `next[${idx}]`, text: n })),
    ];

    for (const item of allCandidateItems) {
      const normText = item.text.trim();
      if (globalSentenceMap.has(normText)) {
        const prev = globalSentenceMap.get(normText)!;
        candidateUniquenessOk = false;
        duplicateCount++;
        uniquenessDetails.push(
          `Duplicate text in ${item.field}: "${normText.slice(0, 50)}..." matches candidate ${prev.candidateId} (${prev.field})`
        );
      } else {
        globalSentenceMap.set(normText, { candidateId: member.id, field: item.field });
      }
    }

    const uniquenessMsg = candidateUniquenessOk
      ? `PASS: all feedback items unique`
      : `FAIL: ${uniquenessDetails.join('; ')}`;

    const allPassed = completionMathCorrect && skippedCheck && candidateUniquenessOk;

    if (allPassed) {
      totalPassed++;
    } else {
      totalFailed++;
    }

    candidateResults.push({
      id: member.id,
      name: member.name,
      completionCheck: completionMathCorrect,
      completionMsg,
      uniquenessCheck: candidateUniquenessOk,
      uniquenessMsg,
      skippedCheck,
      skippedMsg,
      allPassed,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Print Results Table for All 20 Candidates
  // ──────────────────────────────────────────────────────────────────────────
  console.log('----------------------------------------------------------------------------------------------------');
  console.log(`Candidate ID | Candidate Name         | Completion Math | Skipped-Day Check | Uniqueness Check`);
  console.log('----------------------------------------------------------------------------------------------------');

  for (const res of candidateResults) {
    const statusIcon = res.allPassed ? '✅ PASS' : '❌ FAIL';
    console.log(
      `${res.id}   | ${(res.name + '                   ').slice(0, 22)} | ${res.completionCheck ? '✅ OK' : '❌ ERR'} | ${res.skippedCheck ? '✅ OK' : '❌ ERR'} | ${res.uniquenessCheck ? '✅ OK' : '❌ ERR'} | ${statusIcon}`
    );
    console.log(`   ├─ Math   : ${res.completionMsg}`);
    console.log(`   ├─ Skipped: ${res.skippedMsg}`);
    console.log(`   └─ Unique : ${res.uniquenessMsg}\n`);
  }

  console.log('======================================================================');
  console.log('  SUMMARY OF CANDIDATE REGRESSION SUITE');
  console.log('======================================================================');
  console.log(`Total Candidates Evaluated : ${candidates.length}`);
  console.log(`Candidates Passing All 3   : ${totalPassed}`);
  console.log(`Candidates Failing Any     : ${totalFailed}`);
  console.log(`Total Duplicate Sentences  : ${duplicateCount}`);
  console.log('======================================================================\n');

  if (totalFailed > 0 || duplicateCount > 0) {
    process.exit(1);
  }
}

runAllCandidatesRegressionTest();
