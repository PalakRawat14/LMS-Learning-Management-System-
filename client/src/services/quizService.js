import api from './api';

export const quizService = {
  // Get all quizzes for a course
  getCourseQuizzes: async (courseId) => {
    const response = await api.get(`/courses/${courseId}/quizzes`);
    return response.data;
  },

  // Get a single quiz
  getQuiz: async (courseId, quizId) => {
    const response = await api.get(`/courses/${courseId}/quizzes/${quizId}`);
    return response.data;
  },

  // Create new quiz
  createQuiz: async (courseId, quizData) => {
    const response = await api.post(`/courses/${courseId}/quizzes`, quizData);
    return response.data;
  },

  // Update quiz
  updateQuiz: async (courseId, quizId, quizData) => {
    const response = await api.put(
      `/courses/${courseId}/quizzes/${quizId}`,
      quizData
    );
    return response.data;
  },

  // Delete quiz
  deleteQuiz: async (courseId, quizId) => {
    const response = await api.delete(`/courses/${courseId}/quizzes/${quizId}`);
    return response.data;
  },

  // Start quiz attempt
  startQuizAttempt: async (courseId, quizId) => {
    const response = await api.post(
      `/courses/${courseId}/quizzes/${quizId}/attempts`
    );
    return response.data;
  },

  // Submit quiz attempt
  submitQuizAttempt: async (courseId, quizId, attemptId, answers) => {
    const response = await api.post(
      `/courses/${courseId}/quizzes/${quizId}/attempts/${attemptId}/submit`,
      { answers }
    );
    return response.data;
  },

  // Get quiz attempt
  getQuizAttempt: async (courseId, quizId, attemptId) => {
    const response = await api.get(
      `/courses/${courseId}/quizzes/${quizId}/attempts/${attemptId}`
    );
    return response.data;
  },

  // Get quiz results
  getQuizResults: async (courseId, quizId) => {
    const response = await api.get(
      `/courses/${courseId}/quizzes/${quizId}/results`
    );
    return response.data;
  },
};