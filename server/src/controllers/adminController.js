const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { User, TeacherInvitation, Course, Assignment, SubjectAssignment, Subject } = require('../models');
const { Op } = require('sequelize');
const { sendTeacherInvitation } = require('../services/emailService');

const uploadsDir = path.resolve(__dirname, '../../uploads');

const detectMimeType = (filename) => {
  const ext = path.extname(filename || '').toLowerCase();
  const mapping = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.zip': 'application/zip'
  };

  return mapping[ext] || 'application/octet-stream';
};

const parseAttachments = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
};

const buildAttachmentPayload = (filename, originalName) => {
  const absolutePath = path.join(uploadsDir, filename);
  const displayName = originalName || filename;
  const mimeType = detectMimeType(filename);

  return {
    fileName: filename,
    filename,
    originalName: displayName,
    originalname: displayName,
    filePath: absolutePath,
    path: absolutePath,
    fileSize: null,
    fileSizeBytes: null,
    mimeType,
    mimetype: mimeType
  };
};

// Invite a teacher
const inviteTeacher = async (req, res) => {
  try {
    const { email, firstName, lastName, courseField } = req.body;
    const adminId = req.user.id;

    // Check if email is already registered
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered as a user' });
    }

    // Delete any existing invitations for this email (to allow resending)
    const deletedCount = await TeacherInvitation.destroy({ 
      where: { email } 
    });
    
    if (deletedCount > 0) {
      console.log(`♻️  Deleted ${deletedCount} old invitation(s) for ${email}, creating new one`);
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');

    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = await TeacherInvitation.create({
      email,
      firstName,
      lastName,
      courseField,
      invitationToken,
      invitedBy: adminId,
      expiresAt,
      status: 'pending'
    });

    const invitationLink = `${process.env.CLIENT_URL}/register/teacher/${invitationToken}`;

    // Send invitation email
    const emailResult = await sendTeacherInvitation({
      email,
      firstName,
      lastName,
      invitationLink,
      expiresAt
    });

    res.status(201).json({
      message: emailResult.success 
        ? 'Teacher invitation sent successfully via email' 
        : 'Teacher invitation created (email not sent - check configuration)',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        courseField: invitation.courseField,
        status: invitation.status,
        expiresAt: invitation.expiresAt
      },
      invitationLink,
      emailSent: emailResult.success
    });
  } catch (error) {
    console.error('Invite teacher error:', error);
    res.status(500).json({ message: 'Error creating teacher invitation' });
  }
};

// Get all teacher invitations
const getInvitations = async (req, res) => {
  try {
    const invitations = await TeacherInvitation.findAll({
      include: [{
        model: User,
        as: 'admin',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(invitations);
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ message: 'Error fetching invitations' });
  }
};

// Get all teachers
const getTeachers = async (req, res) => {
  try {
    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: ['id', 'firstName', 'lastName', 'email', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json(teachers);
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ message: 'Error fetching teachers' });
  }
};

// Deactivate/Activate a teacher
const toggleTeacherStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await User.findOne({ 
      where: { 
        id,
        role: 'teacher'
      } 
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    teacher.isActive = !teacher.isActive;
    await teacher.save();

    res.json({
      message: `Teacher ${teacher.isActive ? 'activated' : 'deactivated'} successfully`,
      teacher: {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        isActive: teacher.isActive
      }
    });
  } catch (error) {
    console.error('Toggle teacher status error:', error);
    res.status(500).json({ message: 'Error updating teacher status' });
  }
};

// Revoke invitation
const revokeInvitation = async (req, res) => {
  try {
    const { id } = req.params;

    const invitation = await TeacherInvitation.findByPk(id);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: 'Can only revoke pending invitations' });
    }

    invitation.status = 'expired';
    await invitation.save();

    res.json({ message: 'Invitation revoked successfully' });
  } catch (error) {
    console.error('Revoke invitation error:', error);
    res.status(500).json({ message: 'Error revoking invitation' });
  }
};

// Verify invitation token and register teacher
const registerTeacher = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Find invitation
    const invitation = await TeacherInvitation.findOne({ 
      where: { 
        invitationToken: token,
        status: 'pending',
        expiresAt: { [Op.gt]: new Date() }
      } 
    });

    if (!invitation) {
      return res.status(400).json({ message: 'Invalid or expired invitation token' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: invitation.email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create teacher account
    const teacher = await User.create({
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      email: invitation.email,
      password,
      role: 'teacher',
      courseField: invitation.courseField,
      isActive: true
    });

    // Update invitation status
    invitation.status = 'accepted';
    await invitation.save();

    // Remove password from response
    const teacherResponse = teacher.toJSON();
    delete teacherResponse.password;

    res.status(201).json({
      message: 'Teacher account created successfully',
      teacher: teacherResponse
    });
  } catch (error) {
    console.error('Register teacher error:', error);
    res.status(500).json({ message: 'Error creating teacher account' });
  }
};

// Get invitation details by token (for registration page)
const getInvitationByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await TeacherInvitation.findOne({ 
      where: { 
        invitationToken: token,
        status: 'pending',
        expiresAt: { [Op.gt]: new Date() }
      },
      attributes: ['email', 'firstName', 'lastName', 'courseField', 'expiresAt']
    });

    if (!invitation) {
      return res.status(400).json({ message: 'Invalid or expired invitation token' });
    }

    res.json(invitation);
  } catch (error) {
    console.error('Get invitation error:', error);
    res.status(500).json({ message: 'Error fetching invitation' });
  }
};

// Create course and assign to teacher (admin only)
const createCourse = async (req, res) => {
  try {
    const { title, description, code, startDate, endDate, enrollmentLimit, teacherId, courseField } = req.body;
    
    // Validate that teacherId is provided
    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher ID is required' });
    }

    // Validate that courseField is provided
    if (!courseField) {
      return res.status(400).json({ message: 'Course field (e.g., B.Tech, BCA) is required' });
    }

    // Verify teacher exists and is active
    const teacher = await User.findOne({ 
      where: { 
        id: teacherId,
        role: 'teacher',
        isActive: true
      } 
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Active teacher not found' });
    }

    // Check if course code already exists
    const existingCourse = await Course.findOne({ where: { code } });
    if (existingCourse) {
      return res.status(400).json({ message: 'Course code already exists' });
    }

    // Create course
    const course = await Course.create({
      title,
      description,
      code,
      startDate,
      endDate,
      enrollmentLimit,
      courseField,
      teacherId,
      isPublished: true // Auto-publish courses when created by admin
    });

    // Fetch the course with teacher info for the response
    const createdCourse = await Course.findOne({
      where: { id: course.id },
      include: [{
        model: User,
        as: 'teacher',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    res.status(201).json({
      message: 'Course created and assigned successfully',
      course: createdCourse
    });
  } catch (error) {
    console.error('Admin create course error:', error);
    res.status(500).json({ message: 'Error creating course' });
  }
};

// Delete a teacher
const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await User.findOne({ 
      where: { 
        id,
        role: 'teacher'
      } 
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Check if teacher has any courses
    const { Course } = require('../models');
    const courses = await Course.findAll({ where: { teacherId: id } });
    
    if (courses.length > 0) {
      return res.status(400).json({ 
        message: `Cannot delete teacher. They have ${courses.length} course(s) assigned. Please reassign or delete the courses first.`,
        coursesCount: courses.length
      });
    }

    // Delete the teacher
    await teacher.destroy();

    res.json({
      message: 'Teacher deleted successfully',
      success: true
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({ message: 'Error deleting teacher' });
  }
};

const getUploadFiles = async (req, res) => {
  try {
    const search = (req.query.search || '').trim().toLowerCase();
    const entries = await fs.readdir(uploadsDir, { withFileTypes: true });

    let files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const absolutePath = path.join(uploadsDir, entry.name);
          const stats = await fs.stat(absolutePath);
          return {
            filename: entry.name,
            size: stats.size,
            updatedAt: stats.mtime,
            mimeType: detectMimeType(entry.name)
          };
        })
    );

    if (search) {
      files = files.filter((file) => file.filename.toLowerCase().includes(search));
    }

    files.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({ files });
  } catch (error) {
    console.error('Get upload files error:', error);
    res.status(500).json({ message: 'Error fetching upload files' });
  }
};

const getAllAssignments = async (req, res) => {
  try {
    const type = (req.query.type || 'all').toLowerCase();
    const response = { courseAssignments: [], subjectAssignments: [] };

    if (type === 'all' || type === 'course') {
      const courseAssignments = await Assignment.findAll({
        include: [{
          model: Course,
          attributes: ['id', 'title', 'code']
        }],
        order: [['createdAt', 'DESC']],
        limit: 500
      });

      response.courseAssignments = courseAssignments.map((assignment) => {
        const json = assignment.toJSON();
        const attachments = parseAttachments(json.attachments);
        return {
          id: json.id,
          title: json.title,
          dueDate: json.dueDate,
          containerId: json.Course?.id || null,
          containerName: json.Course?.title || 'Unknown course',
          containerCode: json.Course?.code || '',
          attachmentCount: attachments.length
        };
      });
    }

    if (type === 'all' || type === 'subject') {
      const subjectAssignments = await SubjectAssignment.findAll({
        include: [{
          model: Subject,
          attributes: ['id', 'name', 'code']
        }],
        order: [['createdAt', 'DESC']],
        limit: 500
      });

      response.subjectAssignments = subjectAssignments.map((assignment) => {
        const json = assignment.toJSON();
        const attachments = parseAttachments(json.attachments);
        return {
          id: json.id,
          title: json.title,
          dueDate: json.dueDate,
          containerId: json.Subject?.id || null,
          containerName: json.Subject?.name || 'Unknown subject',
          containerCode: json.Subject?.code || '',
          attachmentCount: attachments.length
        };
      });
    }

    res.json(response);
  } catch (error) {
    console.error('Get all assignments error:', error);
    res.status(500).json({ message: 'Error fetching assignments' });
  }
};

const attachExistingFileToAssignment = async (req, res) => {
  try {
    const { type, assignmentId } = req.params;
    const { filename, originalName } = req.body;

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ message: 'filename is required' });
    }

    const safeFilename = path.basename(filename.trim());
    if (!safeFilename || safeFilename !== filename.trim()) {
      return res.status(400).json({ message: 'Invalid filename' });
    }

    const filePath = path.join(uploadsDir, safeFilename);
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ message: 'Selected file does not exist in uploads folder' });
    }

    const assignmentType = String(type).toLowerCase();
    const isCourse = assignmentType === 'course';
    const isSubject = assignmentType === 'subject';
    if (!isCourse && !isSubject) {
      return res.status(400).json({ message: 'type must be either "course" or "subject"' });
    }

    const Model = isCourse ? Assignment : SubjectAssignment;
    const assignment = await Model.findByPk(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const existingAttachments = parseAttachments(assignment.attachments);
    const nextAttachment = buildAttachmentPayload(safeFilename, originalName);

    const filteredAttachments = existingAttachments.filter((attachment) => {
      if (!attachment) return false;
      if (typeof attachment === 'string') return path.basename(attachment) !== safeFilename;
      return ![
        attachment.fileName,
        attachment.filename,
        attachment.originalName,
        attachment.path,
        attachment.filePath
      ].some((value) => typeof value === 'string' && path.basename(value) === safeFilename);
    });

    filteredAttachments.push(nextAttachment);

    await assignment.update({ attachments: filteredAttachments });

    res.json({
      message: 'File attached successfully',
      assignmentId: assignment.id,
      type: assignmentType,
      attachments: filteredAttachments
    });
  } catch (error) {
    console.error('Attach existing file error:', error);
    res.status(500).json({ message: 'Error attaching file to assignment' });
  }
};

module.exports = {
  inviteTeacher,
  getInvitations,
  getTeachers,
  toggleTeacherStatus,
  revokeInvitation,
  registerTeacher,
  getInvitationByToken,
  createCourse,
  deleteTeacher,
  getUploadFiles,
  getAllAssignments,
  attachExistingFileToAssignment
};
