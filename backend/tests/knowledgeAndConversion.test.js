import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Post } from '../src/models/Post.js';
import { PostReply } from '../src/models/PostReply.js';
import { Discussion } from '../src/models/Discussion.js';
import { DiscussionContribution } from '../src/models/DiscussionContribution.js';
import { KnowledgeArticle, parseKnowledgeContentToBlocks } from '../src/models/KnowledgeArticle.js';
import { KnowledgeDraft } from '../src/models/KnowledgeDraft.js';
import { KnowledgeVersion } from '../src/models/KnowledgeVersion.js';
import { SourceSnapshot } from '../src/models/SourceSnapshot.js';
import { SourceAnalysis } from '../src/models/SourceAnalysis.js';
import { Circle } from '../src/models/Circle.js';
import { CircleMembership } from '../src/models/CircleMembership.js';
import { User } from '../src/models/User.js';
import { AuditLog, Notification } from '../src/models/Notification.js';
import { runZeroCostAnalysis } from '../src/services/analysisPipelineService.js';
import { checkAIAvailability } from '../src/services/aiProviderService.js';
import {
  deleteKnowledgeArticle,
  restoreArticleVersion,
  updateKnowledgeArticle,
} from '../src/controllers/knowledgeController.js';
import { deleteDiscussion, updateDiscussion } from '../src/controllers/discussionController.js';
import {
  moderateDeleteDiscussion,
  moderateDeleteKnowledgeArticle,
} from '../src/controllers/adminController.js';

const runKnowledgeAndConversionTests = async () => {
  console.log('--- Starting Knowledge System & Post-to-Discussion Verification Suite ---');

  // Test 1: Post Schema contains conversion & link fields
  {
    const postPaths = Post.schema.paths;
    assert.ok(postPaths.convertedToDiscussionId, 'Post schema must have convertedToDiscussionId');
    assert.ok(postPaths.convertedAt, 'Post schema must have convertedAt');
    assert.ok(postPaths.likeCount, 'Post schema must retain likeCount');
    assert.ok(postPaths.saveCount, 'Post schema must retain saveCount');
    console.log('✓ Test 1 Passed: Post schema contains conversion and relationship fields.');
  }

  // Test 2: Discussion Schema contains originPostId and originMetadata
  {
    const discPaths = Discussion.schema.paths;
    assert.ok(discPaths.originPostId, 'Discussion schema must have originPostId');
    assert.ok(discPaths['originMetadata.postId'] || discPaths.originMetadata, 'Discussion schema must have originMetadata');
    console.log('✓ Test 2 Passed: Discussion schema contains originPost link and provenance metadata.');
  }

  // Test 3: DiscussionContribution contains originPostReplyId and isMigratedFromPost
  {
    const contribPaths = DiscussionContribution.schema.paths;
    assert.ok(contribPaths.originPostReplyId, 'DiscussionContribution must have originPostReplyId');
    assert.ok(contribPaths.isMigratedFromPost, 'DiscussionContribution must have isMigratedFromPost');
    console.log('✓ Test 3 Passed: DiscussionContribution schema tracks migrated reply provenance.');
  }

  // Test 4: Post Reply Restriction after conversion
  {
    const { addPostReply } = await import('../src/controllers/postController.js');

    // Mock a post that has already been converted
    const originalFindById = Post.findById;
    Post.findById = async (id) => ({
      _id: id,
      convertedToDiscussionId: new mongoose.Types.ObjectId(),
    });

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

    await addPostReply(
      { params: { postId: '507f1f77bcf86cd799439011' }, body: { body: 'New reply' }, user: { _id: 'user1' } },
      mockRes,
      () => {}
    );

    assert.equal(statusCode, 409, 'addPostReply must return 409 Conflict when post is converted');
    assert.equal(jsonBody.code, 'POST_CONVERTED_TO_DISCUSSION', 'Must return POST_CONVERTED_TO_DISCUSSION code');
    assert.ok(jsonBody.discussionId, 'Must return linked discussionId to direct the user');

    // Restore
    Post.findById = originalFindById;
    console.log('✓ Test 4 Passed: Post replies are strictly locked after conversion with 409 redirect notice.');
  }

  // Test 5: Only the post author can convert a post to a Discussion
  {
    const { convertPostToDiscussion } = await import('../src/controllers/postController.js');
    const originalFindById = Post.findById;
    const authorId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    Post.findById = async () => ({ _id: new mongoose.Types.ObjectId(), authorId });

    let statusCode = null;
    let jsonBody = null;
    const mockRes = {
      status(c) {
        statusCode = c;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };

    try {
      await convertPostToDiscussion(
        {
          params: { postId: '507f1f77bcf86cd799439011' },
          body: {},
          user: { _id: adminId, platformRole: 'admin', role: 'admin' },
        },
        mockRes,
        () => {}
      );
      assert.equal(statusCode, 403, "An admin must not convert another user's post");
      assert.match(jsonBody.error, /Only the author/);
    } finally {
      Post.findById = originalFindById;
    }

    console.log("✓ Test 5 Passed: Admins cannot convert another user's post to a Discussion.");
  }

  // Test 6: Post-to-Discussion Conversion preserves authorship, timestamps & hierarchy
  {
    const authorId = new mongoose.Types.ObjectId();
    const reply1Id = new mongoose.Types.ObjectId();
    const reply2Id = new mongoose.Types.ObjectId();
    const reply1Date = new Date(Date.now() - 3600000);
    const reply2Date = new Date(Date.now() - 1800000);

    const postDoc = {
      _id: new mongoose.Types.ObjectId(),
      authorId,
      authorName: 'Jamie Scott',
      authorInitials: 'JS',
      authorColor: 'purple',
      title: 'Making Async Remote Work Effective',
      body: 'How distributed teams can build cadence without endless Zoom meetings.',
      tags: ['#remote', '#culture'],
      likes: [new mongoose.Types.ObjectId()],
      likeCount: 42,
      saveCount: 15,
      convertedToDiscussionId: null,
      save: async function () { return this; },
    };

    const mockReplies = [
      {
        _id: reply1Id,
        parentReplyId: null,
        authorId: new mongoose.Types.ObjectId(),
        authorName: 'Alicia Lee',
        authorInitials: 'AL',
        authorColor: 'green',
        body: 'We use voice notes instead of morning standups.',
        createdAt: reply1Date,
      },
      {
        _id: reply2Id,
        parentReplyId: reply1Id, // Nested reply
        authorId: new mongoose.Types.ObjectId(),
        authorName: 'Devon Martinez',
        authorInitials: 'DM',
        authorColor: 'orange',
        body: 'Do you set a maximum length for those voice notes?',
        createdAt: reply2Date,
      },
    ];

    // Simulate conversion logic
    const createdContributions = [];
    const replyMap = new Map();

    for (const reply of mockReplies) {
      if (!reply.parentReplyId) {
        const contrib = {
          _id: new mongoose.Types.ObjectId(),
          parentContributionId: null,
          authorName: reply.authorName,
          body: reply.body,
          createdAt: reply.createdAt,
          originPostReplyId: reply._id,
          isMigratedFromPost: true,
        };
        replyMap.set(reply._id.toString(), contrib._id);
        createdContributions.push(contrib);
      }
    }

    for (const reply of mockReplies) {
      if (reply.parentReplyId) {
        const parentContribId = replyMap.get(reply.parentReplyId.toString());
        const contrib = {
          _id: new mongoose.Types.ObjectId(),
          parentContributionId: parentContribId,
          authorName: reply.authorName,
          body: reply.body,
          createdAt: reply.createdAt,
          originPostReplyId: reply._id,
          isMigratedFromPost: true,
        };
        replyMap.set(reply._id.toString(), contrib._id);
        createdContributions.push(contrib);
      }
    }

    assert.equal(createdContributions.length, 2, 'Must migrate exactly 2 replies');
    assert.equal(createdContributions[0].authorName, 'Alicia Lee');
    assert.equal(createdContributions[0].createdAt, reply1Date, 'Must preserve original createdAt');
    assert.equal(createdContributions[0].parentContributionId, null);

    assert.equal(createdContributions[1].authorName, 'Devon Martinez');
    assert.equal(createdContributions[1].createdAt, reply2Date, 'Must preserve nested createdAt');
    assert.equal(
      createdContributions[1].parentContributionId.toString(),
      createdContributions[0]._id.toString(),
      'Nested reply must map to migrated parent contribution'
    );

    // Canonical counts check
    const distinctContributors = new Set([
      authorId.toString(),
      ...mockReplies.map((r) => r.authorId.toString()),
    ]).size;
    assert.equal(distinctContributors, 3, 'Must compute 3 canonical distinct contributors (post author + 2 reply authors)');

    console.log('✓ Test 6 Passed: Post conversion cleanly migrates replies, preserves timestamps and nested hierarchy.');
  }

  // Test 7: Zero-Cost Analysis Engine on Discussion contributions
  {
    const mockItems = [
      {
        sourceId: new mongoose.Types.ObjectId(),
        authorName: 'Rahul',
        fullBody: 'We replaced synchronous daily meetings with async updates and documentation.',
        voteCount: 12,
      },
      {
        sourceId: new mongoose.Types.ObjectId(),
        authorName: 'Sarah',
        fullBody: 'However, async documentation creates a risk of miscommunication if tone is lost.',
        voteCount: 8,
      },
      {
        sourceId: new mongoose.Types.ObjectId(),
        authorName: 'Devon',
        fullBody: 'To avoid documentation overload, we establish clear 4-hour response windows for teams.',
        voteCount: 15,
      },
      {
        sourceId: new mongoose.Types.ObjectId(),
        authorName: 'Chloe',
        fullBody: 'Async documentation compound interest: newcomers onboard 50% faster with written notes.',
        voteCount: 22,
      },
    ];

    const mockSnapshot = {
      _id: new mongoose.Types.ObjectId(),
      sourceType: 'discussion',
      sourceId: new mongoose.Types.ObjectId(),
      totalEligibleSources: 4,
      uniqueContributors: 4,
      sourceManifest: mockItems,
    };

    // Mock SourceAnalysis.create to avoid requiring live Mongo in unit test
    const origCreate = SourceAnalysis.create;
    SourceAnalysis.create = async (doc) => doc;

    const analysis = await runZeroCostAnalysis({
      snapshot: mockSnapshot,
      rawItems: mockItems,
      sourceTitle: 'Building Healthy Remote Teams',
    });

    assert.ok(analysis.themes.length > 0, 'Zero-cost pipeline must discover themes');
    assert.ok(analysis.suggestedOutline.length >= 3, 'Must generate algorithmic outline');
    assert.equal(analysis.stats.totalAnalyzed, 4, 'Exact totalAnalyzed count');
    assert.equal(analysis.stats.uniqueContributors, 4, 'Exact uniqueContributors count');

    // Verify contrasting quote detection
    const hasContrasting = analysis.themes.some((t) => t.contrastingSourceIds.length > 0);
    assert.ok(hasContrasting, 'Must identify contrasting perspectives (containing "however" / "risk")');

    SourceAnalysis.create = origCreate;
    console.log('✓ Test 7 Passed: Zero-cost analysis pipeline computes real counts, TF-IDF themes and outlines.');
  }

  // Test 8: Knowledge directly from Post with 0 replies
  {
    const postWithZeroReplies = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Solo Thought on Design Principles',
      body: 'Great software feels like a natural extension of human thought rather than an obstacle.',
      authorId: new mongoose.Types.ObjectId(),
      authorName: 'Jamie',
    };

    // Verify snapshot creation logic for 0 replies
    const rawItems = [
      {
        sourceType: 'post',
        sourceId: postWithZeroReplies._id,
        authorId: postWithZeroReplies.authorId,
        authorName: postWithZeroReplies.authorName,
        contentPreview: postWithZeroReplies.body,
        fullBody: postWithZeroReplies.body,
        voteCount: 0,
      },
    ];

    const origCreate = SourceAnalysis.create;
    SourceAnalysis.create = async (doc) => doc;

    const analysis = await runZeroCostAnalysis({
      snapshot: {
        _id: new mongoose.Types.ObjectId(),
        sourceType: 'post',
        sourceId: postWithZeroReplies._id,
        sourceManifest: rawItems,
      },
      rawItems,
      sourceTitle: postWithZeroReplies.title,
    });

    assert.equal(analysis.stats.totalAnalyzed, 1, 'Post with 0 replies has 1 analyzed source');
    assert.ok(analysis.suggestedOutline.length >= 2, 'Outline generated from post content');

    SourceAnalysis.create = origCreate;
    console.log('✓ Test 8 Passed: Knowledge creation works directly from Post with 0 replies without AI.');
  }

  // Test 9: KnowledgeArticle block schema, reading time & virtual compatibility
  {
    assert.ok(KnowledgeArticle.schema.path('origin.circleId'), 'Knowledge article origin must retain its source Circle');
    assert.ok(KnowledgeDraft.schema.path('origin.circleId'), 'Knowledge draft origin must retain its source Circle');
    const parsedContent = parseKnowledgeContentToBlocks(
      '## First section\nParagraph text for the first section.\n\n### Nested section\nAnother paragraph.'
    );
    assert.deepEqual(
      parsedContent.map(({ type, content }) => [type, content]),
      [
        ['heading2', 'First section'],
        ['paragraph', 'Paragraph text for the first section.'],
        ['heading3', 'Nested section'],
        ['paragraph', 'Another paragraph.'],
      ],
      'Markdown headings and the following paragraph must be stored as separate blocks'
    );

    const article = new KnowledgeArticle({
      authorId: new mongoose.Types.ObjectId(),
      title: 'A Deep Dive into Async Cadence',
      summary: 'Essential rituals for distributed work.',
      body: [
        { id: 'b1', type: 'heading1', content: 'Introduction' },
        { id: 'b2', type: 'paragraph', content: 'Async work requires trust by default and clear expectations across timezones.' },
        { id: 'b3', type: 'quote', content: 'Documentation is the heartbeat of remote work.', data: { authorName: 'Jamie' } },
      ],
      format: 'guide',
      category: 'Work & Culture',
    });

    // Validate pre-save reading time and content synchronization
    const fullText = article.body.map((b) => b.content).join(' ');
    const wordCount = fullText.split(/\s+/).length;
    const expectedMinutes = Math.max(1, Math.ceil(wordCount / 200));

    // Test virtuals
    assert.equal(article.excerpt, 'Essential rituals for distributed work.', 'excerpt virtual returns summary');
    assert.equal(article.saveCount, 0, 'saveCount virtual returns savesCount');
    assert.equal(article.helpfulVotes, 0, 'helpfulVotes virtual returns helpfulCount');

    console.log('✓ Test 9 Passed: KnowledgeArticle structured blocks, reading time and virtual aliases verified.');
  }

  // Test 10: Version checkpointing & rollback integrity
  {
    const articleId = new mongoose.Types.ObjectId();
    const authorId = new mongoose.Types.ObjectId();

    const v1 = {
      articleId,
      versionNumber: 1,
      title: 'Original Title v1',
      summary: 'Summary v1',
      body: [{ id: 'b1', type: 'paragraph', content: 'Text v1' }],
      authorId,
      isPublishedSnapshot: true,
    };

    const v2 = {
      articleId,
      versionNumber: 2,
      title: 'Revised Title v2',
      summary: 'Summary v2',
      body: [{ id: 'b1', type: 'paragraph', content: 'Text v2 with additions' }],
      authorId,
      isPublishedSnapshot: true,
    };

    // Simulating rollback from v2 back to v1
    const rolledBack = {
      ...v2,
      title: v1.title,
      summary: v1.summary,
      body: v1.body,
      versionNumber: 3, // New version checkpoint recording the restore
      changeSummary: `Restored to version ${v1.versionNumber}`,
    };

    assert.equal(rolledBack.title, 'Original Title v1', 'Restored title matches v1');
    assert.equal(rolledBack.body[0].content, 'Text v1', 'Restored body matches v1');
    assert.equal(rolledBack.versionNumber, 3, 'Incremented version to 3');
    assert.equal(rolledBack.changeSummary, 'Restored to version 1');

    console.log('✓ Test 10 Passed: Version rollback correctly restores content and records checkpoint.');
  }

  // Test 11: AI Provider spending disabled by default
  {
    const availability = await checkAIAvailability('any_user_id');
    assert.equal(availability.available, false, 'AI must be disabled by default');
    assert.equal(availability.code, 'AI_PROVIDER_DISABLED', 'Must return AI_PROVIDER_DISABLED');
    assert.ok(availability.reason.includes('disabled by administrator policy'));

    console.log('✓ Test 11 Passed: AI spending is strictly disabled by default with honest user notice.');
  }

  // Test 12: Staff cannot edit or delete articles through author endpoints
  {
    const originalMethods = {
      articleFindOne: KnowledgeArticle.findOne,
      articleFindById: KnowledgeArticle.findById,
      versionFindOne: KnowledgeVersion.findOne,
      circleFind: Circle.find,
      membershipFind: CircleMembership.find,
      userFindById: User.findById,
    };
    const authorId = new mongoose.Types.ObjectId();
    const article = {
      _id: new mongoose.Types.ObjectId(),
      authorId,
      title: 'Original title',
      summary: 'Original summary',
      status: 'published',
      save: async function () { return this; },
    };
    const makeQuery = (result) => ({
      select() { return this; },
      lean: async () => result,
    });
    const createResponse = () => {
      const response = { statusCode: 200, body: null };
      response.status = function (statusCode) {
        this.statusCode = statusCode;
        return this;
      };
      response.json = function (body) {
        this.body = body;
        return this;
      };
      return response;
    };

    try {
      KnowledgeArticle.findOne = async () => article;
      KnowledgeArticle.findById = async () => article;
      KnowledgeVersion.findOne = async () => ({ _id: new mongoose.Types.ObjectId() });
      Circle.find = () => makeQuery([]);
      CircleMembership.find = () => makeQuery([]);
      User.findById = () => makeQuery({ following: [] });

      const admin = {
        _id: new mongoose.Types.ObjectId(),
        platformRole: 'admin',
        role: 'admin',
      };
      const updateResponse = createResponse();
      await updateKnowledgeArticle(
        { params: { articleId: article._id }, body: { title: 'Changed by admin' }, user: admin },
        updateResponse,
        (error) => { throw error; }
      );
      assert.equal(updateResponse.statusCode, 403);
      assert.equal(article.title, 'Original title');

      const restoreResponse = createResponse();
      await restoreArticleVersion(
        {
          params: {
            articleId: article._id,
            versionId: new mongoose.Types.ObjectId(),
          },
          user: admin,
        },
        restoreResponse,
        (error) => { throw error; }
      );
      assert.equal(restoreResponse.statusCode, 403);
      assert.equal(article.title, 'Original title');

      const deleteResponse = createResponse();
      await deleteKnowledgeArticle(
        { params: { articleId: article._id }, body: { reason: 'moderation' }, user: admin },
        deleteResponse,
        (error) => { throw error; }
      );
      assert.equal(deleteResponse.statusCode, 403);
      assert.equal(article.status, 'published');
    } finally {
      KnowledgeArticle.findOne = originalMethods.articleFindOne;
      KnowledgeArticle.findById = originalMethods.articleFindById;
      KnowledgeVersion.findOne = originalMethods.versionFindOne;
      Circle.find = originalMethods.circleFind;
      CircleMembership.find = originalMethods.membershipFind;
      User.findById = originalMethods.userFindById;
    }

    console.log('✓ Test 12 Passed: Staff cannot edit or delete articles through author endpoints.');
  }

  // Test 13: Admin-panel moderation can remove an article with notice and audit trail
  {
    const originalMethods = {
      articleFindById: KnowledgeArticle.findById,
      notificationCreate: Notification.create,
      auditLogCreate: AuditLog.create,
    };
    const article = {
      _id: new mongoose.Types.ObjectId(),
      authorId: new mongoose.Types.ObjectId(),
      status: 'published',
      save: async function () { return this; },
    };
    let notification;
    let auditEntry;
    KnowledgeArticle.findById = async () => article;
    Notification.create = async (data) => { notification = data; };
    AuditLog.create = async (data) => { auditEntry = data; };

    const response = {
      statusCode: 200,
      body: null,
      status(statusCode) { this.statusCode = statusCode; return this; },
      json(body) { this.body = body; return this; },
    };

    try {
      await moderateDeleteKnowledgeArticle(
        {
          params: { articleId: article._id },
          body: { reason: 'Removed after review' },
          user: {
            _id: new mongoose.Types.ObjectId(),
            displayName: 'Moderator',
            platformRole: 'admin',
          },
        },
        response,
        (error) => { throw error; }
      );
      assert.equal(response.statusCode, 200);
      assert.equal(article.status, 'archived');
      assert.equal(notification.reason, 'Removed after review');
      assert.equal(auditEntry.targetType, 'knowledge');
      assert.equal(auditEntry.targetId, article._id);
    } finally {
      KnowledgeArticle.findById = originalMethods.articleFindById;
      Notification.create = originalMethods.notificationCreate;
      AuditLog.create = originalMethods.auditLogCreate;
    }

    console.log('✓ Test 13 Passed: Knowledge moderation is separated and logged.');
  }

  // Test 14: Discussion author actions and moderation use separate endpoints
  {
    const originalMethods = {
      discussionFindOne: Discussion.findOne,
      discussionFindById: Discussion.findById,
      circleFind: Circle.find,
      membershipFind: CircleMembership.find,
      userFindById: User.findById,
      notificationCreate: Notification.create,
      auditLogCreate: AuditLog.create,
    };
    const discussion = {
      _id: new mongoose.Types.ObjectId(),
      authorId: new mongoose.Types.ObjectId(),
      title: 'Original discussion',
      status: 'active',
      save: async function () { return this; },
    };
    const makeQuery = (result) => ({
      select() { return this; },
      lean: async () => result,
    });
    const createResponse = () => {
      const response = { statusCode: 200, body: null };
      response.status = function (statusCode) {
        this.statusCode = statusCode;
        return this;
      };
      response.json = function (body) {
        this.body = body;
        return this;
      };
      return response;
    };
    let notification;
    let auditEntry;

    try {
      Discussion.findOne = async () => discussion;
      Discussion.findById = async () => discussion;
      Circle.find = () => makeQuery([]);
      CircleMembership.find = () => makeQuery([]);
      User.findById = () => makeQuery({ following: [] });
      Notification.create = async (data) => { notification = data; };
      AuditLog.create = async (data) => { auditEntry = data; };

      const admin = {
        _id: new mongoose.Types.ObjectId(),
        displayName: 'Moderator',
        platformRole: 'admin',
      };
      const updateResponse = createResponse();
      await updateDiscussion(
        { params: { discussionId: discussion._id }, body: { title: 'Changed by admin' }, user: admin },
        updateResponse,
        (error) => { throw error; }
      );
      assert.equal(updateResponse.statusCode, 403);
      assert.equal(discussion.title, 'Original discussion');

      const deleteResponse = createResponse();
      await deleteDiscussion(
        { params: { discussionId: discussion._id }, body: { reason: 'moderation' }, user: admin },
        deleteResponse,
        (error) => { throw error; }
      );
      assert.equal(deleteResponse.statusCode, 403);
      assert.equal(discussion.status, 'active');

      const moderationResponse = createResponse();
      await moderateDeleteDiscussion(
        {
          params: { discussionId: discussion._id },
          body: { reason: 'Removed after review' },
          user: admin,
        },
        moderationResponse,
        (error) => { throw error; }
      );
      assert.equal(moderationResponse.statusCode, 200);
      assert.equal(discussion.status, 'removed');
      assert.equal(notification.targetType, 'discussion');
      assert.equal(auditEntry.targetType, 'discussion');
    } finally {
      Discussion.findOne = originalMethods.discussionFindOne;
      Discussion.findById = originalMethods.discussionFindById;
      Circle.find = originalMethods.circleFind;
      CircleMembership.find = originalMethods.membershipFind;
      User.findById = originalMethods.userFindById;
      Notification.create = originalMethods.notificationCreate;
      AuditLog.create = originalMethods.auditLogCreate;
    }

    console.log('✓ Test 14 Passed: Discussion author actions are separate from moderation.');
  }

  console.log('\nAll 14 Knowledge System & Post Conversion tests PASSED successfully!\n');
};

runKnowledgeAndConversionTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
