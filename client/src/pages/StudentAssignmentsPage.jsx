import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subjectService } from '../services/subjectService';
import { ArrowDownTrayIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const StudentAssignmentsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignmentsData, subsData] = await Promise.all([
        subjectService.getSubjectAssignmentsForStudent(),
        subjectService.getMySubmissions().catch(() => [])
      ]);
      setAssignments(assignmentsData || []);
      const subsMap = {};
      (subsData || []).forEach(s => { subsMap[s.subjectAssignmentId] = s; });
      setSubmissions(subsMap);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAttachment = (assignment, idx) => {
    const subjectId = assignment.Subject?.id;
    if (!subjectId) { toast.error('Subject not found'); return; }
    const fileName = assignment.attachments?.[idx]?.originalName || assignment.attachments?.[idx]?.filename || 'download';
    subjectService
      .downloadAssignmentAttachmentFile(subjectId, assignment.id, idx, fileName)
      .catch((error) => {
        console.error('Error downloading attachment:', error);
        toast.error('Failed to download attachment');
      });
  };

  const now = new Date();
  const grouped = {};
  assignments.forEach(a => {
    const subjectName = a.Subject?.name || 'Unknown Subject';
    if (!grouped[subjectName]) grouped[subjectName] = { subject: a.Subject, items: [] };
    grouped[subjectName].items.push(a);
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
        <h1 className="text-3xl font-bold">My Assignments</h1>
        <p className="text-purple-100 mt-1">View and submit assignments across all subjects</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <p className="text-lg">No assignments available yet.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([subjectName, group]) => (
          <div key={subjectName} className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{subjectName}</h2>
              {group.subject?.id && (
                <Link to={`/subjects/${group.subject.id}`} className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                  View Subject <ChevronRightIcon className="w-4 h-4" />
                </Link>
              )}
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {group.items.map(a => {
                const sub = submissions[a.id];
                const isPastDue = new Date(a.dueDate) < now;
                const isSubmitted = !!sub;
                const isGraded = sub?.status === 'graded';
                return (
                  <div key={a.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{a.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{a.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                          <span>{a.totalPoints} pts</span>
                          {isPastDue && <span className="text-red-500 font-medium">Past due</span>}
                        </div>

                        {a.attachments?.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            {a.attachments.map((att, idx) => (
                              <button key={idx} onClick={() => handleDownloadAttachment(a, idx)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 transition-colors">
                                <ArrowDownTrayIcon className="w-3 h-3" /> {att.originalName}
                              </button>
                            ))}
                          </div>
                        )}

                        {isSubmitted && (
                          <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${isGraded ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {isGraded ? `Graded: ${sub.grade}/${a.totalPoints}` : 'Submitted'}
                          </div>
                        )}
                        {isSubmitted && sub?.feedback && (
                          <p className="text-xs text-gray-500 mt-1 italic">Feedback: {sub.feedback}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {!isSubmitted && !isPastDue && (
                          <button onClick={() => navigate(`/subjects/${a.Subject?.id}`)} className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                            Submit
                          </button>
                        )}
                        {!isSubmitted && isPastDue && (
                          <span className="text-xs text-gray-400 italic">Missed</span>
                        )}
                        {isSubmitted && !isGraded && (
                          <span className="text-xs text-gray-400 italic">Awaiting grade</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default StudentAssignmentsPage;
