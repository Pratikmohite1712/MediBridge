const { z } = require('zod');
const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const medicineSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  durationDays: z.number().int(),
  instructions: z.string().optional()
});

const prescriptionSchema = z.object({
  appointmentId: z.string(),
  medicines: z.array(medicineSchema).min(1),
  diagnosis: z.string().optional(),
  followUpDate: z.string().datetime().optional(), // ISO
  notes: z.string().optional()
});

exports.createPrescription = async (req, res, next) => {
  try {
    const data = prescriptionSchema.parse(req.body);

    const appointment = await prisma.appointment.findUnique({ where: { id: data.appointmentId } });
    if (!appointment) return sendError(res, 'Appointment not found', 'NOT_FOUND', 404);
    if (appointment.doctorId !== req.user.userId) return sendError(res, 'Forbidden to prescribe for others', 'FORBIDDEN', 403);
    if (appointment.status !== 'COMPLETED' && appointment.status !== 'ONGOING') {
      return sendError(res, 'Appointment must be ongoing or completed to issue prescription', 'BAD_REQUEST', 400);
    }

    const prescription = await prisma.prescription.create({
      data: {
        appointmentId: data.appointmentId,
        doctorId: req.user.userId,
        patientId: appointment.patientId,
        medicines: data.medicines,
        diagnosis: data.diagnosis,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        notes: data.notes
      }
    });

    return sendSuccess(res, 'Prescription created', prescription, 201);
  } catch (error) {
    next(error);
  }
};

exports.getPrescriptionDetails = async (req, res, next) => {
  try {
    const { prescriptionId } = req.params;
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        appointment: { include: { doctor: { select: { fullName: true } }, patient: { select: { fullName: true } } } }
      }
    });

    if (!prescription) return sendError(res, 'Prescription not found', 'NOT_FOUND', 404);

    if (req.user.role !== 'ADMIN' && prescription.patientId !== req.user.userId && prescription.doctorId !== req.user.userId) {
      return sendError(res, 'Forbidden to view this prescription', 'FORBIDDEN', 403);
    }

    return sendSuccess(res, 'Prescription retrieved', prescription);
  } catch (error) {
    next(error);
  }
};

exports.getPatientPrescriptions = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (req.user.role === 'DOCTOR') {
      const hasConsultation = await prisma.appointment.findFirst({
        where: { doctorId: req.user.userId, patientId: patientId }
      });
      if (!hasConsultation) return sendError(res, 'You have no authorizations for this patient', 'FORBIDDEN', 403);
    }

    const skip = (page - 1) * limit;

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where: { patientId },
        include: { appointment: { include: { doctor: { select: { fullName: true } } } } },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.prescription.count({ where: { patientId } })
    ]);

    return sendSuccess(res, 'Patient prescriptions retrieved', prescriptions, 200, { page: parseInt(page), limit: parseInt(limit), total });
  } catch (error) {
    next(error);
  }
};

exports.getMyPrescriptions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where: { patientId: req.user.userId },
        include: { appointment: { include: { doctor: { select: { fullName: true } } } } },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.prescription.count({ where: { patientId: req.user.userId } })
    ]);

    return sendSuccess(res, 'Prescriptions retrieved', prescriptions, 200, { page: parseInt(page), limit: parseInt(limit), total });
  } catch (error) {
    next(error);
  }
};
