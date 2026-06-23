import { useState, useEffect } from 'react';
import { courseService } from '../../services/courseService';
import EditCourseTeacherModal from './EditCourseTeacherModal';

export default function AdminCourseList({ teachers }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null); // { course: ... }
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await courseService.getAllCourses();
      setCourses(data.courses || data); // support both array and {courses: []}
    } catch (err) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mt-8">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">All Courses</h2>
      </div>
      {error && <div className="text-red-600 p-4">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Teacher</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8">No courses found.</td></tr>
            ) : courses.map(course => (
              <tr key={course.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">{course.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{course.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                  {course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => setEditModal({ course })}
                    className="px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                  >
                    Edit Teacher
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editModal && (
        <EditCourseTeacherModal
          course={editModal.course}
          teachers={teachers}
          onClose={() => setEditModal(null)}
          onSuccess={fetchCourses}
        />
      )}
    </div>
  );
}
