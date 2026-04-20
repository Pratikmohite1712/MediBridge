const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

exports.startConsultation = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) return sendError(res, 'Appointment not found', 'NOT_FOUND', 404);
    if (appointment.doctorId !== req.user.userId) return sendError(res, 'Forbidden', 'FORBIDDEN', 403);
    if (appointment.status !== 'CONFIRMED') return sendError(res, 'Appointment must be CONFIRMED to start', 'BAD_REQUEST', 400);

    const [updatedAppointment, consultation] = await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'ONGOING' }
      }),
      prisma.consultation.create({
        data: {
          appointmentId: appointmentId,
          startedAt: new Date(),
          chatHistory: []
        }
      })
    ]);

    return sendSuccess(res, 'Consultation started', {
      roomId: appointment.roomId,
      consultationId: consultation.id
    });
  } catch (error) {
    next(error);
  }
};

exports.endConsultation = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) return sendError(res, 'Appointment not found', 'NOT_FOUND', 404);
    if (appointment.doctorId !== req.user.userId) return sendError(res, 'Forbidden', 'FORBIDDEN', 403);

    const consultation = await prisma.consultation.findUnique({ where: { appointmentId } });
    if (!consultation) return sendError(res, 'Consultation not found for this appointment', 'NOT_FOUND', 404);
    if (consultation.endedAt) return sendError(res, 'Consultation already ended', 'BAD_REQUEST', 400);

    const endedAt = new Date();
    const durationMins = Math.floor((endedAt - consultation.startedAt) / 60000);

    const [updatedApp, updatedCons] = await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'COMPLETED' }
      }),
      prisma.consultation.update({
        where: { id: consultation.id },
        data: {
          endedAt,
          duration: durationMins
        }
      })
    ]);

    return sendSuccess(res, 'Consultation ended effectively', {
      duration: durationMins,
      endedAt
    });
  } catch (error) {
    next(error);
  }
};

exports.getChatHistory = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) return sendError(res, 'Appointment not found', 'NOT_FOUND', 404);
    
    if (req.user.role !== 'ADMIN' && appointment.patientId !== req.user.userId && appointment.doctorId !== req.user.userId) {
      return sendError(res, 'Forbidden viewing', 'FORBIDDEN', 403);
    }

    const consultation = await prisma.consultation.findUnique({ where: { appointmentId } });
    if (!consultation) return sendError(res, 'No consultation record found', 'NOT_FOUND', 404);

    return sendSuccess(res, 'Chat history retrieved', consultation.chatHistory);
  } catch (error) {
    next(error);
  }
};
