const { z } = require('zod');
const prisma = require('../config/db');
const redisClient = require('../config/redis');
const { sendSuccess, sendError } = require('../utils/response');
const { sendSOSAlert } = require('../services/emailService');

const activateSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional()
});

exports.activateSos = async (req, res, next) => {
  try {
    const data = activateSchema.parse(req.body);
    
    const sosAlert = await prisma.sOSAlert.create({
      data: {
        userId: req.user.userId,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address
      }
    });

    const alertDetails = {
      id: sosAlert.id,
      userId: req.user.userId,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      time: new Date().toLocaleString()
    };

    // Emit Realtime event (socket.io logic usually handled via an emitter singleton or app.locals)
    if (req.app.locals.io) {
      req.app.locals.io.to('ADMIN_ROOM').to('DOCTOR_ROOM').emit('sos:new', alertDetails);
    }

    // Send immediate Email
    await sendSOSAlert('admin@medibridge.ai', alertDetails);

    // Schedule 5-minute escalation checker via Redis Keyspace if needed
    // Assuming simple timeout pattern internally for simplicity without external worker
    setTimeout(async () => {
      const currentAlert = await prisma.sOSAlert.findUnique({ where: { id: sosAlert.id } });
      if (currentAlert && currentAlert.status === 'ACTIVE') {
        await sendSOSAlert('admin@medibridge.ai', { ...alertDetails, time: '[ESCALATION 5M] ' + new Date().toLocaleString() });
      }
    }, 5 * 60 * 1000);

    return sendSuccess(res, 'SOS Activated', { sosId: sosAlert.id }, 201);
  } catch (error) {
    next(error);
  }
};

const respondSchema = z.object({
  respondedBy: z.string()
});

exports.respondToSos = async (req, res, next) => {
  try {
    const { sosId } = req.params;
    const { respondedBy } = respondSchema.parse(req.body);

    const alert = await prisma.sOSAlert.findUnique({ where: { id: sosId } });
    if (!alert) return sendError(res, 'SOS Alert not found', 'NOT_FOUND', 404);

    const updated = await prisma.sOSAlert.update({
      where: { id: sosId },
      data: { status: 'RESPONDED', respondedBy }
    });

    if (req.app.locals.io) {
      req.app.locals.io.emit('sos:responded', updated);
    }

    return sendSuccess(res, 'Successfully responded to SOS', updated);
  } catch (error) {
    next(error);
  }
};

exports.resolveSos = async (req, res, next) => {
  try {
    const { sosId } = req.params;

    const alert = await prisma.sOSAlert.findUnique({ where: { id: sosId } });
    if (!alert) return sendError(res, 'SOS Alert not found', 'NOT_FOUND', 404);

    const updated = await prisma.sOSAlert.update({
      where: { id: sosId },
      data: { status: 'RESOLVED', resolvedAt: new Date() }
    });

    return sendSuccess(res, 'SOS resolved successfully', updated);
  } catch (error) {
    next(error);
  }
};

exports.getActiveSos = async (req, res, next) => {
  try {
    const alerts = await prisma.sOSAlert.findMany({
      where: { status: { in: ['ACTIVE', 'RESPONDED'] } },
      include: { user: { select: { fullName: true, phone: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, 'Active SOS Alerts retrieved', alerts);
  } catch (error) {
    next(error);
  }
};

exports.getMySos = async (req, res, next) => {
  try {
    const alerts = await prisma.sOSAlert.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, 'My SOS history retrieved', alerts);
  } catch (error) {
    next(error);
  }
};
