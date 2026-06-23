import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { analyticsService } from '../../services/analyticsService';
import LoadingSpinner from '../LoadingSpinner';
import LineChart from '../charts/LineChart';
import BarChart from '../charts/BarChart';
import DoughnutChart from '../charts/DoughnutChart';

const CourseAnalytics = () => {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [courseData, progressData, assignmentData, quizData] = await Promise.all([
          analyticsService.getCourseAnalytics(courseId),
          analyticsService.getStudentProgress(courseId),
          analyticsService.getAssignmentAnalytics(courseId),
          analyticsService.getQuizAnalytics(courseId)
        ]);

        setData({
          course: courseData,
          progress: progressData,
          assignments: assignmentData,
          quizzes: quizData
        });
      } catch (err) {
        setError('Failed to fetch course analytics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [courseId]);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const { course, progress, assignments, quizzes } = data;

  const progressChartData = {
    labels: progress.labels,
    datasets: [
      {
        label: 'Course Progress',
        data: progress.values,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        fill: true
      }
    ]
  };

  const assignmentScoresData = {
    labels: assignments.labels,
    datasets: [
      {
        label: 'Average Score',
        data: assignments.scores,
        backgroundColor: 'rgba(59, 130, 246, 0.8)'
      }
    ]
  };

  const quizDistributionData = {
    labels: quizzes.distribution.labels,
    datasets: [
      {
        data: quizzes.distribution.values,
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      }
    ]
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        Course Analytics
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Enrolled Students
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {course.enrolledCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Average Completion
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {course.averageCompletion}%
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Average Grade
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {course.averageGrade}%
          </p>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Student Progress Over Time
        </h2>
        <LineChart data={progressChartData} height={300} />
      </div>

      {/* Assignment and Quiz Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Assignment Scores
          </h2>
          <BarChart data={assignmentScoresData} height={300} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Quiz Score Distribution
          </h2>
          <DoughnutChart data={quizDistributionData} height={300} />
        </div>
      </div>

      {/* Student Performance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Top Performing Students
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Average Grade
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {course.topStudents.map((student, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {student.progress}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {student.averageGrade}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CourseAnalytics;