import api from './api';

export const tutorService = {
  // Student API
  async getQuota() {
    const res = await api.get('/tutor/quota');
    return res.data;
  },

  async listConversations() {
    const res = await api.get('/tutor/conversations');
    return res.data.conversations;
  },

  async createConversation(data = {}) {
    const res = await api.post('/tutor/conversations', data);
    return res.data.conversation;
  },

  async createQuickContext(type, referenceId) {
    const res = await api.post('/tutor/quick-context', { type, referenceId });
    return res.data;
  },

  async getConversation(id) {
    const res = await api.get(`/tutor/conversations/${id}`);
    return res.data;
  },

  async sendMessage(id, { message, mode, hintLevel }) {
    const res = await api.post(`/tutor/conversations/${id}/messages`, {
      message,
      mode,
      hintLevel,
    });
    return res.data;
  },

  async deleteConversation(id) {
    const res = await api.delete(`/tutor/conversations/${id}`);
    return res.data;
  },

  // Admin API
  async getAdminConfig() {
    const res = await api.get('/admin/tutor/config');
    return res.data.config;
  },

  async updateAdminConfig(data) {
    const res = await api.patch('/admin/tutor/config', data);
    return res.data.config;
  },

  async getAdminAnalytics() {
    const res = await api.get('/admin/tutor/analytics');
    return res.data.analytics;
  },
};

