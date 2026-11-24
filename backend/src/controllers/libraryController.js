import { Save } from '../models/Notification.js';

export const getLibrary = async (req, res, next) => {
  try {
    const { type } = req.query;
    let query = { userId: req.user._id };
    if (type && type !== 'all') query.itemType = type;

    const items = await Save.find(query).sort({ createdAt: -1 });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};
