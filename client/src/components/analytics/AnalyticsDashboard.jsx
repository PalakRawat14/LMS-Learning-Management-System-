import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import LoadingSpinner from '../LoadingSpinner';
import LineChart from '../charts/LineChart';
import BarChart from '../charts/BarChart';
import DoughnutChart from '../charts/DoughnutChart';

const StatCard = ({ title, value, subtitle, trend }) => {
  const trendColor = trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-500';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</h3>
      <div className="flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        {trend !== undefined && (
          <span className={`ml-2 text-sm font-medium ${trendColor}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      )}
    </div>
  );
};

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const analyticsData = await analyticsService.getOverallAnalytics();
        setData(analyticsData);
      } catch (err) {
        setError('Failed to fetch analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const {
    activeUsers,
    totalCourses,
    completionRate,
    averageScore,
    engagementTrend,
    performanceData,
    courseDistribution,
    activityData
  } = data;

  const performanceChartData = {
    labels: performanceData.labels,
    datasets: [
      {
        label: 'Average Score',
        data: performanceData.scores,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        fill: true
      }
    ]
  };

  const courseDistributionData = {
    labels: courseDistribution.labels,
    datasets: [
      {
        data: courseDistribution.values,
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      }
    ]
  };

  const activityChartData = {
    labels: activityData.labels,
    datasets: [
      {
        label: 'Course Activity',
        data: activityData.values,
        backgroundColor: 'rgba(59, 130, 246, 0.8)'
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Analytics Dashboard
        </h1>
        {/* Add date range picker or filters here if needed */}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Users"
          value={activeUsers.current}
          trend={activeUsers.trend}
          subtitle="Past 30 days"
        />
        <StatCard
          title="Total Courses"
          value={totalCourses.count}
          trend={totalCourses.trend}
          subtitle="Including archived"
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate.value}%`}
          trend={completionRate.trend}
          subtitle="Course completion"
        />
        <StatCard
          title="Average Score"
          value={`${averageScore.value}%`}
          trend={averageScore.trend}
          subtitle="All assessments"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Performance Trend
          </h2>
          <LineChart data={performanceChartData} height={300} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Course Distribution
          </h2>
          <DoughnutChart data={courseDistributionData} height={300} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Activity Overview
        </h2>
        <BarChart data={activityChartData} height={300} />
      </div>

      {user?.role === 'admin' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Engagement Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {engagementTrend.map((metric, index) => (
              <div key={index} className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {metric.value}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;