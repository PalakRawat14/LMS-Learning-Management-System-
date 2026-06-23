const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const upload = require('../middleware/subjectUpload');
const subjectController = require('../controllers/subjectController');

// Subject CRUD
router.get('/', auth, subjectController.getAllSubjects);
router.get('/:id', auth, subjectController.getSubjectById);
router.post('/', auth, authorize('admin'), subjectController.createSubject);
router.put('/:id', auth, authorize('admin'), subjectController.updateSubject);
router.delete('/:id', auth, authorize('admin'), subjectController.deleteSubject);

// Teacher assignment (admin only)
router.post('/:subjectId/assign-teacher', auth, authorize('admin'), subjectController.assignTeacher);
router.delete('/:subjectId/assign-teacher/:teacherId', auth, authorize('admin'), subjectController.unassignTeacher);

// Subject Materials
router.post('/:subjectId/materials', auth, authorize('admin', 'teacher'), upload.single('file'), subjectController.uploadMaterial);
router.get('/:subjectId/materials', auth, subjectController.getSubjectMaterials);
router.get('/materials/all-student', auth, authorize('student'), subjectController.getAllStudentMaterials);
router.get('/:subjectId/materials/:materialId/download', auth, subjectController.downloadMaterial);
router.delete('/:subjectId/materials/:materialId', auth, authorize('admin', 'teacher'), subjectController.deleteMaterial);

// Subject Assignments
router.get('/assignments/all-student', auth, authorize('student'), subjectController.getAllStudentAssignments);
router.post('/:subjectId/assignments', auth, authorize('admin', 'teacher'), (req, res, next) => {
  upload.array('files', 5)(req, res, (err) => {
    if (err) {
      const msg = err instanceof multer.MulterError
        ? err.code === 'LIMIT_FILE_SIZE' ? 'File too large. Max 20MB.' : err.message
        : err.message || 'Upload error';
      return res.status(400).json({ message: msg });
    }
    next();
  });
}, subjectController.createAssignment);
router.get('/:subjectId/assignments', auth, subjectController.getSubjectAssignments);
router.get('/:subjectId/assignments/:assignmentId', auth, subjectController.getAssignmentById);
router.get('/:subjectId/assignments/:assignmentId/download/:attachmentIndex', auth, subjectController.downloadAssignmentAttachment);
router.delete('/:subjectId/assignments/:assignmentId', auth, authorize('admin', 'teacher'), subjectController.deleteAssignment);

// Subject Assignment Submissions
router.post('/assignments/:assignmentId/submit', auth, authorize('student'), (req, res, next) => {
  upload.array('files', 5)(req, res, (err) => {
    if (err) {
      const msg = err instanceof multer.MulterError
        ? err.code === 'LIMIT_FILE_SIZE' ? 'File too large. Max 20MB.' : err.message
        : err.message || 'Upload error';
      return res.status(400).json({ message: msg });
    }
    next();
  });
}, subjectController.submitAssignment);
router.get('/submissions/my', auth, authorize('student'), subjectController.getMySubmissions);
router.get('/assignments/:assignmentId/my-submission', auth, authorize('student'), subjectController.getMyAssignmentSubmission);
router.get('/assignments/:assignmentId/submissions', auth, authorize('admin', 'teacher'), subjectController.getAssignmentSubmissions);
router.get('/assignments/:assignmentId/submissions/export', auth, authorize('admin', 'teacher'), subjectController.exportAssignmentSubmissions);
router.get('/submissions/teacher-all', auth, authorize('admin', 'teacher'), subjectController.getAllTeacherSubjectSubmissions);
router.get('/submissions/:submissionId/download/:attachmentIndex', auth, authorize('admin', 'teacher'), subjectController.downloadSubmissionAttachment);
router.post('/submissions/:submissionId/grade', auth, authorize('admin', 'teacher'), subjectController.gradeSubmission);

module.exports = router;
