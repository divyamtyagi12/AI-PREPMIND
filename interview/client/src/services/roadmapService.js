import api from './api';

export async function generateRoadmap(data) {
  const res = await api.post('/roadmaps/generate', data);
  return res.data.data;
}

export async function getActiveRoadmap() {
  const res = await api.get('/roadmaps/active');
  return res.data.data;
}

export async function getRoadmapById(id) {
  const res = await api.get(`/roadmaps/${id}`);
  return res.data.data;
}

export async function updateRoadmapSettings(id, data) {
  const res = await api.patch(`/roadmaps/${id}/settings`, data);
  return res.data.data;
}

export async function replanRoadmap(id, data) {
  const res = await api.post(`/roadmaps/${id}/replan`, data);
  return res.data.data;
}

export async function pauseRoadmap(id) {
  const res = await api.post(`/roadmaps/${id}/pause`);
  return res.data.data;
}

export async function resumeRoadmap(id) {
  const res = await api.post(`/roadmaps/${id}/resume`);
  return res.data.data;
}

export async function getRoadmapTasks(id, params) {
  const res = await api.get(`/roadmaps/${id}/tasks`, { params });
  return res.data.data;
}

export async function getTodayTasks(id) {
  const res = await api.get(`/roadmaps/${id}/tasks/today`);
  return res.data.data;
}

export async function getWeekTasks(id) {
  const res = await api.get(`/roadmaps/${id}/tasks/week`);
  return res.data.data;
}

export async function completeTask(taskId, notes = '') {
  const res = await api.post(`/roadmap-tasks/${taskId}/complete`, { notes });
  return res.data.data;
}

export async function skipTask(taskId) {
  const res = await api.post(`/roadmap-tasks/${taskId}/skip`);
  return res.data.data;
}

export async function rescheduleTask(taskId, scheduledDate) {
  const res = await api.post(`/roadmap-tasks/${taskId}/reschedule`, { scheduledDate });
  return res.data.data;
}

export async function getDueRevisions(roadmapId) {
  const res = await api.get('/revisions/due', { params: { roadmapId } });
  return res.data.data;
}

export async function completeRevision(revisionId, isSuccessful = true, masteryAtReview) {
  const res = await api.post(`/revisions/${revisionId}/complete`, { isSuccessful, masteryAtReview });
  return res.data.data;
}

export async function getRoadmapProgress(id) {
  const res = await api.get(`/roadmaps/${id}/progress`);
  return res.data.data;
}

export async function getRoadmapMilestones(id) {
  const res = await api.get(`/roadmaps/${id}/milestones`);
  return res.data.data;
}

export async function getRoadmapAnalytics(id) {
  const res = await api.get(`/roadmaps/${id}/analytics`);
  return res.data.data;
}

// ======================== ADMIN ========================

export async function getAdminPrerequisites() {
  const res = await api.get('/admin/roadmap/prerequisites');
  return res.data.data;
}

export async function addAdminPrerequisite(data) {
  const res = await api.post('/admin/roadmap/prerequisites', data);
  return res.data.data;
}

export async function deleteAdminPrerequisite(id) {
  const res = await api.delete(`/admin/roadmap/prerequisites/${id}`);
  return res.data.data;
}

export async function getAdminRoadmapConfig() {
  const res = await api.get('/admin/roadmap/config');
  return res.data.data;
}

export async function updateAdminRoadmapConfig(data) {
  const res = await api.patch('/admin/roadmap/config', data);
  return res.data.data;
}

