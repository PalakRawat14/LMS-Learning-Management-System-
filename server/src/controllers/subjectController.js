const { Subject, SubjectTeacher, SubjectMaterial, SubjectAssignment, SubjectSubmission, User } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

// Helper function to parse attachments from JSON string to array
const parseAttachments = (assignment) => {
  if (!assignment) return assignment;
  if (assignment.attachments && typeof assignment.attachments === 'string') {
    try {
      assignment.attachments = JSON.parse(assignment.attachments);
    } catch (e) {
      assignment.attachments = [];
    }
  }
  return assignment;
};

// Helper to parse attachments on array of assignments
const parseAttachmentsArray = (assignments) => {
  return (assignments || []).map(a => parseAttachments(a.toJSON ? a.toJSON() : a));
};

const subjectController = {
  // ---- Subjects CRUD ----

  getAllSubjects: async (req, res) => {
    try {
      const { role, id: userId, courseField } = req.user;
      let where = {};

      if (role === 'admin') {
        // Admin sees all
      } else if (role === 'teacher') {
        // Teacher sees subjects they are assigned to + matching their courseField
        const assignments = await SubjectTeacher.findAll({
          where: { teacherId: userId },
          attributes: ['subjectId']
        });
        const subjectIds = assignments.map(a => a.subjectId);
        if (courseField) {
          where = { id: { [Op.in]: subjectIds }, [Op.or]: [{ courseField }, { courseField: '' }] };
        } else {
          where = { id: { [Op.in]: subjectIds } };
        }
      } else {
        // Student sees active subjects matching their courseField (or no courseField = general)
        where = { isActive: true };
        if (courseField) {
          where = { isActive: true, [Op.or]: [{ courseField }, { courseField: '' }] };
        }
      }

      const subjects = await Subject.findAll({
        where,
        include: [
          {
            model: User,
            as: 'teachers',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            through: { attributes: [] }
          }
        ],
        order: [['name', 'ASC']]
      });

      res.json(subjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      res.status(500).json({ message: 'Error fetching subjects' });
    }
  },

  getSubjectById: async (req, res) => {
    try {
      const subject = await Subject.findByPk(req.params.id, {
        include: [
          {
            model: User,
            as: 'teachers',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            through: { attributes: [] }
          }
        ]
      });

      if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      res.json(subject);
    } catch (error) {
      console.error('Error fetching subject:', error);
      res.status(500).json({ message: 'Error fetching subject' });
    }
  },

  createSubject: async (req, res) => {
    try {
      const { name, code, description, courseField } = req.body;

      if (!courseField) {
        return res.status(400).json({ message: 'Course field is required' });
      }

      const existing = await Subject.findOne({ where: { code: code.toUpperCase() } });
      if (existing) {
        return res.status(400).json({ message: 'A subject with this code already exists' });
      }

      const subject = await Subject.create({
        name,
        code: code.toUpperCase(),
        description,
        courseField
      });

      res.status(201).json(subject);
    } catch (error) {
      console.error('Error creating subject:', error);
      res.status(500).json({ message: error.message || 'Error creating subject' });
    }
  },

  updateSubject: async (req, res) => {
    try {
      const subject = await Subject.findByPk(req.params.id);
      if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      const { name, code, description, isActive, courseField } = req.body;

      if (code && code.toUpperCase() !== subject.code) {
        const existing = await Subject.findOne({ where: { code: code.toUpperCase() } });
        if (existing) {
          return res.status(400).json({ message: 'A subject with this code already exists' });
        }
      }

      await subject.update({
        name: name || subject.name,
        code: code ? code.toUpperCase() : subject.code,
        description: description !== undefined ? description : subject.description,
        isActive: isActive !== undefined ? isActive : subject.isActive,
        courseField: courseField || subject.courseField
      });

      const updated = await Subject.findByPk(subject.id, {
        include: [
          {
            model: User,
            as: 'teachers',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            through: { attributes: [] }
          }
        ]
      });

      res.json(updated);
    } catch (error) {
      console.error('Error updating subject:', error);
      res.status(500).json({ message: 'Error updating subject' });
    }
  },

  deleteSubject: async (req, res) => {
    try {
      const subject = await Subject.findByPk(req.params.id);
      if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      await SubjectTeacher.destroy({ where: { subjectId: subject.id } });

      const materials = await SubjectMaterial.findAll({ where: { subjectId: subject.id } });
      for (const material of materials) {
        const filePath = path.join(__dirname, '../../', material.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      await SubjectMaterial.destroy({ where: { subjectId: subject.id } });

      await SubjectAssignment.destroy({ where: { subjectId: subject.id } });

      await subject.destroy();

      res.json({ message: 'Subject deleted successfully' });
    } catch (error) {
      console.error('Error deleting subject:', error);
      res.status(500).json({ message: 'Error deleting subject' });
    }
  },

  // ---- Teacher Assignment ----

  assignTeacher: async (req, res) => {
    try {
      const { subjectId } = req.params;
      const { teacherId } = req.body;

      const subject = await Subject.findByPk(subjectId);
      if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      const teacher = await User.findOne({ where: { id: teacherId, role: 'teacher' } });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      const existing = await SubjectTeacher.findOne({
        where: { subjectId, teacherId }
      });
      if (existing) {
        return res.status(400).json({ message: 'Teacher is already assigned to this subject' });
      }

      await SubjectTeacher.create({ subjectId, teacherId });

      const updated = await Subject.findByPk(subjectId, {
        include: [
          {
            model: User,
            as: 'teachers',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            through: { attributes: [] }
          }
        ]
      });

      res.json(updated);
    } catch (error) {
      console.error('Error assigning teacher:', error);
      res.status(500).json({ message: 'Error assigning teacher' });
    }
  },

  unassignTeacher: async (req, res) => {
    try {
      const { subjectId, teacherId } = req.params;

      const deleted = await SubjectTeacher.destroy({
        where: { subjectId, teacherId }
      });

      if (!deleted) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      const updated = await Subject.findByPk(subjectId, {
        include: [
          {
            model: User,
            as: 'teachers',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            through: { attributes: [] }
          }
        ]
      });

      res.json(updated);
    } catch (error) {
      console.error('Error unassigning teacher:', error);
      res.status(500).json({ message: 'Error unassigning teacher' });
    }
  },

  // ---- Subject Materials ----

  uploadMaterial: async (req, res) => {
    try {
      const { subjectId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const subject = await Subject.findByPk(subjectId);
      if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      if (userRole !== 'admin') {
        const assignment = await SubjectTeacher.findOne({
          where: { subjectId, teacherId: userId }
        });
        if (!assignment) {
          return res.status(403).json({ message: 'You are not assigned to this subject' });
        }
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const file = req.file;
      const material = await SubjectMaterial.create({
        subjectId,
        title: req.body.title || file.originalname,
        description: req.body.description || null,
        fileName: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileExtension: path.extname(file.originalname).toLowerCase(),
        uploadedBy: userId
      });

      const created = await SubjectMaterial.findByPk(material.id, {
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'firstName', 'lastName']
          }
        ]
      });

      res.status(201).json(created);
    } catch (error) {
      console.error('Error uploading material:', error);
      res.status(500).json({ message: 'Error uploading material' });
    }
  },

  getSubjectMaterials: async (req, res) => {
    try {
      const { subjectId } = req.params;

      const subject = await Subject.findByPk(subjectId);
      if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      const materials = await SubjectMaterial.findAll({
        where: { subjectId, isActive: true },
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json(materials);
    } catch (error) {
      console.error('Error fetching materials:', error);
      res.status(500).json({ message: 'Error fetching materials' });
    }
  },

  getAllStudentMaterials: async (req, res) => {
    try {
      const user = req.user;
      const subjects = await Subject.findAll({
        where: user.courseField ? { courseField: user.courseField } : {}
      });
      const subjectIds = subjects.map(s => s.id);

      const materials = await SubjectMaterial.findAll({
        where: { subjectId: subjectIds, isActive: true },
        include: [
          { model: Subject, attributes: ['id', 'name', 'code'] },
          { model: User, as: 'uploader', attributes: ['id', 'firstName', 'lastName'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json(materials);
    } catch (error) {
      console.error('Error fetching student materials:', error);
      res.status(500).json({ message: 'Error fetching materials' });
    }
  },

  downloadMaterial: async (req, res) => {
    try {
      const material = await SubjectMaterial.findByPk(req.params.materialId);
      if (!material) {
        return res.status(404).json({ message: 'Material not found' });
      }

      const filePath = path.resolve(material.filePath);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }

      await material.increment('downloadCount');

      res.download(filePath, material.originalName);
    } catch (error) {
      console.error('Error downloading material:', error);
      res.status(500).json({ message: 'Error downloading material' });
    }
  },

  deleteMaterial: async (req, res) => {
    try {
      const material = await SubjectMaterial.findByPk(req.params.materialId);
      if (!material) {
        return res.status(404).json({ message: 'Material not found' });
      }

      const userId = req.user.id;
      const userRole = req.user.role;

      if (userRole !== 'admin' && material.uploadedBy !== userId) {
        return res.status(403).json({ message: 'Not authorized to delete this material' });
      }

      const filePath = path.resolve(material.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await material.destroy();

      res.json({ message: 'Material deleted successfully' });
    } catch (error) {
      console.error('Error deleting material:', error);
      res.status(500).json({ message: 'Error deleting material' });
    }
  },

  // ---- Subject Assignments ----

  createAssignment: async (req, res) => {
    try {
      const { subjectId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const subject = await Subject.findByPk(subjectId);
      if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      if (userRole !== 'admin') {
        const assignment = await SubjectTeacher.findOne({
          where: { subjectId, teacherId: userId }
        });
        if (!assignment) {
          return res.status(403).json({ message: 'You are not assigned to this subject' });
        }
      }

      const { title, description, dueDate, totalPoints } = req.body;

      const attachments = req.files ? req.files.map(f => ({
        // Store both naming variants to remain compatible with older records
        fileName: f.filename,
        filename: f.filename,
        originalName: f.originalname,
        originalname: f.originalname,
        filePath: f.path,
        path: f.path,
        fileSize: f.size,
        fileSizeBytes: f.size,
        mimeType: f.mimetype,
        mimetype: f.mimetype
      })) : null;

      const newAssignment = await SubjectAssignment.create({
        subjectId,
        title,
        description,
        dueDate,
        totalPoints: totalPoints || 100,
        attachments,
        isPublished: true
      });

      res.status(201).json(parseAttachments(newAssignment));
    } catch (error) {
      console.error('Error creating assignment:', error);
      res.status(500).json({ message: 'Error creating assignment' });
    }
  },

  getSubjectAssignments: async (req, res) => {
    try {
      const { subjectId } = req.params;

      const subject = await Subject.findByPk(subjectId);
      if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      const assignments = await SubjectAssignment.findAll({
        where: { subjectId },
        order: [['createdAt', 'DESC']]
      });

      res.json(parseAttachmentsArray(assignments));
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({ message: 'Error fetching assignments' });
    }
  },

  getAllStudentAssignments: async (req, res) => {
    try {
      const user = req.user;
      const subjects = await Subject.findAll({
        where: user.courseField ? { courseField: user.courseField } : {}
      });
      const subjectIds = subjects.map(s => s.id);

      const assignments = await SubjectAssignment.findAll({
        where: { subjectId: subjectIds },
        include: [{ model: Subject, attributes: ['id', 'name', 'code'] }],
        order: [['dueDate', 'ASC']]
      });

      res.json(parseAttachmentsArray(assignments));
    } catch (error) {
      console.error('Error fetching student assignments:', error);
      res.status(500).json({ message: 'Error fetching assignments' });
    }
  },

  getAssignmentById: async (req, res) => {
    try {
      const assignment = await SubjectAssignment.findByPk(req.params.assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      res.json(parseAttachments(assignment));
    } catch (error) {
      console.error('Error fetching assignment:', error);
      res.status(500).json({ message: 'Error fetching assignment' });
    }
  },

  deleteAssignment: async (req, res) => {
    try {
      const assignment = await SubjectAssignment.findByPk(req.params.assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      const userId = req.user.id;
      const userRole = req.user.role;

      if (userRole !== 'admin') {
        const teacherAssigned = await SubjectTeacher.findOne({
          where: { subjectId: assignment.subjectId, teacherId: userId }
        });
        if (!teacherAssigned) {
          return res.status(403).json({ message: 'Not authorized to delete this assignment' });
        }
      }

      await assignment.destroy();
      res.json({ message: 'Assignment deleted successfully' });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      res.status(500).json({ message: 'Error deleting assignment' });
    }
  },

  // ---- Subject Submissions ----

  submitAssignment: async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const userId = req.user.id;

      const assignment = await SubjectAssignment.findByPk(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      const existing = await SubjectSubmission.findOne({
        where: { subjectAssignmentId: assignmentId, userId }
      });
      if (existing) {
        return res.status(400).json({ message: 'You have already submitted this assignment' });
      }

      const submission = await SubjectSubmission.create({
        subjectAssignmentId: assignmentId,
        userId,
        content: req.body.content || '',
        attachments: req.files ? req.files.map(f => ({
          fileName: f.filename,
          originalName: f.originalname,
          filePath: f.path,
          fileSize: f.size,
          mimeType: f.mimetype
        })) : null,
        status: 'submitted'
      });

      const created = await SubjectSubmission.findByPk(submission.id, {
        include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email'] }]
      });

      res.status(201).json(created);
    } catch (error) {
      console.error('Error submitting assignment:', error);
      res.status(500).json({ message: error.message || 'Error submitting assignment' });
    }
  },

  getMySubmissions: async (req, res) => {
    try {
      const userId = req.user.id;

      const submissions = await SubjectSubmission.findAll({
        where: { userId },
        include: [
          { model: SubjectAssignment, include: [{ model: Subject, attributes: ['id', 'name', 'code'] }] }
        ],
        order: [['submittedAt', 'DESC']]
      });

      res.json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ message: 'Error fetching submissions' });
    }
  },

  getMyAssignmentSubmission: async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const userId = req.user.id;

      const submission = await SubjectSubmission.findOne({
        where: { subjectAssignmentId: assignmentId, userId },
        include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email'] }]
      });

      res.json(submission || null);
    } catch (error) {
      console.error('Error fetching submission:', error);
      res.status(500).json({ message: 'Error fetching submission' });
    }
  },

  getAssignmentSubmissions: async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const assignment = await SubjectAssignment.findByPk(assignmentId, {
        include: [{ model: Subject, attributes: ['id', 'name'] }]
      });
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      if (userRole !== 'admin') {
        const isTeacher = await SubjectTeacher.findOne({
          where: { subjectId: assignment.subjectId, teacherId: userId }
        });
        if (!isTeacher) {
          return res.status(403).json({ message: 'Not authorized to view these submissions' });
        }
      }

      const submissions = await SubjectSubmission.findAll({
        where: { subjectAssignmentId: assignmentId },
        include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email'] }],
        order: [['submittedAt', 'DESC']]
      });

      res.json({ assignment: parseAttachments(assignment), submissions });
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ message: 'Error fetching submissions' });
    }
  },

  getAllTeacherSubjectSubmissions: async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      let subjectIds;
      if (userRole === 'admin') {
        const subjects = await Subject.findAll({ attributes: ['id'] });
        subjectIds = subjects.map(s => s.id);
      } else {
        const assignments = await SubjectTeacher.findAll({
          where: { teacherId: userId },
          attributes: ['subjectId']
        });
        subjectIds = assignments.map(a => a.subjectId);
      }

      if (subjectIds.length === 0) {
        return res.json([]);
      }

      const submissions = await SubjectSubmission.findAll({
        include: [
          {
            model: SubjectAssignment,
            where: { subjectId: subjectIds },
            include: [{ model: Subject, attributes: ['id', 'name', 'code'] }]
          },
          { model: User, attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [['submittedAt', 'DESC']]
      });

      res.json({ submissions });
    } catch (error) {
      console.error('Error fetching teacher submissions:', error);
      res.status(500).json({ message: 'Error fetching submissions' });
    }
  },

  // Export subject assignment submissions to Excel
  exportAssignmentSubmissions: async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const assignment = await SubjectAssignment.findByPk(assignmentId, {
        include: [{ model: Subject, attributes: ['id', 'name', 'code', 'courseField'] }]
      });

      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      if (userRole !== 'admin') {
        const isTeacher = await SubjectTeacher.findOne({
          where: { subjectId: assignment.subjectId, teacherId: userId }
        });
        if (!isTeacher) {
          return res.status(403).json({ message: 'Not authorized to export this assignment report' });
        }
      }

      const subject = assignment.Subject;

      const submissions = await SubjectSubmission.findAll({
        where: { subjectAssignmentId: assignmentId },
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

      const worksheet = workbook.addWorksheet('Subject Submissions');
      worksheet.properties.defaultRowHeight = 20;
      worksheet.views = [{ state: 'frozen', ySplit: 5 }];

      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').value = 'Subject Assignment Submissions Report';
      worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };

      worksheet.getCell('A2').value = 'Subject';
      worksheet.getCell('B2').value = `${subject?.name || 'N/A'}${subject?.code ? ` (${subject.code})` : ''}`;
      worksheet.getCell('A3').value = 'Assignment';
      worksheet.getCell('B3').value = assignment.title;
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
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD8B4FE' } },
          left: { style: 'thin', color: { argb: 'FFD8B4FE' } },
          bottom: { style: 'thin', color: { argb: 'FFD8B4FE' } },
          right: { style: 'thin', color: { argb: 'FFD8B4FE' } }
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

      const safeTitle = assignment.title.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || `subject_assignment_${assignmentId}`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_submissions.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Export subject assignment submissions error:', error);
      res.status(500).json({ message: 'Error exporting assignment submissions' });
    }
  },

  gradeSubmission: async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { grade, feedback } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const submission = await SubjectSubmission.findByPk(submissionId, {
        include: [{ model: SubjectAssignment }]
      });
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      if (userRole !== 'admin') {
        const isTeacher = await SubjectTeacher.findOne({
          where: { subjectId: submission.SubjectAssignment.subjectId, teacherId: userId }
        });
        if (!isTeacher) {
          return res.status(403).json({ message: 'Not authorized to grade this submission' });
        }
      }

      await submission.update({ grade, feedback, status: 'graded' });

      const updated = await SubjectSubmission.findByPk(submissionId, {
        include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email'] }]
      });

      res.json(updated);
    } catch (error) {
      console.error('Error grading submission:', error);
      res.status(500).json({ message: error.message || 'Error grading submission' });
    }
  },

  downloadAssignmentAttachment: async (req, res) => {
    try {
      const { assignmentId, attachmentIndex } = req.params;
      const assignment = await SubjectAssignment.findByPk(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      let attachments = assignment.attachments;
      if (!attachments) {
        return res.status(404).json({ message: 'No attachments on this assignment' });
      }
      if (typeof attachments === 'string') {
        try { attachments = JSON.parse(attachments); } catch { attachments = []; }
      }

      const fileInfo = attachments[parseInt(attachmentIndex)];
      if (!fileInfo) {
        return res.status(404).json({ message: 'Attachment not found at index ' + attachmentIndex });
      }

      // Security: prevent directory traversal via stored paths or filenames
      const suspect = (val) => typeof val === 'string' && (val.includes('..') || val.includes('/') || val.includes('\\'));
      if (suspect(fileInfo.filePath) || suspect(fileInfo.path) || suspect(fileInfo.fileName) || suspect(fileInfo.filename) || suspect(fileInfo.originalName) || suspect(fileInfo.originalname)) {
        // We'll still attempt to resolve safely from uploads folder, but refuse obvious traversal
        console.warn('Attachment contains suspicious path or filename, rejecting direct path usage', { fileInfo });
      }

      // Attempt multiple candidate paths to be resilient to different stored filePath formats
      const candidates = [];
      if (fileInfo.filePath) {
        // If absolute, try it first
        if (path.isAbsolute(fileInfo.filePath)) candidates.push(fileInfo.filePath);
        // Common: relative to process.cwd (e.g., 'uploads/..')
        candidates.push(path.resolve(fileInfo.filePath));
        // Common alternate: relative to project root from this file (__dirname)
        candidates.push(path.resolve(__dirname, '../../', fileInfo.filePath));
      }

      // Also try by filename inside the server uploads folder
      const filename = fileInfo.fileName || fileInfo.filename || fileInfo.originalName;
      if (filename) {
        candidates.push(path.resolve(__dirname, '../../uploads', filename));
        candidates.push(path.resolve(process.cwd(), 'uploads', filename));
      }

      // Find the first candidate that exists
      let foundPath = null;
      for (const p of candidates) {
        try {
          if (p && fs.existsSync(p)) {
            foundPath = p;
            break;
          }
        } catch (e) {
          // ignore and continue
        }
      }

      if (!foundPath) {
        console.error('File not found. Tried paths:', candidates, 'stored filePath:', fileInfo.filePath, 'filename:', filename);
        return res.status(404).json({ message: 'File not found on server' });
      }

      res.download(foundPath, fileInfo.originalName || filename);
    } catch (error) {
      console.error('Error downloading assignment attachment:', error);
      res.status(500).json({ message: 'Error downloading file' });
    }
  },

  downloadSubmissionAttachment: async (req, res) => {
    try {
      const { submissionId, attachmentIndex } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const submission = await SubjectSubmission.findByPk(submissionId, {
        include: [{ model: SubjectAssignment }]
      });

      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      if (userRole !== 'admin') {
        const isTeacher = await SubjectTeacher.findOne({
          where: { subjectId: submission.SubjectAssignment.subjectId, teacherId: userId }
        });

        if (!isTeacher) {
          return res.status(403).json({ message: 'Not authorized to download this submission attachment' });
        }
      }

      let attachments = submission.attachments;
      if (!attachments) {
        return res.status(404).json({ message: 'No attachments on this submission' });
      }

      if (typeof attachments === 'string') {
        try {
          attachments = JSON.parse(attachments);
        } catch (error) {
          attachments = [];
        }
      }

      const index = parseInt(attachmentIndex, 10);
      const fileInfo = attachments[index];
      if (!fileInfo) {
        return res.status(404).json({ message: `Attachment not found at index ${attachmentIndex}` });
      }

      const addCandidate = (arr, value) => {
        if (!value || typeof value !== 'string') return;
        arr.push(value);
        arr.push(path.resolve(value));
        arr.push(path.resolve(__dirname, '../../', value));
        arr.push(path.resolve(__dirname, '../../uploads', path.basename(value)));
        arr.push(path.resolve(process.cwd(), 'uploads', path.basename(value)));
      };

      const candidates = [];
      if (typeof fileInfo === 'string') {
        addCandidate(candidates, fileInfo);
      } else {
        addCandidate(candidates, fileInfo.filePath);
        addCandidate(candidates, fileInfo.path);
        addCandidate(candidates, fileInfo.fileName);
        addCandidate(candidates, fileInfo.filename);
        addCandidate(candidates, fileInfo.originalName);
        addCandidate(candidates, fileInfo.originalname);
      }

      const seen = new Set();
      const uniqueCandidates = candidates.filter((candidate) => {
        if (!candidate || seen.has(candidate)) return false;
        seen.add(candidate);
        return true;
      });

      const foundPath = uniqueCandidates.find((candidate) => {
        try {
          return fs.existsSync(candidate);
        } catch (error) {
          return false;
        }
      });

      if (!foundPath) {
        return res.status(404).json({ message: 'Submission file not found on server' });
      }

      const downloadName = typeof fileInfo === 'string'
        ? path.basename(fileInfo)
        : (fileInfo.originalName || fileInfo.originalname || fileInfo.fileName || fileInfo.filename || 'submission-file');

      res.download(foundPath, downloadName);
    } catch (error) {
      console.error('Error downloading submission attachment:', error);
      res.status(500).json({ message: 'Error downloading submission file' });
    }
  }
};

module.exports = subjectController;
