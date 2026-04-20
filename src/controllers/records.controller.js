const { z } = require('zod');
const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const uploadSchema = z.object({
  title: z.string(),
  recordType: z.enum(['LAB_REPORT', 'PRESCRIPTION', 'XRAY', 'SCAN', 'DISCHARGE_SUMMARY', 'OTHER']),
  date: z.string().datetime(),
  tags: z.string().optional(), // usually submitted as stringified array or comma separated via FormData
  patientId: z.string().optional()
});

exports.uploadRecord = async (req, res, next) => {
  try {
    const data = uploadSchema.parse(req.body);
    if (!req.file) return sendError(res, 'File is required', 'BAD_REQUEST', 400);

    const fileUrl = req.file.path;
    const fileSize = req.file.size || 0;
    
    let targetPatientId = req.user.userId;

    if (req.user.role === 'DOCTOR') {
      if (!data.patientId) return sendError(res, 'patientId is required when uploading as doctor', 'BAD_REQUEST', 400);
      targetPatientId = data.patientId;
      
      const hasConsultation = await prisma.appointment.findFirst({
        where: { doctorId: req.user.userId, patientId: targetPatientId }
      });
      if (!hasConsultation) return sendError(res, 'Unauthorized to upload for this patient', 'FORBIDDEN', 403);
    }

    const tagsArray = data.tags ? data.tags.split(',').map(t => t.trim()) : [];

    const record = await prisma.medicalRecord.create({
      data: {
        patientId: targetPatientId,
        uploadedBy: req.user.userId,
        title: data.title,
        recordType: data.recordType,
        fileUrl: fileUrl,
        fileSize: fileSize,
        date: new Date(data.date),
        tags: tagsArray
      }
    });

    return sendSuccess(res, 'Record uploaded successfully', record, 201);
  } catch (error) {
    next(error);
  }
};

exports.getRecords = async (req, res, next) => {
  try {
    const { recordType, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const whereClause = {};

    if (req.user.role === 'PATIENT') {
      whereClause.patientId = req.user.userId;
    } else if (req.user.role === 'DOCTOR') {
      // Return records of patients they have appointments with
      const apps = await prisma.appointment.findMany({ where: { doctorId: req.user.userId }, select: { patientId: true } });
      const patientIds = apps.map(a => a.patientId);
      whereClause.patientId = { in: patientIds };
    }

    if (recordType) whereClause.recordType = recordType;
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ];
    }

    const [records, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where: whereClause,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { date: 'desc' },
        include: { patient: { select: { fullName: true } } }
      }),
      prisma.medicalRecord.count({ where: whereClause })
    ]);

    return sendSuccess(res, 'Records retrieved', records, 200, { page: parseInt(page), limit: parseInt(limit), total });
  } catch (error) {
    next(error);
  }
};

exports.getRecordDetails = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const record = await prisma.medicalRecord.findUnique({ where: { id: recordId } });
    
    if (!record) return sendError(res, 'Record not found', 'NOT_FOUND', 404);

    if (req.user.role === 'PATIENT' && record.patientId !== req.user.userId) {
      return sendError(res, 'Forbidden', 'FORBIDDEN', 403);
    }
    
    if (req.user.role === 'DOCTOR') {
      const hasConsultation = await prisma.appointment.findFirst({ where: { doctorId: req.user.userId, patientId: record.patientId } });
      if (!hasConsultation) return sendError(res, 'Forbidden', 'FORBIDDEN', 403);
    }

    return sendSuccess(res, 'Record details retrieved', record);
  } catch (error) {
    next(error);
  }
};

exports.deleteRecord = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const record = await prisma.medicalRecord.findUnique({ where: { id: recordId } });
    if (!record) return sendError(res, 'Record not found', 'NOT_FOUND', 404);

    if (req.user.role === 'PATIENT' && record.patientId !== req.user.userId) return sendError(res, 'Forbidden', 'FORBIDDEN', 403);

    await prisma.medicalRecord.delete({ where: { id: recordId } });
    return sendSuccess(res, 'Record deleted successfully');
  } catch (error) {
    next(error);
  }
};

exports.getRecordsByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    
    const hasConsultation = await prisma.appointment.findFirst({ where: { doctorId: req.user.userId, patientId: patientId } });
    if (!hasConsultation) return sendError(res, 'Unauthorized viewing', 'FORBIDDEN', 403);

    const records = await prisma.medicalRecord.findMany({
      where: { patientId },
      orderBy: { date: 'desc' }
    });

    return sendSuccess(res, 'Records retrieved', records);
  } catch (error) {
    next(error);
  }
};
