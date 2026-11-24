import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import * as authCtrl from '../controllers/authController.js';
import * as postCtrl from '../controllers/postController.js';
import * as discCtrl from '../controllers/discussionController.js';
import * as knowCtrl from '../controllers/knowledgeController.js';
import * as circleCtrl from '../controllers/circleController.js';
import * as msgCtrl from '../controllers/messageController.js';
import * as notifCtrl from '../controllers/notificationController.js';
import * as libCtrl from '../controllers/libraryController.js';
import * as searchCtrl from '../controllers/searchController.js';
import * as adminCtrl from '../controllers/adminController.js';
import * as aiCtrl from '../controllers/aiController.js';
import * as userCtrl from '../controllers/userController.js';

const router = express.Router();

// Auth & User
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.post('/auth/logout', requireAuth, authCtrl.logout);
router.get('/auth/me', requireAuth, authCtrl.getMe);
router.post('/auth/forgot-password', authCtrl.forgotPassword);
router.post('/auth/reset-password', authCtrl.resetPassword);
router.post('/auth/verify-email', authCtrl.verifyEmail);

// User profile
router.get('/users/:username', optionalAuth, userCtrl.getUserByUsername);
router.patch('/users/me', requireAuth, userCtrl.updateProfile);

// Posts
router.get('/posts', optionalAuth, postCtrl.getPosts);
router.post('/posts', requireAuth, postCtrl.createPost);
router.post('/posts/:postId/like', requireAuth, postCtrl.toggleLikePost);
router.post('/posts/:postId/save', requireAuth, postCtrl.savePost);

// Discussions (Ideas hub)
router.get('/discussions', optionalAuth, discCtrl.getDiscussions);
router.get('/discussions/:discussionId', optionalAuth, discCtrl.getDiscussionById);
router.post('/discussions', requireAuth, discCtrl.createDiscussion);
router.post('/discussions/:discussionId/upvote', requireAuth, discCtrl.upvoteDiscussion);
router.post('/discussions/:discussionId/contributions', requireAuth, discCtrl.addContribution);

// Knowledge
router.get('/knowledge', optionalAuth, knowCtrl.getKnowledgeArticles);
router.get('/knowledge/:articleId', optionalAuth, knowCtrl.getKnowledgeById);
router.post('/knowledge', requireAuth, knowCtrl.createKnowledge);
router.post('/knowledge/:articleId/helpful', requireAuth, knowCtrl.voteHelpful);
router.post('/knowledge/:articleId/save', requireAuth, knowCtrl.saveKnowledge);

// Circles
router.get('/circles', optionalAuth, circleCtrl.getCircles);
router.get('/circles/:circleId', optionalAuth, circleCtrl.getCircleById);
router.post('/circles', requireAuth, circleCtrl.createCircle);
router.post('/circles/:circleId/join', requireAuth, circleCtrl.toggleJoinCircle);

// Messages
router.get('/conversations', requireAuth, msgCtrl.getConversations);
router.post('/conversations', requireAuth, msgCtrl.startConversation);
router.get('/conversations/:conversationId/messages', requireAuth, msgCtrl.getMessages);
router.post('/conversations/:conversationId/messages', requireAuth, msgCtrl.sendMessage);

// Notifications & Activity
router.get('/notifications', requireAuth, notifCtrl.getNotifications);
router.patch('/notifications/:id/read', requireAuth, notifCtrl.markAsRead);
router.post('/notifications/read-all', requireAuth, notifCtrl.markAllAsRead);

// Library
router.get('/library', requireAuth, libCtrl.getLibrary);

// Search
router.get('/search', optionalAuth, searchCtrl.globalSearch);

// Admin & Moderation
router.get('/admin/overview', requireAuth, adminCtrl.getAdminOverview);
router.post('/reports', requireAuth, adminCtrl.submitReport);

// AI Knowledge Partner
router.post('/ai/knowledge/outline', requireAuth, aiCtrl.generateOutline);
router.post('/ai/knowledge/draft-section', requireAuth, aiCtrl.draftSection);

export default router;
