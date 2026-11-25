import {
  checkAIAvailability,
  aiGenerateOutline,
  aiDraftSection,
  getAISpendingStats,
} from '../services/aiProviderService.js';

export const getAIAvailability = async (req, res, next) => {
  try {
    const status = await checkAIAvailability(req.user?._id);
    res.json(status);
  } catch (err) {
    next(err);
  }
};

export const generateOutline = async (req, res, next) => {
  try {
    const { topic, draftId, sourceDiscussionContext } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const check = await checkAIAvailability(req.user._id);
    if (!check.available) {
      return res.status(403).json({
        error: check.reason,
        code: check.code,
      });
    }

    const outline = await aiGenerateOutline({
      userId: req.user._id,
      draftId,
      topic: topic.trim(),
      contextNotes: sourceDiscussionContext || '',
    });

    res.json({ outline });
  } catch (err) {
    next(err);
  }
};

export const draftSection = async (req, res, next) => {
  try {
    const { sectionHeading, draftId, contextNotes, authorNotes } = req.body;
    if (!sectionHeading || !sectionHeading.trim()) {
      return res.status(400).json({ error: 'Section heading is required' });
    }

    const check = await checkAIAvailability(req.user._id);
    if (!check.available) {
      return res.status(403).json({
        error: check.reason,
        code: check.code,
      });
    }

    const draftText = await aiDraftSection({
      userId: req.user._id,
      draftId,
      sectionHeading: sectionHeading.trim(),
      contextNotes: contextNotes || '',
      authorNotes: authorNotes || '',
    });

    res.json({ draftText });
  } catch (err) {
    next(err);
  }
};

export const getAIAdminStats = async (req, res, next) => {
  try {
    const isAdmin = req.user && (req.user.platformRole === 'admin' || req.user.role === 'admin');
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin authorization required' });
    }

    const stats = await getAISpendingStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
};
