import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireGuestPreviewOrAuth } from '../middleware/guestPreview.js';
import { publicApiRateLimiter, publicSearchRateLimiter } from '../middleware/rateLimiter.js';

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
import * as publicCtrl from '../controllers/publicController.js';
import * as feedCtrl from '../controllers/feedController.js';

const router = express.Router();

// ==========================================
// 1. UNIFIED FEED (For you, Trending, Following, Latest)
// ==========================================
router.get('/feed', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, feedCtrl.getUnifiedFeed);

// ==========================================
// 2. PUBLIC READ-ONLY PREVIEW APIS (120s limit + rate limited)
// ==========================================
router.get('/public/session/preview-token', publicCtrl.getPreviewSession);
router.get('/public/discover', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, publicCtrl.getPublicDiscover);
router.get('/public/posts/:postId', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, publicCtrl.getPublicPostById);
router.get('/public/discussions/:discussionId', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, publicCtrl.getPublicDiscussionById);
router.get('/public/knowledge/:articleId', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, publicCtrl.getPublicKnowledgeById);
router.get('/public/users/:username', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, publicCtrl.getPublicUserByUsername);
router.get('/public/circles/:slugOrId', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, publicCtrl.getPublicCircle);

// ==========================================
// 3. AUTHENTICATION LIFECYCLE
// ==========================================
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.post('/auth/logout', requireAuth, authCtrl.logout);
router.get('/auth/me', requireAuth, authCtrl.getMe);
router.post('/auth/forgot-password', authCtrl.forgotPassword);
router.post('/auth/reset-password', authCtrl.resetPassword);
router.post('/auth/verify-email', authCtrl.verifyEmail);

// ==========================================
// 4. USERS & PROFILES (People discovery, target profile vs own profile)
// ==========================================
router.get('/users/me', requireAuth, userCtrl.getMe);
router.patch('/users/me', requireAuth, userCtrl.updateProfile);
router.get('/users/:username', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, userCtrl.getUserByUsername);
router.post('/users/:userId/follow', requireAuth, userCtrl.toggleFollowUser);
router.get('/users', optionalAuth, requireGuestPreviewOrAuth, publicSearchRateLimiter, userCtrl.searchUsers);

// ==========================================
// 5. POSTS
// ==========================================
router.get('/posts', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, postCtrl.getPosts);
router.get('/posts/:postId', requireAuth, postCtrl.getPostById);
router.post('/posts', requireAuth, postCtrl.createPost);
router.post('/posts/:postId/like', requireAuth, postCtrl.toggleLikePost);
router.get('/posts/:postId/replies', requireAuth, postCtrl.getPostReplies);
router.post('/posts/:postId/replies', requireAuth, postCtrl.addPostReply);
router.post('/posts/:postId/save', requireAuth, postCtrl.savePost);
router.patch('/posts/:postId', requireAuth, postCtrl.updatePost);
router.delete('/posts/:postId', requireAuth, postCtrl.deletePost);
router.post('/posts/:postId/convert-to-discussion', requireAuth, postCtrl.convertPostToDiscussion);
router.post('/posts/:postId/knowledge-drafts', requireAuth, knowCtrl.createDraftFromPost);

// ==========================================
// 6. DISCUSSIONS
// ==========================================
router.get('/discussions', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, discCtrl.getDiscussions);
router.get('/discussions/:discussionId', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, discCtrl.getDiscussionById);
router.patch('/discussions/:discussionId', requireAuth, discCtrl.updateDiscussion);
router.delete('/discussions/:discussionId', requireAuth, discCtrl.deleteDiscussion);
router.post('/discussions', requireAuth, discCtrl.createDiscussion);
router.post('/discussions/:discussionId/upvote', requireAuth, discCtrl.upvoteDiscussion);
router.post('/discussions/:discussionId/contributions', requireAuth, discCtrl.addContribution);
router.patch('/discussions/:discussionId/contributions/:contributionId', requireAuth, discCtrl.updateContribution);
router.delete('/discussions/:discussionId/contributions/:contributionId', requireAuth, discCtrl.deleteContribution);
router.post('/discussions/:discussionId/knowledge-drafts', requireAuth, knowCtrl.createDraftFromDiscussion);

// ==========================================
// 7. KNOWLEDGE
// ==========================================
router.get('/knowledge', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, knowCtrl.getKnowledgeArticles);
router.get('/knowledge/drafts', requireAuth, knowCtrl.getUserDrafts);
router.post('/knowledge/drafts', requireAuth, knowCtrl.createIndependentDraft);
router.get('/knowledge/drafts/:draftId', requireAuth, knowCtrl.getDraftById);
router.patch('/knowledge/drafts/:draftId', requireAuth, knowCtrl.updateDraft);
router.delete('/knowledge/drafts/:draftId', requireAuth, knowCtrl.discardDraft);
router.post('/knowledge/drafts/:draftId/publish', requireAuth, knowCtrl.publishDraft);
router.post('/knowledge/drafts/:draftId/update-sources', requireAuth, knowCtrl.updateDraftSources);
router.get('/knowledge/:articleId/versions', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, knowCtrl.getArticleVersions);
router.post('/knowledge/:articleId/restore-version/:versionId', requireAuth, knowCtrl.restoreArticleVersion);
router.get('/knowledge/:articleId/sources', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, knowCtrl.getArticleSources);
router.get('/knowledge/:articleId', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, knowCtrl.getKnowledgeById);
router.patch('/knowledge/:articleId', requireAuth, knowCtrl.updateKnowledgeArticle);
router.delete('/knowledge/:articleId', requireAuth, knowCtrl.deleteKnowledgeArticle);
router.post('/knowledge', requireAuth, knowCtrl.createKnowledge);
router.post('/knowledge/:articleId/helpful', requireAuth, knowCtrl.voteHelpful);
router.post('/knowledge/:articleId/save', requireAuth, knowCtrl.saveKnowledge);

// ==========================================
// 8. CIRCLES
// ==========================================
router.get('/circles', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, circleCtrl.getCircles);
router.get('/circles/:circleId', optionalAuth, requireGuestPreviewOrAuth, publicApiRateLimiter, circleCtrl.getCircleById);
router.post('/circles', requireAuth, circleCtrl.createCircle);
router.post('/circles/:circleId/join', requireAuth, circleCtrl.toggleJoinCircle);

// ==========================================
// 9. MESSAGES
// ==========================================
router.get('/conversations', requireAuth, msgCtrl.getConversations);
router.post('/conversations', requireAuth, msgCtrl.startConversation);
router.get('/conversations/:conversationId/messages', requireAuth, msgCtrl.getMessages);
router.post('/conversations/:conversationId/messages', requireAuth, msgCtrl.sendMessage);

// ==========================================
// 10. NOTIFICATIONS & ACTIVITY
// ==========================================
router.get('/notifications', requireAuth, notifCtrl.getNotifications);
router.get('/notifications/preferences', requireAuth, notifCtrl.getNotificationPreferences);
router.patch('/notifications/preferences', requireAuth, notifCtrl.updateNotificationPreferences);
router.patch('/notifications/:id/read', requireAuth, notifCtrl.markAsRead);
router.post('/notifications/read-all', requireAuth, notifCtrl.markAllAsRead);

// ==========================================
// 11. LIBRARY
// ==========================================
router.get('/library', requireAuth, libCtrl.getLibrary);

// ==========================================
// 12. SEARCH
// ==========================================
router.get('/search', optionalAuth, requireGuestPreviewOrAuth, publicSearchRateLimiter, searchCtrl.globalSearch);

// ==========================================
// 13. ADMIN & MODERATION
// ==========================================
router.get('/admin/overview', requireAuth, adminCtrl.getAdminOverview);
router.get('/admin/users', requireAuth, adminCtrl.getAdminUsers);
router.get('/admin/users/:userId/content', requireAuth, adminCtrl.getAdminUserContent);
router.patch('/admin/users/:userId/role', requireAuth, adminCtrl.updateUserRole);
router.patch('/admin/users/:userId/status', requireAuth, adminCtrl.updateUserStatus);
router.patch('/admin/reports/:reportId', requireAuth, adminCtrl.updateReport);
router.post('/reports', requireAuth, adminCtrl.submitReport);

// ==========================================
// 14. AI WRITING PARTNER
// ==========================================
router.get('/ai/status', optionalAuth, aiCtrl.getAIAvailability);
router.post('/ai/knowledge/outline', requireAuth, aiCtrl.generateOutline);
router.post('/ai/knowledge/draft-section', requireAuth, aiCtrl.draftSection);
router.get('/admin/ai/usage', requireAuth, aiCtrl.getAIAdminStats);

export default router;
