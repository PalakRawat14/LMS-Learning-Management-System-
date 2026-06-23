import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { courseService } from '../services/courseService';
import materialService from '../services/materialService';
import { toast } from 'react-hot-toast';
import { DocumentTextIcon, ArrowUpTrayIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import MaterialUpload from '../components/materials/MaterialUpload';
import { subjectService } from '../services/subjectService';

export default function AllMaterialsPage() {
  const [courses, setCourses] = useState([]);
  const [materialsMap, setMaterialsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSubjectId, setUploadSubjectId] = useState(null);

  useEffect(() => {
    fetchCoursesAndMaterials();
  }, []);

  useEffect(() => {
    const loadSubjects = async () => {
      if (!isTeacher) return;
      try {
        const data = await subjectService.getAllSubjects();
        setTeacherSubjects(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error loading teacher subjects', e);
        setTeacherSubjects([]);
      }
    };
    loadSubjects();
  }, [isTeacher]);

  const fetchCoursesAndMaterials = async () => {
    try {
      setLoading(true);
      const coursesData = await courseService.getMyCourses();
      setCourses(coursesData);

      // Fetch materials for each course
      const materialsData = {};
      for (const course of coursesData) {
        try {
          const materials = await materialService.getCourseMaterials(course.id);
          materialsData[course.id] = materials;
        } catch (err) {
          console.error(`Failed to fetch materials for course ${course.id}:`, err);
          materialsData[course.id] = [];
        }
      }
      setMaterialsMap(materialsData);
    } catch (error) {
      console.error('Error fetching courses and materials:', error);
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (material) => {
    try {
      await materialService.downloadMaterial(material.id, material.originalName);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDelete = async (materialId, courseId) => {
    if (!window.confirm('Are you sure you want to delete this material?')) {
      return;
    }

    try {
      await materialService.deleteMaterial(materialId);
      toast.success('Material deleted successfully');
      // Refresh materials for this course
      const materials = await materialService.getCourseMaterials(courseId);
      setMaterialsMap(prev => ({ ...prev, [courseId]: materials }));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete material');
    }
  };

  const getTotalMaterials = () => {
    return Object.values(materialsMap).reduce((total, materials) => total + materials.length, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading materials...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Study Materials
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {isTeacher 
            ? `Manage materials across all your courses (${getTotalMaterials()} total materials)`
            : `Access all your course materials in one place (${getTotalMaterials()} materials available)`
          }
        </p>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {courses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <AcademicCapIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {isTeacher 
                ? "You haven't created any courses yet"
                : "You're not enrolled in any courses yet"
              }
            </p>
            {isTeacher && (
              <div className="text-sm text-gray-500">
                You haven't created any courses yet. Ask an administrator to create or assign a course to you.
              </div>
            )}
          </div>
        ) : (
          courses.map((course) => {
            const materials = materialsMap[course.id] || [];
            const initials = course.title ? course.title.split(' ').map(s => s[0]).slice(0,2).join('') : '';
            return (
              <button
                key={course.id}
                onClick={() => navigate(`/courses/${course.id}/materials`)}
                className="relative group w-full max-w-[14rem] text-left bg-white/70 dark:bg-gray-800/70 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-blue-400 aspect-square p-0 mx-auto"
                style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)' }}
              >
                {/* subtle hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative h-full flex flex-col items-center justify-center p-6">
                  {/* Icon / Thumbnail */}
                  <div className="relative">
                    <div className="w-16 h-16 md:w-18 md:h-18 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-lg md:text-xl font-bold shadow-md transform group-hover:scale-102 transition-transform">
                      {course.thumbnail ? (
                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover rounded-3xl" />
                      ) : (
                        <span className="select-none">{initials}</span>
                      )}
                    </div>
                    <div className="absolute -bottom-3 right-0">
                      <span aria-label={`${materials.length} materials`} className="inline-flex items-center px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 text-[10px] font-semibold text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700">
                        {materials.length}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mt-4 text-center">
                    <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white leading-tight truncate max-w-[9rem]">
                      {course.title}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      {course.code}
                    </p>
                  </div>

                  {/* CTA overlay on hover */}
                  <div className="absolute inset-0 flex items-end justify-center p-4 pointer-events-none">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <span className="inline-flex items-center gap-2 px-3 py-2 bg-white/90 dark:bg-gray-800/80 rounded-full text-sm font-semibold text-gray-900 dark:text-white shadow">Open Materials</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Quick Action for Teachers: show subjects and allow subject uploads */}
      {isTeacher && (
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                <ArrowUpTrayIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Upload Study Materials (Your Subjects)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select one of your assigned subjects and upload resources directly to the subject.
              </p>
              <div className="flex flex-wrap gap-2">
                {teacherSubjects.map((subject) => (
                  <div key={subject.id} className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/subjects/${subject.id}`)}
                      className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-gray-700 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-lg transition-colors"
                    >
                      {subject.code || subject.name}
                    </button>
                    <button
                      onClick={() => { setUploadSubjectId(subject.id); setShowUploadModal(true); }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Upload
                    </button>
                  </div>
                ))}
                {teacherSubjects.length === 0 && (
                  <div className="text-sm text-gray-500">You have no assigned subjects yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && uploadSubjectId && (
        <MaterialUpload
          subjectId={uploadSubjectId}
          onUploadSuccess={async () => {
            // refresh teacher subjects or any relevant data if needed
            try {
              const mats = await subjectService.getSubjectMaterials(uploadSubjectId);
              toast.success('Uploaded — materials refreshed.');
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
  );
}
