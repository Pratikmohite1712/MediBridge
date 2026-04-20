const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const { authenticate } = require('../middleware/auth');
const { role } = require('../middleware/role');

router.post('/book', authenticate, role('PATIENT'), appointmentController.book);
router.get('/upcoming', authenticate, appointmentController.getUpcoming);
router.get('/', authenticate, appointmentController.getAppointments);
router.get('/:appointmentId', authenticate, appointmentController.getAppointmentDetails);
router.put('/:appointmentId/status', authenticate, role('DOCTOR', 'ADMIN'), appointmentController.updateStatus);
router.delete('/:appointmentId', authenticate, role('PATIENT'), appointmentController.cancelAppointment);

module.exports = router;
