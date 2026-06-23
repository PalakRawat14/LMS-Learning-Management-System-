import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { subjectService } from '../services/subjectService';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import AdminCourseList from '../components/admin/AdminCourseList';
import AttachExistingFileModal from '../components/admin/AttachExistingFileModal';
import { 
  UserPlusIcon, 
  UserGroupIcon, 
  XCircleIcon,
  ClockIcon,
  BookOpenIcon,
  PlusIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';

const COURSE_FIELDS = ['B.Tech', 'BCA', 'MBA', 'MSc', 'BTech CSE', 'BTech ECE', 'BTech Mechanical', 'Other'];

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    courseField: ''
  });
  const [subjectFormData, setSubjectFormData] = useState({
    name: '',
    code: '',
    description: '',
    courseField: ''
  });
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    teacherId: null,
    teacherName: ''
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/unauthorized');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teachersRes, invitationsRes] = await Promise.all([
        api.get('/admin/teachers'),
        api.get('/admin/teachers/invitations')
      ]);
      setTeachers(teachersRes.data);
      setInvitations(invitationsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteTeacher = async (e) => {
    e.preventDefault();
    try {
      // Validate courseField
      if (!formData.courseField) {
        setError('Please select a course field');
        return;
      }

      const response = await api.post('/admin/teachers/invite', formData);
      setSuccess(`Invitation sent to ${formData.email}`);
      setShowInviteModal(false);
      setFormData({ email: '', firstName: '', lastName: '', courseField: '' });
      fetchData();
      
      // Show invitation link
      alert(`Invitation Link:\n${response.data.invitationLink}\n\nShare this link with the teacher.`);
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invitation');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleCreateAndAssignSubject = async (e) => {
    e.preventDefault();
    try {
      if (!subjectFormData.name || !subjectFormData.code || !subjectFormData.courseField) {
        setError('Please fill in all required subject fields');
        return;
      }

      if (selectedTeacherIds.length === 0) {
        setError('Select at least one teacher to assign');
        return;
      }

      const subject = await subjectService.createSubject(subjectFormData);
      const subjectId = subject?.id;

      if (!subjectId) {
        throw new Error('Subject was created but no subject id was returned');
      }

      await Promise.all(selectedTeacherIds.map((teacherId) => subjectService.assignTeacher(subjectId, teacherId)));

      setSuccess(`Subject ${subjectFormData.name} created and assigned successfully`);
      setShowSubjectModal(false);
      setSubjectFormData({ name: '', code: '', description: '', courseField: '' });
      setSelectedTeacherIds([]);
      fetchData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Error creating and assigning subject:', err);
      setError(err.response?.data?.message || 'Failed to create and assign subject');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleToggleTeacherStatus = async (teacherId) => {
    try {
      await api.patch(`/admin/teachers/${teacherId}/toggle-status`);
      setSuccess('Teacher status updated successfully');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to update teacher status');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteTeacher = (teacherId, teacherName) => {
    setConfirmDialog({
      isOpen: true,
      teacherId,
      teacherName
    });
  };

  const confirmDeleteTeacher = async () => {
    try {
      await api.delete(`/admin/teachers/${confirmDialog.teacherId}`);
      setSuccess('Teacher deleted successfully');
      setConfirmDialog({ isOpen: false, teacherId: null, teacherName: '' });
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete teacher');
      setConfirmDialog({ isOpen: false, teacherId: null, teacherName: '' });
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleRevokeInvitation = async (invitationId) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    
    try {
      await api.delete(`/admin/teachers/invitations/${invitationId}`);
      setSuccess('Invitation revoked successfully');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to revoke invitation');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) return <LoadingSpinner />;

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  const activeTeachers = teachers.filter(t => t.isActive);
  const inactiveTeachers = teachers.filter(t => !t.isActive);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Admin Dashboard
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlusIcon className="w-5 h-5" />
            Invite Teacher
          </button>
          <button
            onClick={() => setShowSubjectModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <BookOpenIcon className="w-5 h-5" />
            Create & Assign Subject
          </button>
          <button
            onClick={() => setShowAttachModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PaperClipIcon className="w-5 h-5" />
            Attach Upload
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <UserGroupIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Teachers</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{activeTeachers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <ClockIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Invitations</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{pendingInvitations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <XCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inactive Teachers</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{inactiveTeachers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* All Courses List with Edit Teacher */}
      <AdminCourseList teachers={activeTeachers} />

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Pending Invitations
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Invited On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pendingInvitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                      {invitation.firstName} {invitation.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {invitation.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teachers List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Registered Teachers
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                    {teacher.firstName} {teacher.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {teacher.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      teacher.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {teacher.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {new Date(teacher.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleTeacherStatus(teacher.id)}
                        className={`w-28 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          teacher.isActive 
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50' 
                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                        }`}
                      >
                        {teacher.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(teacher.id, `${teacher.firstName} ${teacher.lastName}`)}
                        className="w-20 px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Teacher Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Invite Teacher
            </h3>
            <form onSubmit={handleInviteTeacher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Course Field / Domain *
                </label>
                <select
                  required
                  value={formData.courseField}
                  onChange={(e) => setFormData({ ...formData, courseField: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a course field</option>
                  {COURSE_FIELDS.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Invitation
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create & Assign Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Create and Assign Subject
            </h3>
            <form onSubmit={handleCreateAndAssignSubject} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectFormData.name}
                    onChange={(e) => setSubjectFormData({ ...subjectFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Data Structures"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectFormData.code}
                    onChange={(e) => setSubjectFormData({ ...subjectFormData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., CS-201"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={subjectFormData.description}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Optional subject description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Course Field *
                </label>
                <select
                  required
                  value={subjectFormData.courseField}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, courseField: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a course field</option>
                  {COURSE_FIELDS.map((field) => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assign to Teachers *
                </label>
                <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 bg-gray-50 dark:bg-gray-900/30">
                  {activeTeachers.length > 0 ? activeTeachers.map((teacher) => (
                    <label key={teacher.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
                      <input
                        type="checkbox"
                        checked={selectedTeacherIds.includes(teacher.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeacherIds([...selectedTeacherIds, teacher.id]);
                          } else {
                            setSelectedTeacherIds(selectedTeacherIds.filter((id) => id !== teacher.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {teacher.firstName} {teacher.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{teacher.email}</p>
                      </div>
                    </label>
                  )) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No active teachers available.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <PlusIcon className="w-4 h-4 inline mr-2" />
                  Create and Assign
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubjectModal(false);
                    setSubjectFormData({ name: '', code: '', description: '', courseField: '' });
                    setSelectedTeacherIds([]);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Teacher Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, teacherId: null, teacherName: '' })}
        onConfirm={confirmDeleteTeacher}
        title="Delete Teacher"
        message={`Are you sure you want to delete "${confirmDialog.teacherName}"?\n\nThis action cannot be undone. The teacher must not have any courses assigned to them.`}
        confirmText="Delete Teacher"
        cancelText="Cancel"
        type="danger"
      />

      <AttachExistingFileModal
        isOpen={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        onAttached={(message) => {
          setSuccess(message || 'File attached successfully');
          setTimeout(() => setSuccess(null), 4000);
        }}
      />
    </div>
  );
};

export default AdminDashboardPage;
