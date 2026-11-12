import api from './api';

export const interviewService = {
  async createInterview(data) {
    const res = await api.post('/interviews', data);
    return res.data.session;
  },

  async listInterviews() {
    const res = await api.get('/interviews');
    return res.data.sessions;
  },

  async getInterview(sessionId) {
    const res = await api.get(`/interviews/${sessionId}`);
    return res.data;
  },

  async startInterview(sessionId) {
    const res = await api.post(`/interviews/${sessionId}/start`);
    return res.data;
  },

  async getCurrentQuestion(sessionId) {
    const res = await api.get(`/interviews/${sessionId}/current-question`);
    return res.data;
  },

  async submitAnswer(sessionId, { questionId, answerText, responseDurationSeconds }) {
    const res = await api.post(`/interviews/${sessionId}/answer`, {
      questionId,
      answerText,
      responseDurationSeconds,
    });
    return res.data;
  },

  async completeInterview(sessionId) {
    const res = await api.post(`/interviews/${sessionId}/complete`);
    return res.data;
  },

  async abandonInterview(sessionId) {
    const res = await api.post(`/interviews/${sessionId}/abandon`);
    return res.data;
  },

  async getInterviewReport(sessionId) {
    const res = await api.get(`/interviews/${sessionId}/report`);
    return res.data;
  },

  async getInterviewReview(sessionId) {
    const res = await api.get(`/interviews/${sessionId}/review`);
    return res.data.reviewItems;
  },

  async getInterviewAnalytics() {
    const res = await api.get('/interviews/analytics');
    return res.data.analytics;
  },
};

