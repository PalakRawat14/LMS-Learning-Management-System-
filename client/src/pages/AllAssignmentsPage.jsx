import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { assignmentService } from '../services/assignmentService';
import { courseService } from '../services/courseService';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';

const AllAssignmentsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, overdue, completed
  const [deleting, setDeleting] = useState(null); // Track which assignment is being deleted
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, assignmentId: null, assignmentTitle: '' });

  const isTeacher = user?.role === 'teacher' || user?.role === 'instructor';
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await assignmentService.getUserAssignments();
      setAssignments(data.assignments || []);
      
      // Fetch courses for students
      if (isStudent) {
        const coursesData = await courseService.getMyCourses();
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      }

      // For teachers, extract courses from assignments
      if (isTeacher) {
        const courseMap = {};
        (data.assignments || []).forEach(assignment => {
          if (assignment.Course) {
            courseMap[assignment.Course.id] = assignment.Course;
          }
        });
        const coursesData = Object.values(courseMap);
        setCourses(coursesData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again later.');
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId, assignmentTitle) => {
    setConfirmDialog({ 
      isOpen: true, 
      assignmentId, 
      assignmentTitle 
    });
  };

  const confirmDelete = async () => {
    const { assignmentId } = confirmDialog;
    
    setDeleting(assignmentId);
    try {
      await assignmentService.deleteAssignment(assignmentId);
      toast.success('Assignment deleted successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete assignment');
    } finally {
      setDeleting(null);
      setConfirmDialog({ isOpen: false, assignmentId: null, assignmentTitle: '' });
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-2xl shadow-2xl p-8 overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              {isAdmin ? 'All Assignments' : isTeacher ? 'Assignments' : 'All Assignments'}
            </h1>
            <p className="text-blue-100 text-lg">
              {isAdmin
                ? 'All assignments from all courses in the system'
                : isTeacher 
                  ? 'Assignments for your assigned courses'
                  : 'All assignments from your enrolled courses'
              }
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
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Course Cards Section - Students Only */}
      {isStudent && courses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Select a Course
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => {
              const courseAssignments = assignments.filter(
                a => a.courseId === course.id && !a.submitted && new Date(a.dueDate) > new Date()
              );
              const pendingCount = courseAssignments.length;
              const hasDueSoon = courseAssignments.some(a => {
                const daysUntilDue = Math.ceil((new Date(a.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                return daysUntilDue <= 3;
              });
              return (
                <button
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}/assignments`)}
                  className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-sm border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 p-6 text-left overflow-hidden"
                >
                  {/* Decorative gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  {/* Due Soon Badge */}
                  {hasDueSoon && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg shadow-sm">
                      <svg className="w-3 h-3 text-orange-600 dark:text-orange-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">Due Soon</span>
                    </div>
                  )}
                  <div className="relative">
                    {/* Course Code Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg mb-3 shadow-md group-hover:shadow-lg transition-shadow">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                      </svg>
                      <span className="text-sm font-bold text-white">{course.code}</span>
                    </div>
                    {/* Course Title */}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                      {course.title}
                    </h3>
                    {/* Course Description */}
                    {course.description && <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>}
                    {/* Teacher Info */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Instructor</p>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {course.Teacher?.name || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    {/* Pending Assignments Count */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {pendingCount} {pendingCount === 1 ? 'assignment' : 'assignments'}
                          </p>
                        </div>
                      </div>
                      {/* Arrow Icon */}
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No Courses Message - Students Only */}
      {isStudent && courses.length === 0 && (
        <div className="relative bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-16 text-center overflow-hidden">
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #a855f7 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          </div>
          {/* Content */}
          <div className="relative">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-6 shadow-xl">
                                <>
                                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold ${
                                    isOverdue 
                                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                                      : daysUntilDue <= 1 
                                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' 
                                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                  }`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm">{formatTimeRemaining()}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Link
                                      to={`/assignments/${assignment.id}`}
                                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      View Details
                                    </Link>
                                    {(isTeacher || isAdmin) && (
                                      <Link
                                        to={`/assignments/${assignment.id}#submissions`}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Submissions
                                      </Link>
                                    )}
                                    {(isAdmin || isTeacher) && (
                                      <button
                                        onClick={() => handleDeleteAssignment(assignment.id, assignment.title)}
                                        disabled={deleting === assignment.id}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95"
                                      >
                                        {deleting === assignment.id ? (
                                          <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Deleting...
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Delete
                                          </>
                                        )}
                                      </button>
                                    )}
                                    {!isTeacher && !isAdmin && !assignment.submitted && !isOverdue && (
                                      <Link
                                        to={`/assignments/${assignment.id}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 animate-pulse"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        Submit Now
                                      </Link>
                                    )}
                                  </div>
                                </>
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No Courses Enrolled
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto">
              You are not enrolled in any courses yet. Check with your instructor or admin to get enrolled.
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, assignmentId: null, assignmentTitle: '' })}
        onConfirm={confirmDelete}
        title="Delete Assignment"
        message={`Are you sure you want to delete "${confirmDialog.assignmentTitle}"? This action cannot be undone and will also delete all student submissions.`}
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  );
};

export default AllAssignmentsPage;