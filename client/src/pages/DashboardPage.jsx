import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import QuickAssignmentUpload from '../components/assignments/QuickAssignmentUpload';
import { courseService } from '../services/courseService';
import { assignmentService } from '../services/assignmentService';
import { subjectService } from '../services/subjectService';
import MaterialUpload from '../components/materials/MaterialUpload';
import { 
  PlusIcon, 
  DocumentTextIcon, 
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  BookOpenIcon,
  ClockIcon,
  CheckCircleIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  FolderIcon,
  BookOpenIcon as SubjectsIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null); // Track which assignment is being deleted
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, assignmentId: null, assignmentTitle: '' });
  const [dashboardData, setDashboardData] = useState({
    courses: [],
    assignments: [],
    coursesCount: 0,
    subjectsCount: 0,
    teachersCount: 0,
    pendingAssignments: 0,
    upcomingQuizzes: 0
  });
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [studentSubmissionGroups, setStudentSubmissionGroups] = useState([]);
  const [gradeModal, setGradeModal] = useState({ isOpen: false, submission: null, grade: '', feedback: '' });
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [uploadSubjectId, setUploadSubjectId] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [coursesResponse, assignmentsResponse, subjectAssignmentsData, mySubmissionsData, subjectsResponse, teachersResponse] = await Promise.all([
        courseService.getMyCourses(),
        assignmentService.getUserAssignments(),
        user?.role === 'student' ? subjectService.getSubjectAssignmentsForStudent().catch(() => []) : Promise.resolve([]),
        user?.role === 'student' ? subjectService.getMySubmissions().catch(() => []) : Promise.resolve([]),
        subjectService.getAllSubjects().catch(() => []),
        user?.role === 'admin' ? api.get('/admin/teachers').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);

      const courses = Array.isArray(coursesResponse) ? coursesResponse : [];
      const assignments = assignmentsResponse?.assignments || [];
      const subjects = Array.isArray(subjectsResponse) ? subjectsResponse : [];
      const teachers = Array.isArray(teachersResponse?.data) ? teachersResponse.data : [];

      // Merge subject assignments into dashboard
      const subjectAssignments = Array.isArray(subjectAssignmentsData) ? subjectAssignmentsData : [];
      const mySubs = Array.isArray(mySubmissionsData) ? mySubmissionsData : [];
      const submittedIds = new Set(mySubs.map(s => s.subjectAssignmentId));

      let teacherSubjectAssignments = [];
      if (user?.role === 'teacher' || user?.role === 'instructor') {
        const teacherSubjects = subjects || [];
        const teacherAssignmentsResults = await Promise.all(
          teacherSubjects.map(async (subject) => {
            try {
              const result = await subjectService.getSubjectAssignments(subject.id);
              return (Array.isArray(result) ? result : []).map((assignment) => ({
                ...assignment,
                Subject: assignment.Subject || subject
              }));
            } catch (error) {
              console.error(`Error loading assignments for subject ${subject.id}:`, error);
              return [];
            }
          })
        );
        teacherSubjectAssignments = teacherAssignmentsResults.flat();
      }

      const now = new Date();
      const pendingSubjectAssignments = subjectAssignments.filter(a => {
        return new Date(a.dueDate) > now && !submittedIds.has(a.id);
      });

      // For students, calculate pending assignments (course + subject)
      const coursePending = assignments.filter(a => {
        const dueDate = new Date(a.dueDate);
        return dueDate > now && !a.submitted;
      });

      const totalPending = user.role === 'student'
        ? coursePending.length + pendingSubjectAssignments.length
        : assignments.filter(a => new Date(a.dueDate) >= now).length;

      const dashboardAssignments = user?.role === 'teacher' || user?.role === 'instructor'
        ? [...assignments, ...teacherSubjectAssignments]
        : [...assignments, ...subjectAssignments];

      setDashboardData({
        courses,
        assignments: dashboardAssignments,
        coursesCount: courses.length,
        subjectsCount: subjects.length,
        teachersCount: teachers.length,
        pendingAssignments: totalPending,
        upcomingQuizzes: 0
      });

      // For teachers, also fetch their assigned subjects for quick access
      if (user?.role === 'teacher' || user?.role === 'instructor') {
        setTeacherSubjects(subjects);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calendar helpers
  const prevMonth = () => {
    const d = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
    setCalendarDate(d);
  };
  const nextMonth = () => {
    const d = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
    setCalendarDate(d);
  };

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const buildCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay(); // 0-6 Sun-Sat

    // map due dates to counts
    const dueMap = {};
    (dashboardData.assignments || []).forEach(a => {
      if (!a.dueDate) return;
      const d = new Date(a.dueDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        dueMap[day] = (dueMap[day] || 0) + 1;
      }
    });

    const weeks = [];
    let week = [];
    // fill leading empty days
    for (let i = 0; i < startDay; i++) week.push(null);
    for (let day = 1; day <= lastDay.getDate(); day++) {
      week.push({ day, count: dueMap[day] || 0 });
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    // trailing
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    return { weeks, month, year };
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
      
      // Refresh the assignments list
      await fetchDashboardData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to delete assignment');
    } finally {
      setDeleting(null);
    }
  };

  const openSubmissionsModal = async (filterDate = null) => {
    setShowSubmissionsModal(true);
    setSubmissionsLoading(true);

    try {
      let courseAssignments = (dashboardData.assignments || []).filter((assignment) => !assignment.SubjectAssignment);
      if (filterDate) {
        courseAssignments = courseAssignments.filter(a => a.dueDate && isSameDay(new Date(a.dueDate), filterDate));
      }

      const courseResults = await Promise.all(courseAssignments.map(async (assignment) => {
        try {
          const response = await assignmentService.getAssignmentSubmissions(assignment.id);
          return { assignment, submissions: response.submissions || [] };
        } catch (err) {
          console.error(`Error fetching course assignment submissions for ${assignment.id}:`, err?.response?.data || err.message || err);
          return { assignment, submissions: [] };
        }
      }));

      const courseSubmissionItems = [];
      courseResults.forEach((result) => {
        (result.submissions || []).forEach((submission) => {
          const attachmentList = Array.isArray(submission.attachments) ? submission.attachments : [];
          const attachments = attachmentList.map((attachment, index) => {
            if (typeof attachment === 'string') {
              return {
                kind: 'course',
                label: attachment,
                downloadUrl: `/api/assignments/download/${attachment}`,
                index
              };
            }

            const fallbackName = attachment?.filename || attachment?.fileName || attachment?.originalName || attachment?.originalname || `Attachment ${index + 1}`;
            return {
              kind: 'course',
              label: attachment?.originalName || attachment?.originalname || fallbackName,
              downloadUrl: attachment?.downloadUrl || (fallbackName ? `/api/assignments/download/${fallbackName}` : null),
              index
            };
          });

          courseSubmissionItems.push({
            key: `course-${submission.id}`,
            submissionId: submission.id,
            studentId: submission.User?.id || `course-student-${submission.id}`,
            studentName: `${submission.User?.firstName || ''} ${submission.User?.lastName || ''}`.trim() || 'Unknown Student',
            studentEmail: submission.User?.email || '',
            assignmentTitle: result.assignment.title,
            containerName: result.assignment.Course?.title || result.assignment.course?.title || 'Course Assignment',
            submittedAt: submission.submittedAt,
            status: submission.status,
            grade: submission.grade,
            totalPoints: result.assignment.totalPoints || 100,
            sourceType: 'Course',
            openUrl: `/assignments/${result.assignment.id}#submissions`,
            attachments
          });
        });
      });

      const subjectPayload = await subjectService.getAllTeacherSubjectSubmissions().catch(() => ({ submissions: [] }));
      const subjectSubmissions = Array.isArray(subjectPayload)
        ? subjectPayload.flatMap((assignment) => assignment.SubjectSubmissions || [])
        : (subjectPayload.submissions || []);

      const filteredSubjectSubmissions = filterDate
        ? subjectSubmissions.filter(s => s.SubjectAssignment && s.SubjectAssignment.dueDate && isSameDay(new Date(s.SubjectAssignment.dueDate), filterDate))
        : subjectSubmissions;

      const subjectSubmissionItems = filteredSubjectSubmissions.map((submission) => {
        const attachmentList = Array.isArray(submission.attachments) ? submission.attachments : [];
        const attachments = attachmentList.map((attachment, index) => {
          if (typeof attachment === 'string') {
            return {
              kind: 'subject',
              label: attachment,
              submissionId: submission.id,
              index
            };
          }

          const fallbackName = attachment?.fileName || attachment?.filename || attachment?.originalName || attachment?.originalname || `Attachment ${index + 1}`;
          return {
            kind: 'subject',
            label: attachment?.originalName || attachment?.originalname || fallbackName,
            submissionId: submission.id,
            index
          };
        });

        return {
          key: `subject-${submission.id}`,
          submissionId: submission.id,
          studentId: submission.User?.id || `subject-student-${submission.id}`,
          studentName: `${submission.User?.firstName || ''} ${submission.User?.lastName || ''}`.trim() || 'Unknown Student',
          studentEmail: submission.User?.email || '',
          assignmentTitle: submission.SubjectAssignment?.title || 'Subject Assignment',
          containerName: submission.SubjectAssignment?.Subject?.name || 'Subject',
          submittedAt: submission.submittedAt,
          status: submission.status,
          grade: submission.grade,
          totalPoints: submission.SubjectAssignment?.totalPoints || 100,
          sourceType: 'Subject',
          openUrl: `/subjects/${submission.SubjectAssignment?.subjectId}`,
          attachments
        };
      });

      const combined = [...courseSubmissionItems, ...subjectSubmissionItems]
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

      const groupedMap = combined.reduce((acc, item) => {
        if (!acc[item.studentId]) {
          acc[item.studentId] = {
            studentId: item.studentId,
            studentName: item.studentName,
            studentEmail: item.studentEmail,
            submissions: []
          };
        }
        acc[item.studentId].submissions.push(item);
        return acc;
      }, {});

      const grouped = Object.values(groupedMap).sort((a, b) => {
        const aDate = a.submissions[0]?.submittedAt ? new Date(a.submissions[0].submittedAt).getTime() : 0;
        const bDate = b.submissions[0]?.submittedAt ? new Date(b.submissions[0].submittedAt).getTime() : 0;
        return bDate - aDate;
      });

      setStudentSubmissionGroups(grouped);
    } catch (error) {
      console.error('Error fetching submissions for dashboard:', error);
      toast.error('Failed to load submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const downloadCourseAttachment = async (attachment) => {
    if (!attachment?.downloadUrl) {
      toast.error('No download URL for this attachment');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const baseUrl = assignmentService.downloadAttachmentUrl('');
      const absoluteUrl = attachment.downloadUrl.startsWith('http')
        ? attachment.downloadUrl
        : new URL(attachment.downloadUrl, baseUrl).toString();

      const response = await fetch(absoluteUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.label || 'submission-file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading course submission attachment:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDownloadSubmissionAttachment = async (attachment) => {
    if (!attachment) return;

    if (attachment.kind === 'subject') {
      subjectService
        .downloadSubmissionAttachmentFile(attachment.submissionId, attachment.index, attachment.label)
        .catch((error) => {
          console.error('Error downloading subject submission attachment:', error);
          toast.error('Failed to download file');
        });
      return;
    }

    await downloadCourseAttachment(attachment);
  };

  const openGradeModal = (submission) => {
    setGradeModal({ isOpen: true, submission, grade: submission.grade ?? '', feedback: submission.feedback ?? '' });
  };

  const handleGrade = async (e) => {
    e.preventDefault();
    try {
      const sub = gradeModal.submission;
      const payload = { grade: parseFloat(gradeModal.grade), feedback: gradeModal.feedback };
      if (sub.sourceType === 'Subject') {
        await subjectService.gradeSubmission(sub.submissionId, payload);
      } else {
        await assignmentService.gradeSubmission(sub.submissionId, payload);
      }
      toast.success('Graded successfully');
      setGradeModal({ isOpen: false, submission: null, grade: '', feedback: '' });
      // Refresh the submissions list
      await openSubmissionsModal();
    } catch (err) {
      console.error('Error grading submission:', err);
      toast.error(err.response?.data?.message || 'Failed to grade');
    }
  };

  const handleDownloadAttachment = (assignment, idx) => {
    if (!assignment.Subject?.id) return;
    const fileName = assignment.attachments?.[idx]?.originalName || assignment.attachments?.[idx]?.filename || 'download';
    subjectService
      .downloadAssignmentAttachmentFile(assignment.Subject.id, assignment.id, idx, fileName)
      .catch((error) => {
        console.error('Error downloading attachment:', error);
        toast.error('Failed to download attachment');
      });
  };

  const calendar = buildCalendar();

  if (!user) {
    return <LoadingSpinner />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  const isTeacher = user.role === 'teacher' || user.role === 'admin' || user.role === 'instructor';
  const isStudent = user.role === 'student';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ...removed teacher's course cards section... */}
        
        {/* Hero Welcome Section */}
        <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundImage: 'linear-gradient(90deg, #0ea5ff 0%, #7c3aed 50%, #ec4899 100%)' }}>
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)'
          }}></div>
          <div className="relative px-8 py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Welcome back, {user.firstName}! 👋
                </h1>
                <p className="text-xl text-white/90">
                  {isTeacher 
                    ? 'Ready to inspire minds today?'
                    : 'Continue your learning journey'}
                </p>
              </div>
              <div className="hidden md:block">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                  <AcademicCapIcon className="h-16 w-16 text-white" />
                </div>
              </div>
            </div>
            
            {/* Quick Stats Bar */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => navigate('/subjects')}
                className="group relative overflow-hidden text-left bg-white/14 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:scale-[1.01] transform transition-transform duration-200 focus:outline-none focus:ring-4 focus:ring-white/20 h-full flex items-center shadow-[0_12px_40px_rgba(255,255,255,0.08)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-2xl pointer-events-none"></div>
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                      <BookOpenIcon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-white/80 text-sm">Total Subjects</p>
                    <div className="flex items-baseline gap-3">
                      <p className="bg-clip-text text-transparent bg-gradient-to-r from-[#0ea5ff] via-[#7c3aed] to-[#ec4899] text-5xl sm:text-6xl md:text-7xl font-extrabold leading-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.45)' }}>{dashboardData.subjectsCount}</p>
                      <span className="text-white/70 text-xs">subjects</span>
                    </div>
                    <p className="text-white/60 text-xs mt-2">Manage and organize your subjects</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white/80 text-sm">›</div>
                </div>
              </button>
              
              {user.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="group relative overflow-hidden text-left bg-white/14 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:scale-[1.01] transform transition-transform duration-200 focus:outline-none focus:ring-4 focus:ring-white/20 h-full flex items-center shadow-[0_12px_40px_rgba(255,255,255,0.08)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent pointer-events-none"></div>
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-2xl pointer-events-none"></div>
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                        <UserGroupIcon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-white/80 text-sm">Total Teachers</p>
                      <div className="flex items-baseline gap-3">
                        <p className="bg-clip-text text-transparent bg-gradient-to-r from-[#0ea5ff] via-[#7c3aed] to-[#ec4899] text-5xl sm:text-6xl md:text-7xl font-extrabold leading-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.45)' }}>
                          {dashboardData.teachersCount}
                        </p>
                        <span className="text-white/70 text-xs">teachers</span>
                      </div>
                      <p className="text-white/60 text-xs mt-2">Faculty registered in the system</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white/80 text-sm">›</div>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (isTeacher) navigate('/teacher-assignments');
                    else if (isStudent) navigate('/pending-assignments');
                    else navigate('/assignments');
                  }}
                  className="group relative overflow-hidden text-left bg-white/14 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:scale-[1.01] transform transition-transform duration-200 focus:outline-none focus:ring-4 focus:ring-white/20 h-full flex items-center shadow-[0_12px_40px_rgba(255,255,255,0.08)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent pointer-events-none"></div>
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-2xl pointer-events-none"></div>
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                        <ClipboardDocumentListIcon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-white/80 text-sm">{isTeacher ? 'Total Assignments' : 'Pending Tasks'}</p>
                      <div className="flex items-baseline gap-3">
                        <p className="bg-clip-text text-transparent bg-gradient-to-r from-[#0ea5ff] via-[#7c3aed] to-[#ec4899] text-5xl sm:text-6xl md:text-7xl font-extrabold leading-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.45)' }}>
                          {isStudent ? dashboardData.pendingAssignments : dashboardData.assignments.length}
                        </p>
                        <span className="text-white/70 text-xs">items</span>
                      </div>
                      <p className="text-white/60 text-xs mt-2">View and manage assignments</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white/80 text-sm">›</div>
                  </div>
                </button>
              )}
              
              <div className="bg-white/6 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover-lift transition-smooth">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white/80 text-sm">Calendar</h4>
                  <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center bg-black/30 rounded text-white/90 hover:bg-black/40">◀</button>
                    <div className="text-white text-sm font-medium px-2">{calendarDate.toLocaleString(undefined, { month: 'short', year: 'numeric' })}</div>
                    <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center bg-black/30 rounded text-white/90 hover:bg-black/40">▶</button>
                  </div>
                </div>
                <div className="w-full">
                  <div className="grid grid-cols-7 gap-1 text-[10px] text-white/60">
                    {['S','M','T','W','T','F','S'].map(d => (
                      <div key={d} className="text-center">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 mt-2">
                    {calendar.weeks.flat().map((cell, idx) => {
                      const isToday = cell && isSameDay(new Date(), new Date(calendar.year, calendar.month, cell.day));
                      return (
                        <button key={idx} onClick={() => cell && openSubmissionsModal(new Date(calendar.year, calendar.month, cell.day))} className={`flex items-center justify-center ${cell ? 'bg-white/5' : 'bg-transparent'} ${isToday ? 'ring-1 ring-white/30 rounded' : 'rounded-sm'} h-8`}>
                          {cell ? (
                            <div className="relative w-8 text-center text-white text-sm">
                              <div>{cell.day}</div>
                              {cell.count > 0 && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5" title={`${cell.count} due`}>
                                  {Array.from({ length: Math.min(cell.count, 3) }).map((_, i) => (
                                    <span key={i} className="w-2 h-2 rounded-full shadow-sm inline-block" style={{ backgroundColor: '#ec4899' }} />
                                  ))}
                                  {cell.count > 3 && (
                                    <span className="ml-0.5 text-[10px] text-white rounded-full w-4 h-4 flex items-center justify-center font-semibold" style={{ backgroundColor: '#ec4899' }}>{cell.count}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="bg-gradient-to-r from-[#0ea5ff] to-[#7c3aed] bg-clip-text text-transparent">
                    Quick Actions
                  </span>
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
                {user.role === 'admin' ? (
                  <>
                    <button
                      onClick={() => navigate('/admin/subjects?openCreate=true')}
                      className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-blue-200 dark:border-blue-800 hover:scale-105 h-full flex"
                    >
                      <div className="flex items-start gap-4 h-full">
                          <div className="bg-gradient-to-br from-[#0ea5ff] to-[#7c3aed] rounded-lg p-3 group-hover:scale-110 transition-transform">
                          <SubjectsIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1">Create Subject</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Create and manage subjects</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate('/materials')}
                      className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-orange-200 dark:border-orange-800 hover:scale-105 h-full flex"
                    >
                      <div className="flex items-start gap-4 h-full">
                        <div className="bg-gradient-to-br from-[#0ea5ff] to-[#7c3aed] rounded-lg p-3 group-hover:scale-110 transition-transform">
                          <FolderIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1">Study Materials</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Manage learning resources</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate('/subjects')}
                      className="group relative overflow-hidden bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-teal-200 dark:border-teal-800 hover:scale-105 h-full flex"
                    >
                      <div className="flex items-start gap-4 h-full">
                        <div className="bg-gradient-to-br from-[#0ea5ff] to-[#7c3aed] rounded-lg p-3 group-hover:scale-110 transition-transform">
                          <SubjectsIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1">Subjects</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Manage subjects and assignments</p>
                        </div>
                      </div>
                    </button>
                  </>
                ) : isTeacher ? (
                  <>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-green-200 dark:border-green-800 hover:scale-105 h-full flex"
                    >
                      <div className="flex items-start gap-4 h-full">
                        <div className="bg-gradient-to-br from-[#0ea5ff] to-[#7c3aed] rounded-lg p-3 group-hover:scale-110 transition-transform">
                          <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1">Upload Assignment</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Create new assignment for your courses</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={openSubmissionsModal}
                      className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-purple-200 dark:border-purple-800 hover:scale-105 h-full flex"
                    >
                      <div className="flex items-start gap-4 h-full">
                        <div className="bg-gradient-to-br from-[#7c3aed] to-[#ec4899] rounded-lg p-3 group-hover:scale-110 transition-transform">
                          <DocumentTextIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1">View Submissions</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Review all course and subject submissions in one place</p>
                        </div>
                      </div>
                    </button>

                    {/* Submissions Modal Trigger: fetch recent submissions for teacher's assignments */}

                    <button
                      onClick={() => navigate('/subjects')}
                      className="group relative overflow-hidden bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-cyan-200 dark:border-cyan-800 hover:scale-105 h-full flex items-center justify-between"
                    >
                      <div className="flex items-start gap-4">
                          <div className="bg-gradient-to-br from-[#0ea5ff] to-[#7c3aed] rounded-lg p-3 flex-shrink-0">
                          <SubjectsIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1">Subjects</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">View all allotted subjects</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{teacherSubjects?.length || 0}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Allotted</div>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate('/materials/upload')}
                      className="group relative overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-amber-200 dark:border-amber-800 hover:scale-105"
                    >
                      <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-br from-[#0ea5ff] to-[#7c3aed] rounded-lg p-3 group-hover:scale-110 transition-transform">
                          <DocumentTextIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1">Upload Materials</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Pick one of your subjects and upload study materials</p>
                        </div>
                      </div>
                    </button>
                  </>
                ) : (
                  <>

                    <button
                      onClick={() => navigate('/assignments')}
                      className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-orange-200 dark:border-orange-800 hover:scale-105"
                    >
                      <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-br from-[#0ea5ff] to-[#7c3aed] rounded-lg p-3 group-hover:scale-110 transition-transform">
                          <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1">My Assignments</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">View and submit your work</p>
                        </div>
                      </div>
                    </button>

                    {/* Removed Browse Courses and My Courses for students per request */}

                    <button
                      onClick={() => navigate('/materials')}
                      className="group relative overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-amber-200 dark:border-amber-800 hover:scale-105"
                    >
                      <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-br from-[#0ea5ff] to-[#7c3aed] rounded-lg p-3 group-hover:scale-110 transition-transform">
                          <DocumentTextIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1">Study Materials</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Access learning resources</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate('/subjects')}
                      className="group relative overflow-hidden bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-teal-200 dark:border-teal-800 hover:scale-105"
                    >
                      <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-br from-[#0ea5ff] to-[#7c3aed] rounded-lg p-3 group-hover:scale-110 transition-transform">
                          <SubjectsIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1">Subjects</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Browse your subjects</p>
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {isStudent && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Upcoming Deadlines
              </h2>
              <div className="space-y-3">
                 {dashboardData.assignments.slice(0, 5).map((assignment, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {assignment.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {assignment.Subject?.name && (
                          <span className="mr-2">{assignment.Subject.name}</span>
                        )}
                        {assignment.Course?.title && (
                          <span className="mr-2">📚 {assignment.Course.title}</span>
                        )}
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                      {assignment.attachments?.length > 0 && isStudent && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {assignment.attachments.map((att, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleDownloadAttachment(assignment, idx)}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <ArrowDownTrayIcon className="w-2.5 h-2.5" />
                              {att.originalName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <ClockIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                ))}
                {dashboardData.assignments.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircleIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No upcoming deadlines
                    </p>
                  </div>
                )}

                {/* Subject upload modal for dashboard quick-action */}
                {showUploadModal && uploadSubjectId && (
                  <MaterialUpload
                    subjectId={uploadSubjectId}
                    onUploadSuccess={async () => {
                      try {
                        await fetchDashboardData();
                        toast.success('Material uploaded and dashboard refreshed');
                      } catch (e) {
                        // ignore
                      }
                      setShowUploadModal(false);
                      setUploadSubjectId(null);
                    }}
                    onClose={() => { setShowUploadModal(false); setUploadSubjectId(null); }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Courses Section - Only for Students */}
        {false && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="bg-gradient-to-r from-[#0ea5ff] to-[#7c3aed] bg-clip-text text-transparent">
                  Enrolled Courses
                </span>
              </h2>
              <Link 
                to="/courses" 
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 group"
              >
                View All
                <svg className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          
            {dashboardData.courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.courses.slice(0, 6).map((course) => (
                  <Link
                    key={course.id}
                    to={`/courses/${course.id}`}
                    className="group relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <div className="absolute top-0 right-0 m-3">
                      <div className="bg-blue-100 dark:bg-blue-900/50 rounded-full p-2">
                        <BookOpenIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2 pr-10 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-3">
                      {course.code}
                    </p>
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 mb-2">
                      <AcademicCapIcon className="h-4 w-4 mr-2 text-purple-500" />
                      {course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : 'Instructor'}
                    </div>
                    {course.enrollmentCount !== undefined && (
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {course.enrollmentCount} students
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <BookOpenIcon className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">
                  No courses enrolled yet
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Browse available courses and start your learning journey
                </p>
                <Link 
                  to="/courses"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <PlusIcon className="h-5 w-5" />
                  Browse Courses
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Assignment Modal */}
      <QuickAssignmentUpload 
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={fetchDashboardData}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, assignmentId: null, assignmentTitle: '' })}
        onConfirm={confirmDelete}
        type="danger"
        title="Delete Assignment"
        message={`Are you sure you want to delete "${confirmDialog.assignmentTitle}"?\n\nThis action cannot be undone and will permanently delete:\n• The assignment\n• All student submissions\n• All uploaded files`}
        confirmText="Delete Assignment"
        cancelText="Cancel"
      />

      {/* Submissions Modal (Teacher) */}
      {showSubmissionsModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSubmissionsModal(false)} />
          <div className="relative w-full max-w-5xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Student Submissions</h3>
                <button onClick={() => setShowSubmissionsModal(false)} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
              </div>

              {submissionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : studentSubmissionGroups.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">No submissions found across your assignments.</p>
                </div>
              ) : (
                <div className="space-y-4 p-2 max-h-[65vh] overflow-auto">
                  {studentSubmissionGroups.map((group) => (
                    <div key={group.studentId} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/30 p-4">
                      <div className="mb-3">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{group.studentName}</p>
                        {group.studentEmail && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{group.studentEmail}</p>
                        )}
                      </div>

                      <div className="space-y-3">
                        {group.submissions.map((submission) => (
                          <div key={submission.key} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">
                                  {submission.assignmentTitle}
                                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    {submission.sourceType}
                                  </span>
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {submission.containerName} • Submitted: {new Date(submission.submittedAt).toLocaleString()}
                                </p>
                                <div className="mt-2">
                                  {submission.status === 'graded' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                                      Graded: {submission.grade}/{submission.totalPoints}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                                      Pending Grade
                                    </span>
                                  )}
                                </div>

                                {submission.attachments?.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {submission.attachments.map((attachment, idx) => (
                                      <button
                                        key={`${submission.key}-att-${idx}`}
                                        onClick={() => handleDownloadSubmissionAttachment(attachment)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-lg transition-colors"
                                      >
                                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                        {attachment.label}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">No files attached.</p>
                                )}
                              </div>

                              <Link
                                to={submission.openUrl}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                              >
                                Open
                              </Link>
                              {isTeacher && (
                                <button onClick={() => openGradeModal(submission)} className="ml-2 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">Grade</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {gradeModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Grade Submission</h3>
            <p className="text-sm text-gray-500 mb-4">{gradeModal.submission?.studentName || `${gradeModal.submission?.submissionId}`}</p>
            <form onSubmit={handleGrade} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade (out of {gradeModal.submission?.totalPoints || 100})</label>
                <input type="number" step="0.5" min="0" max={gradeModal.submission?.totalPoints || 100} required value={gradeModal.grade} onChange={(e) => setGradeModal({ ...gradeModal, grade: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feedback</label>
                <textarea rows="3" value={gradeModal.feedback} onChange={(e) => setGradeModal({ ...gradeModal, feedback: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white" placeholder="Optional feedback for the student" />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Save Grade</button>
                <button type="button" onClick={() => setGradeModal({ isOpen: false, submission: null, grade: '', feedback: '' })} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
