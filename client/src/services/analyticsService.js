import api from './api';

export const analyticsService = {
  // Get overall analytics for admin dashboard
  getOverallAnalytics: async () => {
    const response = await api.get('/analytics/overall');
    return response.data;
  },

  // Get course analytics for instructor
  getCourseAnalytics: async (courseId) => {
    const response = await api.get(`/analytics/courses/${courseId}`);
    return response.data;
  },

  // Get student progress analytics
  getStudentProgress: async (courseId) => {
    const response = await api.get(`/analytics/courses/${courseId}/progress`);
    return response.data;
  },

  // Get assignment analytics
  getAssignmentAnalytics: async (courseId) => {
    const response = await api.get(`/analytics/courses/${courseId}/assignments`);
    return response.data;
  },

  // Get quiz analytics
  getQuizAnalytics: async (courseId) => {
    const response = await api.get(`/analytics/courses/${courseId}/quizzes`);
    return response.data;
  },

  // Get student performance trends
  getPerformanceTrends: async (courseId, studentId) => {
    const response = await api.get(
      `/analytics/courses/${courseId}/students/${studentId}/performance`
    );
    return response.data;
  },

  // Get engagement metrics
  getEngagementMetrics: async (courseId) => {
    const response = await api.get(`/analytics/courses/${courseId}/engagement`);
    return response.data;
  },
};