const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createQuizValidation,
  createQuizQuestionValidation,
  submitQuizValidation
} = require('../middleware/validations/assignmentValidation');

// Create new quiz (teachers and admins only)
router.post(
  '/',
  auth,
  authorize('teacher', 'admin'),
  createQuizValidation,
  validate,
  quizController.createQuiz
);

// Add question to quiz (teachers and admins only)
router.post(
  '/:quizId/questions',
  auth,
  authorize('teacher', 'admin'),
  createQuizQuestionValidation,
  validate,
  quizController.addQuizQuestion
);

// Get quiz with questions
router.get(
  '/:id',
  auth,
  quizController.getQuiz
);

// Submit quiz attempt (students only)
router.post(
  '/:quizId/submit',
  auth,
  authorize('student'),
  submitQuizValidation,
  validate,
  quizController.submitQuizAttempt
);

// Get quiz attempts
router.get(
  '/:quizId/attempts',
  auth,
  quizController.getQuizAttempts
);

module.exports = router;