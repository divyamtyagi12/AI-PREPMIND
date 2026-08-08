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
  const curriculumPath = path.resolve(
    process.env.CURRICULUM_PATH ?? './data/curriculum.json',
  );
  const candidatesPath = path.resolve(
    process.env.CANDIDATES_PATH ?? './data/candidates.json',
  );

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
