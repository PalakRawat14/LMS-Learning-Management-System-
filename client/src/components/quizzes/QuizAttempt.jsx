import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { quizService } from '../../services/quizService';
import LoadingSpinner from '../LoadingSpinner';

const QuizQuestion = ({ question, answer, onChange, isDisabled }) => {
  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <label
              key={index}
              className={`flex items-center space-x-3 p-3 rounded-lg border ${
                isDisabled
                  ? 'cursor-not-allowed opacity-75'
                  : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${
                answer === option
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option}
                checked={answer === option}
                onChange={() => onChange(option)}
                disabled={isDisabled}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">{option}</span>
            </label>
          ))}
        </div>
      );

    case 'true_false':
      return (
        <div className="space-y-3">
          {['True', 'False'].map((option) => (
            <label
              key={option}
              className={`flex items-center space-x-3 p-3 rounded-lg border ${
                isDisabled
                  ? 'cursor-not-allowed opacity-75'
                  : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${
                answer === option
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option}
                checked={answer === option}
                onChange={() => onChange(option)}
                disabled={isDisabled}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">{option}</span>
            </label>
          ))}
        </div>
      );

    case 'short_answer':
      return (
        <textarea
          value={answer || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={isDisabled}
          rows="3"
          className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="Enter your answer here..."
        />
      );

    default:
      return null;
  }
};

const QuizAttempt = () => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const quizData = await quizService.getQuiz(courseId, quizId);
        setQuiz(quizData);
        // Start new attempt
        const attemptData = await quizService.startQuizAttempt(courseId, quizId);
        setAttempt(attemptData);
        setTimeLeft(quizData.timeLimit * 60); // Convert minutes to seconds
      } catch (err) {
        setError('Failed to start quiz. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [courseId, quizId]);

  // Timer countdown
  useEffect(() => {
    if (!timeLeft) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await quizService.submitQuizAttempt(courseId, quizId, attempt.id, answers);
      navigate(`/courses/${courseId}/quizzes/${quizId}/results`);
    } catch (err) {
      setError('Failed to submit quiz. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!quiz || !attempt) return <div>Quiz not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {quiz.title}
          </h1>
          <div className="text-lg font-medium text-gray-600 dark:text-gray-300">
            Time Left: {formatTime(timeLeft)}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {quiz.questions.map((question, index) => (
            <div key={question.id} className="space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  {index + 1}. {question.text}
                </h3>
                {question.points && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {question.points} points
                  </span>
                )}
              </div>
              <QuizQuestion
                question={question}
                answer={answers[question.id]}
                onChange={(value) => handleAnswerChange(question.id, value)}
                isDisabled={submitting}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizAttempt;