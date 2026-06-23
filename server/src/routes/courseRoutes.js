const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createCourseValidation, updateCourseValidation } = require('../middleware/validations/courseValidation');

// Get all courses (public, but filters based on user role)
router.get('/', auth, courseController.getCourses);

// Get my courses (courses user is teaching or enrolled in)
router.get('/my-courses', auth, courseController.getMyCourses);

// Get single course
router.get('/:id', auth, courseController.getCourseById);

// Create course (admin only - teachers get courses assigned by admin)
router.post(
  '/',
  auth,
  authorize('admin'),
  createCourseValidation,
  validate,
  courseController.createCourse
);

// Update course (course teacher and admins only)
router.put(
  '/:id',
  auth,
  authorize('teacher', 'admin'),
  updateCourseValidation,
  validate,
  courseController.updateCourse
);

// Delete course (course teacher and admins only)
router.delete(
  '/:id',
  auth,
  authorize('teacher', 'admin'),
  courseController.deleteCourse
);

// Enroll in course (students only)
router.post(
  '/:id/enroll',
  auth,
  authorize('student'),
  courseController.enrollInCourse
);

// Unenroll from course (students only)
router.post(
  '/:id/unenroll',
  auth,
  authorize('student'),
  courseController.unenrollFromCourse
);

// Get enrolled students (course teacher and admins only)
router.get(
  '/:id/students',
  auth,
  authorize('teacher', 'admin'),
  courseController.getEnrolledStudents
);

module.exports = router;