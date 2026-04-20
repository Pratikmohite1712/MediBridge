const express = require('express');
const router = express.Router();
const consultationController = require('../controllers/consultation.controller');
const { authenticate } = require('../middleware/auth');
const { role } = require('../middleware/role');

router.post('/:appointmentId/start', authenticate, role('DOCTOR'), consultationController.startConsultation);
router.post('/:appointmentId/end', authenticate, role('DOCTOR'), consultationController.endConsultation);
router.get('/:appointmentId/chat', authenticate, consultationController.getChatHistory);

module.exports = router;
