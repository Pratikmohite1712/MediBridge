const { z } = require('zod');
const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const patientProfileSchema = z.object({
  age: z.number().int().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
});

exports.completePatientProfile = async (req, res, next) => {
  try {
    const data = patientProfileSchema.parse(req.body);
    const profile = await prisma.patientProfile.upsert({
      where: { userId: req.user.userId },
      update: data,
      create: { ...data, userId: req.user.userId }
    });
    return sendSuccess(res, 'Patient profile updated', profile);
  } catch (error) {
    next(error);
  }
};

const doctorProfileSchema = z.object({
  specialization: z.string(),
  qualification: z.string(),
  experienceYears: z.coerce.number().int(),
  clinicName: z.string().optional(),
  registrationNo: z.string()
});

exports.completeDoctorProfile = async (req, res, next) => {
  try {
    const data = doctorProfileSchema.parse(req.body);
    const certificateUrl = req.file ? req.file.path : null; 

    const profile = await prisma.doctorProfile.upsert({
      where: { userId: req.user.userId },
      update: { ...data, certificateUrl, verificationStatus: 'PENDING' },
      create: { ...data, userId: req.user.userId, certificateUrl, verificationStatus: 'PENDING' }
    });
    return sendSuccess(res, 'Doctor profile created/updated. Pending verification.', profile);
  } catch (error) {
    next(error);
  }
};

exports.getMyProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        patientProfile: true,
        doctorProfile: true
      }
    });

    if (!user) return sendError(res, 'User not found', 'NOT_FOUND', 404);

    return sendSuccess(res, 'Profile retrieved', user);
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, preferredLang } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { fullName, phone, preferredLang }
    });
    return sendSuccess(res, 'Profile dynamically updated', user);
  } catch (error) {
    next(error);
  }
};

exports.uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'No photo uploaded', 'BAD_REQUEST', 400);

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { profilePhotoUrl: req.file.path }
    });
    
    return sendSuccess(res, 'Photo uploaded successfully', { profilePhotoUrl: user.profilePhotoUrl });
  } catch (error) {
    next(error);
  }
};
