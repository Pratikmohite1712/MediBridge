const { z } = require('zod');
const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

exports.getDoctors = async (req, res, next) => {
  try {
    const { specialization, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const whereClause = {
      isVerified: true,
      verificationStatus: 'APPROVED'
    };

    if (specialization) {
      whereClause.specialization = { contains: specialization, mode: 'insensitive' };
    }

    if (search) {
      whereClause.OR = [
        { specialization: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [doctors, total] = await Promise.all([
      prisma.doctorProfile.findMany({
        where: whereClause,
        include: { user: { select: { fullName: true, profilePhotoUrl: true } } },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.doctorProfile.count({ where: whereClause })
    ]);

    return sendSuccess(res, 'Doctors retrieved', doctors, 200, {
      page: parseInt(page), limit: parseInt(limit), total
    });
  } catch (error) {
    next(error);
  }
};

exports.getDoctorDetails = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
      include: { user: { select: { fullName: true, profilePhotoUrl: true, isVerified: true } } }
    });

    if (!doctor) return sendError(res, 'Doctor not found', 'NOT_FOUND', 404);

    return sendSuccess(res, 'Doctor retrieved', doctor);
  } catch (error) {
    next(error);
  }
};

exports.getDoctorAvailability = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query; 

    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
      select: { availableSlots: true }
    });

    if (!doctor) return sendError(res, 'Doctor not found', 'NOT_FOUND', 404);

    return sendSuccess(res, 'Availability retrieved', doctor.availableSlots);
  } catch (error) {
    next(error);
  }
};

exports.getMyPatients = async (req, res, next) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { doctorId: req.user.userId, status: 'COMPLETED' },
      select: { patient: { include: { patientProfile: true } } },
      distinct: ['patientId']
    });

    const patients = appointments.map(a => a.patient);
    return sendSuccess(res, 'Patients retrieved', patients);
  } catch (error) {
    next(error);
  }
};

exports.getMyAppointments = async (req, res, next) => {
  try {
    const { status, date, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const whereClause = { doctorId: req.user.userId };
    if (status) whereClause.status = status;
    if (date) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause.scheduledAt = { gte: new Date(date), lt: nextDay };
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: whereClause,
        include: { patient: { select: { fullName: true } } },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { scheduledAt: 'asc' }
      }),
      prisma.appointment.count({ where: whereClause })
    ]);

    return sendSuccess(res, 'Appointments retrieved', appointments, 200, {
      page: parseInt(page), limit: parseInt(limit), total
    });
  } catch (error) {
    next(error);
  }
};
