import { Conversation, Message } from '../models/Conversation.js';
import { User } from '../models/User.js';

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'displayName username initials avatarColor')
      .sort({ lastMessageAt: -1 });

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({ messages });
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'Message body required' });

    const message = await Message.create({
      conversationId,
      senderId: req.user._id,
      senderName: req.user.displayName,
      body: body.trim(),
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: body.trim(),
      lastMessageSenderId: req.user._id,
      lastMessageAt: new Date(),
    });

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
};

export const startConversation = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user._id;

    let conv = await Conversation.findOne({
      participants: { $all: [userId, recipientId], $size: 2 },
    }).populate('participants', 'displayName username initials avatarColor');

    if (!conv) {
      conv = await Conversation.create({
        participants: [userId, recipientId],
        lastMessage: 'Conversation started',
        lastMessageAt: new Date(),
      });
      conv = await Conversation.findById(conv._id).populate('participants', 'displayName username initials avatarColor');
    }

    res.status(201).json({ conversation: conv });
  } catch (err) {
    next(err);
  }
};
