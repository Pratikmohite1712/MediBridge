const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
const { sendAppointmentConfirmation } = require('../services/emailService');
const { sendAppointmentSMS } = require('../services/smsService');

const bookSchema = z.object({
  doctorId: z.string(),
  consultationType: z.enum(['VIDEO', 'AUDIO', 'CHAT']),
  scheduledAt: z.string().datetime(), // ISO string format
  notes: z.string().optional()
});

exports.book = async (req, res, next) => {
  try {
    const data = bookSchema.parse(req.body);
    const scheduledDate = new Date(data.scheduledAt);

    // 1. Check doctor is verified
    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId: data.doctorId },
      include: { user: true }
    });

    if (!doctor || !doctor.isVerified || doctor.verificationStatus !== 'APPROVED') {
      return sendError(res, 'Doctor is not verified or does not exist', 'BAD_REQUEST', 400);
    }

    // 2. Check slot overlap
    const thirtyMinutesBefore = new Date(scheduledDate.getTime() - 30 * 60000);
    const thirtyMinutesAfter = new Date(scheduledDate.getTime() + 30 * 60000);

    const overlap = await prisma.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { gte: thirtyMinutesBefore, lt: thirtyMinutesAfter }
      }
    });

    if (overlap) {
      return sendError(res, 'Timeslot already booked or overlaps closely', 'CONFLICT', 409);
    }

    const roomId = uuidv4();
    const appointment = await prisma.appointment.create({
      data: {
        patientId: req.user.userId,
        doctorId: data.doctorId,
        consultationType: data.consultationType,
        scheduledAt: scheduledDate,
        notes: data.notes,
        roomId
      },
      include: {
        patient: true
      }
    });

    // Fire & Forget notifications
    const appointmentDetails = {
      doctorName: doctor.user.fullName,
      scheduledAt: scheduledDate.toLocaleString(),
      type: data.consultationType,
      date: scheduledDate.toLocaleDateString()
    };

    if (appointment.patient.email) await sendAppointmentConfirmation(appointment.patient.email, appointmentDetails);
    if (appointment.patient.phone) await sendAppointmentSMS(appointment.patient.phone, appointmentDetails);

    if (doctor.user.email) await sendAppointmentConfirmation(doctor.user.email, { ...appointmentDetails, doctorName: 'Dr.' }); // Send to doc

    return sendSuccess(res, 'Appointment booked successfully', { appointmentId: appointment.id, roomId }, 201);
  } catch (error) {
    next(error);
  }
};

exports.getAppointments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const whereClause = {};
    if (req.user.role === 'PATIENT') whereClause.patientId = req.user.userId;
    if (req.user.role === 'DOCTOR') whereClause.doctorId = req.user.userId;
    
    if (status) whereClause.status = status;

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: whereClause,
        include: {
          doctor: { select: { fullName: true, doctorProfile: { select: { specialization: true } } } },
          patient: { select: { fullName: true } }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { scheduledAt: 'desc' }
      }),
      prisma.appointment.count({ where: whereClause })
    ]);

    return sendSuccess(res, 'Appointments retrieved', appointments, 200, { page: parseInt(page), limit: parseInt(limit), total });
  } catch (error) {
    next(error);
  }
};

exports.getAppointmentDetails = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { select: { id: true, fullName: true, doctorProfile: true } },
        patient: { select: { id: true, fullName: true, patientProfile: true } },
        consultation: true,
        prescription: true
      }
    });

    if (!appointment) return sendError(res, 'Appointment not found', 'NOT_FOUND', 404);

    if (req.user.role !== 'ADMIN' && req.user.userId !== appointment.patientId && req.user.userId !== appointment.doctorId) {
      return sendError(res, 'Unauthorized to view this appointment', 'FORBIDDEN', 403);
    }

    return sendSuccess(res, 'Appointment retrieved', appointment);
  } catch (error) {
    next(error);
  }
};

const statusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED'])
});

exports.updateStatus = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const { status } = statusSchema.parse(req.body);

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { patient: true, doctor: true } });
    if (!appointment) return sendError(res, 'Appointment not found', 'NOT_FOUND', 404);

    if (req.user.role === 'DOCTOR' && req.user.userId !== appointment.doctorId) {
      return sendError(res, 'Forbidden', 'FORBIDDEN', 403);
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status }
    });

    if (status === 'CONFIRMED') {
      const details = {
        doctorName: appointment.doctor.fullName,
        scheduledAt: appointment.scheduledAt.toLocaleString(),
        type: appointment.consultationType,
        date: appointment.scheduledAt.toLocaleDateString()
      };
      if (appointment.patient.email) await sendAppointmentConfirmation(appointment.patient.email, details);
      if (appointment.patient.phone) await sendAppointmentSMS(appointment.patient.phone, details);
    }

    return sendSuccess(res, `Appointment ${status.toLowerCase()}`, updated);
  } catch (error) {
    next(error);
  }
};

exports.cancelAppointment = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });

    if (!appointment) return sendError(res, 'Appointment not found', 'NOT_FOUND', 404);
    if (appointment.patientId !== req.user.userId) return sendError(res, 'Forbidden', 'FORBIDDEN', 403);
    if (appointment.status !== 'PENDING') return sendError(res, 'Can only cancel pending appointments', 'BAD_REQUEST', 400);

    const cancelled = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' }
    });

    return sendSuccess(res, 'Appointment cancelled', cancelled);
  } catch (error) {
    next(error);
  }
};

exports.getUpcoming = async (req, res, next) => {
  try {
    const whereClause = {
      status: 'CONFIRMED',
      scheduledAt: { gt: new Date() }
    };
    
    if (req.user.role === 'PATIENT') whereClause.patientId = req.user.userId;
    if (req.user.role === 'DOCTOR') whereClause.doctorId = req.user.userId;

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        doctor: { select: { fullName: true } },
        patient: { select: { fullName: true } }
      },
      take: 5,
      orderBy: { scheduledAt: 'asc' }
    });

    return sendSuccess(res, 'Upcoming appointments retrieved', appointments);
  } catch (error) {
    next(error);
  }
};
