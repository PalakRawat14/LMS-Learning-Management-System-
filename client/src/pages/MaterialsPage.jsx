import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MaterialUpload from '../components/materials/MaterialUpload';
import MaterialList from '../components/materials/MaterialList';
import { courseService } from '../services/courseService';

export default function MaterialsPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    console.log('[MaterialsPage] Fetching course, courseId:', courseId);
    try {
      const courseData = await courseService.getCourseById(courseId);
      console.log('[MaterialsPage] Course loaded:', courseData);
      setCourse(courseData);
    } catch (error) {
      console.error('[MaterialsPage] Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user can upload materials:
  // - Admins can upload to any course
  // - Teachers can only upload to courses they teach
  const canUploadMaterials = user && (
    user.role === 'admin' || 
    (user.role === 'teacher' && user.id === course?.teacherId)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading course...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Enhanced Header with Gradient */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-2xl shadow-2xl p-8 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                Course Materials
              </h1>
              <p className="text-blue-100 text-lg">
                {course ? `${course.title} - ${course.code}` : 'Loading course...'}
              </p>
            </div>
          </div>
          
          {canUploadMaterials && (
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-xl hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/50 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload Material</span>
            </button>
          )}
        </div>
      </div>

      {/* Instructions for teachers */}
      {canUploadMaterials && (
        <div className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/30 dark:via-emerald-900/20 dark:to-teal-900/20 border-2 border-green-200 dark:border-green-700 rounded-xl p-6 overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 rounded-full blur-2xl" />
          <div className="relative flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-green-900 dark:text-green-200 mb-2">
                🎓 Instructor Resource Hub
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed mb-4">
                Share course materials, lecture notes, assignments, and resources with your students. 
                Supported formats: PDF, Word, PowerPoint, Excel, images, videos, and archives.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(`/courses/${courseId}/assignments`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Assignments
                </button>
                <button
                  onClick={() => setShowUpload(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Quick Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Materials List */}
      <MaterialList 
        courseId={courseId} 
        teacherId={course?.teacherId}
      />

      {/* Upload Modal */}
      {showUpload && course && (
        <MaterialUpload
          courseId={courseId}
          onUploadSuccess={() => {
            setShowUpload(false);
            // The MaterialList component will automatically refresh
          }}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Show loading if trying to upload without course data */}
      {showUpload && !course && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading course information...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}