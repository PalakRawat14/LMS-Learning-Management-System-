const { Course, User, Enrollment, Assignment } = require('../models');
const { Op, fn, col } = require('sequelize');

// Create a new course
const createCourse = async (req, res) => {
  try {
    const { title, description, code, startDate, endDate, enrollmentLimit, courseField } = req.body;
    
    // Validate courseField
    if (!courseField) {
      return res.status(400).json({ message: 'Course field (e.g., B.Tech, BCA) is required' });
    }

    // Check if course code already exists
    const existingCourse = await Course.findOne({ where: { code } });
    if (existingCourse) {
      return res.status(400).json({ message: 'Course code already exists' });
    }

    const course = await Course.create({
      title,
      description,
      code,
      startDate,
      endDate,
      enrollmentLimit,
      courseField,
      teacherId: req.user.id,
      isPublished: true // Auto-publish courses when created
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
      message: 'Course created successfully',
      course: createdCourse
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Error creating course' });
  }
};

// Get all courses with filters
const getCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      teacherId,
      isPublished
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Add filters
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ];
    }

    if (teacherId) where.teacherId = teacherId;
    if (isPublished !== undefined) where.isPublished = isPublished;

    // For students, only show published courses from their field
    if (req.user.role === 'student') {
      where.isPublished = true;
      if (req.user.courseField) {
        where.courseField = req.user.courseField;
      }
    }

    // For teachers, only show their own courses and courses from their field
    if (req.user.role === 'teacher') {
      if (req.user.courseField) {
        where.courseField = req.user.courseField;
      }
    }

    const { count, rows: courses } = await Course.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    // Add enrollment count to each course
    const coursesWithEnrollment = await Promise.all(
      courses.map(async (course) => {
        const enrollmentCount = await Enrollment.count({
          where: { courseId: course.id, status: 'active' }
        });
        return {
          ...course.toJSON(),
          enrollmentCount
        };
      })
    );

    res.json({
      courses: coursesWithEnrollment,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalCourses: count
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Error retrieving courses' });
  }
};

// Get a single course by ID
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if student can access unpublished course
    if (!course.isPublished && req.user.role === 'student') {
      return res.status(403).json({ message: 'Course not available' });
    }

    res.json({ course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Error retrieving course' });
  }
};

// Update a course
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Only admin can change teacherId
    if (req.body.teacherId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can change the teacher of a course' });
    }

    // Only admin or the current teacher can update other fields
    if (req.user.role !== 'admin' && course.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this course' });
    }

    // If teacherId is being updated, check that the new teacher exists and is a teacher
    if (req.body.teacherId) {
      const { User } = require('../models');
      const newTeacher = await User.findByPk(req.body.teacherId);
      if (!newTeacher || newTeacher.role !== 'teacher') {
        return res.status(400).json({ message: 'teacherId must be a valid teacher user' });
      }
    }

    const updates = req.body;
    await course.update(updates);

    res.json({
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Error updating course' });
  }
};

// Delete a course
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user has permission to delete
    if (req.user.role !== 'admin' && course.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this course' });
    }

    await course.destroy();

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Error deleting course' });
  }
};

// Enroll in a course
const enrollInCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!course.isPublished) {
      return res.status(400).json({ message: 'Cannot enroll in unpublished course' });
    }

    // Check if student's courseField matches course field (if student has a field assigned)
    if (req.user.role === 'student' && req.user.courseField && course.courseField !== req.user.courseField) {
      return res.status(403).json({ 
        message: `You can only enroll in courses for your field (${req.user.courseField}). This course is for ${course.courseField} students.` 
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      where: {
        userId: req.user.id,
        courseId: course.id
      }
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Check enrollment limit
    if (course.enrollmentLimit) {
      const enrollmentCount = await Enrollment.count({
        where: { courseId: course.id }
      });

      if (enrollmentCount >= course.enrollmentLimit) {
        return res.status(400).json({ message: 'Course enrollment limit reached' });
      }
    }

    // Create enrollment
    await Enrollment.create({
      userId: req.user.id,
      courseId: course.id,
      status: 'active'
    });

    res.status(201).json({ message: 'Successfully enrolled in course' });
  } catch (error) {
    console.error('Course enrollment error:', error);
    res.status(500).json({ message: 'Error enrolling in course' });
  }
};

// Get my courses (courses user is teaching or enrolled in)
const getMyCourses = async (req, res) => {
  try {
    let courses = [];

    if (req.user.role === 'admin') {
      // For admins: get ALL courses
      courses = await Course.findAll({
        include: [
          {
            model: User,
            as: 'teacher',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    } else if (req.user.role === 'teacher' || req.user.role === 'instructor') {
      // For teachers: get courses they are teaching
      courses = await Course.findAll({
        where: { teacherId: req.user.id },
        include: [
          {
            model: User,
            as: 'teacher',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: Assignment,
            attributes: []
          },
          {
            model: Enrollment,
            attributes: []
          }
        ],
        attributes: {
          include: [
            [
              fn('COUNT', col('Assignments.id')),
              'assignmentCount'
            ],
            [
              fn('COUNT', col('Enrollments.id')),
              'enrollmentCount'
            ]
          ]
        },
        group: ['Course.id', 'teacher.id', 'teacher.firstName', 'teacher.lastName', 'teacher.email'],
        order: [['createdAt', 'DESC']]
      });
    } else if (req.user.role === 'student') {
      // For students: get courses they are enrolled in
      const enrollments = await Enrollment.findAll({
        where: { userId: req.user.id, status: 'active' },
        include: [{
          model: Course,
          include: [{
            model: User,
            as: 'teacher',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }]
        }]
      });
      courses = enrollments.map(enrollment => enrollment.Course);
    }

    // Add enrollment count to each course
    const coursesWithEnrollment = await Promise.all(
      courses.map(async (course) => {
        const enrollmentCount = await Enrollment.count({
          where: { courseId: course.id, status: 'active' }
        });
        return {
          ...course.toJSON(),
          enrollmentCount
        };
      })
    );

    res.json(coursesWithEnrollment);
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({ message: 'Error retrieving my courses' });
  }
};

// Unenroll from course
const unenrollFromCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Find existing enrollment
    const enrollment = await Enrollment.findOne({
      where: {
        userId: req.user.id,
        courseId: course.id
      }
    });

    if (!enrollment) {
      return res.status(400).json({ message: 'Not enrolled in this course' });
    }

    // Delete the enrollment
    await enrollment.destroy();

    res.json({ message: 'Successfully unenrolled from course' });
  } catch (error) {
    console.error('Course unenrollment error:', error);
    res.status(500).json({ message: 'Error unenrolling from course' });
  }
};

// Get enrolled students
const getEnrolledStudents = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user has permission to view enrolled students
    if (req.user.role === 'student' && course.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view enrolled students' });
    }

    const enrollments = await Enrollment.findAll({
      where: { courseId: course.id },
      include: [{
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    // Extract student data from enrollments
    const students = enrollments.map(enrollment => enrollment.User);

    res.json(students);
  } catch (error) {
    console.error('Get enrolled students error:', error);
    res.status(500).json({ message: 'Error retrieving enrolled students' });
  }
};

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  getMyCourses,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  unenrollFromCourse,
  getEnrolledStudents
};