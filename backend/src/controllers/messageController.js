import { Conversation, Message } from '../models/Conversation.js';
import { User } from '../models/User.js';

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'displayName username initials avatarColor avatar')
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

    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient is required' });
    }

    const cleanRecipient = recipientId.toString().trim();
    if (cleanRecipient === userId.toString()) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself' });
    }

    let targetUser = null;

    if (cleanRecipient.match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(cleanRecipient);
    }
    if (!targetUser) {
      targetUser = await User.findOne({ username: cleanRecipient.toLowerCase() });
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    const targetUserId = targetUser._id;

    if (targetUserId.toString() === userId.toString()) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself' });
    }

    let conv = await Conversation.findOne({
      participants: { $all: [userId, targetUserId], $size: 2 },
    }).populate('participants', 'displayName username initials avatarColor avatar');

    if (!conv) {
      conv = await Conversation.create({
        participants: [userId, targetUserId],
        lastMessage: 'Conversation started',
        lastMessageAt: new Date(),
      });
      conv = await Conversation.findById(conv._id).populate('participants', 'displayName username initials avatarColor avatar');
    }

    res.status(201).json({ conversation: conv });
  } catch (err) {
    next(err);
  }
};
