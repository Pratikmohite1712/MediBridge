const express = require('express');
const router = express.Router();
const recordsController = require('../controllers/records.controller');
const { authenticate } = require('../middleware/auth');
const { role } = require('../middleware/role');
const { uploadDocument } = require('../middleware/upload');

router.post('/upload', authenticate, uploadDocument('file'), recordsController.uploadRecord);
router.get('/', authenticate, recordsController.getRecords);
router.get('/patient/:patientId', authenticate, role('DOCTOR'), recordsController.getRecordsByPatient);
router.get('/:recordId', authenticate, recordsController.getRecordDetails);
router.delete('/:recordId', authenticate, role('PATIENT', 'ADMIN'), recordsController.deleteRecord);

module.exports = router;
