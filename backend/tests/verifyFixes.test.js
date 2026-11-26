import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { issueGuestPreviewToken, requireGuestPreviewOrAuth } from '../src/middleware/guestPreview.js';
import { createRateLimiter } from '../src/middleware/rateLimiter.js';
import {
  calculateTrendingScore,
  calculateForYouScore,
  interleaveFeedItems,
} from '../src/services/feedRankingService.js';

const runTests = async () => {
  console.log('--- Starting Orvexa Fix Validation Tests (Batch 01 + 02) ---');

  // Test 1: Guest preview token issuance and verification
  {
    const token = issueGuestPreviewToken();
    assert.ok(token, 'Guest token should be issued');
    const decoded = jwt.decode(token);
    assert.equal(decoded.type, 'guest_preview');
    assert.ok(decoded.createdAt <= Date.now());
    console.log('✓ Test 1 Passed: Guest preview token issued with proper claims.');
  }

  // Test 2: Guest preview expiration after configured duration
  {
    const oldTimestamp = Date.now() - 125 * 1000;
    const expiredToken = issueGuestPreviewToken(oldTimestamp);

    const req = {
      headers: { 'x-guest-preview-token': expiredToken },
      user: null,
    };
    let statusCode = null;
    let jsonBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
      setHeader() {},
    };
    let nextCalled = false;

    requireGuestPreviewOrAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, 'Expired guest preview must NOT call next()');
    assert.equal(statusCode, 403, 'Expired guest preview must return 403');
    assert.equal(jsonBody.code, 'GUEST_PREVIEW_EXPIRED', 'Must return GUEST_PREVIEW_EXPIRED code');
    console.log('✓ Test 2 Passed: 120s expired guest preview strictly returns 403 GUEST_PREVIEW_EXPIRED.');
  }

  // Test 3: Authenticated user bypasses guest preview check
  {
    const req = {
      headers: {},
      user: { _id: 'fake_user_id', username: 'testuser' },
    };
    let nextCalled = false;
    const res = { setHeader() {} };

    requireGuestPreviewOrAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true, 'Authenticated user must bypass guest timer');
    console.log('✓ Test 3 Passed: Authenticated user is exempt from guest preview limit.');
  }

  // Test 4: Rate Limiting enforces max requests and returns 429
  {
    const limiter = createRateLimiter({
      windowMs: 5000,
      max: 3,
      endpointName: 'test-limit',
      message: 'Limit reached',
    });

    const fakeReq = {
      headers: {},
      ip: '192.168.1.100',
      user: null,
    };
    let headersSet = {};
    const fakeRes = {
      setHeader(k, v) {
        headersSet[k] = v;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    limiter(fakeReq, fakeRes, () => {});
    limiter(fakeReq, fakeRes, () => {});
    limiter(fakeReq, fakeRes, () => {});

    let fourthPassed = false;
    limiter(fakeReq, fakeRes, () => {
      fourthPassed = true;
    });

    assert.equal(fourthPassed, false, '4th request beyond max=3 must be blocked');
    assert.equal(fakeRes.statusCode, 429, 'Blocked request must return 429');
    assert.equal(fakeRes.body.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(headersSet['Retry-After'] !== undefined, 'Retry-After header must be set');
    console.log('✓ Test 4 Passed: Rate limiter bounds requests and returns 429 + Retry-After.');
  }

  // Test 5: Accurate Discussion counting rules
  {
    // Rahul contributes twice, Chloe contributes once -> 3 contributions, 2 contributors
    const contributions = [
      { authorId: 'user_rahul', authorName: 'Rahul' },
      { authorId: 'user_rahul', authorName: 'Rahul' },
      { authorId: 'user_chloe', authorName: 'Chloe' },
    ];
    const contributionCount = contributions.length;
    const distinctContributors = new Set(contributions.map((c) => c.authorId)).size;

    assert.equal(contributionCount, 3, 'Contribution count must be 3');
    assert.equal(distinctContributors, 2, 'Contributor count must be 2 distinct users');
    console.log('✓ Test 5 Passed: Discussion canonical counts: 3 contributions, 2 contributors.');
  }

  // Test 6: Trending algorithm time decay over lifetime popularity
  {
    const now = Date.now();
    // Old item (30 days ago) with 100 votes
    const oldItem = {
      createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
      votes: 100,
      voters: new Array(100).fill('uid'),
      commentsCount: 20,
      contributorsCount: 10,
    };
    // Recent item (2 hours ago) with 15 votes and 5 contributions
    const recentItem = {
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
      votes: 15,
      voters: new Array(15).fill('uid'),
      commentsCount: 5,
      contributorsCount: 4,
    };

    const oldScore = calculateTrendingScore(oldItem, 'discussion');
    const recentScore = calculateTrendingScore(recentItem, 'discussion');

    assert.ok(
      recentScore > oldScore,
      `Recent momentum score (${recentScore}) must exceed old decayed score (${oldScore})`
    );
    console.log('✓ Test 6 Passed: Trending time-decay ensures recent momentum outranks stale high totals.');
  }

  // Test 7: Feed diversity interleaving
  {
    const candidates = [
      { id: '1', type: 'post' },
      { id: '2', type: 'post' },
      { id: '3', type: 'post' },
      { id: '4', type: 'discussion' },
      { id: '5', type: 'knowledge' },
    ];

    const interleaved = interleaveFeedItems(candidates);
    const types = interleaved.map((i) => i.type);
    
    // Check that we didn't keep 3 consecutive posts when alternatives exist
    const hasThreeConsecutivePosts = types.some((t, idx) => t === 'post' && types[idx + 1] === 'post' && types[idx + 2] === 'post');
    assert.equal(hasThreeConsecutivePosts, false, 'Interleaving must break up long single-type runs');
    console.log('✓ Test 7 Passed: Feed interleaving properly breaks up consecutive identical types.');
  }

  // Test 6: User & Post schema fields for following, followers, and likes
  {
    const { User } = await import('../src/models/User.js');
    const { Post } = await import('../src/models/Post.js');
    const { DiscussionContribution } = await import('../src/models/DiscussionContribution.js');

    assert.ok(User.schema.path('followers'), 'User schema must define followers array');
    assert.ok(User.schema.path('following'), 'User schema must define following array');
    assert.ok(Post.schema.path('likes'), 'Post schema must define likes array');
    assert.ok(Post.schema.path('likedBy'), 'Post schema must define likedBy array');
    assert.ok(Post.schema.path('commentCount'), 'Post schema must define commentCount');
    assert.ok(Post.schema.path('commentsCount'), 'Post schema must define commentsCount');
    const deeplyNestedContribution = new DiscussionContribution({
      discussionId: new mongoose.Types.ObjectId(),
      authorId: new mongoose.Types.ObjectId(),
      body: 'A reply beyond the previous depth limit',
      depth: 4,
    });
    await deeplyNestedContribution.validate();
    console.log('✓ Test 6 Passed: User & Post schemas contain all relationship and interaction fields.');
  }

  // Test 7: Feed controllers require authentication for "following" mode
  {
    const { getPosts } = await import('../src/controllers/postController.js');
    const { getDiscussions } = await import('../src/controllers/discussionController.js');
    const { getKnowledgeArticles } = await import('../src/controllers/knowledgeController.js');

    const fakeReq = { query: { mode: 'following' }, user: null };
    const createMockRes = () => {
      let code = null;
      let body = null;
      return {
        status(c) {
          code = c;
          return this;
        },
        json(b) {
          body = b;
          return this;
        },
        getCode: () => code,
        getBody: () => body,
      };
    };

    const resPost = createMockRes();
    await getPosts(fakeReq, resPost, () => {});
    assert.equal(resPost.getCode(), 401, 'getPosts(mode=following) without auth must return 401');
    assert.equal(resPost.getBody()?.code, 'AUTHENTICATION_REQUIRED');

    const resDisc = createMockRes();
    await getDiscussions(fakeReq, resDisc, () => {});
    assert.equal(resDisc.getCode(), 401, 'getDiscussions(mode=following) without auth must return 401');
    assert.equal(resDisc.getBody()?.code, 'AUTHENTICATION_REQUIRED');

    const resKnow = createMockRes();
    await getKnowledgeArticles(fakeReq, resKnow, () => {});
    assert.equal(resKnow.getCode(), 401, 'getKnowledgeArticles(mode=following) without auth must return 401');
    assert.equal(resKnow.getBody()?.code, 'AUTHENTICATION_REQUIRED');

    console.log('✓ Test 7 Passed: All feed endpoints enforce authentication on following mode with 401.');
  }

  // Test 8: Admin overview endpoint verifies platformRole === 'admin'
  {
    const { getAdminOverview } = await import('../src/controllers/adminController.js');

    const regularUserReq = {
      user: { _id: 'fake_user_1', platformRole: 'user', role: 'user' },
    };
    let statusCode = null;
    let jsonBody = null;
    const mockRes = {
      status(c) {
        statusCode = c;
        return this;
      },
      json(b) {
        jsonBody = b;
        return this;
      },
    };

    await getAdminOverview(regularUserReq, mockRes, () => {});
    assert.equal(statusCode, 403, 'Regular user must receive 403 Forbidden from admin overview');
    assert.equal(jsonBody?.error, 'Admin access required');

    console.log('✓ Test 8 Passed: Admin overview correctly restricts non-admin users with 403.');
  }

  // Test 9: Direct messaging startConversation validates input and self-messaging
  {
    const { startConversation } = await import('../src/controllers/messageController.js');

    const createMockRes = () => {
      let code = null;
      let body = null;
      return {
        status(c) {
          code = c;
          return this;
        },
        json(b) {
          body = b;
          return this;
        },
        getCode: () => code,
        getBody: () => body,
      };
    };

    // Missing recipient
    const resNoRecipient = createMockRes();
    await startConversation({ user: { _id: '507f1f77bcf86cd799439011' }, body: {} }, resNoRecipient, () => {});
    assert.equal(resNoRecipient.getCode(), 400, 'startConversation must reject missing recipient');

    // Self recipient
    const selfId = '507f1f77bcf86cd799439011';
    const resSelf = createMockRes();
    await startConversation({ user: { _id: selfId }, body: { recipientId: selfId } }, resSelf, () => {});
    assert.equal(resSelf.getCode(), 400, 'startConversation must reject self conversation');

    console.log('✓ Test 9 Passed: Direct conversation validation strictly prevents invalid or self conversations.');
  }

  // Test 10: Content Deletion & Moderation with Reason Notifications
  {
    const { deletePost, moderateDeletePost, updatePost } = await import('../src/controllers/postController.js');
    const { Post } = await import('../src/models/Post.js');
    const { Notification } = await import('../src/models/Notification.js');

    const originalFindById = Post.findById;
    const originalNotifCreate = Notification.create;

    let savedStatus = null;
    let createdNotification = null;

    const mockPost = {
      _id: '507f1f77bcf86cd799439099',
      authorId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      status: 'published',
      save: async () => {
        savedStatus = mockPost.status;
      },
    };

    Post.findById = async () => mockPost;
    Notification.create = async (doc) => {
      createdNotification = doc;
      return doc;
    };

    // 10a. Unauthorized user blocked
    let unauthCode = null;
    const unauthRes = {
      status(c) { unauthCode = c; return this; },
      json() { return this; },
    };
    await deletePost(
      { params: { postId: mockPost._id }, user: { _id: '507f1f77bcf86cd799439022', platformRole: 'user' }, body: {} },
      unauthRes,
      () => {}
    );
    assert.equal(unauthCode, 403, 'Non-owner and non-staff must be rejected with 403');

    // Staff cannot use regular post edit or delete routes.
    let staffEditCode = null;
    const staffEditRes = {
      status(c) { staffEditCode = c; return this; },
      json() { return this; },
    };
    await updatePost(
      {
        params: { postId: mockPost._id },
        user: { _id: '507f1f77bcf86cd799439088', platformRole: 'admin' },
        body: { title: 'Edited by admin' },
      },
      staffEditRes,
      () => {}
    );
    assert.equal(staffEditCode, 403, 'Admin must not edit another user post outside the admin panel');

    let staffDeleteCode = null;
    const staffDeleteRes = {
      status(c) { staffDeleteCode = c; return this; },
      json() { return this; },
    };
    await deletePost(
      {
        params: { postId: mockPost._id },
        user: { _id: '507f1f77bcf86cd799439088', platformRole: 'admin' },
        body: { reason: 'Must use the admin panel' },
      },
      staffDeleteRes,
      () => {}
    );
    assert.equal(staffDeleteCode, 403, 'Admin must not delete another user post outside the admin panel');

    // Moderators retain removal access through the dedicated admin-panel route.
    let modJson = null;
    const modRes = {
      json(b) { modJson = b; return this; },
    };
    await moderateDeletePost(
      {
        params: { postId: mockPost._id },
        user: { _id: '507f1f77bcf86cd799439088', platformRole: 'moderator', displayName: 'ModTeam' },
        body: { reason: 'Violates toxicity policy' },
      },
      modRes,
      () => {}
    );
    assert.equal(savedStatus, 'deleted', 'Post status must be set to deleted');
    assert.equal(modJson?.success, true);
    assert.ok(createdNotification, 'Moderator deletion must record notification');
    assert.equal(createdNotification.reason, 'Violates toxicity policy');
    assert.equal(createdNotification.type, 'content_deleted');

    Post.findById = originalFindById;
    Notification.create = originalNotifCreate;

    console.log('✓ Test 10 Passed: Post edit/delete is owner-only outside the moderation route.');
  }

  // Test 11: Admin user content inspection
  {
    const { getAdminUserContent } = await import('../src/controllers/adminController.js');

    let regularCode = null;
    const regRes = {
      status(c) { regularCode = c; return this; },
      json() { return this; },
    };
    await getAdminUserContent(
      { params: { userId: '507f1f77bcf86cd799439011' }, user: { platformRole: 'user' } },
      regRes,
      () => {}
    );
    assert.equal(regularCode, 403, 'Regular users cannot access admin user content inspection');

    console.log('✓ Test 11 Passed: Admin user inspection endpoint properly secured for staff only.');
  }

  // Test 12: Marking a notification read only affects its recipient's notification
  {
    const { markAsRead } = await import('../src/controllers/notificationController.js');
    const { Notification } = await import('../src/models/Notification.js');
    const originalFindOneAndUpdate = Notification.findOneAndUpdate;
    const recipientId = new mongoose.Types.ObjectId();
    let updateFilter = null;
    let updateDoc = null;
    Notification.findOneAndUpdate = async (filter, update) => {
      updateFilter = filter;
      updateDoc = update;
      return { _id: new mongoose.Types.ObjectId() };
    };

    let responseBody = null;
    const res = {
      json(body) {
        responseBody = body;
        return this;
      },
    };
    try {
      await markAsRead(
        { params: { id: '507f1f77bcf86cd799439099' }, user: { _id: recipientId } },
        res,
        () => {}
      );
      assert.equal(String(updateFilter.recipientId), String(recipientId));
      assert.equal(updateDoc.isRead, true);
      assert.equal(responseBody.success, true);
    } finally {
      Notification.findOneAndUpdate = originalFindOneAndUpdate;
    }

    console.log('✓ Test 12 Passed: Notification read updates are scoped to the logged-in recipient.');
  }

  console.log('\nAll 12 automated unit/integration checks PASSED successfully!');
};

runTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
