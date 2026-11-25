import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { PostReply } from '../models/PostReply.js';
import { Discussion } from '../models/Discussion.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { Circle } from '../models/Circle.js';

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Checking and enriching Orvexa database with rich media content...');

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('orvexa123', salt);

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
        avatarColor: 'green',
        headline: 'Organizational Psychologist',
        bio: 'Research-backed practices for deep work and authentic collaboration.',
        platformRole: 'moderator',
        followersCount: 512,
        followingCount: 39,
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

    // 2. Circles with Cover Imagery
    const circleDefs = [
      {
        name: 'Tech Enthusiasts',
        slug: 'tech-enthusiasts',
        description: 'Emerging technologies, developer ergonomics, and systems thinking.',
        icon: '⚡',
        imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=300&q=80',
        category: 'Technology',
        membersCount: 3200,
        ownerId: sarah._id,
      },
      {
        name: 'Design Lovers',
        slug: 'design-lovers',
        description: 'Thoughtful typography, interfaces, and physical objects.',
        icon: '✧',
        imageUrl: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=300&q=80',
        category: 'Design & UX',
        membersCount: 2840,
        ownerId: alicia._id,
      },
      {
        name: 'AI & Future',
        slug: 'ai-and-future',
        description: 'Autonomous agents, cognitive workflows, and ethical interfaces.',
        icon: '🤖',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
        category: 'Technology',
        membersCount: 4120,
        ownerId: jamie._id,
      },
      {
        name: 'Future of Work',
        slug: 'future-of-work',
        description: 'Distributed teams, async rhythms, and healthy company culture.',
        icon: '⌘',
        imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=300&q=80',
        category: 'Work & Culture',
        membersCount: 1950,
        ownerId: rahul._id,
      },
    ];

    for (const cDef of circleDefs) {
      const exists = await Circle.findOne({ slug: cDef.slug });
      if (!exists) {
        await Circle.create({
          ...cDef,
          members: [cDef.ownerId, shubham._id],
        });
      }
    }

    // 3. Enrich & Upsert Posts with Pictures
    const richPosts = [
      {
        title: "Just finished reading 'Atomic Habits'",
        body: 'Such a game-changer! 📘 The premise is remarkably simple: you do not rise to the level of your goals, you fall to the level of your systems. Focusing on tiny 1% daily increments creates compounding momentum.',
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
        authorId: rahul._id,
        authorName: rahul.displayName,
        authorInitials: rahul.initials,
        authorColor: rahul.avatarColor,
        tags: ['#Habits', '#ContinuousLearning', '#Productivity'],
        likeCount: 87,
        commentCount: 23,
        commentsCount: 23,
      },
      {
        title: 'Minimalist setups for deeper focus',
        body: 'Cutting down visual and physical clutter directly calms mental processing. A single clean notebook, warm natural daylight, and a dedicated workspace do more for focus than any app ever did.',
        imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80',
        authorId: jamie._id,
        authorName: jamie.displayName,
        authorInitials: jamie.initials,
        authorColor: jamie.avatarColor,
        tags: ['#DeepWork', '#Minimalism', '#Workspaces'],
        likeCount: 114,
        commentCount: 19,
        commentsCount: 19,
      },
      {
        title: 'Clarity over consensus',
        body: 'The best meetings are the ones that make the next step obvious. A small reminder that clarity is often more valuable than another status update or debating edge cases indefinitely.',
        imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
        authorId: chloe._id,
        authorName: chloe.displayName,
        authorInitials: chloe.initials,
        authorColor: chloe.avatarColor,
        tags: ['#Productivity', '#Leadership', '#Clarity'],
        likeCount: 92,
        commentCount: 12,
        commentsCount: 12,
      },
      {
        title: 'Morning espresso & domain modeling',
        body: 'Always map domain entities and invariant rules on paper before jumping to the controllers. If the schema model is clear, the rest of the application flows naturally.',
        imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
        authorId: alicia._id,
        authorName: alicia.displayName,
        authorInitials: alicia.initials,
        authorColor: alicia.avatarColor,
        tags: ['#Engineering', '#Architecture', '#SoftwareDesign'],
        likeCount: 68,
        commentCount: 16,
        commentsCount: 16,
      },
    ];

    for (const pData of richPosts) {
      const exists = await Post.findOne({ title: pData.title });
      if (!exists) {
        const createdPost = await Post.create(pData);
        // Seed an initial reply
        await PostReply.create({
          postId: createdPost._id,
          authorId: devon._id,
          authorName: devon.displayName,
          authorInitials: devon.initials,
          authorColor: devon.avatarColor,
          body: 'Completely agree with this perspective. Small changes really do make the difference.',
        });
      } else if (!exists.imageUrl && pData.imageUrl) {
        exists.imageUrl = pData.imageUrl;
        await exists.save();
      }
    }

    // 4. Enrich & Upsert Discussions with Pictures and Contributions
    const richDiscussions = [
      {
        title: "What's your favourite productivity tool? 🤔",
        body: "Let's hear your top picks and why you love them. Whether it is an analog bullet journal, Obsidian, Raycast, or custom shell scripts, what gives you the highest leverage?",
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        category: 'Productivity',
        authorId: jamie._id,
        authorName: jamie.displayName,
        authorInitials: jamie.initials,
        authorColor: jamie.avatarColor,
        votes: 421,
        commentsCount: 124,
        contributorsCount: 42,
      },
      {
        title: 'Ideas to improve Orvexa?',
        body: 'Share your thoughts and suggestions. How can we make it even easier to graduate everyday discussions into durable knowledge guides?',
        imageUrl: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=800&q=80',
        category: 'Thinking',
        authorId: shubham._id,
        authorName: shubham.displayName,
        authorInitials: shubham.initials,
        authorColor: shubham.avatarColor,
        votes: 292,
        commentsCount: 73,
        contributorsCount: 28,
      },
      {
        title: 'How can we make remote work feel less isolating?',
        body: 'Exploring rituals, tools and team habits that help distributed teams feel connected without creating notification fatigue.',
        imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
        category: 'Work & Culture',
        authorId: jamie._id,
        authorName: jamie.displayName,
        authorInitials: jamie.initials,
        authorColor: jamie.avatarColor,
        votes: 842,
        commentsCount: 84,
        contributorsCount: 35,
      },
      {
        title: 'The future of AI in education: Personalized learning vs mentorship',
        body: 'Can AI agents adaptively tutor fundamentals while human teachers preserve social empathy and critical debate? Where is the real balance?',
        imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
        category: 'Learning',
        authorId: sarah._id,
        authorName: sarah.displayName,
        authorInitials: sarah.initials,
        authorColor: sarah.avatarColor,
        votes: 512,
        commentsCount: 65,
        contributorsCount: 22,
      },
    ];

    for (const dData of richDiscussions) {
      let disc = await Discussion.findOne({ title: dData.title });
      if (!disc) {
        disc = await Discussion.create(dData);
        // Add sample initial contributions
        await DiscussionContribution.create([
          {
            discussionId: disc._id,
            authorId: alicia._id,
            authorName: alicia.displayName,
            authorInitials: alicia.initials,
            authorColor: alicia.avatarColor,
            body: 'Async voice memos and short 3-minute video updates have completely transformed how our team communicates without dragging everyone into hour-long syncs.',
          },
          {
            discussionId: disc._id,
            authorId: devon._id,
            authorName: devon.displayName,
            authorInitials: devon.initials,
            authorColor: devon.avatarColor,
            body: 'Pairing sessions twice a week work wonders. Even just co-working with mics open while working independently eliminates the isolation factor.',
          },
        ]);
      } else if (!disc.imageUrl && dData.imageUrl) {
        disc.imageUrl = dData.imageUrl;
        await disc.save();
      }
    }

    // 5. Enrich & Upsert Knowledge Articles with Cover Imagery
    const richKnowledge = [
      {
        title: "A beginner's guide to building better reading habits",
        subtitle: 'Small changes. Big impact.',
        summary: 'How to transition from passive browsing to focused, active reading habits that stick for life.',
        coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
        category: 'Learning',
        format: 'guide',
        readTime: '8 min read',
        authorId: alicia._id,
        authorName: alicia.displayName,
        authorInitials: alicia.initials,
        authorColor: alicia.avatarColor,
        savesCount: 142,
        helpfulCount: 88,
        status: 'published',
        publishedAt: new Date(),
        body: [
          { id: 'b-1', type: 'heading1', content: 'Why most reading habits fail', data: {} },
          { id: 'b-2', type: 'paragraph', content: 'Most people try to read 50 pages a day immediately, burning out in week two. The secret is frictionless entry: read just 2 pages every evening before touching your phone.', data: {} },
          { id: 'b-3', type: 'heading2', content: 'The 2-Minute Gateway', data: {} },
          { id: 'b-4', type: 'paragraph', content: 'Anchor reading to an existing habit, like your first morning coffee or turning off your desk monitor. The friction to begin is the only barrier that matters.', data: {} },
        ],
      },
      {
        title: 'The future of work: hybrid, remote or both?',
        subtitle: 'Exploring the next chapter of work culture.',
        summary: 'Why the binary debate between office mandates and pure remote is missing the true point: asynchronous agency.',
        coverImage: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80',
        category: 'Work & Culture',
        format: 'perspective',
        readTime: '6 min read',
        authorId: jamie._id,
        authorName: jamie.displayName,
        authorInitials: jamie.initials,
        authorColor: jamie.avatarColor,
        savesCount: 96,
        helpfulCount: 65,
        status: 'published',
        publishedAt: new Date(),
        body: [
          { id: 'b-1', type: 'heading1', content: 'Rethinking Synchronicity', data: {} },
          { id: 'b-2', type: 'paragraph', content: 'The real transformation is not physical geography; it is replacing real-time meetings with high-fidelity written documentation and durable artifacts.', data: {} },
        ],
      },
      {
        title: 'A practical guide to building healthy remote teams',
        subtitle: 'Rituals, psychological safety and async practices.',
        summary: 'Synthesized from over 50 distributed organizations: what actually keeps high-performing remote teams resilient.',
        coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
        category: 'Work & Culture',
        format: 'guide',
        readTime: '7 min read',
        authorId: rahul._id,
        authorName: rahul.displayName,
        authorInitials: rahul.initials,
        authorColor: rahul.avatarColor,
        savesCount: 110,
        helpfulCount: 74,
        status: 'published',
        publishedAt: new Date(),
        body: [
          { id: 'b-1', type: 'heading1', content: 'The Pillars of Distributed Trust', data: {} },
          { id: 'b-2', type: 'paragraph', content: 'Trust in remote teams is built through transparent written artifacts, clear ownership boundaries, and predictable cadence rather than digital surveillance.', data: {} },
        ],
      },
      {
        title: 'How to think clearly when a problem feels complex',
        subtitle: 'Mental models for navigation and decision making.',
        summary: 'Deconstruct overwhelming problems using first principles, inversion, and second-order effect modeling.',
        coverImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80',
        category: 'Thinking',
        format: 'explainer',
        readTime: '5 min read',
        authorId: alicia._id,
        authorName: alicia.displayName,
        authorInitials: alicia.initials,
        authorColor: alicia.avatarColor,
        savesCount: 84,
        helpfulCount: 52,
        status: 'published',
        publishedAt: new Date(),
        body: [
          { id: 'b-1', type: 'heading1', content: 'Inversion: Avoid Stupidity Before Seeking Brilliance', data: {} },
          { id: 'b-2', type: 'paragraph', content: 'Instead of asking how to make a project succeed, ask what guarantees its failure, and systematically eliminate those failure modes.', data: {} },
        ],
      },
    ];

    for (const kData of richKnowledge) {
      let art = await KnowledgeArticle.findOne({ title: kData.title });
      if (!art) {
        await KnowledgeArticle.create(kData);
      } else if (!art.coverImage && kData.coverImage) {
        art.coverImage = kData.coverImage;
        await art.save();
      }
    }

    console.log('[Seed] Database content enrichment complete.');
  } catch (err) {
    console.error('[Seed Error] Failed to enrich database:', err);
  }
};
