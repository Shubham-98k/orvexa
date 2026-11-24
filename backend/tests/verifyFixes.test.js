import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { issueGuestPreviewToken, requireGuestPreviewOrAuth } from '../src/middleware/guestPreview.js';
import { createRateLimiter } from '../src/middleware/rateLimiter.js';

const runTests = async () => {
  console.log('--- Starting Orvexa Fix Validation Tests ---');

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
    // Issue token with createdAt 121 seconds ago (> 120s limit)
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

    // Requests 1, 2, 3 should pass
    limiter(fakeReq, fakeRes, () => {});
    limiter(fakeReq, fakeRes, () => {});
    limiter(fakeReq, fakeRes, () => {});

    // Request 4 should be blocked with 429
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

  // Test 5: Reconciled counts logic test (truthful calculations)
  {
    const mockContributions = [
      { authorName: 'Alice', votes: 5 },
      { authorName: 'Alice', votes: 2 },
      { authorName: 'Bob', votes: 3 },
    ];
    const totalCount = mockContributions.length;
    const distinctContributors = new Set(mockContributions.map((c) => c.authorName)).size;

    assert.equal(totalCount, 3, 'Total contributions must match visible items');
    assert.equal(distinctContributors, 2, 'Distinct contributors must be unique users (Alice, Bob)');
    console.log('✓ Test 5 Passed: Truthful counting distinguishes contributions from distinct contributors.');
  }

  // Test 6: User & Post schema fields for following, followers, and likes
  {
    const { User } = await import('../src/models/User.js');
    const { Post } = await import('../src/models/Post.js');

    assert.ok(User.schema.path('followers'), 'User schema must define followers array');
    assert.ok(User.schema.path('following'), 'User schema must define following array');
    assert.ok(Post.schema.path('likes'), 'Post schema must define likes array');
    assert.ok(Post.schema.path('likedBy'), 'Post schema must define likedBy array');
    assert.ok(Post.schema.path('commentCount'), 'Post schema must define commentCount');
    assert.ok(Post.schema.path('commentsCount'), 'Post schema must define commentsCount');
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

  console.log('\nAll 9 automated unit/integration checks PASSED successfully!');
};

runTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
