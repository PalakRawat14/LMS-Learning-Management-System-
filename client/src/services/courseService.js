import api from './api';

export const courseService = {
  // Get all courses
  getAllCourses: async () => {
    const response = await api.get('/courses');
    return response.data;
  },

  // Get courses for current user (enrolled or teaching)
  getMyCourses: async () => {
    const response = await api.get('/courses/my-courses');
    return response.data;
  },

  // Get single course by ID
  getCourseById: async (id) => {
    const response = await api.get(`/courses/${id}`);
    return response.data.course || response.data;
  },

  // Alias for getCourseById for compatibility
  getCourse: async (id) => {
    const response = await api.get(`/courses/${id}`);
    return response.data.course || response.data;
  },

  // Create new course
  createCourse: async (courseData) => {
    const response = await api.post('/courses', courseData);
    return response.data;
  },

  // Update course
  updateCourse: async (id, courseData) => {
    const response = await api.put(`/courses/${id}`, courseData);
    return response.data;
  },

  // Delete course
  deleteCourse: async (id) => {
    const response = await api.delete(`/courses/${id}`);
    return response.data;
  },

  // Enroll in a course
  enrollInCourse: async (courseId) => {
    const response = await api.post(`/courses/${courseId}/enroll`);
    return response.data;
  },

  // Unenroll from a course
  unenrollFromCourse: async (courseId) => {
    const response = await api.post(`/courses/${courseId}/unenroll`);
    return response.data;
  },

  // Get enrolled students for a course (teachers and admins only)
  getEnrolledStudents: async (courseId) => {
    const response = await api.get(`/courses/${courseId}/students`);
    return response.data;
  }
};