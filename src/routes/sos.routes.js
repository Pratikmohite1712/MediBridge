const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sos.controller');
const { authenticate } = require('../middleware/auth');
const { role } = require('../middleware/role');

router.post('/activate', authenticate, role('PATIENT'), sosController.activateSos);
router.put('/:sosId/respond', authenticate, role('DOCTOR', 'ADMIN'), sosController.respondToSos);
router.put('/:sosId/resolve', authenticate, role('ADMIN'), sosController.resolveSos);
router.get('/active', authenticate, role('ADMIN', 'DOCTOR'), sosController.getActiveSos);
router.get('/my', authenticate, role('PATIENT'), sosController.getMySos);

module.exports = router;
