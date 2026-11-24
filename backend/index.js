import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('send_message', (data) => {
    if (data.conversationId) {
      io.to(data.conversationId).emit('new_message', data);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`[Orvexa Server] Running on http://localhost:${PORT}`);
    console.log(`[Orvexa API] Base URL http://localhost:${PORT}/api`);
  });
};

startServer();
