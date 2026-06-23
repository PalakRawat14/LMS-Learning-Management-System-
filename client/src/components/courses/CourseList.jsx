import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { courseService } from '../../services/courseService';
import LoadingSpinner from '../LoadingSpinner';
import ConfirmDialog from '../common/ConfirmDialog';
import CourseCard from './CourseCard';

const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    courseId: null,
    courseName: ''
  });
  const { user } = useAuth();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        if (user?.role === 'teacher') {
          // Teachers: only assigned courses
          const myCourses = await courseService.getMyCourses();
          setCourses(myCourses);
          setEnrolledCourses([]);
        } else if (user?.role === 'student') {
          // Students: all available courses (so they can browse and enroll)
          const [allCoursesResponse, myCourses] = await Promise.all([
            courseService.getAllCourses(),
            courseService.getMyCourses()
          ]);
          const allCourses = allCoursesResponse.courses || allCoursesResponse;
          setCourses(allCourses);
          setEnrolledCourses(myCourses);
        } else if (user?.role === 'admin') {
          // Admin: all courses
          const allCoursesResponse = await courseService.getAllCourses();
          const allCourses = allCoursesResponse.courses || allCoursesResponse;
          setCourses(allCourses);
          setEnrolledCourses([]);
        } else {
          setCourses([]);
          setEnrolledCourses([]);
        }
      } catch (err) {
        setError('Failed to fetch courses. Please try again later.');
        console.error('Fetch courses error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

  const handleEnroll = async (courseId) => {
    try {
      await courseService.enrollInCourse(courseId);
      const updatedCourses = await courseService.getMyCourses();
      setEnrolledCourses(updatedCourses);
      
      // Clear any existing errors
      setError(null);
      
      const course = courses.find(c => c.id === courseId);
      const courseName = course ? course.title : 'the course';
      alert(`Successfully enrolled in "${courseName}"`);
    } catch (err) {
      console.error('Enroll error:', err);
      setError(err.response?.data?.message || 'Failed to enroll in the course. Please try again.');
    }
  };

  const handleUnenroll = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    const courseName = course ? course.title : 'this course';
    
    // Open confirmation dialog
    setConfirmDialog({
      isOpen: true,
      courseId,
      courseName
    });
  };

  const confirmUnenroll = async () => {
    const { courseId, courseName } = confirmDialog;
    
    try {
      await courseService.unenrollFromCourse(courseId);
      const updatedCourses = await courseService.getMyCourses();
      setEnrolledCourses(updatedCourses);
      
      // Show success message
      setError(null);
      setSuccessMessage(`Successfully unenrolled from "${courseName}"`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Unenroll error:', err);
      setError(err.response?.data?.message || 'Failed to unenroll from the course. Please try again.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {user?.role === 'teacher' ? 'My Courses' : user?.role === 'admin' ? 'All Courses' : 'Browse Courses'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user?.role === 'teacher' 
              ? 'Courses assigned to you by administration' 
              : user?.role === 'admin'
              ? 'Manage all courses in the system'
              : 'Discover and enroll in available courses'}
          </p>
        </div>
        {user?.role === 'admin' && (
          <Link
            to="/admin"
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin Panel
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg shadow-md animate-fade-in">
          <div className="flex items-center">
            <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 px-6 py-4 rounded-lg shadow-md animate-fade-in">
          <div className="flex items-center">
            <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-white dark:bg-gray-800 rounded-full p-8 mb-6 shadow-lg">
            <svg className="h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">No courses found</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
            {user?.role === 'teacher' 
              ? 'You have no courses assigned yet. Contact your administrator to get courses assigned to you.'
              : user?.role === 'admin'
              ? 'No courses have been created yet. Create your first course from the Admin Panel.'
              : 'No courses are currently available for enrollment. Check back soon!'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onEnroll={handleEnroll}
                onUnenroll={handleUnenroll}
                isEnrolled={enrolledCourses.some((c) => c.id === course.id)}
                user={user}
              />
            ))}
          </div>
        </>
      )}

      {confirmDialog.isOpen && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, courseId: null, courseName: '' })}
          onConfirm={() => {
            confirmUnenroll();
            setConfirmDialog({ isOpen: false, courseId: null, courseName: '' });
          }}
          title="Unenroll from Course"
          message={`Are you sure you want to unenroll from "${confirmDialog.courseName}"? You will lose access to all course materials and assignments.`}
          confirmText="Unenroll"
          cancelText="Cancel"
          type="danger"
        />
      )}
    </div>
  );
};

export default CourseList;