const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const redisClient = require('../config/redis');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  // Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: Token missing'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { userId: decoded.userId, role: decoded.role };
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId, role } = socket.user;

    // Track connection in Redis
    if (redisClient) {
      await redisClient.set(`socket:${userId}`, socket.id, 'EX', 24 * 60 * 60);
    }

    // Auto-join personal room
    socket.join(`user:${userId}`);

    // Auto-join ADMIN and DOCTOR to sos-responders
    if (['ADMIN', 'DOCTOR'].includes(role)) {
      socket.join('sos-responders');
    }

    // Room Management
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', { userId });
      socket.currentRoom = roomId; 
    });

    socket.on('send-message', async ({ roomId, message }) => {
      if (!roomId || !message) return;
      
      const timestamp = new Date().toISOString();
      const payload = { senderId: userId, message, timestamp };

      // Broadcast immediately
      io.to(roomId).emit('receive-message', payload);

      // Append to DB
      try {
        const appointment = await prisma.appointment.findFirst({ where: { roomId } });
        if (appointment && (appointment.patientId === userId || appointment.doctorId === userId)) {
          const consultation = await prisma.consultation.findUnique({ where: { appointmentId: appointment.id } });
          
          if (consultation) {
            const history = Array.isArray(consultation.chatHistory) ? consultation.chatHistory : [];
            history.push(payload);
            
            await prisma.consultation.update({
              where: { id: consultation.id },
              data: { chatHistory: history }
            });
          }
        }
      } catch (err) {
        console.error('Socket DB Error - send-message:', err);
      }
    });

    socket.on('call-signal', ({ roomId, signalData }) => {
      socket.to(roomId).emit('call-signal', { senderId: userId, signalData });
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      socket.currentRoom = null;
      socket.to(roomId).emit('user-left', { userId });
    });

    socket.on('consultation-ended', (roomId) => {
      io.to(roomId).emit('consultation-ended');
      io.in(roomId).socketsLeave(roomId);
    });

    socket.on('disconnect', async () => {
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('user-left', { userId });
      }
      if (redisClient) {
        await redisClient.del(`socket:${userId}`);
      }
    });
  });

  return io;
};

module.exports = { initSocket };
