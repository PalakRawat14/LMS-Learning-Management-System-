import { Link } from 'react-router-dom';
import { 
  AcademicCapIcon, 
  UserGroupIcon, 
  BookOpenIcon,
  CheckBadgeIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';

const CourseCard = ({ course, onEnroll, onUnenroll, isEnrolled, user }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate days until start/end
  const getDaysUntil = (date) => {
    const today = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const startDays = course.startDate ? getDaysUntil(course.startDate) : null;
  const endDays = course.endDate ? getDaysUntil(course.endDate) : null;

  // Determine course status
  const getCourseStatus = () => {
    if (startDays && startDays > 0) {
      return { text: `Starts in ${startDays} days`, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
    } else if (endDays && endDays > 0 && endDays < 7) {
      return { text: `Ends in ${endDays} days`, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
    } else if (endDays && endDays < 0) {
      return { text: 'Completed', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
    } else {
      return { text: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    }
  };

  const status = getCourseStatus();
  const isTeacher = (user?.role === 'teacher' || user?.role === 'instructor') && course.teacherId === user?.id;
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  return (
    <div 
      className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover-lift ${
        isHovered ? 'transform -translate-y-2' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with gradient background */}
      <div className="h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <AcademicCapIcon className="h-16 w-16 text-white opacity-30" />
        </div>
        
        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
            {status.text}
          </span>
        </div>

                {/* Enrollment badge for students */}
        {isEnrolled && isStudent && (
          <div className="absolute top-3 left-3">
            <span className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full shadow-lg">
              <CheckBadgeIcon className="h-4 w-4" />
              Enrolled
            </span>
          </div>
        )}

        {/* Teacher badge */}
        {isTeacher && (
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400 text-gray-900 flex items-center gap-1">
              <AcademicCapIcon className="h-4 w-4" />
              Teaching
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Course code */}
        <div className="mb-2">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {course.code || 'COURSE-001'}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 line-clamp-2 min-h-[3.5rem]">
          {course.title}
        </h3>

        {/* Course info grid */}
        <div className="grid grid-cols-2 gap-3 mb-5 pb-5 border-b border-gray-200 dark:border-gray-700">
          {/* Teacher */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <AcademicCapIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Teacher</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : 'TBA'}
              </p>
            </div>
          </div>

          {/* Students */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Students</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {course.enrollmentCount || 0} {course.enrollmentLimit ? `/ ${course.enrollmentLimit}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {/* Primary action - View Details */}
          <Link
            to={`/courses/${course.id}`}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg group"
          >
            <BookOpenIcon className="h-5 w-5" />
            View Course Details
            <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Teacher actions */}
          {isTeacher && (
            <div className="grid grid-cols-2 gap-2">
              <Link
                to={`/courses/${course.id}/assignments`}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4" />
                Assignments
              </Link>
              <Link
                to={`/courses/${course.id}/assignments/create`}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Create
              </Link>
            </div>
          )}

          {/* Student actions */}
          {isStudent && isEnrolled && (
            <div className="grid grid-cols-2 gap-2">
              <Link
                to={`/courses/${course.id}/assignments`}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4" />
                My Assignments
              </Link>
              <button
                onClick={() => onUnenroll(course.id)}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
              >
                Unenroll
              </button>
            </div>
          )}

          {/* Enrollment button for non-enrolled students */}
          {isStudent && !isEnrolled && (
            <button
              onClick={() => onEnroll(course.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
            >
              <CheckBadgeIcon className="h-5 w-5" />
              Enroll Now
            </button>
          )}
        </div>
      </div>

      {/* Hover effect overlay */}
      <div className={`absolute inset-0 pointer-events-none border-2 border-blue-500 rounded-xl transition-opacity duration-300 ${
        isHovered ? 'opacity-100' : 'opacity-0'
      }`}></div>
    </div>
  );
};

export default CourseCard;
