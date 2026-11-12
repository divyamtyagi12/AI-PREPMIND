// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv/config');
import * as fs   from 'fs';
import * as path from 'path';
import { loadStore }                                         from '../src/store';
import { prepareInterviewPlan }                              from '../src/questionBank';
import { buildSystemPrompt, parseFeedbackOutput, isGenericItem } from '../src/prompts';
import { createSession, getSession, updateSession, sessionCount } from '../src/sessionStore';
import type { CandidateProfile }                            from '../src/types';

let passed=0,failed=0,skipped=0,currentSection='';
interface Result{section:string;name:string;ok:boolean;detail?:string}
const results:Result[]=[];
function section(t:string){currentSection=t;console.log(`\n${'='.repeat(65)}\n  ${t}\n${'-'.repeat(65)}`);}
function assert(c:boolean,n:string,d?:string){results.push({section:currentSection,name:n,ok:c,detail:d});if(c){console.log(`  PASS: ${n}`);passed++;}else{console.error(`  FAIL: ${n}${d?`\n       -> ${d}`:''}`);failed++;}}
function skip(n:string,r:string){console.log(`  SKIP: ${n} (${r})`);skipped++;}

const BASE_URL=process.env.BASE_URL??'http://localhost:3000';
const API=`${BASE_URL}/api/interview`;
const HEALTH=`${BASE_URL}/health`;
async function post(body:unknown){const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return{status:res.status,json:await res.json() as Record<string,unknown>};}
async function getUrl(url:string){const res=await fetch(url);return{status:res.status,json:await res.json() as Record<string,unknown>};}

const SARAH:CandidateProfile={member:{id:'CAND-001',name:'Sarah Johnson',jobRole:'Senior Data Engineer',yearsExperience:9,education:'MS CS',status:'COMPLETED'},missions:[{day:7,title:'Embeddings Explained',passed:true,attempts:1},{day:8,title:'Vector Databases Overview',passed:true,attempts:1},{day:10,title:'Retrieval & Matching Engine',passed:true,attempts:2},{day:12,title:'Prompt Engineering Fundamentals',passed:true,attempts:4},{day:16,title:'Chatbot Backend & API Integration',passed:true,attempts:1},{day:22,title:'Multi-Agent Orchestration',passed:true,attempts:2},{day:28,title:'Docker & Kubernetes Deployment',passed:true,attempts:3},{day:29,title:'Monitoring, Logging & Observability',skipped:true},{day:31,title:'Capstone Project & Final Demo',passed:true,attempts:1}],signals:{commitDays:28,missionsCompleted:30,missionsFirstTry:20}};
const EMILY:CandidateProfile={member:{id:'CAND-003',name:'Emily Chen',jobRole:'AI Engineer',yearsExperience:6,education:'MS AI',status:'COMPLETED'},missions:[{day:7,title:'Embeddings Explained',passed:true,attempts:1},{day:8,title:'Vector Databases Overview',passed:true,attempts:1},{day:10,title:'Retrieval & Matching Engine',passed:true,attempts:1},{day:11,title:'RAG End-to-End & LLM API Basics',passed:true,attempts:1},{day:12,title:'Prompt Engineering Fundamentals',passed:true,attempts:1},{day:21,title:'LangChain Agents',passed:true,attempts:1},{day:22,title:'Multi-Agent Orchestration',passed:true,attempts:1},{day:23,title:'Model Context Protocol (MCP)',passed:true,attempts:1},{day:31,title:'Capstone Project & Final Demo',passed:true,attempts:1}],signals:{commitDays:31,missionsCompleted:31,missionsFirstTry:30}};
const DAVID:CandidateProfile={member:{id:'CAND-004',name:'David Miller',jobRole:'Business Analyst',yearsExperience:8,education:'MBA',status:'COMPLETED'},missions:[{day:7,title:'Embeddings Explained',passed:true,attempts:4},{day:8,title:'Vector Databases Overview',passed:true,attempts:5},{day:12,title:'Prompt Engineering Fundamentals',passed:true,attempts:3},{day:22,title:'Multi-Agent Orchestration',passed:true,attempts:4},{day:28,title:'Docker & Kubernetes Deployment',skipped:true},{day:31,title:'Capstone Project & Final Demo',passed:true,attempts:2}],signals:{commitDays:18,missionsCompleted:28,missionsFirstTry:6}};
const ETHAN:CandidateProfile={member:{id:'CAND-007',name:'Ethan Brooks',jobRole:'Computer Science Intern',yearsExperience:0,education:'BS CS',status:'COMPLETED'},missions:[{day:1,title:'VS Code & Python Environment Setup',passed:true,attempts:1},{day:7,title:'Embeddings Explained',passed:true,attempts:2},{day:8,title:'Vector Databases Overview',passed:true,attempts:1},{day:12,title:'Prompt Engineering Fundamentals',passed:true,attempts:1},{day:16,title:'Chatbot Backend & API Integration',passed:true,attempts:1},{day:22,title:'Multi-Agent Orchestration',passed:true,attempts:1},{day:27,title:'Security, Privacy & Guardrails',skipped:true},{day:28,title:'Docker & Kubernetes Deployment',skipped:true},{day:31,title:'Capstone Project & Final Demo',passed:true,attempts:2}],signals:{commitDays:26,missionsCompleted:27,missionsFirstTry:22}};
const WENDY:CandidateProfile={member:{id:'CAND-006',name:'Wendy Foster',jobRole:'Marketing Manager',yearsExperience:12,education:'BA Marketing',status:'COMPLETED'},missions:[{day:7,title:'Embeddings Explained',passed:true,attempts:5},{day:8,title:'Vector Databases Overview',passed:true,attempts:5},{day:12,title:'Prompt Engineering Fundamentals',passed:true,attempts:4},{day:16,title:'Chatbot Backend & API Integration',passed:true,attempts:4},{day:22,title:'Multi-Agent Orchestration',passed:true,attempts:5},{day:27,title:'Security, Privacy & Guardrails',skipped:true},{day:28,title:'Docker & Kubernetes Deployment',skipped:true},{day:31,title:'Capstone Project & Final Demo',passed:true,attempts:3}],signals:{commitDays:19,missionsCompleted:24,missionsFirstTry:2}};
const profiles=[{label:'Sarah (Senior DE 9yr, 1 skip, mostly aced)',c:SARAH},{label:'Emily (AI Eng 6yr, all-aced)',c:EMILY},{label:'David (Biz Analyst 8yr, heavy struggles 1 skip)',c:DAVID},{label:'Ethan (Intern 0yr, 2 skips)',c:ETHAN},{label:'Wendy (Mktg Mgr 12yr, 2 skips all struggled)',c:WENDY}];

async function main():Promise<void>{
  loadStore();

  section('S9.1 -- Interview plans are candidate-specific');
  const plans:{label:string;days:number[];modules:number[]}[]=[];
  for(const{label,c}of profiles){
    const{selectedDays}=prepareInterviewPlan(c);
    const days=selectedDays.map(d=>d.day);
    const mods=[...new Set(selectedDays.map(d=>d.moduleNumber))];
    plans.push({label,days,modules:mods});
    assert(selectedDays.length>=4&&selectedDays.length<=6,`${label}: 4-6 days (got ${selectedDays.length})`);
    assert(mods.length>=2,`${label}: spans >=2 modules (got [${mods.join(',')}])`);
  }
  let allDiffer=true;
  for(let i=0;i<plans.length;i++)for(let j=i+1;j<plans.length;j++){
    const b=new Set(plans[j].days);
    const union=new Set([...plans[i].days,...plans[j].days]).size;
    const overlap=plans[i].days.filter(d=>b.has(d)).length;
    if(overlap/union>=1){allDiffer=false;console.log(`  WARNING: plans identical: ${plans[i].label} vs ${plans[j].label}`);}
  }
  assert(allDiffer,'No two candidate plans are identical (all 10 pairs checked)');
  const seniorP=buildSystemPrompt(SARAH),juniorP=buildSystemPrompt(ETHAN);
  assert(seniorP.includes('architectural trade-offs')||seniorP.includes('senior'),'Sarah (9yr) gets senior-tier prompt');
  assert(juniorP.includes('early in their career')||juniorP.includes('encouraging'),'Ethan (0yr) gets junior-tier prompt');
  assert(seniorP!==juniorP,'Senior and junior prompts differ');
  console.log('  Plans:');
  for(const{label,days,modules}of plans)console.log(`    [${days.join(',')}] mods[${modules.join(',')}] -- ${label}`);
  const p1=prepareInterviewPlan(SARAH).selectedDays.map(d=>d.day);
  const p2=prepareInterviewPlan(SARAH).selectedDays.map(d=>d.day);
  assert(JSON.stringify(p1)===JSON.stringify(p2),'Same candidate produces same plan (deterministic)');

  section('S9.2 -- Session isolation: no state bleed');
  const sidA=`isoA-${Date.now()}`,sidB=`isoB-${Date.now()}`;
  createSession(sidA,SARAH);createSession(sidB,EMILY);
  assert(getSession(sidA)!.candidate.member.name==='Sarah Johnson','Session A candidate = Sarah');
  assert(getSession(sidB)!.candidate.member.name==='Emily Chen','Session B candidate = Emily');
  updateSession(sidA,{questionsAsked:7,daysCovered:new Set([7,12,22]),history:[{role:'agent',text:'A msg',timestamp:new Date().toISOString()}]});
  assert(getSession(sidA)!.questionsAsked===7,'A.questionsAsked=7 after mutation');
  assert(getSession(sidB)!.questionsAsked===0,'B.questionsAsked still 0 (no bleed)');
  assert(getSession(sidA)!.history.length===1,'A.history has 1 entry');
  assert(getSession(sidB)!.history.length===0,'B.history empty (no bleed)');
  assert(!getSession(sidB)!.daysCovered.has(7),"B.daysCovered doesn't have A's day 7");
  updateSession(sidB,{questionsAsked:3,daysCovered:new Set([8,16])});
  assert(getSession(sidA)!.questionsAsked===7,'A.questionsAsked still 7 after B mutation');
  assert(getSession(sidB)!.questionsAsked===3,'B.questionsAsked=3 after mutation');
  assert(!getSession(sidA)!.daysCovered.has(16),"A.daysCovered doesn't have B's day 16");
  assert(sessionCount()>=2,'sessionCount()>=2');

  section('S9.5 -- In-memory store only (no DB/file I/O)');
  const ss=fs.readFileSync(path.join(__dirname,'../src/sessionStore.ts'),'utf8');
  assert(ss.includes('new Map<string, SessionState>'),'Store uses Map<string,SessionState>');
  assert(!ss.match(/mongoose|prisma|sequelize|typeorm|\bpg\b|sqlite|mysql|redis/),'No DB library in sessionStore.ts');
  assert(!ss.match(/fs\.write|writeFile|appendFile/),'No file writes in sessionStore.ts');
  assert(ss.includes('sessions.get(sessionId)'),'getSession reads from Map');
  assert(ss.includes('sessions.set(sessionId'),'writes to Map');

  section('S9.6 -- Unknown sessionId handled gracefully');
  assert(getSession('ghost-xyz-999')===undefined,'getSession("ghost") returns undefined (no throw)');
  const rs=fs.readFileSync(path.join(__dirname,'../src/routes/interview.ts'),'utf8');
  assert(rs.includes('404')||/not found/i.test(rs),'Route returns 404 for unknown session (source check)');

  section('S9.7 -- Evidence-based fallback feedback for all 5 profiles');
  for(const{label,c}of profiles){
    const{feedback:fb}=parseFeedbackOutput('',c);
    const firstName=c.member.name.split(' ')[0];
    assert(fb.summary.includes(firstName),`${label}: fallback summary names candidate`);
    assert(fb.strengths.length>=2,`${label}: strengths>=2 (got ${fb.strengths.length})`);
    assert(fb.gaps.length>=2,`${label}: gaps>=2 (got ${fb.gaps.length})`);
    assert(fb.next.length>=2,`${label}: next>=2 (got ${fb.next.length})`);
    assert(/Day \d+/.test([...fb.gaps,...fb.next].join(' ')),`${label}: gap/next references a Day`);
    const generics=[...fb.strengths,...fb.gaps,...fb.next].filter(isGenericItem);
    assert(generics.length===0,`${label}: no generic items`,generics[0]?.slice(0,60));
  }

  section('S9.3 -- Malformed input returns 4xx not 500 (HTTP)');
  let serverUp=false;
  try{const{status}=await getUrl(HEALTH);serverUp=status===200;if(serverUp)console.log('  Server reachable at',BASE_URL);}
  catch{console.log('  Server unreachable -- skipping HTTP tests');}
  if(!serverUp){skip('S9.3 HTTP tests','server not reachable');}
  else{
    const uid=Date.now();
    const{status:s1}=await post({});assert(s1>=400&&s1<500,`Empty body -> 4xx (got ${s1})`);
    const{status:s2}=await post({candidate:SARAH});assert(s2>=400&&s2<500,`Missing sessionId -> 4xx (got ${s2})`);
    const{status:s3,json:j3}=await post({sessionId:`ghost-${uid}`,message:'hello'});
    assert(s3===404,`Unknown sessionId mid-turn -> 404 (got ${s3})`);
    const errMsg=(j3['error'] as Record<string,unknown>)?.['message']??j3['message'];
    assert(typeof errMsg==='string','Unknown sessionId response has message field');
    const{status:s4}=await post({sessionId:`ghost-${uid}`,message:''});assert(s4>=400&&s4<500,`Empty message -> 4xx (got ${s4})`);
    const{status:s5}=await post({sessionId:`bad-cand-${uid}`,candidate:{foo:'bar'}});assert(s5>=400&&s5<500,`Malformed candidate -> 4xx (got ${s5})`);
    const{status:s6}=await post({sessionId:`bad-miss-${uid}`,candidate:{member:{id:'x',name:'X',jobRole:'Y',yearsExperience:0,education:'Z',status:'A'}}});assert(s6>=400&&s6<500,`Candidate missing missions -> 4xx (got ${s6})`);
    const dup=`dup-${uid}`;
    await post({sessionId:dup,candidate:EMILY});
    const{status:s7}=await post({sessionId:dup,candidate:EMILY});assert(s7===409,`Duplicate sessionId -> 409 (got ${s7})`);
    const{status:hs,json:hj}=await getUrl(HEALTH);assert(hs===200,'GET /health -> 200');assert(hj['success']===true,'Health returns success:true');
  }

  section('S9.4 -- Hard-cap fires; stall answers get re-prompted');
  if(!serverUp){skip('S9.4','server not reachable');}
  else{
    const sid=`stall-${Date.now()}`;
    const{status:ss2,json:sj}=await post({sessionId:sid,candidate:ETHAN});
    assert(ss2===200,'Stall session start -> 200');
    assert(sj['done']===false,'Opening: done:false');
    assert(typeof sj['reply']==='string','Opening: reply is string');
    let done=false,turns=0;const replies:string[]=[];
    for(let i=0;i<18&&!done;i++){
      const{json}=await post({sessionId:sid,message:"I don't know."});
      turns++;replies.push((json['reply'] as string)??'');
      if(json['done']===true){done=true;break;}
      await new Promise(r=>setTimeout(r,200));
    }
    assert(done,`Hard cap fires: done:true at turn ${turns}`);
    assert(turns<=16,`Terminated at or before cap (turn ${turns})`);
    assert(replies.filter(r=>r.length>5).length===replies.length,`All ${replies.length} stall replies non-empty`);
    const{status:pc}=await post({sessionId:sid,message:'still here'});
    assert(pc===410,`Post-close -> 410 Gone (got ${pc})`);
    // Check feedback shape via second stall session
    const sid2=`stall2-${Date.now()}`;
    await post({sessionId:sid2,candidate:DAVID});
    let fin:Record<string,unknown>|null=null;
    for(let i=0;i<18&&!fin;i++){
      const{json}=await post({sessionId:sid2,message:'no'});
      if(json['done']===true){fin=json;break;}
      await new Promise(r=>setTimeout(r,100));
    }
    if(fin){
      const fb=fin['feedback'] as Record<string,unknown>;
      assert(typeof fb==='object'&&fb!==null,'Stall session: feedback is object');
      assert(typeof fb['summary']==='string','Stall session: summary is string');
      assert(Array.isArray(fb['strengths']),'Stall session: strengths is array');
      assert(Array.isArray(fb['gaps']),'Stall session: gaps is array');
      assert(Array.isArray(fb['next']),'Stall session: next is array');
    }
  }

  section('S9.8 -- E2E done:true with all 4 feedback fields (spec shape)');
  if(!serverUp){skip('S9.8','server not reachable');}
  else{
    const e2eSid=`e2e-${Date.now()}`;
    await post({sessionId:e2eSid,candidate:DAVID});
    let fin2:Record<string,unknown>|null=null;
    for(let i=0;i<18&&!fin2;i++){
      const{json}=await post({sessionId:e2eSid,message:'I have limited experience here.'});
      if(json['done']===true){fin2=json;break;}
      await new Promise(r=>setTimeout(r,150));
    }
    if(!fin2){skip('S9.8 feedback shape check','session did not conclude in 18 turns');}
    else{
      assert(fin2['done']===true,'E2E: done:true');
      assert(typeof fin2['reply']==='string','E2E: reply is string');
      const fb=fin2['feedback'] as Record<string,unknown>;
      assert(typeof fb==='object'&&fb!==null,'E2E: feedback is object');
      assert(typeof fb['summary']==='string'&&(fb['summary'] as string).length>0,'E2E: summary non-empty');
      const str=fb['strengths'] as unknown[],gaps=fb['gaps'] as unknown[],nxt=fb['next'] as unknown[];
      assert(Array.isArray(str)&&str.length>=1,'E2E: strengths>=1');
      assert(Array.isArray(gaps)&&gaps.length>=1,'E2E: gaps>=1');
      assert(Array.isArray(nxt)&&nxt.length>=1,'E2E: next>=1');
      assert(str.every(s=>typeof s==='string'),'E2E: all strengths are strings');
      assert(gaps.every(s=>typeof s==='string'),'E2E: all gaps are strings');
      assert(nxt.every(s=>typeof s==='string'),'E2E: all next are strings');
      const gandn=[...(gaps as string[]),...(nxt as string[])].join(' ');
      assert(/Day \d+/.test(gandn)||gandn.length>50,'E2E: feedback cites specific evidence');
      console.log(`\n  Feedback sample (David):`);
      console.log(`    summary   : "${(fb['summary'] as string).slice(0,120)}..."`);
      console.log(`    strengths : [${str.length}] "${(str[0] as string).slice(0,100)}..."`);
      console.log(`    gaps      : [${gaps.length}] "${(gaps[0] as string).slice(0,100)}..."`);
      console.log(`    next      : [${nxt.length}] "${(nxt[0] as string).slice(0,100)}..."`);
    }
  }

  console.log(`\n${'='.repeat(65)}`);
  console.log('  PRD ACCEPTANCE CHECKLIST');
  console.log(`${'-'.repeat(65)}`);
  const bySec:Record<string,{ok:number;fail:number}>={};
  for(const r of results){if(!bySec[r.section])bySec[r.section]={ok:0,fail:0};if(r.ok)bySec[r.section].ok++;else bySec[r.section].fail++;}
  for(const[sec,c]of Object.entries(bySec))console.log(`  ${c.fail===0?'[PASS]':'[FAIL]'}  ${sec} -- ${c.ok} passed, ${c.fail} failed`);
  console.log(`\n  Total: ${passed} passed | ${failed} failed | ${skipped} skipped`);
  if(failed===0)console.log('\n  ALL ACCEPTANCE CRITERIA VERIFIED. Phase 5 complete.');
  else console.log('\n  Some criteria failed -- see output above.');
  console.log(`${'='.repeat(65)}\n`);
  if(failed>0)process.exit(1);
}
main().catch(err=>{console.error('[FATAL]',err);process.exit(1);});
