import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { subjectService } from '../services/subjectService';
import LoadingSpinner from '../components/LoadingSpinner';
import { BookOpenIcon, AcademicCapIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const SubjectsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const data = await subjectService.getAllSubjects();
      setSubjects(data);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Subjects</h1>
        {isAdmin && (
          <button
            onClick={() => navigate('/admin/subjects')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Manage Subjects
          </button>
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <BookOpenIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">
            {isTeacher ? 'No subjects assigned yet' : 'No subjects available'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            {isTeacher ? 'Ask your admin to assign you to subjects.' : 'Check back later for new subjects.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              onClick={() => navigate(`/subjects/${subject.id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                  <AcademicCapIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{subject.name}</h3>
                  <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{subject.code}</p>
                  {subject.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{subject.description}</p>
                  )}
                  {subject.courseField && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full font-medium mt-2">
                      {subject.courseField}
                    </span>
                  )}
                  {subject.teachers?.length > 0 && (
                    <div className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
                      <UserGroupIcon className="w-3.5 h-3.5" />
                      <span>{subject.teachers.map(t => `${t.firstName} ${t.lastName}`).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectsPage;
