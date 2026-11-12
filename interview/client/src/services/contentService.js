import api from './api';

export const contentService = {
  // Categories
  getCategories: () => api.get('/categories').then((r) => r.data.data.categories),
  getCategoryBySlug: (slug) => api.get(`/categories/${slug}`).then((r) => r.data.data),

  // Subjects
  getSubjects: (params) => api.get('/subjects', { params }).then((r) => r.data.data.subjects),
  getSubjectById: (id) => api.get(`/subjects/${id}`).then((r) => r.data.data),

  // Topics
  getTopics: (params) => api.get('/topics', { params }).then((r) => r.data.data.topics),
  getTopicById: (id) => api.get(`/topics/${id}`).then((r) => r.data.data.topic),

  // Questions
  getQuestions: (params) => api.get('/questions', { params }).then((r) => r.data.data),
  getQuestionById: (id) => api.get(`/questions/${id}`).then((r) => r.data.data.question),
};

export const practiceService = {
  submitAttempt: (payload) => api.post('/practice/attempts', payload).then((r) => r.data.data),
  getHistory: (params) => api.get('/practice/history', { params }).then((r) => r.data.data),
  getStats: () => api.get('/practice/stats').then((r) => r.data.data.stats),
  getTopicStats: (topicId) => api.get(`/practice/topics/${topicId}/stats`).then((r) => r.data.data.stats),
};

export const adminService = {
  getStats: () => api.get('/admin/stats').then((r) => r.data.data),

  // Categories
  createCategory: (payload) => api.post('/admin/categories', payload).then((r) => r.data.data.category),
  updateCategory: (id, payload) => api.patch(`/admin/categories/${id}`, payload).then((r) => r.data.data.category),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`).then((r) => r.data.data),

  // Subjects
  createSubject: (payload) => api.post('/admin/subjects', payload).then((r) => r.data.data.subject),
  updateSubject: (id, payload) => api.patch(`/admin/subjects/${id}`, payload).then((r) => r.data.data.subject),
  deleteSubject: (id) => api.delete(`/admin/subjects/${id}`).then((r) => r.data.data),

  // Topics
  createTopic: (payload) => api.post('/admin/topics', payload).then((r) => r.data.data.topic),
  updateTopic: (id, payload) => api.patch(`/admin/topics/${id}`, payload).then((r) => r.data.data.topic),
  deleteTopic: (id) => api.delete(`/admin/topics/${id}`).then((r) => r.data.data),

  // Questions
  getQuestions: (params) => api.get('/admin/questions', { params }).then((r) => r.data.data),
  createQuestion: (payload) => api.post('/admin/questions', payload).then((r) => r.data.data.question),
  updateQuestion: (id, payload) => api.patch(`/admin/questions/${id}`, payload).then((r) => r.data.data.question),
  deleteQuestion: (id) => api.delete(`/admin/questions/${id}`).then((r) => r.data.data),

  // External Problems Import & Management
  importExternalProblems: (payload) => api.post('/admin/external-problems/import', payload).then((r) => r.data.data),

  // AI Question Generator
  generateQuestions: (payload) => api.post('/admin/questions/generate', payload).then((r) => r.data.data),
  getReviewQueue: (params) => api.get('/admin/questions/review', { params }).then((r) => r.data.data),
  reviewQuestion: (id, payload) => api.patch(`/admin/questions/${id}/review`, payload).then((r) => r.data.data),

  // Bulk Question Import
  bulkImportQuestions: (payload) => api.post('/admin/questions/import', payload).then((r) => r.data.data),

  // Jobs and Batches
  getGenerationJobs: () => api.get('/admin/generation-jobs').then((r) => r.data.data.jobs),
  getImportBatches: () => api.get('/admin/import-batches').then((r) => r.data.data.batches),

  // Phase 3: Admin Assessment Management
  getAssessments: (params) => api.get('/admin/assessments', { params }).then((r) => r.data.data.assessments),
  getAssessmentById: (id) => api.get(`/admin/assessments/${id}`).then((r) => r.data.data.assessment),
  createAssessment: (payload) => api.post('/admin/assessments', payload).then((r) => r.data.data.assessment),
  updateAssessment: (id, payload) => api.patch(`/admin/assessments/${id}`, payload).then((r) => r.data.data.assessment),
  deleteAssessment: (id) => api.delete(`/admin/assessments/${id}`).then((r) => r.data.data),
  getAssessmentResults: (params) => api.get('/admin/assessment-results', { params }).then((r) => r.data.data),
  getAssessmentStats: () => api.get('/admin/assessment-stats').then((r) => r.data.data),
};

export const externalProblemService = {
  getProblems: (params) => api.get('/external-problems', { params }).then((r) => r.data.data),
  getProblemById: (id) => api.get(`/external-problems/${id}`).then((r) => r.data.data.problem),
  getMyProgress: () => api.get('/external-problems/progress/me').then((r) => r.data.data.progress),
  updateProgress: (id, payload) => api.patch(`/external-problems/${id}/progress`, payload).then((r) => r.data.data.progress),
};

export const assessmentService = {
  getAssessments: (params) => api.get('/assessments', { params }).then((r) => r.data.data.assessments),
  getAssessmentById: (templateId) => api.get(`/assessments/${templateId}`).then((r) => r.data.data.assessment),
  startAssessment: (templateId) => api.post(`/assessments/${templateId}/start`).then((r) => r.data.data),
  getSession: (sessionId) => api.get(`/assessment-sessions/${sessionId}`).then((r) => r.data.data),
  saveAnswers: (sessionId, payload) =>
    api.patch(`/assessment-sessions/${sessionId}/answers`, payload).then((r) => r.data.data),
  submitSession: (sessionId) =>
    api.post(`/assessment-sessions/${sessionId}/submit`).then((r) => r.data.data),
  getSessionResult: (sessionId) =>
    api.get(`/assessment-sessions/${sessionId}/result`).then((r) => r.data.data),
  getSessionReview: (sessionId) =>
    api.get(`/assessment-sessions/${sessionId}/review`).then((r) => r.data.data),
  getHistory: (params) => api.get('/assessment-history', { params }).then((r) => r.data.data),
  getMySkillProfile: () => api.get('/skill-profiles/me').then((r) => r.data.data),
};

