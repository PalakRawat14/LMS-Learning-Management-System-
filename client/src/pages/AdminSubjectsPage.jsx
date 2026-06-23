import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { subjectService } from '../services/subjectService';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import { PlusIcon, BookOpenIcon, UserGroupIcon, TrashIcon, PencilIcon, XCircleIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

const COURSE_FIELDS = ['B.Tech', 'BCA', 'MBA', 'MSc', 'BTech CSE', 'BTech ECE', 'BTech Mechanical', 'Other'];

const AdminSubjectsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', courseField: '' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, subjectId: null, subjectName: '' });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/unauthorized');
      return;
    }
    fetchData();
  }, [user, navigate]);

  // Open create modal if URL has ?openCreate=true
  const location = useLocation();
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('openCreate') === 'true') {
        setFormData({ name: '', code: '', description: '', courseField: '' });
        setShowCreateModal(true);
      }
    } catch (e) {
      // ignore
    }
  }, [location.search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subjectsData, teachersRes] = await Promise.all([
        subjectService.getAllSubjects(),
        api.get('/admin/teachers')
      ]);
      setSubjects(subjectsData);
      setTeachers(teachersRes.data.filter(t => t.isActive));
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await subjectService.createSubject(formData);
      toast.success('Subject created successfully');
      setShowCreateModal(false);
      setFormData({ name: '', code: '', description: '', courseField: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create subject');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await subjectService.updateSubject(selectedSubject.id, formData);
      toast.success('Subject updated successfully');
      setShowEditModal(false);
      setSelectedSubject(null);
      setFormData({ name: '', code: '', description: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update subject');
    }
  };

  const openEditModal = (subject) => {
    setSelectedSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      courseField: subject.courseField || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = (subjectId, subjectName) => {
    setConfirmDialog({ isOpen: true, subjectId, subjectName });
  };

  const confirmDelete = async () => {
    try {
      await subjectService.deleteSubject(confirmDialog.subjectId);
      toast.success('Subject deleted successfully');
      setConfirmDialog({ isOpen: false, subjectId: null, subjectName: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete subject');
      setConfirmDialog({ isOpen: false, subjectId: null, subjectName: '' });
    }
  };

  const openAssignModal = (subject) => {
    setSelectedSubject(subject);
    setShowAssignModal(true);
  };

  const handleAssignTeacher = async (teacherId) => {
    try {
      await subjectService.assignTeacher(selectedSubject.id, teacherId);
      toast.success('Teacher assigned successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign teacher');
    }
  };

  const handleUnassignTeacher = async (teacherId) => {
    try {
      await subjectService.unassignTeacher(selectedSubject.id, teacherId);
      toast.success('Teacher unassigned successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unassign teacher');
    }
  };

  if (loading) return <LoadingSpinner />;

  const assignedTeacherIds = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.teachers?.map(t => t.id) || [];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Manage Subjects</h1>
        <button
          onClick={() => { setFormData({ name: '', code: '', description: '', courseField: '' }); setShowCreateModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Create Subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <BookOpenIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">No subjects yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Create your first subject to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <div key={subject.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{subject.name}</h3>
                  <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{subject.code}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${subject.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                  {subject.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {subject.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{subject.description}</p>
              )}

              {subject.courseField && (
                <div className="mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full font-medium">
                    {subject.courseField}
                  </span>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <UserGroupIcon className="w-4 h-4" />
                  <span>Teachers ({subject.teachers?.length || 0})</span>
                </div>
                {subject.teachers?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {subject.teachers.map((teacher) => (
                      <span key={teacher.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                        {teacher.firstName} {teacher.lastName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">No teachers assigned</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => openAssignModal(subject)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-lg transition-colors">
                  <UserGroupIcon className="w-3.5 h-3.5" />
                  Assign
                </button>
                <button onClick={() => openEditModal(subject)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors">
                  <PencilIcon className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => navigate(`/subjects/${subject.id}`)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
                >
                  <AcademicCapIcon className="w-3.5 h-3.5" />
                  View
                </button>
                <button onClick={() => handleDelete(subject.id, subject.name)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors ml-auto">
                  <TrashIcon className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Create Subject</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" placeholder="e.g., Mathematics" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Code *</label>
                <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" placeholder="e.g., MATH-101" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" placeholder="Optional description" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Field *</label>
                <select required value={formData.courseField} onChange={(e) => setFormData({ ...formData, courseField: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  <option value="">Select course field...</option>
                  {COURSE_FIELDS.map((field) => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Create</button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Edit Subject</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Code *</label>
                <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Field *</label>
                <select required value={formData.courseField} onChange={(e) => setFormData({ ...formData, courseField: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  <option value="">Select course field...</option>
                  {COURSE_FIELDS.map((field) => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Update</button>
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Assign Teachers</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Subject: <span className="font-medium">{selectedSubject.name}</span></p>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currently Assigned:</h4>
              {selectedSubject.teachers?.length > 0 ? (
                <div className="space-y-2">
                  {selectedSubject.teachers.map((teacher) => (
                    <div key={teacher.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-800 dark:text-white">{teacher.firstName} {teacher.lastName} ({teacher.email})</span>
                      <button onClick={() => handleUnassignTeacher(teacher.id)} className="text-red-600 hover:text-red-800 dark:text-red-400">
                        <XCircleIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No teachers assigned yet</p>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Teacher:</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {teachers.filter(t => !assignedTeacherIds(selectedSubject.id).includes(t.id)).map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => handleAssignTeacher(teacher.id)}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                  >
                    {teacher.firstName} {teacher.lastName} ({teacher.email})
                  </button>
                ))}
                {teachers.filter(t => !assignedTeacherIds(selectedSubject.id).includes(t.id)).length === 0 && (
                  <p className="text-sm text-gray-400 italic">All teachers are already assigned</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <button onClick={() => setShowAssignModal(false)} className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, subjectId: null, subjectName: '' })}
        onConfirm={confirmDelete}
        title="Delete Subject"
        message={`Are you sure you want to delete "${confirmDialog.subjectName}"?\n\nThis will also remove all teacher assignments and associated materials/assignments.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default AdminSubjectsPage;
