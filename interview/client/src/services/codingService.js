import api from './api';

export const codingService = {
  // Student API
  async listProblems(params = {}) {
    const res = await api.get('/coding/problems', { params });
    return res.data;
  },

  async getProblem(id) {
    const res = await api.get(`/coding/problems/${id}`);
    return res.data;
  },

  async runCode(problemId, { sourceCode, language }) {
    const res = await api.post(`/coding/problems/${problemId}/run`, {
      sourceCode,
      language,
    });
    return res.data;
  },

  async submitCode(problemId, { sourceCode, language }) {
    const res = await api.post(`/coding/problems/${problemId}/submit`, {
      sourceCode,
      language,
    });
    return res.data;
  },

  async getCodeDraft(problemId, language) {
    const res = await api.get(`/coding/problems/${problemId}/draft`, {
      params: { language },
    });
    return res.data.draft;
  },

  async saveCodeDraft(problemId, { sourceCode, language }) {
    const res = await api.put(`/coding/problems/${problemId}/draft`, {
      sourceCode,
      language,
    });
    return res.data.draft;
  },

  async listSubmissions(params = {}) {
    const res = await api.get('/coding/submissions', { params });
    return res.data;
  },

  async getSubmission(id) {
    const res = await api.get(`/coding/submissions/${id}`);
    return res.data.submission;
  },

  async getCodingAnalytics() {
    const res = await api.get('/coding/analytics');
    return res.data.analytics;
  },

  // Admin API
  async adminCreateProblem(data) {
    const res = await api.post('/admin/coding/problems', data);
    return res.data.problem;
  },

  async adminUpdateProblem(id, data) {
    const res = await api.patch(`/admin/coding/problems/${id}`, data);
    return res.data.problem;
  },

  async adminAddTestCase(problemId, data) {
    const res = await api.post(`/admin/coding/problems/${problemId}/testcases`, data);
    return res.data.testCase;
  },
};

