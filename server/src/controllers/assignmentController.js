const { Assignment, Submission, User, Course } = require('../models');
const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');

// Create new assignment
const createAssignment = async (req, res) => {
  try {
    const { title, description, dueDate, totalPoints, courseId } = req.body;
    let attachments = [];

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        mimetype: file.mimetype
      }));
    }

    // Check if user has permission to create assignment in this course
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (req.user.role !== 'admin' && String(course.teacherId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to create assignments in this course' });
    }

    const assignment = await Assignment.create({
      title,
      description,
      dueDate,
      totalPoints,
      courseId,
      attachments
    });

    res.status(201).json({
      message: 'Assignment created successfully',
      assignment
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ message: 'Error creating assignment' });
  }
};

// Get all assignments for a course
const getCourseAssignments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const assignments = await Assignment.findAll({
      where: { courseId },
      order: [['dueDate', 'ASC']]
    });

    res.json({ assignments });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ message: 'Error retrieving assignments' });
  }
};

// Get assignment by ID
const getAssignment = async (req, res) => {
  try {
    const includeOptions = [{
      model: Course,
      attributes: ['title', 'teacherId']
    }];
    
    // If student, include their submission to check if they've submitted
    if (req.user.role === 'student') {
      includeOptions.push({
        model: Submission,
        where: { userId: req.user.id },
        required: false,
        attributes: ['id', 'submittedAt', 'grade', 'status']
      });
    }
    
    const assignment = await Assignment.findByPk(req.params.id, {
      include: includeOptions
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Add submitted flag for students
    const assignmentJSON = assignment.toJSON();
    if (req.user.role === 'student') {
      assignmentJSON.submitted = assignmentJSON.Submissions && assignmentJSON.Submissions.length > 0;
      assignmentJSON.isSubmitted = assignmentJSON.submitted;
    }

    res.json({ assignment: assignmentJSON });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ message: 'Error retrieving assignment' });
  }
};

// Submit assignment
const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { content } = req.body;
    let attachments = [];

    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if student has already submitted
    const existingSubmission = await Submission.findOne({
      where: {
        assignmentId,
        userId: req.user.id
      }
    });

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        mimetype: file.mimetype
      }));
    }

    // Check if past due date
    const isLate = new Date() > new Date(assignment.dueDate);

    let submission;
    if (existingSubmission) {
      // Resubmission: update existing submission
      console.log(`User ${req.user.id} resubmitting assignment ${assignmentId}`);
      
      // Delete old attachment files if new ones are uploaded
      if (attachments.length > 0 && existingSubmission.attachments && existingSubmission.attachments.length > 0) {
        const fs = require('fs');
        const path = require('path');
        for (const oldAttachment of existingSubmission.attachments) {
          try {
            fs.unlinkSync(path.join(__dirname, '../../uploads', oldAttachment.filename));
            console.log(`Deleted old attachment: ${oldAttachment.filename}`);
          } catch (err) {
            console.warn(`Failed to delete old attachment ${oldAttachment.filename}:`, err.message);
          }
        }
      }

      // Update submission
      await existingSubmission.update({
        content,
        attachments: attachments.length > 0 ? attachments : existingSubmission.attachments,
        status: isLate ? 'late' : 'resubmitted',
        updatedAt: new Date()
      });

      submission = existingSubmission;
      res.status(200).json({
        message: 'Assignment resubmitted successfully',
        submission
      });
    } else {
      // First submission
      submission = await Submission.create({
        content,
        attachments,
        assignmentId,
        userId: req.user.id,
        status: isLate ? 'late' : 'submitted'
      });

      res.status(201).json({
        message: 'Assignment submitted successfully',
        submission
      });
    }
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ message: 'Error submitting assignment' });
  }
};

// Grade submission
const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;

    const submission = await Submission.findByPk(submissionId, {
      include: [{
        model: Assignment,
        include: [{ model: Course }]
      }]
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if user has permission to grade
    if (req.user.role !== 'admin' && String(submission.Assignment.Course.teacherId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to grade this submission' });
    }

    await submission.update({
      grade,
      feedback,
      status: 'graded'
    });

    res.json({
      message: 'Submission graded successfully',
      submission
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ message: 'Error grading submission' });
  }
};

// Get all submissions for an assignment
const getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    console.log(`[Submissions] Fetching submissions for assignment ${assignmentId} by user ${req.user.id} (${req.user.role})`);
    
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [{ model: Course }]
    });

    if (!assignment) {
      console.log(`[Submissions] Assignment ${assignmentId} not found`);
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Debug: log types/values to diagnose auth mismatches
    console.log(`[Submissions] DEBUG types - assignment.Course.teacherId: (${typeof assignment.Course.teacherId}) ${assignment.Course.teacherId}, req.user.id: (${typeof req.user.id}) ${req.user.id}, req.user.role: ${req.user.role}`);

    // Allow both teacher and instructor roles, and handle id type mismatches
    const isAdmin = req.user.role === 'admin';
    const isTeacher = req.user.role === 'teacher' || req.user.role === 'instructor';
    const teacherId = assignment.Course.teacherId;
    const userId = req.user.id;
    if (!isAdmin && !(isTeacher && teacherId == userId)) {
      console.log(`[Submissions] User ${userId} not authorized. Course teacher is ${teacherId}`);
      // Add detailed debug info in the response for troubleshooting
      return res.status(403).json({
        message: 'Not authorized to view submissions',
        debug: {
          userId,
          userRole: req.user.role,
          teacherId,
          teacherIdType: typeof teacherId,
          userIdType: typeof userId,
          possibleCauses: [
            'teacherId in Course table does not match your teacher user id',
            'The teacher user may not have the correct role (teacher or instructor)',
            'There may be a type mismatch (string vs number) in the database',
            'The frontend may be using a cached/old token or not logging in as the correct teacher user'
          ]
        }
      });
    }

    const submissions = await Submission.findAll({
      where: { assignmentId },
      include: [{
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['submittedAt', 'DESC']]
    });

    console.log(`[Submissions] Found ${submissions.length} submissions for assignment ${assignmentId}`);

    // Enrich attachments with a download URL so frontend can directly link to files
    const enriched = submissions.map(s => {
      const sj = s.toJSON();
      if (sj.attachments && Array.isArray(sj.attachments)) {
        sj.attachments = sj.attachments.map(att => {
          if (!att) return att;
          // att may be a string (filename) or an object { filename, originalName, path, mimetype }
          if (typeof att === 'string') {
            return { filename: att, originalName: att, downloadUrl: `/api/assignments/download/${att}` };
          }
          const filename = att.filename || att.originalName;
          return {
            filename: att.filename || filename,
            originalName: att.originalName || filename,
            mimetype: att.mimetype,
            downloadUrl: `/api/assignments/download/${att.filename || filename}`
          };
        });
      }

      return sj;
    });

    res.json({ submissions: enriched });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ message: 'Error retrieving submissions' });
  }
};

// Export assignment submissions to Excel
const exportAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await Assignment.findByPk(assignmentId, {
      include: [{ model: Course, attributes: ['id', 'title', 'code', 'teacherId'] }]
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isTeacher = req.user.role === 'teacher' || req.user.role === 'instructor';
    if (!isAdmin && !(isTeacher && assignment.Course.teacherId == req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to export this assignment report' });
    }

    const submissions = await Submission.findAll({
      where: { assignmentId },
      include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['submittedAt', 'DESC']]
    });

    const reportRows = submissions.map((submission) => {
      const submissionJSON = submission.toJSON();
      const attachmentNames = Array.isArray(submissionJSON.attachments)
        ? submissionJSON.attachments
            .map((attachment) => {
              if (!attachment) return '';
              if (typeof attachment === 'string') return attachment;
              return attachment.originalName || attachment.originalname || attachment.fileName || attachment.filename || '';
            })
            .filter(Boolean)
        : [];

      return {
        studentName: `${submissionJSON.User?.firstName || ''} ${submissionJSON.User?.lastName || ''}`.trim() || 'Unknown Student',
        email: submissionJSON.User?.email || '',
        submittedAtText: submissionJSON.submittedAt ? new Date(submissionJSON.submittedAt).toLocaleString() : '',
        grade: submissionJSON.grade ?? '',
        feedback: submissionJSON.feedback || '',
        submissionStatus: submissionJSON.status || 'submitted',
        submissionId: submissionJSON.id,
        attachments: attachmentNames.join(', ')
      };
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LMS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet('Submissions');
    worksheet.properties.defaultRowHeight = 20;
    worksheet.views = [{ state: 'frozen', ySplit: 5 }];

    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = 'Assignment Submissions Report';
    worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

    worksheet.getCell('A2').value = 'Assignment';
    worksheet.getCell('B2').value = assignment.title;
    worksheet.getCell('A3').value = 'Course';
    worksheet.getCell('B3').value = `${assignment.Course.title}${assignment.Course.code ? ` (${assignment.Course.code})` : ''}`;
    worksheet.getCell('A4').value = 'Generated At';
    worksheet.getCell('B4').value = new Date().toLocaleString();

    worksheet.getRow(2).font = { bold: true };
    worksheet.getRow(3).font = { bold: true };
    worksheet.getRow(4).font = { bold: true };

    worksheet.addRow([]);

      const headerRow = worksheet.addRow([
        'Student Name',
        'Email',
        'Submitted At',
        'Grade',
        'Feedback',
        'Status',
        'Submission ID',
        'Files'
      ]);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF93C5FD' } },
        left: { style: 'thin', color: { argb: 'FF93C5FD' } },
        bottom: { style: 'thin', color: { argb: 'FF93C5FD' } },
        right: { style: 'thin', color: { argb: 'FF93C5FD' } }
      };
    });

      if (reportRows.length === 0) {
      const row = worksheet.addRow(['No submissions found for this assignment.']);
      worksheet.mergeCells(row.number, 1, row.number, 8);
    } else {
      reportRows.forEach((student) => {
        const row = worksheet.addRow([
          student.studentName,
          student.email,
          student.submittedAtText,
          student.grade,
          student.feedback,
            student.submissionStatus,
            student.submissionId,
            student.attachments
        ]);

        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
        });

          row.getCell(6).font = { bold: true, color: { argb: 'FF166534' } };
      });
    }

    worksheet.columns.forEach((column, index) => {
        const widths = [28, 32, 22, 12, 32, 16, 14, 32];
      column.width = widths[index] || 18;
    });

    const safeTitle = assignment.title.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || `assignment_${assignmentId}`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_submissions.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export assignment submissions error:', error);
    res.status(500).json({ message: 'Error exporting assignment submissions' });
  }
};

// Get all assignments for the logged-in user
const getUserAssignments = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let assignments = [];

    if (userRole === 'admin') {
      // For admins, get ALL assignments from ALL courses with teacher info
      assignments = await Assignment.findAll({
        include: [{
          model: Course,
          attributes: ['id', 'title', 'code', 'teacherId'],
          include: [{
            model: User,
            as: 'teacher',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }]
        }],
        order: [['dueDate', 'ASC']]
      });
    } else if (userRole === 'teacher' || userRole === 'instructor') {
      // For teachers, get all assignments from their courses
      assignments = await Assignment.findAll({
        include: [{
          model: Course,
          where: { teacherId: userId },
          attributes: ['id', 'title', 'code']
        }],
        order: [['dueDate', 'ASC']]
      });
    } else {
      // For students, get assignments from courses they're enrolled in
      const { Enrollment } = require('../models');
      
      // Get enrolled courses
      const enrollments = await Enrollment.findAll({
        where: { userId, status: 'active' },
        attributes: ['courseId']
      });
      
      const enrolledCourseIds = enrollments.map(e => e.courseId);
      
      if (enrolledCourseIds.length > 0) {
        // Get assignments from enrolled courses
        assignments = await Assignment.findAll({
          where: { courseId: enrolledCourseIds },
          include: [{
            model: Course,
            attributes: ['id', 'title', 'code', 'teacherId'],
            include: [{
              model: User,
              as: 'teacher',
              attributes: ['id', 'firstName', 'lastName', 'email']
            }]
          }, {
            model: Submission,
            where: { userId },
            required: false,
            attributes: ['id', 'submittedAt', 'grade']
          }],
          order: [['dueDate', 'ASC']]
        });
        
        // Add isSubmitted and submitted flags for easier frontend handling
        assignments = assignments.map(assignment => {
          const assignmentJSON = assignment.toJSON();
          const hasSubmission = assignmentJSON.Submissions && assignmentJSON.Submissions.length > 0;
          assignmentJSON.isSubmitted = hasSubmission;
          assignmentJSON.submitted = hasSubmission; // For consistency with frontend
          return assignmentJSON;
        });
      }
    }

    res.json({ assignments });
  } catch (error) {
    console.error('Get user assignments error:', error);
    res.status(500).json({ message: 'Error retrieving assignments' });
  }
};

// Download assignment attachment
const downloadAttachment = async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: Prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ message: 'Invalid filename' });
    }

    const filePath = path.join(__dirname, '../../uploads', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Send file
    res.download(filePath);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ message: 'Error downloading file' });
  }
};

// Download assignment attachment by index so older attachment records that
// don't preserve the exact stored filename still work reliably.
const downloadAttachmentByIndex = async (req, res) => {
  try {
    const { assignmentId, attachmentIndex } = req.params;

    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    let attachments = assignment.attachments;
    if (!attachments) {
      return res.status(404).json({ message: 'No attachments found for this assignment' });
    }

    if (typeof attachments === 'string') {
      try {
        attachments = JSON.parse(attachments);
      } catch (error) {
        attachments = [];
      }
    }

    const index = parseInt(attachmentIndex, 10);
    const attachment = attachments[index];
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const candidates = [];
    const addCandidate = (value) => {
      if (!value || typeof value !== 'string') return;
      const normalized = value.trim();
      if (!normalized) return;

      candidates.push(normalized);
      candidates.push(path.resolve(normalized));
      candidates.push(path.resolve(__dirname, '../../', normalized));
      candidates.push(path.resolve(__dirname, '../../uploads', path.basename(normalized)));
      candidates.push(path.resolve(process.cwd(), 'uploads', path.basename(normalized)));
    };

    if (typeof attachment === 'string') {
      addCandidate(attachment);
    } else {
      addCandidate(attachment.filename);
      addCandidate(attachment.fileName);
      addCandidate(attachment.originalName);
      addCandidate(attachment.path);
      addCandidate(attachment.filePath);
    }

    // Try basename fallbacks for older records that may store a display name
    if (typeof attachment === 'object' && attachment !== null) {
      if (attachment.originalName) addCandidate(path.basename(attachment.originalName));
      if (attachment.filename) addCandidate(path.basename(attachment.filename));
      if (attachment.fileName) addCandidate(path.basename(attachment.fileName));
    }

    const seen = new Set();
    const uniqueCandidates = candidates.filter((candidate) => {
      if (seen.has(candidate)) return false;
      seen.add(candidate);
      return true;
    });

    let foundPath = null;
    for (const candidate of uniqueCandidates) {
      try {
        await fs.access(candidate);
        foundPath = candidate;
        break;
      } catch (error) {
        // keep trying
      }
    }

    if (!foundPath) {
      return res.status(404).json({ message: 'File not found' });
    }

    const downloadName = typeof attachment === 'string'
      ? path.basename(attachment)
      : (attachment.originalName || attachment.filename || attachment.fileName || 'download');

    res.download(foundPath, downloadName);
  } catch (error) {
    console.error('Download attachment by index error:', error);
    res.status(500).json({ message: 'Error downloading file' });
  }
};

// Delete assignment (admin only)
const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const assignment = await Assignment.findByPk(id, {
      include: [{
        model: Course,
        attributes: ['teacherId']
      }]
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check authorization: Admin can delete any, Teacher can delete their own
    if (req.user.role !== 'admin' && assignment.Course.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this assignment' });
    }

    // Delete associated submissions first
    await Submission.destroy({
      where: { assignmentId: id }
    });

    // Delete assignment files if they exist
    if (assignment.attachments && assignment.attachments.length > 0) {
      for (const attachment of assignment.attachments) {
        try {
          const filePath = path.join(__dirname, '../../uploads', attachment.filename);
          await fs.unlink(filePath);
        } catch (err) {
          console.error('Error deleting file:', err);
          // Continue even if file deletion fails
        }
      }
    }

    // Delete the assignment
    await assignment.destroy();

    res.json({ 
      message: 'Assignment deleted successfully',
      success: true
    });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ message: 'Error deleting assignment' });
  }
};

module.exports = {
  createAssignment,
  getCourseAssignments,
  getAssignment,
  submitAssignment,
  gradeSubmission,
  getAssignmentSubmissions,
  getUserAssignments,
  downloadAttachment,
  downloadAttachmentByIndex,
  exportAssignmentSubmissions,
  deleteAssignment
};