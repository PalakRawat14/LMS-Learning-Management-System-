import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subjectService } from '../services/subjectService';
import LoadingSpinner from '../components/LoadingSpinner';
import { Link } from 'react-router-dom';

const TeacherAssignmentsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const subjects = await subjectService.getAllSubjects();
      const teacherSubjects = Array.isArray(subjects) ? subjects : [];

      const subjectResults = await Promise.all(
        teacherSubjects.map(async (subject) => {
          try {
            const subjectAssignments = await subjectService.getSubjectAssignments(subject.id);
            return (Array.isArray(subjectAssignments) ? subjectAssignments : []).map((assignment) => ({
              ...assignment,
              subjectName: subject.name,
              subjectCode: subject.code,
              subjectId: subject.id,
              subjectTeachers: subject.teachers || []
            }));
          } catch (error) {
            console.error(`Failed loading assignments for subject ${subject.id}`, error);
            return [];
          }
        })
      );

      setAssignments(subjectResults.flat());
    } catch (err) {
      console.error('Failed to load teacher assignments', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Uploaded Assignments</h1>
        <p className="text-sm text-gray-500">Showing assignments you uploaded, grouped with subject/course</p>
      </div>

      {assignments.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-500">No assignments found for subjects you teach.</div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <div key={a.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    <Link to={`/assignments/${a.id}`} className="hover:underline">{a.title}</Link>
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{a.description}</p>
                  <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
                    {a.subjectName ? (
                      <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">Subject: {a.subjectName}</span>
                    ) : a.SubjectAssignment?.Subject?.name ? (
                      <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">Subject: {a.SubjectAssignment.Subject.name}</span>
                    ) : a.Subject?.name ? (
                      <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">Subject: {a.Subject.name}</span>
                    ) : null}

                    <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/assignments/${a.id}`} className="px-3 py-1.5 bg-[#0ea5ff] text-white rounded-lg">View</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherAssignmentsPage;
