const express = require('express');
const router = express.Router();
const {
  upload,
  uploadMaterial,
  getCourseMaterials,
  downloadMaterial,
  getMaterialDetails,
  updateMaterial,
  deleteMaterial
} = require('../controllers/materialController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Upload material (teachers/admins only)
router.post('/upload', 
  auth, 
  authorize(['teacher', 'admin']), 
  upload.single('file'), 
  uploadMaterial
);

// Get all materials for a course
router.get('/course/:courseId', auth, getCourseMaterials);

// Get material details
router.get('/:materialId', auth, getMaterialDetails);

// Download material
router.get('/:materialId/download', auth, downloadMaterial);

// Update material (teachers/admins only)
router.put('/:materialId', 
  auth, 
  authorize(['teacher', 'admin']), 
  updateMaterial
);

// Delete material (teachers/admins only)
router.delete('/:materialId', 
  auth, 
  authorize(['teacher', 'admin']), 
  deleteMaterial
);

module.exports = router;