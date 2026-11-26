import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { clientCorsOptions } from './src/config/cors.js';
import { User } from './src/models/User.js';
import { emitConversationEvent, getAuthorizedConversation, saveConversationMessage } from './src/services/messageService.js';
import { seedDatabase } from './src/seeds/seed.js';

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    methods: ['GET', 'POST'],
    ...clientCorsOptions,
  },
});

app.set('io', io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || !token) {
      return next(new Error('Authentication required'));
    }
    const secret = process.env.JWT_SECRET || 'orvexa_jwt_dev_secret_key_8932478';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user || ['banned', 'suspended'].includes(user.accountStatus)) {
      return next(new Error('User session is invalid'));
    }
    socket.data.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid or expired session'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.data.user._id.toString()}`);
  socket.data.joinedConversations = new Set();

  socket.on('join_conversation', async (conversationId) => {
    try {
      if (typeof conversationId !== 'string') return;
      const access = await getAuthorizedConversation(conversationId, socket.data.user._id);
      if (access.error) return socket.emit('operation_error', { error: access.error });
      socket.data.joinedConversations.add(access.conversation._id.toString());
    } catch (error) {
      console.error('Failed to authorize conversation room:', error);
      socket.emit('operation_error', { error: 'Unable to join conversation' });
    }
  });

  socket.on('leave_conversation', async (conversationId) => {
    if (typeof conversationId === 'string') socket.data.joinedConversations.delete(conversationId);
  });

  socket.on('send_message', async (data) => {
    try {
      if (!data || typeof data.conversationId !== 'string') return;
      const access = await getAuthorizedConversation(data.conversationId, socket.data.user._id, { forSend: true });
      if (access.error) return socket.emit('operation_error', { error: access.error });
      const roomId = access.conversation._id.toString();
      if (!socket.data.joinedConversations.has(roomId)) {
        return socket.emit('operation_error', { error: 'Join the conversation before sending messages' });
      }
      const message = await saveConversationMessage({
        conversation: access.conversation,
        user: socket.data.user,
        body: data.body,
      });
      await emitConversationEvent(io, access.conversation, 'new_message', message.toObject());
    } catch (error) {
      if (error.status) return socket.emit('operation_error', { error: error.message });
      console.error('Failed to persist socket message:', error);
      socket.emit('operation_error', { error: 'Unable to send message' });
    }
  });
});

const startServer = async () => {
  await connectDB();
  await seedDatabase();

  server.listen(PORT, () => {
    console.log(`[Orvexa Server] Running on http://localhost:${PORT}`);
    console.log(`[Orvexa API] Base URL http://localhost:${PORT}/api`);
  });
};

startServer();
