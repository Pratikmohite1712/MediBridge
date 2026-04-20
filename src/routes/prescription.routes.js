const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescription.controller');
const { authenticate } = require('../middleware/auth');
const { role } = require('../middleware/role');

router.post('/', authenticate, role('DOCTOR'), prescriptionController.createPrescription);
router.get('/my', authenticate, role('PATIENT'), prescriptionController.getMyPrescriptions);
router.get('/patient/:patientId', authenticate, role('DOCTOR', 'ADMIN'), prescriptionController.getPatientPrescriptions);
router.get('/:prescriptionId', authenticate, prescriptionController.getPrescriptionDetails);

module.exports = router;
