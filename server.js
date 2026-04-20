require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const prisma = require('./src/config/db');
const { initSocket } = require('./src/socket/index');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);
app.locals.io = io; // Inject to app locals for routes to broadcast

// Boot Server
server.listen(PORT, async () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log('Socket.io initialized');
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed', error);
  }
});
