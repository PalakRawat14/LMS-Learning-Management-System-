const { body } = require('express-validator');

const createCourseValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Course title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Course title must be between 3 and 100 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Course description is required')
    .isLength({ min: 10 })
    .withMessage('Course description must be at least 10 characters long'),

  body('code')
    .trim()
    .notEmpty()
    .withMessage('Course code is required')
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('Course code must contain only uppercase letters, numbers, and hyphens')
    .isLength({ min: 3, max: 20 })
    .withMessage('Course code must be between 3 and 20 characters'),

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

  body('enrollmentLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Enrollment limit must be a positive number')
];

const updateCourseValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Course title must be between 3 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Course description must be at least 10 characters long'),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((endDate, { req }) => {
      if (req.body.startDate && new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('enrollmentLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Enrollment limit must be a positive number'),

  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean value'),

  // Allow admin to update teacherId
  body('teacherId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('teacherId must be a valid user id')
    .toInt()
];

module.exports = {
  createCourseValidation,
  updateCourseValidation
};