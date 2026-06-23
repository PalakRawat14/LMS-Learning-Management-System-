const { body } = require('express-validator');

const createAssignmentValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Assignment title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Assignment title must be between 3 and 100 characters'),

  body('description')
    .optional()
    .trim(),

  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isISO8601()
    .withMessage('Invalid due date format'),

  body('totalPoints')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total points must be a positive number'),

  body('courseId')
    .notEmpty()
    .withMessage('Course ID is required')
    .isInt()
    .withMessage('Invalid course ID')
];

const createQuizValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Quiz title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Quiz title must be between 3 and 100 characters'),

  body('description')
    .optional()
    .trim(),

  body('timeLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Time limit must be a positive number'),

  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format'),

  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('totalPoints')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total points must be a positive number'),

  body('courseId')
    .notEmpty()
    .withMessage('Course ID is required')
    .isInt()
    .withMessage('Invalid course ID')
];

const createQuizQuestionValidation = [
  body('question')
    .trim()
    .notEmpty()
    .withMessage('Question is required'),

  body('type')
    .notEmpty()
    .withMessage('Question type is required')
    .isIn(['multiple-choice', 'true-false', 'short-answer'])
    .withMessage('Invalid question type'),

  body('options')
    .custom((options, { req }) => {
      if (req.body.type === 'multiple-choice' && (!Array.isArray(options) || options.length < 2)) {
        throw new Error('Multiple choice questions must have at least 2 options');
      }
      return true;
    }),

  body('correctAnswer')
    .notEmpty()
    .withMessage('Correct answer is required'),

  body('points')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Points must be a positive number'),

  body('order')
    .notEmpty()
    .withMessage('Question order is required')
    .isInt({ min: 0 })
    .withMessage('Order must be a positive number')
];

const submitQuizValidation = [
  body('answers')
    .isArray()
    .withMessage('Answers must be an array')
    .notEmpty()
    .withMessage('Answers are required')
];

module.exports = {
  createAssignmentValidation,
  createQuizValidation,
  createQuizQuestionValidation,
  submitQuizValidation
};