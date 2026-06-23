import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { assignmentService } from '../../services/assignmentService';
import LoadingSpinner from '../LoadingSpinner';

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

const AssignmentDetails = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [content, setContent] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  // Grading modal state
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  const isTeacher = user?.role === 'teacher' || user?.role === 'instructor';
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const assignmentData = await assignmentService.getAssignment(assignmentId);
        setAssignment(assignmentData.assignment);

        // If teacher or admin, fetch submissions
        if (isTeacher || isAdmin) {
          try {
            const submissionsData = await assignmentService.getAssignmentSubmissions(assignmentId);
            console.log('Submissions fetched:', submissionsData);
            setSubmissions(submissionsData.submissions || []);
          } catch (err) {
            console.error('Error fetching submissions:', err.response?.data || err.message);
            // Don't show error toast for no submissions, only for actual errors
            if (err.response?.status !== 404) {
              toast.error('Failed to load submissions');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching assignment:', err);
        setError('Failed to fetch assignment details. Please try again later.');
        toast.error('Failed to load assignment');
      } finally {
        setLoading(false);
      }
    };

    if (assignmentId) {
      fetchData();
    }
  }, [assignmentId, isTeacher, isAdmin]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files) {
          handleFiles(e.target.files);
          // Validate file type
          const invalidFiles = Array.from(e.target.files).filter(file => file.type !== 'application/pdf');
          if (invalidFiles.length > 0) {
            invalidFiles.forEach(file => {
              toast.error(`${file.name} is not a PDF file.`);
            });
          }
    }
  };

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList);
    const validFiles = newFiles.filter(file => {
        // 10MB limit
        if (file.size > 10 * 1024 * 1024) {
            toast.error(`${file.name} is too large. Maximum size is 10MB`);
            return false;
        }
        // Only allow PDFs
        if (file.type !== 'application/pdf') {
            toast.error(`${file.name} is not a PDF file.`);
            return false;
        }
        return true;
    });

    setFiles(prevFiles => [...prevFiles, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    
    if (files.length === 0) {
      toast.error('Please upload at least one file');
      return;
    }

    // Check if already submitted
    if (assignment.submitted || assignment.isSubmitted) {
      toast.error('You have already submitted this assignment');
      return;
    }

    setSubmitting(true);
    try {
      await assignmentService.submitAssignment(assignmentId, {
        files,
        content
      });
      toast.success('Assignment submitted successfully!');
      setFiles([]);
      setContent('');
      
      // Refresh assignment data to update submission status
      const assignmentData = await assignmentService.getAssignment(assignmentId);
      setAssignment(assignmentData.assignment);
      
      // Refresh submissions if teacher or admin
      if (isTeacher || isAdmin) {
        const submissionsData = await assignmentService.getAssignmentSubmissions(assignmentId);
        setSubmissions(submissionsData.submissions || []);
      }
      
      // For students, redirect to assignments list after a short delay
      if (isStudent) {
        setTimeout(() => {
          navigate('/assignments');
        }, 2000);
      }
    } catch (err) {
      console.error('Submit error:', err);
      // Handle specific error for already submitted
      if (err.response?.data?.error === 'ALREADY_SUBMITTED') {
        toast.error('You have already submitted this assignment. Multiple submissions are not allowed.');
        // Refresh to show the submitted state
        const assignmentData = await assignmentService.getAssignment(assignmentId);
        setAssignment(assignmentData.assignment);
      } else {
        toast.error(err.response?.data?.message || 'Failed to submit assignment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openGradeModal = (submission) => {
    setSelectedSubmission(submission);
    setGradeInput(submission.grade !== null ? submission.grade.toString() : '');
    setFeedbackInput(submission.feedback || '');
    setShowGradeModal(true);
  };

  const closeGradeModal = () => {
    setShowGradeModal(false);
    setSelectedSubmission(null);
    setGradeInput('');
  };

  const handleGradeSubmission = async (e) => {
    e.preventDefault();
    
    try {
      const grade = parseFloat(gradeInput);
      if (isNaN(grade) || grade < 0 || grade > assignment.totalPoints) {
        toast.error(`Grade must be between 0 and ${assignment.totalPoints}`);
        return;
      }

      await assignmentService.gradeSubmission(selectedSubmission.id, {
        grade,
        feedback: feedbackInput
      });

      // Refresh submissions
      const submissionsData = await assignmentService.getAssignmentSubmissions(assignmentId);
      setSubmissions(submissionsData.submissions || []);
      // Refresh assignment details as well (to update student view)
      const assignmentData = await assignmentService.getAssignment(assignmentId);
      setAssignment(assignmentData.assignment);
      
      toast.success('Grade submitted successfully!');
      closeGradeModal();
    } catch (error) {
      console.error('Grading error:', error);
      toast.error('Failed to submit grade. Please try again.');
    }
  };

  const downloadAttachment = async (attachment, index) => {
    try {
      const displayName = typeof attachment === 'string'
        ? attachment
        : (attachment.originalName || attachment.filename || attachment.fileName || 'download');

      const downloadUrl = index !== undefined
        ? assignmentService.downloadAttachmentByIndexUrl(assignmentId, index)
        : assignmentService.downloadAttachmentUrl(
            typeof attachment === 'string'
              ? attachment
              : (attachment.filename || attachment.fileName || attachment.originalName)
          );

      console.log('Downloading assignment file from:', downloadUrl);

      const token = localStorage.getItem('token');
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Download failed:', response.status, response.statusText);
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = displayName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('File downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file. Please check console for details.');
    }
  };

  const attachmentList = normalizeAttachments(assignment.attachments);

  if (loading) return <LoadingSpinner />;
  if (!assignment) return <div>Assignment not found</div>;

  const dueDate = new Date(assignment.dueDate);
  const now = new Date();
  const isOverdue = dueDate < now;
  const timeUntilDue = dueDate - now;
  const daysUntilDue = Math.ceil(timeUntilDue / (1000 * 60 * 60 * 24));

  const formatTimeRemaining = () => {
    if (isOverdue) return 'Overdue';
    if (daysUntilDue === 0) return 'Due today';
    if (daysUntilDue === 1) return 'Due tomorrow';
    return `${daysUntilDue} days remaining`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Assignment Header */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
        
        <div className="relative p-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6 mb-6">
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 leading-tight">
                    {assignment.title}
                  </h1>
                  {assignment.description && (
                    <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                      {assignment.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 lg:self-start">
              <Link
                to="/assignments"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back</span>
              </Link>
            </div>
          </div>
          
          {/* Assignment Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
            {/* Due Date Card */}
            <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-5 border-2 border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all transform hover:scale-105">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Due Date</h3>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {dueDate.toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Status Card */}
            <div className={`relative rounded-xl p-5 border-2 hover:shadow-lg transition-all transform hover:scale-105 ${
              isOverdue 
                ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700' 
                : daysUntilDue <= 1 
                ? 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-700'
                : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg shadow-md ${
                  isOverdue 
                    ? 'bg-gradient-to-br from-red-500 to-red-600' 
                    : daysUntilDue <= 1 
                    ? 'bg-gradient-to-br from-orange-500 to-orange-600'
                    : 'bg-gradient-to-br from-green-500 to-green-600'
                }`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                    isOverdue 
                      ? 'text-red-600 dark:text-red-400' 
                      : daysUntilDue <= 1 
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>Status</h3>
                  <p className={`text-lg font-bold ${
                    isOverdue 
                      ? 'text-red-700 dark:text-red-300' 
                      : daysUntilDue <= 1 
                      ? 'text-orange-700 dark:text-orange-300'
                      : 'text-green-700 dark:text-green-300'
                  }`}>
                    {formatTimeRemaining()}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Points Card */}
            <div className="relative bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-xl p-5 border-2 border-amber-200 dark:border-amber-700 hover:shadow-lg transition-all transform hover:scale-105">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Points</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {assignment.totalPoints}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Total Points
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Assignment Files */}
          {attachmentList.length > 0 && (
          <div className="mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Attached Files ({attachmentList.length})
              </h3>
            </div>
            <div className="grid gap-3">
              {attachmentList.map((attachment, index) => (
                <div
                  key={index}
                  className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700/50 dark:to-blue-900/20 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all transform hover:scale-[1.02]"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {attachment.originalName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {attachment.mimetype}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadAttachment(attachment, index)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all shadow-md hover:shadow-xl transform hover:scale-105 active:scale-95 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Teacher/Admin View - Submissions */}
      {(isTeacher || isAdmin) && (
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-blue-500/5 to-purple-500/5 pointer-events-none" />
          
          <div className="relative p-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Student Submissions
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'} received
                  </p>
                </div>
              </div>
              <Link
                to={`/assignments/${assignmentId}#submissions`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View All
              </Link>
            </div>
          
          {submissions.length === 0 ? (
            <div className="relative bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-700/30 dark:via-gray-700/30 dark:to-gray-700/30 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mb-5 shadow-lg animate-pulse">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                No Submissions Yet
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Students haven't submitted their work yet
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {submissions.slice(0, 5).map((submission) => (
                <div
                  key={submission.id}
                  className="group p-5 bg-gradient-to-r from-white to-blue-50 dark:from-gray-700/50 dark:to-blue-900/20 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl transition-all"
                >
                  {/* Student Info Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/50 group-hover:scale-110 transition-transform">
                          <span className="text-white font-bold text-lg">
                            {submission.User?.firstName?.charAt(0)}{submission.User?.lastName?.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {submission.User?.firstName} {submission.User?.lastName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(submission.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {submission.grade !== null ? (
                        <div className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-md ring-4 ring-green-100 dark:ring-green-900/50 font-bold flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{submission.grade}/{assignment.totalPoints}</span>
                        </div>
                      ) : (
                        <div className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-md ring-4 ring-amber-100 dark:ring-amber-900/50 font-bold flex items-center gap-2">
                          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Pending</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submission Content */}
                  {submission.content && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{submission.content}</p>
                    </div>
                  )}

                  {/* Attached Files */}
                  {submission.attachments && submission.attachments.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Attached Files ({submission.attachments.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {submission.attachments.map((file, index) => {
                          // Handle both string filenames and file objects
                          const fileName = typeof file === 'string' ? file : (file.originalName || file.filename || 'file');
                          
                          return (
                            <button
                              key={index}
                              onClick={() => downloadAttachment(file)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border-2 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm font-medium truncate max-w-[200px]">{fileName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Feedback Section (if graded) */}
                  {submission.feedback && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg mb-4">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">Teacher Feedback:</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{submission.feedback}</p>
                    </div>
                  )}

                  {/* Grade Button for Teachers */}
                  {(isTeacher || isAdmin) && (
                    <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => openGradeModal(submission)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-purple-500/50 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {submission.grade !== null ? 'Update Grade' : 'Grade Submission'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Student View - Submit Assignment */}
      {isStudent && !isOverdue && !assignment.submitted && (
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-blue-500/5 to-purple-500/5 pointer-events-none" />
          
          <div className="relative p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Submit Assignment
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Upload your work to complete this assignment
                </p>
              </div>
            </div>
          
          <form onSubmit={handleSubmitAssignment} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Assignment Files (Required)
              </label>
              
              <div
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all transform ${
                  dragActive
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 scale-105 shadow-2xl'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all ${
                  dragActive 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 scale-110' 
                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                }`}>
                  <svg className={`w-10 h-10 text-white transition-transform ${dragActive ? 'animate-bounce' : ''}`} stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                      Click to upload
                    </span>
                    <span className="text-lg text-gray-600 dark:text-gray-400"> or drag and drop</span>
                  </label>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    multiple
                    accept="application/pdf"
                    className="sr-only"
                    onChange={handleFileInput}
                  />
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>PDF files only • Maximum 10MB per file</span>
                </div>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selected Files ({files.length})
                  </h4>
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6 border-t-2 border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={submitting || files.length === 0}
                className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 font-bold text-lg"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Submit Assignment</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Already Submitted Message */}
      {isStudent && !isOverdue && assignment.submitted && (
        <div className="relative bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 dark:from-green-900/30 dark:via-green-800/30 dark:to-emerald-900/30 border-2 border-green-400 dark:border-green-600 rounded-2xl shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 pointer-events-none" />
          <div className="relative p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-5 shadow-lg ring-4 ring-green-200 dark:ring-green-900/50">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">
              Assignment Submitted
            </h3>
            <p className="text-lg text-green-600 dark:text-green-400 mb-4">
              You have successfully submitted this assignment.
            </p>
            {assignment.Submissions && assignment.Submissions[0] && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Submitted on: {new Date(assignment.Submissions[0].submittedAt).toLocaleString()}
                </span>
              </div>
            )}
            {assignment.Submissions && assignment.Submissions[0] && assignment.Submissions[0].grade !== null && (
              <div className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl border-2 border-purple-300 dark:border-purple-700">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">Your Grade</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {assignment.Submissions[0].grade}<span className="text-lg text-gray-500">/{assignment.totalPoints}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overdue Message */}
      {isStudent && isOverdue && !assignment.submitted && (
        <div className="relative bg-gradient-to-br from-red-50 via-red-100 to-orange-100 dark:from-red-900/30 dark:via-red-800/30 dark:to-orange-900/30 border-2 border-red-400 dark:border-red-600 rounded-2xl shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 pointer-events-none" />
          <div className="relative p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-5 shadow-lg animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-2">
              Assignment Overdue
            </h3>
            <p className="text-lg text-red-600 dark:text-red-400">
              The submission window for this assignment has closed.
            </p>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {showGradeModal && selectedSubmission && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
            onClick={closeGradeModal}
          ></div>

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full transform transition-all border-2 border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-t-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        Grade Submission
                      </h3>
                      <p className="text-purple-100 text-sm mt-1">
                        {selectedSubmission.User?.firstName} {selectedSubmission.User?.lastName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeGradeModal}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleGradeSubmission} className="p-6 space-y-6">
                {/* Grade Input */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Grade (out of {assignment.totalPoints})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={assignment.totalPoints}
                      step="0.5"
                      value={gradeInput}
                      onChange={(e) => setGradeInput(e.target.value)}
                      required
                      className="w-full px-4 py-3 text-lg font-semibold border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-purple-500/50 focus:border-purple-500 dark:bg-gray-700 dark:text-white transition-all"
                      placeholder="Enter grade..."
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-semibold">
                      / {assignment.totalPoints}
                    </div>
                  </div>
                  {gradeInput && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300"
                          style={{ width: `${(parseFloat(gradeInput) / assignment.totalPoints) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {((parseFloat(gradeInput) / assignment.totalPoints) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Feedback Input */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Feedback (optional)
                  </label>
                  <textarea
                    rows="3"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    className="w-full px-4 py-3 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 dark:bg-gray-700 dark:text-white transition-all"
                    placeholder="Enter feedback for the student (optional)"
                  />
                </div>

                {/* Submission Preview */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-gray-200 dark:border-gray-600">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Submission Preview
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300">
                        Submitted: {new Date(selectedSubmission.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300">
                          {selectedSubmission.attachments.length} file{selectedSubmission.attachments.length !== 1 ? 's' : ''} attached
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={closeGradeModal}
                    className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-purple-500/50 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Submit Grade
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentDetails;