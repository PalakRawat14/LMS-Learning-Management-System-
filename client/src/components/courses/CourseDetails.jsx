import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { courseService } from '../../services/courseService';
import LoadingSpinner from '../LoadingSpinner';
import { UserGroupIcon, AcademicCapIcon, EnvelopeIcon, DocumentTextIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import materialService from '../../services/materialService';
import MaterialUpload from '../materials/MaterialUpload';

const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const courseData = await courseService.getCourseById(id);
        setCourse(courseData);
        // Check if user is enrolled
        const myCourses = await courseService.getMyCourses();
        setIsEnrolled(myCourses.some(c => c.id === courseData.id));
        
        // Fetch enrolled students if user is teacher or admin
        if (user?.role === 'teacher' || user?.role === 'admin') {
          setLoadingStudents(true);
          try {
            const students = await courseService.getEnrolledStudents(id);
            // Ensure students is an array
            setEnrolledStudents(Array.isArray(students) ? students : []);
          } catch (err) {
            console.error('Failed to fetch enrolled students:', err);
            setEnrolledStudents([]);
          } finally {
            setLoadingStudents(false);
          }
        }
        
        // Fetch recent materials for preview
        fetchMaterials();
      } catch (err) {
        setError('Failed to fetch course details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id, user?.role]);

  const fetchMaterials = async () => {
    try {
      setLoadingMaterials(true);
      const data = await materialService.getCourseMaterials(id);
      setMaterials(data.slice(0, 5)); // Show only latest 5
    } catch (err) {
      console.error('Failed to fetch materials:', err);
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleEnroll = async () => {
    try {
      await courseService.enrollInCourse(id);
      setIsEnrolled(true);
    } catch (err) {
      setError('Failed to enroll in the course. Please try again.');
    }
  };

  const handleUnenroll = async () => {
    try {
      await courseService.unenrollFromCourse(id);
      setIsEnrolled(false);
    } catch (err) {
      setError('Failed to unenroll from the course. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await courseService.deleteCourse(id);
        navigate('/courses');
      } catch (err) {
        setError('Failed to delete the course. Please try again.');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) return <LoadingSpinner />;
  if (!course) return <div>Course not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {(course.title || course.description) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              {course.title && (
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  {course.title}
                </h1>
              )}
              {course.description && (
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {course.description}
                </p>
              )}
            </div>
            {user?.role === 'instructor' && user.id === course.instructorId ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/courses/${id}/edit`)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            ) : user?.role === 'admin' ? (
              // Admins don't have enroll/unenroll buttons
              null
            ) : (
              isEnrolled ? (
                <button
                  onClick={handleUnenroll}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Unenroll
                </button>
              ) : (
                <button
                  onClick={handleEnroll}
                  className="px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                >
                  Enroll
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Study Materials Section - Visible to teachers, admins, and enrolled students */}
      {(user?.role === 'teacher' || user?.role === 'admin' || isEnrolled) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Study Materials ({materials.length})
              </h2>
            </div>
            
            <div className="flex gap-2">
              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
                >
                  <ArrowUpTrayIcon className="h-5 w-5" />
                  Upload Material
                </button>
              )}
              <button
                onClick={() => navigate(`/materials/${id}`)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              >
                View All
              </button>
            </div>
          </div>

          {loadingMaterials ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No study materials uploaded yet
              </p>
              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                >
                  <ArrowUpTrayIcon className="h-5 w-5" />
                  Upload First Material
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-lg border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-200"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded flex items-center justify-center">
                        <DocumentTextIcon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {material.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                          {material.type}
                        </span>
                        <span>{(material.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => materialService.downloadMaterial(material.id, material.originalName)}
                    className="ml-2 px-3 py-1 bg-white dark:bg-gray-700 hover:bg-purple-50 dark:hover:bg-gray-600 text-purple-600 dark:text-purple-400 text-xs font-medium rounded border border-purple-300 dark:border-purple-700 transition-colors flex-shrink-0"
                  >
                    Download
                  </button>
                </div>
              ))}
              
              {materials.length >= 5 && (
                <button
                  onClick={() => navigate(`/materials/${id}`)}
                  className="w-full py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                >
                  View all materials →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Enrolled Students Section - Only visible to teachers and admins */}
      {(user?.role === 'teacher' || user?.role === 'admin') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Enrolled Students ({enrolledStudents.length})
            </h2>
          </div>

          {loadingStudents ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : enrolledStudents.length === 0 ? (
            <div className="text-center py-8">
              <UserGroupIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No students enrolled yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrolledStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <AcademicCapIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {student.firstName} {student.lastName}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                      <EnvelopeIcon className="h-3 w-3" />
                      {student.email}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Upload Material Modal */}
      {showUploadModal && (
        <MaterialUpload
          courseId={id}
          onUploadSuccess={() => {
            setShowUploadModal(false);
            fetchMaterials(); // Refresh materials list
          }}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
};

export default CourseDetails;