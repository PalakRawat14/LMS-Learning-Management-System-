import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { assignmentService } from '../../services/assignmentService';

const AssignmentsList = () => {
  const { id: courseId } = useParams();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await assignmentService.getAssignmentsByCourse(courseId);
        setAssignments(res.data);
      } catch (err) {
        setError('Failed to load assignments.');
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, [courseId]);

  if (loading) return <div>Loading assignments...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!assignments.length) return <div>No assignments available.</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Assignments</h2>
      <ul className="space-y-4">
        {assignments.map(a => (
          <li key={a.id} className="p-4 bg-white dark:bg-gray-800 rounded shadow">
            <div className="font-semibold">{a.title}</div>
            <div className="text-gray-600 dark:text-gray-300">{a.description}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Due: {new Date(a.dueDate).toLocaleDateString()}
            </div>
            {a.fileUrl && (
              <a
                href={a.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 underline mt-2 block"
              >
                Download Assignment
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AssignmentsList;
