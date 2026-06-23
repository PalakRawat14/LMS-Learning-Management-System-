const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// All routes require admin authentication
router.use(auth);
router.use(authorize('admin'));

// Teacher invitation management (specific routes first)
router.post('/teachers/invite', adminController.inviteTeacher);
router.get('/teachers/invitations', adminController.getInvitations);
router.delete('/teachers/invitations/:id', adminController.revokeInvitation);

// Teacher management (generic routes after specific ones)
router.get('/teachers', adminController.getTeachers);
router.delete('/teachers/:id', adminController.deleteTeacher);
router.patch('/teachers/:id/toggle-status', adminController.toggleTeacherStatus);

// Course management (admin creates courses and assigns to teachers)
router.post('/courses', adminController.createCourse);

// Existing uploads and assignment attachments
router.get('/uploads', adminController.getUploadFiles);
router.get('/assignments', adminController.getAllAssignments);
router.post('/assignments/:type/:assignmentId/attach-existing', adminController.attachExistingFileToAssignment);

module.exports = router;
