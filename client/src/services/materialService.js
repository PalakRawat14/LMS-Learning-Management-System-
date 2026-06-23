import api from './api';

const materialService = {
  // Upload material
  uploadMaterial: async (courseId, materialData, file) => {
    const formData = new FormData();
    formData.append('courseId', courseId);
    formData.append('title', materialData.title);
    formData.append('description', materialData.description || '');
    formData.append('type', materialData.type);
    if (materialData.dueDate) {
      formData.append('dueDate', materialData.dueDate);
    }
    formData.append('file', file);

    const response = await api.post('/materials/upload', formData);
    return response.data;
  },

  // Get materials for a course
  getCourseMaterials: async (courseId, type = null) => {
    const params = type ? { type } : {};
    const response = await api.get(`/materials/course/${courseId}`, { params });
    return response.data;
  },

  // Get material details
  getMaterialDetails: async (materialId) => {
    const response = await api.get(`/materials/${materialId}`);
    return response.data;
  },

  // Download material
  downloadMaterial: async (materialId, originalName) => {
    const response = await api.get(`/materials/${materialId}/download`, {
      responseType: 'blob',
    });
    
    // Create blob URL and trigger download
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', originalName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  },

  // Update material
  updateMaterial: async (materialId, materialData) => {
    const response = await api.put(`/materials/${materialId}`, materialData);
    return response.data;
  },

  // Delete material
  deleteMaterial: async (materialId) => {
    const response = await api.delete(`/materials/${materialId}`);
    return response.data;
  },

  // Get file type icon based on mime type or extension
  getFileIcon: (mimeType, extension) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || extension === '.doc' || extension === '.docx') return '📝';
    if (mimeType.includes('powerpoint') || extension === '.ppt' || extension === '.pptx') return '📊';
    if (mimeType.includes('excel') || extension === '.xls' || extension === '.xlsx') return '📈';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    if (mimeType.includes('text')) return '📋';
    return '📁';
  },

  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Get material type color
  getTypeColor: (type) => {
    const colors = {
      assignment: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      notes: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      lecture: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      reference: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colors[type] || colors.other;
  }
};

export default materialService;