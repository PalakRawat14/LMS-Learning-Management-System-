import api from './api';

export const assignmentService = {
  // Create new assignment
  createAssignment: async (assignmentData) => {
    // Check if assignmentData is already FormData
    const formData = assignmentData instanceof FormData 
      ? assignmentData 
      : new FormData();
    
    // Only append fields if not already FormData
    if (!(assignmentData instanceof FormData)) {
      formData.append('title', assignmentData.title);
      formData.append('description', assignmentData.description);
      formData.append('dueDate', assignmentData.dueDate);
      formData.append('totalPoints', assignmentData.totalPoints);
      formData.append('courseId', assignmentData.courseId);
      
      // Append files if any
      if (assignmentData.files && assignmentData.files.length > 0) {
        for (let file of assignmentData.files) {
          formData.append('files', file);
        }
      }
    }

    const response = await api.post('/assignments', formData);
    return response.data;
  },

  // Get all assignments for a course
  getCourseAssignments: async (courseId) => {
    const response = await api.get(`/assignments/course/${courseId}`);
    return response.data;
  },

  // Get a single assignment
  getAssignment: async (assignmentId) => {
    const response = await api.get(`/assignments/${assignmentId}`);
    return response.data;
  },

  // Submit assignment (for students)
  submitAssignment: async (assignmentId, submissionData) => {
    const formData = new FormData();
    
    if (submissionData.content) {
      formData.append('content', submissionData.content);
    }
    
    if (submissionData.files && submissionData.files.length > 0) {
      for (let file of submissionData.files) {
        formData.append('files', file);
      }
    }

    const response = await api.post(`/assignments/${assignmentId}/submit`, formData);
    return response.data;
  },

  // Get all submissions for an assignment (for teachers)
  getAssignmentSubmissions: async (assignmentId) => {
    const response = await api.get(`/assignments/${assignmentId}/submissions`);
    return response.data;
  },

  // Export submission roster to Excel (for teachers)
  downloadSubmissionReport: async (assignmentId, fileName) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${api.defaults.baseURL}/assignments/${assignmentId}/submissions/export`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'assignment-submissions.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Grade submission (for teachers)
  gradeSubmission: async (submissionId, gradeData) => {
    const response = await api.post(`/assignments/submissions/${submissionId}/grade`, gradeData);
    return response.data;
  },

  // Get all assignments for the logged-in user
  getUserAssignments: async () => {
    const response = await api.get('/assignments/user/all');
    return response.data;
  },

  // Get assignments dashboard data
  getAssignmentsDashboard: async () => {
    const response = await api.get('/assignments/dashboard');
    return response.data;
  },

  // Upload assignment
  uploadAssignment: async (formData) => {
    return api.post('/assignments', formData);
  },

  // Get assignments by course
  getAssignmentsByCourse: async (courseId) => {
    return api.get(`/courses/${courseId}/assignments`);
  },

  // Delete assignment (admin/teacher only)
  deleteAssignment: async (assignmentId) => {
    const response = await api.delete(`/assignments/${assignmentId}`);
    return response.data;
  }
  ,
  // Get direct download URL for an assignment attachment
  downloadAttachmentUrl: (fileName) => {
    return `${api.defaults.baseURL}/assignments/download/${fileName}`;
  },

  // Get direct download URL for an assignment attachment by index
  downloadAttachmentByIndexUrl: (assignmentId, attachmentIndex) => {
    return `${api.defaults.baseURL}/assignments/${assignmentId}/download/${attachmentIndex}`;
  }
};

export default assignmentService;