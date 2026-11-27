import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { PostReply } from '../models/PostReply.js';
import { Discussion } from '../models/Discussion.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { Circle } from '../models/Circle.js';
import { circleSeedProfiles } from './circleSeedData.js';
import { getSeedPassword } from '../config/demoAccounts.js';

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Checking and enriching Orvexa database with rich media content...');

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash(getSeedPassword(), salt);

    // 1. Initial User Roster with realistic photo avatars
    const userProfiles = [
      {
        username: 'shubham',
        email: 'shubham@orvexa.io',
        displayName: 'Shubham Pal',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
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
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
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
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
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
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
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
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
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
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
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
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
        passwordHash: defaultPasswordHash,
        initials: 'RM',
        avatarColor: 'blue',
        headline: 'Software Craftsman & Distributed Architecture',
        bio: 'Passionate about clean code, event-driven design and developer ergonomics.',
        platformRole: 'user',
        followersCount: 520,
        followingCount: 61,
      },
    ];

    const users = [];
    for (const up of userProfiles) {
      let u = await User.findOne({ username: up.username });
      if (!u) {
        u = await User.create(up);
      } else {
        u.avatar = up.avatar;
        u.displayName = up.displayName;
        await u.save();
      }
      users.push(u);
    }

    const [shubham, jamie, alicia, devon, sarah, chloe, rahul] = users;

    // 2. Circles with Cover Imagery (Preserve existing circles & content)
    for (const profile of circleSeedProfiles) {
      const exists = await Circle.findOne({ slug: profile.slug });
      if (!exists) {
        const owner = users.find((item) => item.username === profile.ownerUsername) || shubham;
        const members = [...new Map([owner, shubham].map((member) => [member._id.toString(), member._id])).values()];
        await Circle.create({
          name: profile.name,
          slug: profile.slug,
          description: profile.description,
          ownerId: owner._id,
          icon: profile.icon,
          category: profile.category,
          tags: profile.tags,
          avatar: profile.avatar,
          coverImage: profile.coverImage,
          rules: profile.rules,
          welcomeMessage: profile.welcomeMessage,
          communityGuidelines: profile.communityGuidelines,
          members,
          membersCount: members.length,
        });
      }
    }

    // 3. Clean up the old short initial mock posts (while strictly preserving any circle posts)
    const oldPostTitles = [
      "Just finished reading 'Atomic Habits'",
      'Minimalist setups for deeper focus',
      'Clarity over consensus',
      'Morning espresso & domain modeling',
    ];
    await Post.deleteMany({
      title: { $in: oldPostTitles },
      $or: [{ circleId: null }, { circleId: { $exists: false } }],
    });

    // 4. Enrich & Upsert New Substantive Posts
    const freshPosts = [
      {
        title: 'Building for depth in an era of 15-second algorithmic feeds',
        body: `Every major social platform has converged on the exact same metric: time-in-app optimized by slot-machine infinite loops. When you reward immediate outrage and dopamine hits, thoughtful synthesis becomes impossible.\n\nOver the past six months of building decentralized tools, our team noticed a fascinating pattern: when you remove algorithmic anger mechanics and replace them with topic graduation—where everyday thoughts naturally mature into discussions and permanent playbooks—the quality of engagement multiplies by 10x.\n\nPeople do not actually want endless noise. They want durable signal that stays accessible long after the original conversation ends.`,
        imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85',
        authorId: rahul._id,
        authorName: rahul.displayName,
        authorInitials: rahul.initials,
        authorColor: rahul.avatarColor,
        tags: ['#FutureOfSocial', '#ProductDesign', '#DeepWork'],
        likeCount: 142,
        commentCount: 38,
        commentsCount: 38,
        replies: [
          {
            author: jamie,
            body: 'Spot on Rahul. The tragedy of modern Slack and Twitter is that the most brilliant technical insights get buried after 48 hours. A system that preserves provenance changes everything.',
            children: [
              {
                author: alicia,
                body: 'Exactly why we prioritized the graduation model. If a casual thought gains community traction, it shouldn’t just scroll off the screen.',
              },
            ],
          },
          {
            author: devon,
            body: 'What strikes me is how this shifts user incentives: people write with more care when they know their contribution can be cited in a permanent guide.',
          },
        ],
      },
      {
        title: 'The architectural cost of premature microservices in early-stage products',
        body: `We recently finished migrating three splintered backend microservices back into a clean, modular monolith. The results: API latency dropped by 64%, deployment complexity vanished, and debugging distributed traces across network boundaries was replaced by straightforward function calls.\n\nMartin Fowler famously coined the MonolithFirst strategy over a decade ago, yet engineering teams repeatedly fall into the trap of splitting services before understanding domain boundaries.\n\nRule of thumb: unless you have distinct teams that cannot coordinate deploy schedules, or genuinely conflicting scaling requirements, keep your code in a single cohesive repository with clear module boundaries.`,
        imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=85',
        authorId: shubham._id,
        authorName: shubham.displayName,
        authorInitials: shubham.initials,
        authorColor: shubham.avatarColor,
        tags: ['#Architecture', '#Engineering', '#SystemDesign'],
        likeCount: 238,
        commentCount: 45,
        commentsCount: 45,
        replies: [
          {
            author: rahul,
            body: 'Amen! The cognitive tax of managing multiple docker-compose environments, inter-service auth tokens, and distributed transactions kills small team velocity.',
          },
          {
            author: sarah,
            body: 'Not to mention testing! With our unified MERN monolith, our automated suite runs 21 comprehensive integration checks in under 3 seconds.',
          },
        ],
      },
      {
        title: 'Designing ergonomic dark modes: Why pure black (#000000) is usually a mistake',
        body: `A common pitfall in modern web design is flipping background colors directly to absolute black (#000000) with pure white text (#FFFFFF). The extreme contrast ratio (21:1) creates visual halation, causing white letters to bleed and strain eyes during prolonged night reading.\n\nIn Orvexa, we tuned our dark palette around deep slate blues (#0b101e and #17213f) paired with soft off-white text (#f1f5f9). This delivers soothing readability while maintaining crisp depth hierarchies through subtle border opacities and backdrop blur surfaces.`,
        imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=85',
        authorId: alicia._id,
        authorName: alicia.displayName,
        authorInitials: alicia.initials,
        authorColor: alicia.avatarColor,
        tags: ['#UIUX', '#DesignSystems', '#Accessibility'],
        likeCount: 176,
        commentCount: 29,
        commentsCount: 29,
        replies: [
          {
            author: chloe,
            body: 'The difference in eye fatigue is night and day. Especially on OLED displays where high-contrast edges look unnaturally harsh.',
          },
        ],
      },
      {
        title: 'Asynchronous standups vs daily status calls: What our metrics showed after 90 days',
        body: `Three months ago, we replaced our 9:30 AM daily standup with a structured 3-bullet async check-in posted in our engineering circle before 11:00 AM.\n\nThe initial fear was loss of team cohesion. What actually happened was the opposite: morning maker time was completely restored. Engineers got 2.5 hours of uninterrupted flow state before noon, pull request turnaround improved by 40%, and meetings became reserved exclusively for design debates and pairing.\n\nStatus updates belong in text; real-time conversations belong to problem solving.`,
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85',
        authorId: chloe._id,
        authorName: chloe.displayName,
        authorInitials: chloe.initials,
        authorColor: chloe.avatarColor,
        tags: ['#RemoteCulture', '#Productivity', '#Leadership'],
        likeCount: 312,
        commentCount: 54,
        commentsCount: 54,
        replies: [
          {
            author: devon,
            body: 'We did the same thing. The unexpected bonus is that new hires can read through past async check-ins and grasp project context 3x faster.',
          },
        ],
      },
    ];

    for (const pData of freshPosts) {
      const exists = await Post.findOne({ title: pData.title });
      if (!exists) {
        const createdPost = await Post.create({
          title: pData.title,
          body: pData.body,
          imageUrl: pData.imageUrl,
          authorId: pData.authorId,
          authorName: pData.authorName,
          authorInitials: pData.authorInitials,
          authorColor: pData.authorColor,
          tags: pData.tags,
          likeCount: pData.likeCount,
          commentCount: pData.commentCount,
          commentsCount: pData.commentsCount,
        });

        // Seed realistic threaded replies
        if (pData.replies && Array.isArray(pData.replies)) {
          for (const rep of pData.replies) {
            const parentReply = await PostReply.create({
              postId: createdPost._id,
              authorId: rep.author._id,
              authorName: rep.author.displayName,
              authorInitials: rep.author.initials,
              authorColor: rep.author.avatarColor,
              body: rep.body,
            });

            if (rep.children && Array.isArray(rep.children)) {
              for (const child of rep.children) {
                await PostReply.create({
                  postId: createdPost._id,
                  parentReplyId: parentReply._id,
                  authorId: child.author._id,
                  authorName: child.author.displayName,
                  authorInitials: child.author.initials,
                  authorColor: child.author.avatarColor,
                  body: child.body,
                });
              }
            }
          }
        }
      }
    }

    // 5. Clean up old mock discussions and seed rich, authentic problem-solving discussions
    const oldDiscussionTitles = [
      "What's your favourite productivity tool? 🤔",
      'Ideas to improve Orvexa?',
      'How can we make remote work feel less isolating?',
      'The future of AI in education: Personalized learning vs mentorship',
    ];
    await Discussion.deleteMany({
      title: { $in: oldDiscussionTitles },
      $or: [{ circleId: null }, { circleId: { $exists: false } }],
    });

    const freshDiscussions = [
      {
        title: 'How should distributed teams balance asynchronous autonomy with spontaneous mentorship?',
        body: `Async communication allows developers and designers to work in deep focus across multiple timezones. However, junior engineers frequently report feeling stranded or hesitant to interrupt seniors over Slack with "quick questions".\n\nHow is your organization solving the junior mentorship gap in remote environments? Do you use scheduled pair programming slots, virtual co-working rooms with open microphones, or lightweight design jam sessions?`,
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85',
        category: 'Work & Culture',
        tags: ['#RemoteWork', '#Mentorship', '#EngineeringCulture'],
        authorId: jamie._id,
        authorName: jamie.displayName,
        authorInitials: jamie.initials,
        authorColor: jamie.avatarColor,
        votes: 842,
        commentsCount: 96,
        contributorsCount: 41,
        contributions: [
          {
            author: alicia,
            body: 'We introduced "Office Hours" twice a week where staff engineers hang out in a live voice huddle. Anyone can drop in to rubber-duck a bug, share a screen, or ask architectural questions without scheduling friction.',
          },
          {
            author: rahul,
            body: 'Another technique that worked well for us: pair on the first 3 pull requests end-to-end. Walk through git rebase, code review norms, and staging deploys together. It builds relational safety right away.',
          },
          {
            author: devon,
            body: 'Documentation also matters. When institutional knowledge is recorded in living playbooks rather than buried in private DMs, juniors feel empowered to search and self-serve before being blocked.',
          },
        ],
      },
      {
        title: 'Context windows vs persistent memory: What makes an AI assistant genuinely useful?',
        body: `Modern language models have context windows exceeding 1 million tokens, yet AI code assistants still frequently forget team architecture decisions, API schemas, and testing guidelines from one day to the next.\n\nShould future developer tools lean heavier on large transient context stuffing (re-sending the entire repository each prompt), or on curated, user-controlled local memory banks that track verified decisions and code invariants?`,
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85',
        category: 'Technology',
        tags: ['#ArtificialIntelligence', '#SoftwareEngineering', '#DeveloperTools'],
        authorId: sarah._id,
        authorName: sarah.displayName,
        authorInitials: sarah.initials,
        authorColor: sarah.avatarColor,
        votes: 1120,
        commentsCount: 128,
        contributorsCount: 52,
        contributions: [
          {
            author: shubham,
            body: 'Curated memory wins every time. Huge context windows degrade retrieval needle-in-a-haystack accuracy, burn huge token costs, and slow down turnaround. Concise verified project rules are far more dependable.',
          },
          {
            author: rahul,
            body: 'Plus privacy and auditability! If memory is explicitly stored as structured Markdown artifacts that the developer can review and edit, you never have hallucinated "ghost rules" affecting builds.',
          },
        ],
      },
      {
        title: 'Monolith vs Microservices in 2026: What is your team’s real tipping point?',
        body: `Ten years after the peak of microservice hype, many organizations are consolidating back into modular monoliths to regain velocity and eliminate distributed network latency.\n\nAt what exact threshold (team size, deploy frequency, database volume, domain boundaries) did splitting into distinct services genuinely pay off for your organization?`,
        imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85',
        category: 'Engineering',
        tags: ['#Architecture', '#CloudComputing', '#Scale'],
        authorId: rahul._id,
        authorName: rahul.displayName,
        authorInitials: rahul.initials,
        authorColor: rahul.avatarColor,
        votes: 754,
        commentsCount: 88,
        contributorsCount: 36,
        contributions: [
          {
            author: shubham,
            body: 'For us, the only real tipping point is independent deploy cadence across distinct teams. If Team A cannot release without coordinating with Team B, splitting them into microservices just turns a function call into an HTTP timeout.',
          },
          {
            author: devon,
            body: 'Another legitimate boundary is data compliance: e.g., isolating payments and HIPAA medical records into an audited isolated cluster while keeping main business logic in the primary app.',
          },
        ],
      },
      {
        title: 'Mental models for technical leaders: How to make irreversible decisions calmly',
        body: `Jeff Bezos famously categorized decisions into Type 1 (irreversible, one-way doors like database architecture or core license choices) and Type 2 (reversible, two-way doors like button colors or sprint lengths).\n\nWhat mental models or decision frameworks do you rely on when facing ambiguous, high-stakes trade-offs?`,
        imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=85',
        category: 'Thinking',
        tags: ['#Leadership', '#MentalModels', '#Strategy'],
        authorId: alicia._id,
        authorName: alicia.displayName,
        authorInitials: alicia.initials,
        authorColor: alicia.avatarColor,
        votes: 692,
        commentsCount: 71,
        contributorsCount: 30,
        contributions: [
          {
            author: chloe,
            body: 'Inversion thinking: rather than asking "how do we guarantee success?", I ask "what would make this project guaranteed to fail within 6 months?" and aggressively eliminate those failure modes.',
          },
          {
            author: jamie,
            body: 'Writing before coding: if a proposal cannot be clearly articulated in a 2-page design memo with pros, cons, and alternatives, we do not understand the problem well enough to build it.',
          },
        ],
      },
    ];

    for (const dData of freshDiscussions) {
      let disc = await Discussion.findOne({ title: dData.title });
      if (!disc) {
        disc = await Discussion.create({
          title: dData.title,
          body: dData.body,
          imageUrl: dData.imageUrl,
          category: dData.category,
          tags: dData.tags,
          authorId: dData.authorId,
          authorName: dData.authorName,
          authorInitials: dData.authorInitials,
          authorColor: dData.authorColor,
          votes: dData.votes,
          commentsCount: dData.commentsCount,
          contributorsCount: dData.contributorsCount,
        });

        if (dData.contributions && Array.isArray(dData.contributions)) {
          for (const c of dData.contributions) {
            await DiscussionContribution.create({
              discussionId: disc._id,
              authorId: c.author._id,
              authorName: c.author.displayName,
              authorInitials: c.author.initials,
              authorColor: c.author.avatarColor,
              body: c.body,
              votes: Math.floor(Math.random() * 25) + 5,
            });
          }
        }
      }
    }

    // 6. Clean up old mock knowledge articles and seed comprehensive, structured playbooks
    const oldKnowledgeTitles = [
      "A beginner's guide to building better reading habits",
      'The future of work: hybrid, remote or both?',
      'A practical guide to building healthy remote teams',
      'How to think clearly when a problem feels complex',
    ];
    await KnowledgeArticle.deleteMany({
      title: { $in: oldKnowledgeTitles },
      $or: [{ circleId: null }, { circleId: { $exists: false } }],
    });

    const freshKnowledge = [
      {
        title: 'The Engineering Playbook for Resilient Distributed Systems',
        subtitle: 'Practical patterns for graceful degradation, idempotency, and fail-safe design.',
        summary: 'A comprehensive engineering guide covering circuit breakers, idempotent APIs, database connection pooling, and zero-downtime database migrations in modern web backends.',
        coverImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=85',
        category: 'Engineering',
        format: 'guide',
        readTime: '9 min read',
        readTimeMinutes: 9,
        authorId: rahul._id,
        authorName: rahul.displayName,
        authorInitials: rahul.initials,
        authorColor: rahul.avatarColor,
        savesCount: 318,
        helpfulCount: 245,
        status: 'published',
        publishedAt: new Date(),
        body: [
          { id: 'sec-1', type: 'heading1', content: '1. Embrace Eventual Consistency & Idempotency', data: {} },
          { id: 'sec-2', type: 'paragraph', content: 'In distributed architectures, network partitions and retry loops are unavoidable realities. If an API request is re-sent due to a dropped socket, your backend must guarantee that processing it twice produces the exact same state mutation.', data: {} },
          { id: 'sec-3', type: 'heading2', content: 'Implementing Idempotency Keys', data: {} },
          { id: 'sec-4', type: 'paragraph', content: 'Store unique request tokens alongside target mutations. Before processing state transitions, verify if the idempotency token exists in your cache or database, and return the cached receipt instead of executing duplicate writes.', data: {} },
          { id: 'sec-5', type: 'heading1', content: '2. Circuit Breakers and Graceful Degradation', data: {} },
          { id: 'sec-6', type: 'paragraph', content: 'When downstream services or external AI providers fail, your application must fail gracefully rather than crashing entire server event loops. Fall back to cached local heuristics, zero-cost keyword extractors, and helpful offline notices.', data: {} },
        ],
      },
      {
        title: 'Designing High-Trust Remote Cultures: A Field Guide for Leaders',
        subtitle: 'Moving from digital surveillance to clear written artifacts and asynchronous agency.',
        summary: 'How leading distributed engineering organizations cultivate deep psychological safety, replace daily status syncs with structured updates, and establish transparent decision trails.',
        coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85',
        category: 'Work & Culture',
        format: 'guide',
        readTime: '7 min read',
        readTimeMinutes: 7,
        authorId: jamie._id,
        authorName: jamie.displayName,
        authorInitials: jamie.initials,
        authorColor: jamie.avatarColor,
        savesCount: 284,
        helpfulCount: 198,
        status: 'published',
        publishedAt: new Date(),
        body: [
          { id: 'sec-1', type: 'heading1', content: '1. The Death of Green-Dot Surveillance', data: {} },
          { id: 'sec-2', type: 'paragraph', content: 'Measuring presence by active Slack dots or mouse movements creates anxiety and drives shallow busywork. High-performing teams measure tangible outcomes: merged pull requests, published design docs, and shipped customer value.', data: {} },
          { id: 'sec-3', type: 'heading2', content: '2. The 2-Page Decision Memo', data: {} },
          { id: 'sec-4', type: 'paragraph', content: 'Before calling an all-hands alignment meeting, write a 2-page memo outlining the problem context, data findings, and proposed trade-offs. Allow 24 hours for silent reading and inline commenting before debating live.', data: {} },
        ],
      },
      {
        title: 'A Primer on Mental Models: Thinking in First Principles and Inversion',
        subtitle: 'Tools for cutting through cognitive bias and navigating complex systems.',
        summary: 'Deconstruct overwhelming engineering and business decisions using first principles physics, second-order consequences, and Charlie Munger inversion frameworks.',
        coverImage: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1200&q=85',
        category: 'Thinking',
        format: 'explainer',
        readTime: '6 min read',
        readTimeMinutes: 6,
        authorId: alicia._id,
        authorName: alicia.displayName,
        authorInitials: alicia.initials,
        authorColor: alicia.avatarColor,
        savesCount: 220,
        helpfulCount: 167,
        status: 'published',
        publishedAt: new Date(),
        body: [
          { id: 'sec-1', type: 'heading1', content: '1. First Principles: Stripping Down to Bedrock', data: {} },
          { id: 'sec-2', type: 'paragraph', content: 'Reasoning by analogy means copying what others do with minor tweaks. Reasoning from first principles means boiling a challenge down to fundamental truths that cannot be deduced any further, then building up.', data: {} },
          { id: 'sec-3', type: 'heading2', content: '2. Inversion: What Guarantees Failure?', data: {} },
          { id: 'sec-4', type: 'paragraph', content: 'It is often far easier to identify what will ruin a project than what will ensure its brilliance. List the top five ways your architecture or launch could fail, and systematically engineer safeguards against them.', data: {} },
        ],
      },
    ];

    for (const kData of freshKnowledge) {
      let art = await KnowledgeArticle.findOne({ title: kData.title });
      if (!art) {
        await KnowledgeArticle.create(kData);
      }
    }

    console.log('[Seed] Database content enrichment complete.');
  } catch (err) {
    console.error('[Seed Error] Failed to enrich database:', err);
  }
};
