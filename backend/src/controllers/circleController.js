import { Circle } from '../models/Circle.js';

export const getCircles = async (req, res, next) => {
  try {
    const { category } = req.query;
    let query = { status: 'active' };
    if (category && category !== 'All interests') query.category = category;

    const circles = await Circle.find(query).sort({ membersCount: -1 });
    res.json({ circles });
  } catch (err) {
    next(err);
  }
};

export const getCircleById = async (req, res, next) => {
  try {
    const { circleId } = req.params;
    const circle = await Circle.findById(circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    res.json({ circle });
  } catch (err) {
    next(err);
  }
};

export const toggleJoinCircle = async (req, res, next) => {
  try {
    const { circleId } = req.params;
    const userId = req.user._id;

    const circle = await Circle.findById(circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });

    const idx = circle.members.indexOf(userId);
    let joined = false;
    if (idx === -1) {
      circle.members.push(userId);
      circle.membersCount += 1;
      joined = true;
    } else {
      circle.members.splice(idx, 1);
      circle.membersCount = Math.max(1, circle.membersCount - 1);
      joined = false;
    }

    await circle.save();
    res.json({ joined, membersCount: circle.membersCount });
  } catch (err) {
    next(err);
  }
};

export const createCircle = async (req, res, next) => {
  try {
    const { name, description, category, visibility } = req.body;
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const circle = await Circle.create({
      name,
      slug,
      description,
      ownerId: req.user._id,
      category: category || 'Technology',
      visibility: visibility || 'public',
      members: [req.user._id],
      membersCount: 1,
    });

    res.status(201).json({ circle });
  } catch (err) {
    next(err);
  }
};
