const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth');
const { role } = require('../middleware/role');

router.post('/symptom-check', authenticate, role('PATIENT'), aiController.symptomCheck);

module.exports = router;
