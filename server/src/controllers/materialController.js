const { Material, Course, User } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/materials');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter to allow specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'application/zip',
    'application/x-rar-compressed'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Please upload PDF, Word, PowerPoint, Excel, Text, Image, Video, or Archive files.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Upload material
const uploadMaterial = async (req, res) => {
  try {
    const { courseId, title, description, type, dueDate } = req.body;
    const uploadedBy = req.user.id;
    
    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Authorization check:
    // - Admins can upload to any course
    // - Teachers can ONLY upload to their own courses (where they are the course teacher)
    const isAdmin = req.user.role === 'admin';
    const isCourseTeacher = course.teacherId === uploadedBy;
    
    if (!isAdmin && !isCourseTeacher) {
      return res.status(403).json({ 
        message: 'You can only upload materials to courses you teach',
        debug: { 
          userRole: req.user.role, 
          userId: uploadedBy, 
          courseTeacherId: course.teacherId,
          courseId: courseId,
          courseTitle: course.title
        }
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Get file extension
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    // Create material record
    const material = await Material.create({
      courseId,
      title,
      description,
      type,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      fileExtension,
      uploadedBy,
      dueDate: dueDate ? new Date(dueDate) : null
    });
    
    // Fetch the complete material with course and uploader info
    const completeMaterial = await Material.findByPk(material.id, {
      include: [
        {
          model: Course,
          attributes: ['title', 'code']
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    res.status(201).json({
      message: 'Material uploaded successfully',
      material: completeMaterial
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload material', error: error.message });
  }
};

// Get all materials for a course
const getCourseMaterials = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { type } = req.query;
    
    // Build where clause
    const whereClause = { courseId, isActive: true };
    if (type) {
      whereClause.type = type;
    }
    
    const materials = await Material.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(materials);
    
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ message: 'Failed to fetch materials', error: error.message });
  }
};

// Download material
const downloadMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    
    const material = await Material.findByPk(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    
    // Check if file exists
    if (!fs.existsSync(material.filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }
    
    // Increment download count
    await material.increment('downloadCount');
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${material.originalName}"`);
    res.setHeader('Content-Type', material.mimeType);
    
    // Stream the file
    const fileStream = fs.createReadStream(material.filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Failed to download material', error: error.message });
  }
};

// Get material details
const getMaterialDetails = async (req, res) => {
  try {
    const { materialId } = req.params;
    
    const material = await Material.findByPk(materialId, {
      include: [
        {
          model: Course,
          attributes: ['title', 'code']
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    
    res.json(material);
    
  } catch (error) {
    console.error('Get material details error:', error);
    res.status(500).json({ message: 'Failed to fetch material details', error: error.message });
  }
};

// Update material
const updateMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const { title, description, type, dueDate } = req.body;
    const userId = req.user.id;
    
    const material = await Material.findByPk(materialId, {
      include: [{ model: Course }]
    });
    
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    
    // Check permissions
    if (material.uploadedBy !== userId && material.Course.teacherId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    await material.update({
      title,
      description,
      type,
      dueDate: dueDate ? new Date(dueDate) : null
    });
    
    const updatedMaterial = await Material.findByPk(materialId, {
      include: [
        {
          model: Course,
          attributes: ['title', 'code']
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    res.json({
      message: 'Material updated successfully',
      material: updatedMaterial
    });
    
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ message: 'Failed to update material', error: error.message });
  }
};

// Delete material
const deleteMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const userId = req.user.id;
    
    const material = await Material.findByPk(materialId, {
      include: [{ model: Course }]
    });
    
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    
    // Check permissions
    if (material.uploadedBy !== userId && material.Course.teacherId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    // Delete file from filesystem
    if (fs.existsSync(material.filePath)) {
      fs.unlinkSync(material.filePath);
    }
    
    // Delete material record
    await material.destroy();
    
    res.json({ message: 'Material deleted successfully' });
    
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ message: 'Failed to delete material', error: error.message });
  }
};

module.exports = {
  upload,
  uploadMaterial,
  getCourseMaterials,
  downloadMaterial,
  getMaterialDetails,
  updateMaterial,
  deleteMaterial
};