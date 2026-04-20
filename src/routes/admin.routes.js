const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth');
const { role } = require('../middleware/role');

router.get('/stats', authenticate, role('ADMIN'), adminController.getStats);
router.get('/doctors/pending', authenticate, role('ADMIN'), adminController.getPendingDoctors);
router.put('/doctors/:doctorId/verify', authenticate, role('ADMIN'), adminController.verifyDoctor);
router.get('/users', authenticate, role('ADMIN'), adminController.getUsers);
router.put('/users/:userId/status', authenticate, role('ADMIN'), adminController.updateUserStatus);
router.delete('/users/:userId', authenticate, role('ADMIN'), adminController.deleteUser);
router.get('/analytics', authenticate, role('ADMIN'), adminController.getAnalytics);

module.exports = router;
