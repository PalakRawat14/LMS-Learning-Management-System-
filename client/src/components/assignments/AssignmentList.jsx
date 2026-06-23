import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { assignmentService } from '../../services/assignmentService';
import LoadingSpinner from '../LoadingSpinner';
import ConfirmDialog from '../ConfirmDialog';

const normalizeAttachments = (attachments) => {
  if (Array.isArray(attachments)) return attachments;

  if (typeof attachments === 'string') {
    try {
      const parsed = JSON.parse(attachments);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const AssignmentCard = ({ assignment, courseId, userRole, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dueDate = new Date(assignment.dueDate);
  const now = new Date();
  const isOverdue = dueDate < now;
  const timeUntilDue = dueDate - now;
  const daysUntilDue = Math.ceil(timeUntilDue / (1000 * 60 * 60 * 24));
  
  const isAdmin = userRole === 'admin';
  const isTeacher = userRole === 'teacher' || userRole === 'instructor';

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleExportReport = async () => {
    try {
      await assignmentService.downloadSubmissionReport(
        assignment.id,
        `${assignment.title || 'assignment'}-submissions.xlsx`
      );
      toast.success('Excel report downloaded');
    } catch (error) {
      console.error('Error exporting submission report:', error);
      toast.error('Failed to export submission report');
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await assignmentService.deleteAssignment(assignment.id);
      toast.success('Assignment deleted successfully');
      setShowDeleteConfirm(false);
      if (onDelete) {
        onDelete(assignment.id);
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to delete assignment');
    } finally {
      setDeleting(false);
    }
  };
  
  // Determine status based on submission and due date
  const getStatus = () => {
    if (assignment.submitted) return 'Submitted';
    if (isOverdue) return 'Overdue';
    if (daysUntilDue <= 1) return 'Due Soon';
    return 'Pending';
  };

  const status = getStatus();
  
  const statusColors = {
    Submitted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    Overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'Due Soon': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    Pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  };

  const formatTimeRemaining = () => {
    if (isOverdue) return 'Overdue';
    if (daysUntilDue === 0) return 'Due today';
    if (daysUntilDue === 1) return 'Due tomorrow';
    return `${daysUntilDue} days remaining`;
  };

  const downloadAttachment = async (attachment, index) => {
    try {
      const fileName = typeof attachment === 'string'
        ? attachment
        : (attachment.originalName || attachment.filename || attachment.fileName || 'download');

      const downloadUrl = assignmentService.downloadAttachmentByIndexUrl(assignment.id, index);
      const token = localStorage.getItem('token');

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download attachment');
    }
  };

  const attachmentList = normalizeAttachments(assignment.attachments);

  return (
    <div className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-sm border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 p-6 overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <div className="relative flex justify-between items-start mb-4">
        <div className="flex-1 pr-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <h3 className="relative text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                {assignment.title}
              </h3>
            </div>
            {assignment.attachments && assignment.attachments.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-sm font-medium">{assignment.attachments.length}</span>
              </div>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2 leading-relaxed">
            {assignment.description}
          </p>
        </div>
        <span className={`relative px-4 py-2 rounded-full text-sm font-semibold shadow-sm flex-shrink-0 ${statusColors[status]} ring-2 ring-offset-2 dark:ring-offset-gray-800 ${
          status === 'Submitted' ? 'ring-green-500/20' :
          status === 'Overdue' ? 'ring-red-500/20' :
          status === 'Due Soon' ? 'ring-orange-500/20' : 'ring-blue-500/20'
        } group-hover:scale-105 transition-transform duration-300`}>
          {status}
        </span>
      </div>

      {/* Assignment Details */}
      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-sm">
        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Due Date</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {dueDate.toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group-hover:bg-purple-50 dark:group-hover:bg-purple-900/20 transition-colors">
          <div className="flex-shrink-0 mt-0.5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-lg ${
              isOverdue ? 'bg-gradient-to-br from-red-500 to-red-600' :
              daysUntilDue <= 1 ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
              'bg-gradient-to-br from-green-500 to-green-600'
            }`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Time Remaining</p>
            <p className={`font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : 
              daysUntilDue <= 1 ? 'text-orange-600 dark:text-orange-400' : 
              'text-green-600 dark:text-green-400'}`}>
              {formatTimeRemaining()}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20 transition-colors">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Points</p>
            <p className="font-bold text-gray-900 dark:text-white text-lg">
              {assignment.totalPoints}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">total points</p>
          </div>
        </div>
      </div>

      {attachmentList.length > 0 && (
        <div className="relative mb-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Attached Files</p>
          <div className="flex flex-wrap gap-2">
            {attachmentList.map((attachment, index) => {
              const fileName = typeof attachment === 'string'
                ? attachment
                : (attachment.originalName || attachment.filename || attachment.fileName || `attachment-${index + 1}`);

              return (
                <button
                  key={index}
                  onClick={() => downloadAttachment(attachment, index)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="text-sm font-medium truncate max-w-[220px]">{fileName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="relative flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/assignments/${assignment.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg shadow-md hover:shadow-xl transform hover:scale-[1.02] active:scale-95 transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </Link>

          {(isTeacher || isAdmin) && (
            <button
              onClick={handleExportReport}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 rounded-lg shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-95 transition-all duration-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Excel
            </button>
          )}
          
          {(isTeacher || isAdmin) && (
            <>
              <Link
                to={`/assignments/${assignment.id}#submissions`}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-95 transition-all duration-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Submissions ({assignment.submissionCount || 0})
              </Link>
              
              <button
                onClick={handleDeleteClick}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed rounded-lg shadow-md hover:shadow-xl transform hover:scale-[1.02] active:scale-95 transition-all duration-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Assignment"
        message={`Are you sure you want to delete "${assignment.title}"? This action cannot be undone and will also delete all student submissions.`}
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  );
};

const AssignmentList = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAssignments = async () => {
    try {
      const data = await assignmentService.getCourseAssignments(courseId);
      setAssignments(data.assignments || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError('Failed to fetch assignments. Please try again later.');
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchAssignments();
    }
  }, [courseId]);

  const handleDeleteAssignment = (deletedId) => {
    setAssignments(prev => prev.filter(a => a.id !== deletedId));
  };

  if (loading) return <LoadingSpinner />;

  const isTeacher = user?.role === 'teacher' || user?.role === 'instructor';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-2xl shadow-2xl p-8 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
        
        <div className="relative flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                Assignments
              </h1>
              <p className="text-blue-100 text-lg">
                {isTeacher ? 'Manage course assignments' : 'View and submit assignments'}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white text-sm font-medium">{assignments.length} Total</span>
                </div>
              </div>
            </div>
          </div>
          
          {isTeacher && (
            <Link
              to={`/courses/${courseId}/assignments/create`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-xl hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/50 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Create Assignment</span>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="relative bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-16 text-center overflow-hidden">
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #60a5fa 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          </div>
          
          {/* Content */}
          <div className="relative">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-xl animate-bounce-slow">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No Assignments Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto">
              {isTeacher 
                ? 'Start engaging your students by creating your first assignment.' 
                : 'Check back soon! Your instructor will post assignments here.'}
            </p>
            
            {isTeacher && (
              <Link
                to={`/courses/${courseId}/assignments/create`}
                className="inline-flex items-center gap-2 mt-8 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create First Assignment</span>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              courseId={courseId}
              userRole={user?.role}
              onDelete={handleDeleteAssignment}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentList;