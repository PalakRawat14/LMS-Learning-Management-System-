const { 
  User, 
  Course, 
  Assignment, 
  Quiz, 
  Submission, 
  QuizAttempt,
  Enrollment,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

// Get student's course progress
const getStudentCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.params.userId || req.user.id;

    // Verify course exists and user is enrolled
    const enrollment = await Enrollment.findOne({
      where: {
        courseId,
        userId
      },
      include: [{ model: Course }]
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Get assignment statistics
    const assignments = await Assignment.findAll({
      where: { courseId },
      include: [{
        model: Submission,
        where: { userId },
        required: false
      }]
    });

    const assignmentStats = {
      total: assignments.length,
      completed: assignments.filter(a => a.Submissions.length > 0).length,
      totalPoints: assignments.reduce((sum, a) => sum + (a.totalPoints || 0), 0),
      earnedPoints: assignments.reduce((sum, a) => {
        const submission = a.Submissions[0];
        return sum + (submission?.grade || 0);
      }, 0)
    };

    // Get quiz statistics
    const quizzes = await Quiz.findAll({
      where: { courseId },
      include: [{
        model: QuizAttempt,
        where: { userId },
        required: false
      }]
    });

    const quizStats = {
      total: quizzes.length,
      completed: quizzes.filter(q => q.QuizAttempts.length > 0).length,
      totalPoints: quizzes.reduce((sum, q) => sum + (q.totalPoints || 0), 0),
      earnedPoints: quizzes.reduce((sum, q) => {
        const bestAttempt = q.QuizAttempts.reduce((best, attempt) => 
          (!best || attempt.score > best.score) ? attempt : best, null);
        return sum + (bestAttempt?.score || 0);
      }, 0)
    };

    // Calculate overall progress
    const totalAssessments = assignmentStats.total + quizStats.total;
    const completedAssessments = assignmentStats.completed + quizStats.completed;
    const totalPoints = assignmentStats.totalPoints + quizStats.totalPoints;
    const earnedPoints = assignmentStats.earnedPoints + quizStats.earnedPoints;

    const progress = {
      completionPercentage: totalAssessments ? (completedAssessments / totalAssessments) * 100 : 0,
      gradePercentage: totalPoints ? (earnedPoints / totalPoints) * 100 : 0,
      assignments: assignmentStats,
      quizzes: quizStats
    };

    res.json({ progress });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: 'Error retrieving progress' });
  }
};

// Get course analytics for teachers
const getCourseAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Verify course exists and user has access
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (req.user.role !== 'admin' && course.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view course analytics' });
    }

    // Get enrollment statistics
    const enrollmentStats = await Enrollment.findAll({
      where: { courseId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    // Get assignment submission statistics
    const assignmentStats = await Assignment.findAll({
      where: { courseId },
      include: [{
        model: Submission,
        attributes: []
      }],
      attributes: [
        'id',
        'title',
        [sequelize.fn('COUNT', sequelize.col('Submissions.id')), 'submissionCount'],
        [sequelize.fn('AVG', sequelize.col('Submissions.grade')), 'averageGrade']
      ],
      group: ['Assignment.id']
    });

    // Get quiz completion statistics
    const quizStats = await Quiz.findAll({
      where: { courseId },
      include: [{
        model: QuizAttempt,
        attributes: []
      }],
      attributes: [
        'id',
        'title',
        [sequelize.fn('COUNT', sequelize.col('QuizAttempts.id')), 'attemptCount'],
        [sequelize.fn('AVG', sequelize.col('QuizAttempts.score')), 'averageScore']
      ],
      group: ['Quiz.id']
    });

    // Get grade distribution
    const gradeDistribution = await sequelize.query(`
      SELECT 
        CASE
          WHEN grade >= 90 THEN 'A'
          WHEN grade >= 80 THEN 'B'
          WHEN grade >= 70 THEN 'C'
          WHEN grade >= 60 THEN 'D'
          ELSE 'F'
        END as grade_range,
        COUNT(*) as count
      FROM submissions
      WHERE assignment_id IN (
        SELECT id FROM assignments WHERE course_id = :courseId
      )
      AND grade IS NOT NULL
      GROUP BY grade_range
      ORDER BY grade_range
    `, {
      replacements: { courseId },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      enrollmentStats,
      assignmentStats,
      quizStats,
      gradeDistribution
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Error retrieving analytics' });
  }
};

// Get system-wide analytics for admin
const getSystemAnalytics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view system analytics' });
    }

    // Get user statistics
    const userStats = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role']
    });

    // Get course statistics
    const courseStats = await Course.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCourses'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_published = true THEN 1 END')), 'publishedCourses']
      ]
    });

    // Get activity statistics for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await Promise.all([
      Submission.count({ where: { createdAt: { [Op.gte]: thirtyDaysAgo } } }),
      QuizAttempt.count({ where: { createdAt: { [Op.gte]: thirtyDaysAgo } } }),
      Enrollment.count({ where: { createdAt: { [Op.gte]: thirtyDaysAgo } } })
    ]);

    // Get average course completion rate
    const completionRate = await Enrollment.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    res.json({
      userStats,
      courseStats: courseStats[0],
      recentActivity: {
        submissions: recentActivity[0],
        quizAttempts: recentActivity[1],
        newEnrollments: recentActivity[2]
      },
      completionRate
    });
  } catch (error) {
    console.error('Get system analytics error:', error);
    res.status(500).json({ message: 'Error retrieving system analytics' });
  }
};

module.exports = {
  getStudentCourseProgress,
  getCourseAnalytics,
  getSystemAnalytics
};