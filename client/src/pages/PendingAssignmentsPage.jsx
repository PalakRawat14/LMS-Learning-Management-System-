import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { assignmentService } from '../services/assignmentService';
import { subjectService } from '../services/subjectService';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { BookOpenIcon, ClipboardDocumentListIcon, ArrowDownTrayIcon, ClockIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const PendingAssignmentsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [subjectAssignments, setSubjectAssignments] = useState([]);
  const [submissionsMap, setSubmissionsMap] = useState({});

  useEffect(() => {
    fetchPendingAssignments();
  }, []);

  const fetchPendingAssignments = async () => {
    try {
      setLoading(true);

      const [courseResponse, subjectAssignmentsData, mySubjectSubmissions] = await Promise.all([
        assignmentService.getUserAssignments(),
        subjectService.getSubjectAssignmentsForStudent().catch(() => []),
        subjectService.getMySubmissions().catch(() => [])
      ]);

      const now = new Date();
      const courseItems = Array.isArray(courseResponse?.assignments) ? courseResponse.assignments : [];
      const pendingCourseAssignments = courseItems.filter((assignment) => {
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
        const isSubmitted = assignment.submitted || assignment.isSubmitted;
        return dueDate ? dueDate >= now && !isSubmitted : !isSubmitted;
      });

      const subjectItems = Array.isArray(subjectAssignmentsData) ? subjectAssignmentsData : [];
      const submittedSubjectIds = new Set((mySubjectSubmissions || []).map((submission) => submission.subjectAssignmentId));
      const pendingSubjectAssignments = subjectItems.filter((assignment) => {
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
        return dueDate ? dueDate >= now && !submittedSubjectIds.has(assignment.id) : !submittedSubjectIds.has(assignment.id);
      });

      const map = {};
      (mySubjectSubmissions || []).forEach((submission) => {
        map[submission.subjectAssignmentId] = submission;
      });

      setCourseAssignments(pendingCourseAssignments);
      setSubjectAssignments(pendingSubjectAssignments);
      setSubmissionsMap(map);
    } catch (error) {
      console.error('Failed to load pending assignments', error);
      toast.error('Failed to load pending assignments');
    } finally {
      setLoading(false);
    }
  };

  const groupedCourseAssignments = useMemo(() => {
    const groups = {};
    courseAssignments.forEach((assignment) => {
      const key = assignment.Course?.title || 'Course Assignments';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(assignment);
    });
    return groups;
  }, [courseAssignments]);

  const groupedSubjectAssignments = useMemo(() => {
    const groups = {};
    subjectAssignments.forEach((assignment) => {
      const key = assignment.Subject?.name || 'Subject Assignments';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(assignment);
    });
    return groups;
  }, [subjectAssignments]);

  const handleDownloadCourseAttachment = async (assignment, index) => {
    const attachment = assignment.attachments?.[index];
    const fileName = attachment?.originalName || attachment?.filename || 'download';
    try {
      const token = localStorage.getItem('token');
      const url = `${assignmentService.downloadAttachmentByIndexUrl(assignment.id, index)}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Course attachment download failed', error);
      toast.error('Failed to download file');
    }
  };

  if (loading) return <LoadingSpinner />;

  const now = new Date();
  const totalPending = courseAssignments.length + subjectAssignments.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundImage: 'linear-gradient(90deg, #0ea5ff 0%, #7c3aed 50%, #ec4899 100%)' }}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative p-8 text-white">
          <h1 className="text-3xl font-bold">Pending Assignments</h1>
          <p className="text-white/90 mt-1">{totalPending} assignments waiting for your submission</p>
        </div>
      </div>

      {totalPending === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-10 text-center border border-gray-200 dark:border-gray-700">
          <ClipboardDocumentListIcon className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white">No pending assignments right now</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">You are up to date on your coursework.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedCourseAssignments).map(([groupName, items]) => (
            <div key={groupName} className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpenIcon className="w-5 h-5 text-[#0ea5ff]" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{groupName}</h2>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Course</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((assignment) => (
                  <div key={assignment.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{assignment.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{assignment.description}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : '—'}</span>
                          <span>{assignment.totalPoints} pts</span>
                          {assignment.Course?.teacher ? (
                            <span>{assignment.Course.teacher.firstName} {assignment.Course.teacher.lastName}</span>
                          ) : null}
                          {assignment.dueDate && new Date(assignment.dueDate) < now ? (
                            <span className="text-red-500 font-medium">Past due</span>
                          ) : null}
                        </div>
                        {assignment.attachments?.length > 0 && (
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            {assignment.attachments.map((attachment, index) => (
                              <button
                                key={index}
                                onClick={() => handleDownloadCourseAttachment(assignment, index)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0ea5ff] bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                              >
                                <ArrowDownTrayIcon className="w-3 h-3" />
                                {attachment.originalName || attachment.filename || `Attachment ${index + 1}`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <Link
                          to={`/assignments/${assignment.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#0ea5ff] text-white rounded-lg hover:opacity-90 transition-colors"
                        >
                          Open <ChevronRightIcon className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.entries(groupedSubjectAssignments).map(([subjectName, items]) => (
            <div key={subjectName} className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-[#7c3aed]" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{subjectName}</h2>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Subject</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((assignment) => {
                  const submission = submissionsMap[assignment.id];
                  return (
                    <div key={assignment.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{assignment.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{assignment.description}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                            <span className="inline-flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : '—'}</span>
                            <span>{assignment.totalPoints} pts</span>
                            {assignment.Subject?.code ? <span>{assignment.Subject.code}</span> : null}
                          </div>
                          {submission?.feedback && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">Feedback: {submission.feedback}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <Link
                            to={`/subjects/${assignment.Subject?.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#7c3aed] text-white rounded-lg hover:opacity-90 transition-colors"
                          >
                            Open <ChevronRightIcon className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingAssignmentsPage;
