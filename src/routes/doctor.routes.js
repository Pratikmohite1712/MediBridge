const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const { authenticate } = require('../middleware/auth');
const { role } = require('../middleware/role');

router.get('/', doctorController.getDoctors);
router.get('/my/patients', authenticate, role('DOCTOR'), doctorController.getMyPatients);
router.get('/my/appointments', authenticate, role('DOCTOR'), doctorController.getMyAppointments);
router.get('/:doctorId', doctorController.getDoctorDetails);
router.get('/:doctorId/availability', doctorController.getDoctorAvailability);

module.exports = router;
