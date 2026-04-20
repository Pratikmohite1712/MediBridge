const { z } = require('zod');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/db');
const redisClient = require('../config/redis');
const { sendSuccess, sendError } = require('../utils/response');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateOTP, verifyOTP } = require('../utils/otp');
const { sendOTPEmail } = require('../services/emailService');
const { sendOTPSms } = require('../services/smsService');

const registerSchema = z.object({
  fullName: z.string().min(2),
  contactInfo: z.string(),
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

exports.register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const isEmail = data.contactInfo.includes('@');
    
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: isEmail ? data.contactInfo : undefined },
          { phone: !isEmail ? data.contactInfo : undefined }
        ]
      }
    });

    if (existingUser) {
      return sendError(res, 'User already exists', 'CONFLICT', 409);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: isEmail ? data.contactInfo : null,
        phone: !isEmail ? data.contactInfo : null,
        passwordHash,
      }
    });

    return sendSuccess(res, 'Registration successful', { userId: user.id }, 201);
  } catch (error) {
    next(error);
  }
};

const loginSchema = z.object({
  identifier: z.string(),
  password: z.string()
});

exports.login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const isEmail = data.identifier.includes('@');

    const user = await prisma.user.findFirst({
      where: isEmail ? { email: data.identifier } : { phone: data.identifier },
      include: {
        patientProfile: true,
        doctorProfile: true
      }
    });

    if (!user) return sendError(res, 'Invalid credentials', 'UNAUTHORIZED', 401);
    if (!user.isActive) return sendError(res, 'Account is disabled', 'FORBIDDEN', 403);

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) return sendError(res, 'Invalid credentials', 'UNAUTHORIZED', 401);

    const isProfileComplete = !!(user.patientProfile || user.doctorProfile);

    const payload = { userId: user.id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { userId: user.id } }), // prevent immense db clutter
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
        }
      })
    ]);

    return sendSuccess(res, 'Login successful', {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        isProfileComplete
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendError(res, 'Refresh token required', 'BAD_REQUEST', 400);

    const decoded = verifyRefreshToken(refreshToken);
    const dbToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

    if (!dbToken) return sendError(res, 'Invalid refresh token', 'UNAUTHORIZED', 401);

    const newRefreshToken = signRefreshToken({ userId: decoded.userId, role: decoded.role });
    const newAccessToken = signAccessToken({ userId: decoded.userId, role: decoded.role });

    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { token: refreshToken } }),
      prisma.refreshToken.create({
        data: {
          userId: decoded.userId,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      })
    ]);

    return sendSuccess(res, 'Token refreshed successfully', { accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    return sendSuccess(res, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

exports.selectRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['PATIENT', 'DOCTOR', 'ADMIN'].includes(role)) {
      return sendError(res, 'Invalid role', 'BAD_REQUEST', 400);
    }

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { role }
    });
    return sendSuccess(res, 'Role selected', { role });
  } catch (error) {
    next(error);
  }
};

exports.sendOtp = async (req, res, next) => {
  try {
    const { contactInfo } = req.body;
    if (!contactInfo) return sendError(res, 'Contact info required', 'BAD_REQUEST', 400);
    
    const otp = await generateOTP(contactInfo);
    const isEmail = contactInfo.includes('@');
    
    if (isEmail) {
      await sendOTPEmail(contactInfo, otp);
    } else {
      await sendOTPSms(contactInfo, otp);
    }
    return sendSuccess(res, 'OTP sent successfully');
  } catch (error) {
    next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { contactInfo, otp } = req.body;
    const isValid = await verifyOTP(contactInfo, otp);
    if (!isValid) return sendError(res, 'Invalid or expired OTP', 'BAD_REQUEST', 400);

    const isEmail = contactInfo.includes('@');
    await prisma.user.updateMany({
      where: isEmail ? { email: contactInfo } : { phone: contactInfo },
      data: { isVerified: true }
    });

    return sendSuccess(res, 'OTP verified successfully', { verified: true });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { contactInfo } = req.body;
    const isEmail = contactInfo.includes('@');
    
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: contactInfo } : { phone: contactInfo }
    });
    
    if (!user) return sendError(res, 'User not found', 'NOT_FOUND', 404);
    
    const token = uuidv4();
    if (redisClient) {
      await redisClient.set(`reset:${token}`, user.id, 'EX', 15 * 60);
    }
    
    if (isEmail) {
      await sendOTPEmail(contactInfo, token); 
    }
    
    return sendSuccess(res, 'Password reset instructions sent');
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!redisClient) return sendError(res, 'Service unavailable', 'UNAVAILABLE', 503);
    
    const userId = await redisClient.get(`reset:${token}`);
    if (!userId) return sendError(res, 'Invalid or expired token', 'BAD_REQUEST', 400);
    
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
    
    await redisClient.del(`reset:${token}`);
    return sendSuccess(res, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};
