import api from './api';

export const subjectService = {
  getAllSubjects: async () => {
    const res = await api.get('/subjects');
    return res.data;
  },

  getSubjectById: async (id) => {
    const res = await api.get(`/subjects/${id}`);
    return res.data;
  },

  createSubject: async (data) => {
    const res = await api.post('/subjects', data);
    return res.data;
  },

  updateSubject: async (id, data) => {
    const res = await api.put(`/subjects/${id}`, data);
    return res.data;
  },

  deleteSubject: async (id) => {
    const res = await api.delete(`/subjects/${id}`);
    return res.data;
  },

  assignTeacher: async (subjectId, teacherId) => {
    const res = await api.post(`/subjects/${subjectId}/assign-teacher`, { teacherId });
    return res.data;
  },

  unassignTeacher: async (subjectId, teacherId) => {
    const res = await api.delete(`/subjects/${subjectId}/assign-teacher/${teacherId}`);
    return res.data;
  },

  getSubjectMaterials: async (subjectId) => {
    const res = await api.get(`/subjects/${subjectId}/materials`);
    return res.data;
  },

  getSubjectMaterialsForStudent: async () => {
    const res = await api.get('/subjects/materials/all-student');
    return res.data;
  },

  uploadMaterial: async (subjectId, formData) => {
    const res = await api.post(`/subjects/${subjectId}/materials`, formData);
    return res.data;
  },

  downloadMaterial: (materialId) => {
    return `${api.defaults.baseURL}/materials/${materialId}/download`;
  },

  deleteMaterial: async (subjectId, materialId) => {
    const res = await api.delete(`/subjects/${subjectId}/materials/${materialId}`);
    return res.data;
  },

  getSubjectAssignments: async (subjectId) => {
    const res = await api.get(`/subjects/${subjectId}/assignments`);
    return res.data;
  },

  getSubjectAssignmentsForStudent: async () => {
    const res = await api.get('/subjects/assignments/all-student');
    return res.data;
  },

  createAssignment: async (subjectId, data) => {
    const res = await api.post(`/subjects/${subjectId}/assignments`, data);
    return res.data;
  },

  deleteAssignment: async (subjectId, assignmentId) => {
    const res = await api.delete(`/subjects/${subjectId}/assignments/${assignmentId}`);
    return res.data;
  },

  downloadAssignmentAttachment: (subjectId, assignmentId, attachmentIndex) => {
    return `${api.defaults.baseURL}/subjects/${subjectId}/assignments/${assignmentId}/download/${attachmentIndex}`;
  },

  downloadAssignmentAttachmentFile: async (subjectId, assignmentId, attachmentIndex, fileName) => {
    const token = localStorage.getItem('token');
    const response = await fetch(subjectService.downloadAssignmentAttachment(subjectId, assignmentId, attachmentIndex), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  submitAssignment: async (assignmentId, formData) => {
    const res = await api.post(`/subjects/assignments/${assignmentId}/submit`, formData);
    return res.data;
  },

  getMySubmissions: async () => {
    const res = await api.get('/subjects/submissions/my');
    return res.data;
  },

  getMyAssignmentSubmission: async (assignmentId) => {
    const res = await api.get(`/subjects/assignments/${assignmentId}/my-submission`);
    return res.data;
  },

  getAssignmentSubmissions: async (assignmentId) => {
    const res = await api.get(`/subjects/assignments/${assignmentId}/submissions`);
    return res.data;
  },

  downloadAssignmentSubmissionReport: async (assignmentId, fileName) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${api.defaults.baseURL}/subjects/assignments/${assignmentId}/submissions/export`, {
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
    link.download = fileName || 'subject-assignment-submissions.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  getAllTeacherSubjectSubmissions: async () => {
    const res = await api.get('/subjects/submissions/teacher-all');
    return res.data;
  },

  downloadSubmissionAttachment: (submissionId, attachmentIndex) => {
    return `${api.defaults.baseURL}/subjects/submissions/${submissionId}/download/${attachmentIndex}`;
  },

  downloadSubmissionAttachmentFile: async (submissionId, attachmentIndex, fileName) => {
    const token = localStorage.getItem('token');
    const response = await fetch(subjectService.downloadSubmissionAttachment(submissionId, attachmentIndex), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'submission-file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  gradeSubmission: async (submissionId, data) => {
    const res = await api.post(`/subjects/submissions/${submissionId}/grade`, data);
    return res.data;
  }
};
