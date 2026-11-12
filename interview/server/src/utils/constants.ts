export const ROLES = ['student', 'admin'] as const;

export const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'] as const;

export const QUESTION_TYPES = ['single_choice', 'multiple_select', 'short_conceptual'] as const;

export const QUESTION_STATUSES = ['Draft', 'Published', 'Archived'] as const;

export const EVALUATION_STATUSES = ['evaluated', 'self_review', 'pending'] as const;

export const EXTERNAL_PLATFORMS = ['leetcode', 'codechef'] as const;

export const EXTERNAL_PROGRESS_STATUSES = ['Not Started', 'In Progress', 'Solved', 'Revisit'] as const;

export const CONTENT_ORIGINS = ['internal', 'ai_generated', 'external_metadata', 'bulk_imported'] as const;

export const JOB_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;

export const ASSESSMENT_TYPES = [
  'full_diagnostic',
  'dsa',
  'core_cs',
  'aptitude',
  'subject',
  'topic',
] as const;

export const ASSESSMENT_STATUSES = ['Draft', 'Published', 'Archived'] as const;

export const ASSESSMENT_SESSION_STATUSES = [
  'in_progress',
  'submitted',
  'expired',
  'cancelled',
] as const;

export const REVIEW_RELEASE_POLICIES = ['immediate', 'after_expiry', 'never'] as const;

export const SKILL_BASELINE_LEVELS = [
  'Insufficient Data',
  'Needs Improvement',
  'Developing',
  'Strong',
] as const;

export const ASSESSMENT_ELIGIBLE_QUESTION_TYPES = ['single_choice', 'multiple_select'] as const;

export const PREPARATION_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

export const PREFERRED_LANGUAGES = ['C++', 'Java', 'Python', 'JavaScript'] as const;

export const PREPARATION_GOALS = [
  'DSA',
  'Core CS',
  'Aptitude',
  'Mock Interviews',
  'System Design',
  'Communication Skills',
] as const;

export const DEGREES = ['B.Tech / B.E.', 'M.Tech / M.E.', 'BCA', 'MCA', 'B.Sc', 'M.Sc', 'Other'] as const;

export const COOKIE_NAMES = {
  access: 'pm_access',
  refresh: 'pm_refresh',
  csrf: 'pm_csrf',
} as const;

export const CSRF_HEADER = 'x-csrf-token';

