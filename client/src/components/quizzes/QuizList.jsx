import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { quizService } from '../../services/quizService';
import LoadingSpinner from '../LoadingSpinner';

const QuizCard = ({ quiz, courseId }) => {
  const startDate = new Date(quiz.startDate);
  const endDate = new Date(quiz.endDate);
  const now = new Date();
  
  let status;
  if (now < startDate) {
    status = 'Upcoming';
  } else if (now > endDate) {
    status = 'Closed';
  } else {
    status = quiz.attempted ? 'Completed' : 'Available';
  }
  
  const statusColors = {
    Upcoming: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    Available: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    Completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    Closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            {quiz.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
            {quiz.description}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
          {status}
        </span>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="space-y-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Available: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Duration: {quiz.timeLimit} minutes
          </p>
          {quiz.attempted && quiz.score !== undefined && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Score: {quiz.score}/{quiz.totalPoints}
            </p>
          )}
        </div>
        <Link
          to={`/courses/${courseId}/quizzes/${quiz.id}`}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {status === 'Available' ? 'Take Quiz →' : 'View Details →'}
        </Link>
      </div>
    </div>
  );
};

const QuizList = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const data = await quizService.getCourseQuizzes(courseId);
        setQuizzes(data);
      } catch (err) {
        setError('Failed to fetch quizzes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [courseId]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Quizzes
        </h1>
        {user?.role === 'instructor' && (
          <Link
            to={`/courses/${courseId}/quizzes/create`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Quiz
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {quizzes.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No quizzes found for this course.
        </div>
      ) : (
        <div className="grid gap-6">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              courseId={courseId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizList;