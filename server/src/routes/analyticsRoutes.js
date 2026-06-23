const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Get student's progress in a course
// Two routes: one for when userId is provided, and one for when it's omitted.
router.get(
  '/courses/:courseId/progress',
  auth,
  analyticsController.getStudentCourseProgress
);

router.get(
  '/courses/:courseId/progress/:userId',
  auth,
  analyticsController.getStudentCourseProgress
);

// Get course analytics (teachers and admins only)
router.get(
  '/courses/:courseId',
  auth,
  authorize('teacher', 'admin'),
  analyticsController.getCourseAnalytics
);

// Get system-wide analytics (admin only)
router.get(
  '/system',
  auth,
  authorize('admin'),
  analyticsController.getSystemAnalytics
);

module.exports = router;