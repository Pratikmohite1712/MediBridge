const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middleware/auth');
const { role } = require('../middleware/role');
const { uploadSingle } = require('../middleware/upload');

router.post('/patient/complete', authenticate, role('PATIENT'), profileController.completePatientProfile);
router.post('/doctor/complete', authenticate, role('DOCTOR'), uploadSingle('certificateUrl'), profileController.completeDoctorProfile);
router.get('/me', authenticate, profileController.getMyProfile);
router.put('/update', authenticate, profileController.updateProfile);
router.post('/photo', authenticate, uploadSingle('photo'), profileController.uploadPhoto);

module.exports = router;
