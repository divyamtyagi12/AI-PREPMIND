import fs from 'fs';
import path from 'path';
import { Curriculum, CandidatesFile } from './types';

export interface AppStore {
  curriculum: Curriculum;
  candidates: CandidatesFile;
}

let _store: AppStore | null = null;

/**
 * Loads curriculum.json and candidates.json from the paths configured in .env.
 * Must be called once at application startup before any route handlers run.
 */
export function loadStore(): AppStore {
  const possibleCurriculumPaths = [
    process.env.CURRICULUM_PATH,
    path.join(process.cwd(), 'data/curriculum.json'),
    path.join(__dirname, '../data/curriculum.json'),
    path.join(__dirname, '../../data/curriculum.json'),
    path.resolve('./data/curriculum.json'),
  ].filter(Boolean) as string[];

  const possibleCandidatesPaths = [
    process.env.CANDIDATES_PATH,
    path.join(process.cwd(), 'data/candidates.json'),
    path.join(__dirname, '../data/candidates.json'),
    path.join(__dirname, '../../data/candidates.json'),
    path.resolve('./data/candidates.json'),
  ].filter(Boolean) as string[];

  const curriculumPath = possibleCurriculumPaths.find(p => fs.existsSync(p)) || possibleCurriculumPaths[0];
  const candidatesPath = possibleCandidatesPaths.find(p => fs.existsSync(p)) || possibleCandidatesPaths[0];

  console.log(`[Store] Loading curriculum from  : ${curriculumPath}`);
  console.log(`[Store] Loading candidates from  : ${candidatesPath}`);

  const curriculum = JSON.parse(
    fs.readFileSync(curriculumPath, 'utf-8'),
  ) as Curriculum;

  const candidates = JSON.parse(
    fs.readFileSync(candidatesPath, 'utf-8'),
  ) as CandidatesFile;

  _store = { curriculum, candidates };

  console.log(
    `[Store] Loaded ${curriculum.days.length} curriculum days across ` +
      `${curriculum.modules.length} modules, ${candidates.candidates.length} candidates.`,
  );

  return _store;
}

/** Returns the already-loaded store. Throws if loadStore() was not called first. */
export function getStore(): AppStore {
  if (!_store) {
    throw new Error('Store not initialised — call loadStore() at startup.');
  }
  return _store;
}
