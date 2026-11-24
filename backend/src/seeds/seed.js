import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Discussion } from '../models/Discussion.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { Circle } from '../models/Circle.js';
import { Notification, Save } from '../models/Notification.js';

export const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('[Seed] Database already seeded.');
      return;
    }

    console.log('[Seed] Seeding Orvexa initial dataset...');

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('orvexa123', salt);

    // 1. Create Users
    const users = await User.create([
      {
        username: 'shubham',
        email: 'shubham@orvexa.io',
        displayName: 'Shubham Pal',
        passwordHash: defaultPasswordHash,
        initials: 'SP',
        avatarColor: 'purple',
        headline: 'Curious mind · Building in public',
        bio: 'Exploring ideas, connecting perspectives and learning from the community.',
        platformRole: 'admin',
        followersCount: 124,
        followingCount: 38,
      },
      {
        username: 'jamie',
        email: 'jamie@orvexa.io',
        displayName: 'Jamie Scott',
        passwordHash: defaultPasswordHash,
        initials: 'JS',
        avatarColor: 'pink',
        headline: 'Culture Architect & Distributed Systems',
        bio: 'Researching rituals and communication patterns for remote teams.',
        platformRole: 'moderator',
        followersCount: 1274,
        followingCount: 82,
      },
      {
        username: 'alicia',
        email: 'alicia@orvexa.io',
        displayName: 'Alicia Lee',
        passwordHash: defaultPasswordHash,
        initials: 'AL',
        avatarColor: 'blue',
        headline: 'Product Designer & Lifelong Learner',
        bio: 'Obsessed with clear typography, intuitive flows and human agency.',
        platformRole: 'user',
        followersCount: 982,
        followingCount: 110,
      },
      {
        username: 'devon',
        email: 'devon@orvexa.io',
        displayName: 'Devon Martinez',
        passwordHash: defaultPasswordHash,
        initials: 'DM',
        avatarColor: 'gold',
        headline: 'Circular Economies & Community Resilience',
        bio: 'Connecting neighborhoods to share resources and collective intelligence.',
        platformRole: 'user',
        followersCount: 876,
        followingCount: 94,
      },
      {
        username: 'sarah',
        email: 'sarah@orvexa.io',
        displayName: 'Sarah Rodriguez',
        passwordHash: defaultPasswordHash,
        initials: 'SR',
        avatarColor: 'purple',
        headline: 'AI Systems & Context Engineering',
        bio: 'Investigating assistive memory, user privacy and proactive agency.',
        platformRole: 'user',
        followersCount: 765,
        followingCount: 45,
      },
      {
        username: 'chloe',
        email: 'chloe@orvexa.io',
        displayName: 'Chloe Patel',
        passwordHash: defaultPasswordHash,
        initials: 'CP',
        avatarColor: 'green',
        headline: 'Operations Thinker & Clarity Advocate',
        bio: 'Helping fast-moving teams cut through noise to find leverage.',
        platformRole: 'user',
        followersCount: 642,
        followingCount: 52,
      },
      {
        username: 'rahul',
        email: 'rahul@orvexa.io',
        displayName: 'Rahul Mehta',
        passwordHash: defaultPasswordHash,
        initials: 'RM',
        avatarColor: 'green',
        headline: 'Organizational Psychologist',
        bio: 'Research-backed practices for deep work and authentic collaboration.',
        platformRole: 'moderator',
        followersCount: 512,
        followingCount: 39,
      },
    ]);

    const shubham = users[0];
    const jamie = users[1];
    const alicia = users[2];
    const devon = users[3];
    const sarah = users[4];
    const chloe = users[5];
    const rahul = users[6];

    // Establish initial following relationships for default user
    shubham.following = [jamie._id, alicia._id, devon._id];
    shubham.followingCount = 3;
    jamie.followers = [shubham._id];
    alicia.followers = [shubham._id];
    devon.followers = [shubham._id];
    await Promise.all([shubham.save(), jamie.save(), alicia.save(), devon.save()]);

    // 2. Create Circles
    const circles = await Circle.create([
      {
        name: 'Design Thinkers',
        slug: 'design-thinkers',
        description: 'A space for people who care about thoughtful, human-centred design.',
        icon: '✧',
        coverTheme: 'c1',
        category: 'Design & UX',
        membersCount: 2400,
        ownerId: alicia._id,
        members: [alicia._id, shubham._id],
      },
      {
        name: 'Future of Work',
        slug: 'future-of-work',
        description: 'Explore how technology and culture are changing the way we work.',
        icon: '⌘',
        coverTheme: 'c2',
        category: 'Work & Culture',
        membersCount: 1800,
        ownerId: jamie._id,
        members: [jamie._id, rahul._id, shubham._id],
      },
      {
        name: 'Curious Minds',
        slug: 'curious-minds',
        description: 'Questions, discoveries and conversations across disciplines.',
        icon: '◉',
        coverTheme: 'c3',
        category: 'Thinking',
        membersCount: 980,
        ownerId: devon._id,
        members: [devon._id, shubham._id],
      },
      {
        name: 'Knowledge Builders',
        slug: 'knowledge-builders',
        description: 'Turn useful discussions into resources people can learn from.',
        icon: '▤',
        coverTheme: 'c4',
        category: 'Learning',
        membersCount: 760,
        ownerId: rahul._id,
        members: [rahul._id, shubham._id],
      },
    ]);

    // 3. Create Posts
    await Post.create([
      {
        authorId: jamie._id,
        authorName: jamie.displayName,
        authorInitials: jamie.initials,
        authorColor: jamie.avatarColor,
        circleName: 'Future of Work',
        circleId: circles[1]._id,
        body: 'I’ve been thinking about how much of remote work is really about the small moments between meetings. A quick check-in, sharing a half-formed thought, or just knowing who’s around can make a huge difference.',
        tags: ['#FutureOfWork', '#RemoteTeams'],
        likeCount: 86,
        likes: [shubham._id],
        likedBy: [shubham._id],
        commentCount: 18,
        commentsCount: 18,
      },
      {
        authorId: alicia._id,
        authorName: alicia.displayName,
        authorInitials: alicia.initials,
        authorColor: alicia.avatarColor,
        body: 'A question for the community: what’s one thing you wish you had learned earlier about giving and receiving feedback?',
        tags: ['#UX', '#Growth'],
        likeCount: 54,
        likes: [],
        likedBy: [],
        commentCount: 22,
        commentsCount: 22,
      },
      {
        authorId: chloe._id,
        authorName: chloe.displayName,
        authorInitials: chloe.initials,
        authorColor: chloe.avatarColor,
        title: 'Clarity over consensus',
        body: 'The best meetings are the ones that make the next step obvious. A small reminder that clarity is often more valuable than another status update.',
        tags: ['#Productivity', '#Leadership'],
        likeCount: 92,
        likes: [],
        likedBy: [],
        commentCount: 12,
        commentsCount: 12,
      },
      {
        authorId: devon._id,
        authorName: devon.displayName,
        authorInitials: devon.initials,
        authorColor: devon.avatarColor,
        title: 'Starting with curiosity',
        body: 'Curiosity is a better starting point than certainty. Especially when you’re trying to solve something with people who see it differently.',
        tags: ['#Collaboration', '#Thinking'],
        likeCount: 68,
        likes: [],
        likedBy: [],
        commentCount: 15,
        commentsCount: 15,
      },
    ]);

    // 4. Create Discussions (Ideas)
    const discussions = await Discussion.create([
      {
        authorId: jamie._id,
        authorName: jamie.displayName,
        authorInitials: jamie.initials,
        authorColor: jamie.avatarColor,
        title: 'How can we make remote work feel less isolating?',
        body: 'Exploring rituals, tools and team habits that help distributed teams feel connected without creating notification fatigue.',
        category: 'Culture',
        status: 'trending',
        votes: 842,
        commentsCount: 43,
        contributorsCount: 24,
      },
      {
        authorId: alicia._id,
        authorName: alicia.displayName,
        authorInitials: alicia.initials,
        authorColor: alicia.avatarColor,
        title: 'A better way to discover what you need to learn',
        body: 'Can we make learning paths feel more personal, practical and community-driven rather than linear syllabi?',
        category: 'UX',
        status: 'open',
        votes: 612,
        commentsCount: 28,
        contributorsCount: 18,
      },
      {
        authorId: devon._id,
        authorName: devon.displayName,
        authorInitials: devon.initials,
        authorColor: devon.avatarColor,
        title: 'Could local communities share unused resources?',
        body: 'A collaborative exploration of neighbourhood sharing, trust, lightweight tool libraries, and circular systems.',
        category: 'Process',
        status: 'under_review',
        votes: 498,
        commentsCount: 31,
        contributorsCount: 16,
      },
      {
        authorId: sarah._id,
        authorName: sarah.displayName,
        authorInitials: sarah.initials,
        authorColor: sarah.avatarColor,
        title: 'What should a truly useful AI assistant remember?',
        body: 'Finding the right balance between helpful persistent context, user privacy, explicit consent, and control.',
        category: 'Engineering',
        status: 'accepted',
        votes: 421,
        commentsCount: 19,
        contributorsCount: 32,
      },
    ]);

    // Add contributions to first discussion
    await DiscussionContribution.create([
      {
        discussionId: discussions[0]._id,
        authorId: rahul._id,
        authorName: rahul.displayName,
        authorInitials: rahul.initials,
        authorColor: rahul.avatarColor,
        body: 'We replaced our morning standup with an asynchronous voice note channel. People listen on their own schedule, and it retains emotional tone without scheduling friction.',
        votes: 38,
      },
      {
        discussionId: discussions[0]._id,
        authorId: chloe._id,
        authorName: chloe.displayName,
        authorInitials: chloe.initials,
        authorColor: chloe.avatarColor,
        body: 'Pair coworking sessions with cameras optional and lo-fi music in the background give that studio feeling without pressure to constantly speak.',
        votes: 27,
      },
    ]);

    // 5. Create Knowledge Articles
    await KnowledgeArticle.create([
      {
        authorId: rahul._id,
        authorName: rahul.displayName,
        authorInitials: rahul.initials,
        authorColor: rahul.avatarColor,
        title: 'A practical guide to building healthy remote teams',
        subtitle: 'Communication, trust and connection in distributed teams',
        summary: 'Research-backed practices for communication, trust and connection in distributed teams.',
        content: `### Executive Summary\nDistributed work fails when it attempts to replicate the physical office through hyper-surveillance or back-to-back video calls. High-performing distributed organizations build deliberate rituals around async documentation, explicit context, and trust by default.\n\n### 1. The Async First Imperative\nWhen synchronous availability is the primary measure of commitment, deep work disappears. Organizations should establish default response windows of 4-6 hours rather than requiring instant replies.\n\n### 2. Rituals of Connection\nConnection in remote environments is either intentional or non-existent. Lightweight practices such as weekly informal showcases and shared reading clubs build social cohesion across timezone barriers.`,
        category: 'Work & Culture',
        readTime: '8 min read',
        source: 'Developed from an Idea',
        sourceDiscussionId: discussions[0]._id,
        contributorsCredited: ['Jamie Scott', 'Rahul Mehta', 'Chloe Patel'],
        savesCount: 128,
        helpfulCount: 64,
        references: [
          { title: 'The Psychology of Virtual Teams', url: 'https://doi.org/example', note: 'Foundational study on async cadence' },
          { title: 'Remote Work Infrastructure Review', url: 'https://example.com/remote-infra', note: 'Field experiments across 40 organizations' }
        ],
      },
      {
        authorId: alicia._id,
        authorName: alicia.displayName,
        authorInitials: alicia.initials,
        authorColor: alicia.avatarColor,
        title: 'How to think clearly when a problem feels complex',
        subtitle: 'A framework for breaking ambiguous problems into smaller, testable questions',
        summary: 'A framework for breaking ambiguous problems into smaller, testable questions.',
        content: `### Deconstructing Ambiguity\nWhen confronted with high ambiguity, the natural impulse is to seek more information. Often, what is needed is not more data, but a structured boundary around the core assumptions.\n\n### The 3-Step Slicing Method\n1. **Isolate the Invariants:** Identify what cannot change under current technical or market constraints.\n2. **Identify Unknown Dependencies:** Map assumptions that have not yet been validated with users.\n3. **Build the Smallest Reversible Probe:** Deploy a lightweight prototype to observe reality before committing large architecture.`,
        category: 'Thinking',
        readTime: '6 min read',
        source: 'Independent article',
        savesCount: 94,
        helpfulCount: 47,
      },
      {
        authorId: jamie._id,
        authorName: jamie.displayName,
        authorInitials: jamie.initials,
        authorColor: jamie.avatarColor,
        title: 'Designing better habits for lifelong learning',
        subtitle: 'Small systems that make curiosity, practice and reflection part of everyday life',
        summary: 'Small systems that make curiosity, practice and reflection part of everyday life.',
        content: `### Curiosity as an Operating System\nLearning is rarely constrained by access to material; it is constrained by cognitive bandwidth and the absence of a capture mechanism.\n\n### The Daily Loop\nBy spending 15 minutes each evening distilling one concept into plain language, comprehension deepens significantly over passive reading.`,
        category: 'Learning',
        readTime: '11 min read',
        source: 'Developed from an Idea',
        savesCount: 81,
        helpfulCount: 39,
      },
    ]);

    // 6. Create Notifications
    await Notification.create([
      {
        recipientId: shubham._id,
        actorId: alicia._id,
        actorName: 'Alicia Lee',
        actorInitials: 'AL',
        actorColor: 'blue',
        type: 'contribution',
        title: 'contributed to an Idea you follow: "How can we make remote work feel less isolating?"',
        timeText: '12 min ago',
      },
      {
        recipientId: shubham._id,
        actorId: jamie._id,
        actorName: 'Jamie Scott',
        actorInitials: 'JS',
        actorColor: 'pink',
        type: 'knowledge_published',
        title: 'published a new Knowledge resource: "Designing better habits for lifelong learning"',
        timeText: '1 hr ago',
      },
      {
        recipientId: shubham._id,
        actorId: devon._id,
        actorName: 'Devon Martinez',
        actorInitials: 'DM',
        actorColor: 'gold',
        type: 'mention',
        title: 'mentioned you in a discussion regarding local sharing tools',
        timeText: '3 hrs ago',
      },
    ]);

    console.log('[Seed] Database successfully seeded with prototype baseline!');
  } catch (err) {
    console.error('[Seed Error]', err);
  }
};
