# Orvexa — Living Implementation Status

**Document Purpose:** Source-of-truth living status tracker for the phased engineering build of Orvexa, referenced against `ORVEXA_MASTER_BUILD_SPEC.md` and `orbit-design-prototype (1).html`.

---

## Current Architecture & Build Status

- **Monolithic MVC Architecture:**
  - One React TypeScript/JSX frontend (`/frontend`)
  - One Express/Node.js backend with Mongoose models, REST controllers, and Socket.IO real-time support (`/backend`)
  - One MongoDB persistence layer with fallback resilience.

- **Frontend & Navigation:**
  - **Landing Page (`/`):** Owner's dynamic landing page in `StoriesInMotionHero.jsx` preserved intact, with interactive section scrolling, doodle replay animations, scroll-synced active navigation via Framer Motion, and mobile glass menu.
  - **Direct Entry:** Added high-visibility "Enter App →" CTA in both desktop header and mobile menu.
  - **Application Routes (`/app/*`):**
    - `/app` & `/discover`: Discover Feed (For You, Trending, Following, Latest) with real likes, comments, library saves.
    - `/ideas`: The Discussion discovery hub mapped per Spec Section 2.2, with voting, sorting, and full detail modal with threaded contributions.
    - `/knowledge`: Distinct publication-grade Knowledge environment with featured publications, reading times, writer metadata, author references, and reader modal with helpfulness feedback.
    - `/circles`: Communities directory with membership join/leave toggling, icons, and member counts.
    - `/library`: Personal curation space for saved posts, reading lists, and followed ideas.
    - `/activity`: Notification center with recent interactions, time stamps, and unread management.
    - `/messages`: Private 1:1 conversation inbox and real-time chat thread.
    - `/profile`: User Profile with contributions, ideas started, and saved items.
    - `/admin`: Platform administration dashboard with system stats, moderation cases, and audit logs.
  - **AI Writing Partner Studio:**
    - Guided workspace modal for generating proposed article structures, drafting sections, and attribution tracking.
  - **Universal Create System:**
    - "Create something" modal supporting Thoughts (Posts), Ideas (Discussions), Knowledge articles, and Circles.

- **Backend APIs (`/api`):**
  - Auth & User: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
  - Posts: `/api/posts`, `/api/posts/:postId/like`, `/api/posts/:postId/save`
  - Discussions: `/api/discussions`, `/api/discussions/:id`, `/api/discussions/:id/upvote`, `/api/discussions/:id/contributions`
  - Knowledge: `/api/knowledge`, `/api/knowledge/:id`, `/api/knowledge/:id/helpful`, `/api/knowledge/:id/save`
  - Circles: `/api/circles`, `/api/circles/:id`, `/api/circles/:id/join`
  - Messages: `/api/conversations`, `/api/conversations/:id/messages`
  - Notifications: `/api/notifications`, `/api/notifications/:id/read`, `/api/notifications/read-all`
  - Library: `/api/library`
  - Search: `/api/search`
  - Admin & Moderation: `/api/admin/overview`, `/api/reports`
  - AI Partner: `/api/ai/knowledge/outline`, `/api/ai/knowledge/draft-section`
  - Seed Dataset: `backend/src/seeds/seed.js` pre-populating users (Shubham Pal, Jamie Scott, Alicia Lee, Devon Martinez, Sarah Rodriguez, Chloe Patel, Rahul Mehta), discussions, knowledge articles, posts, circles, and notifications.

---

## Phased Verification Matrix

| Phase | Milestone | Status | Notes |
|---|---|---|---|
| Phase 0 | Repository inspection & architecture baseline | Completed | Monolithic MVC established with React Router |
| Phase 1 | Authentication & User profile | Completed | JWT + User schema + Profile view & stats |
| Phase 2 | Posts & Discover feed | Completed | Full feed with likes, tags, composer, filters |
| Phase 3 | Discussions & Ideas hub | Completed | Upvoting, contributions thread, detail workspace |
| Phase 4 | Knowledge publication environment | Completed | Editorial reader, reading lists, references, helpfulness feedback |
| Phase 5 | AI-assisted Knowledge Partner | Completed | Studio modal with outline generator & drafting |
| Phase 6 | Circles, Messaging & Realtime | Completed | Communities directory, join/leave, 1:1 chats |
| Phase 7 | Library, Activity & Moderation | Completed | Saved items, notification feed, audit logs |


---

## Targeted Fix Patch Implementation (ORVEXA_FIX.md)

### 1. Server-Authoritative 120-Second Guest Preview
- **Token Mechanism:** Implemented `backend/src/middleware/guestPreview.js` using signed, tamper-resistant tokens carrying the first-seen timestamp (`createdAt`). Configurable via `GUEST_PREVIEW_SECONDS=120`.
- **Enforcement:** Enforces preview expiration on the server, rejecting expired unauthenticated reads with `403 Forbidden` (`code: GUEST_PREVIEW_EXPIRED`). Authenticated sessions are fully exempt.
- **Frontend Interceptor & Modal:** Integrated `GuestGateModal.jsx` triggered automatically upon preview expiration, preserving the visitor's destination for seamless post-login return.

### 2. Route-Specific Rate Limiting
- **Middleware:** Implemented sliding-window limiter `backend/src/middleware/rateLimiter.js` combining IP and session identifier.
- **Endpoints Protected:** Configured on public content reads (`PUBLIC_API_RATE_LIMIT_MAX_REQUESTS=60`) and search (`PUBLIC_SEARCH_RATE_LIMIT_MAX_REQUESTS=20`). Returns `429 Too Many Requests` with `Retry-After`.

### 3. Public Read-Only APIs
- Created `backend/src/controllers/publicController.js` and registered `/api/public/*` routes for Discover, Posts, Discussions, Knowledge, Users, Companies, and Circles with strict privacy filtering and pagination.

### 4. People & Companies Discovery
- **Company Model & Controller:** Created `backend/src/models/Company.js` and `backend/src/controllers/companyController.js` with search, profile lookup, and follow toggle.
- **People Discovery:** Implemented `backend/src/controllers/userController.js` search and follow actions.
- **Frontend View:** Created `frontend/src/views/PeopleCompaniesView.jsx` with real search, follow/unfollow persistence, and direct profile navigation. Added to `LeftSidebar.jsx`.

### 5. Profile Routing & Identity Isolation
- Updated `ProfileView.jsx` to dynamically load target user profiles via `/profile/:username` without conflating with the logged-in user.
- Distinguishes self-editing from viewing/following others.

### 6. Count Reconciliation & Feed Alignment
- Reconciled `votes`, `commentsCount` (persisted contributions), and `contributorsCount` (distinct authors) in `discussionController.js` directly from records.
- Discover feed tabs (`For you`, `Trending`, `Following`, `Latest`) query distinct database filters across Posts, Discussions, and Knowledge:
  - `For you`: Ranked algorithmic balance between engagement and freshness.
  - `Trending`: Sorts by highest engagement (likes, upvotes, saves, comments).
  - `Following`: Restricts content to followed authors. Guests receive a dedicated sign-in/sign-up gate card, and users with 0 followed authors receive an empty state with a link to discovery.
  - `Latest`: Chronological descending sorting across all content types.
- Fixed `User` schema (`followers` and `following` arrays) and `Post` schema (`likes`, `likedBy`, `commentCount`, `commentsCount`) to ensure relationships and interaction counts persist reliably in MongoDB.
- Synchronized like (`isLiked`/`hasLiked`) and upvote (`voted`/`hasUpvoted`) reactivity between cards and backend endpoints.

### 7. Admin & Management Dashboard
- Resolved role property discrepancy (`user.platformRole` vs `user.role`): both properties are now populated across backend auth responses (`login`, `register`, `getMe`) and verified symmetrically in `LeftSidebar.jsx` and `AdminView.jsx`.
- Fixed Admin Dashboard real-time stats mapping (`overview.stats.*` and root-level aliases), including `Circle.countDocuments()`.
- Implemented full platform management in `AdminView`:
  - **Overview & Metrics**: Live counters, recent audit logs, and platform health.
  - **User Management**: Member search, role promotion/demotion (`user`, `moderator`, `admin`), and account suspension/activation.
  - **Moderation Reports**: Interactive queue with Action Report and Dismiss actions writing to `AuditLog`.
- Protected admin routes with strict `403` role checks on `/api/admin/*`.

### 8. Direct Messaging & Member Communication
- **Profile Direct Messaging**: Added direct "Message" CTA on user profiles in `ProfileView.jsx` and `PeopleCompaniesView.jsx`. Automatically initiates or resumes 1:1 direct conversations via `/api/conversations`.
- **Recipient Resolution**: Updated `messageController.js:startConversation` to accept both MongoDB ObjectId and username strings with self-messaging guards.
- **Unified Inbox Navigation**: Updated `MessagesView.jsx` to respond dynamically to `location.state` and `?user=` search params, and added a "+ New Chat" user search modal to compose direct messages directly from the inbox.
- **Route Normalization**: Fixed `RightSidebar.jsx` profile links (`/profile/:username`) and People link (`/people-companies`).

### 9. Automated Test Suite
- Automated test runner at `backend/tests/verifyFixes.test.js` validating:
  1. Guest preview token issuance.
  2. 120-second preview expiry returning `403 GUEST_PREVIEW_EXPIRED`.
  3. Authenticated user exemption.
  4. Rate limiter `429` enforcement and `Retry-After`.
  5. Accurate distinct contributor vs contribution counting.


---

## Targeted Fix Patch Implementation (ORVEXA_FIX_02.md)

### 1. Canonical Discussion Counting & Data Consistency
- **Accurate Counting Logic:** Fixed in `backend/src/controllers/discussionController.js` through `reconcileDiscussionCounts()`.
  - `contributionCount`: count of persisted active contribution documents.
  - `contributorCount`: distinct user IDs/names among contributions (e.g. 3 contributions from 2 distinct users shows 3 contributions and 2 contributors).
  - `voteCount`: derived directly from `discussion.voters.length`, enforcing at most one vote per user with toggle/unvote capability.
- **Frontend Alignment:** `DiscussionCard.jsx` and `DiscussionDetailModal.jsx` use these exact definitions, eliminating mismatched or hardcoded counts.

### 2. People-to-Follow Navigation & Profile Routing Fix
- Fixed `RightSidebar.jsx` where clicking a suggested person's name, avatar, or "View" previously loaded `/profile?username=...` which defaulted to the logged-in user.
- Updated all links to route to `/profile/${person.username}`, loading that specific target user's public profile and public posts cleanly via `useParams()`.

### 3. Removal of Company Functionality
- Fully removed company functionality from backend routes, controllers, and models:
  - Deleted `backend/src/models/Company.js` and `backend/src/controllers/companyController.js`.
  - Removed company endpoints from `apiRoutes.js` and `publicController.js`.
- Replaced `PeopleCompaniesView.jsx` with dedicated `PeopleView.jsx` (`/people`).
- Cleaned up `LeftSidebar.jsx` to display a single **People** navigation item with `<Users />` icon.

### 4. Removal of Explore Topics from Discover
- Removed the "Explore topics" card and associated handlers from `RightSidebar.jsx`. Adjusted sidebar layout cleanly with no leftover gaps or dead code.

### 5. Discover 4-Mode Server-Backed Feed
- Implemented `/api/feed?filter=...&page=...&limit=...` via `backend/src/controllers/feedController.js` and `backend/src/services/feedRankingService.js`:
  1. **For you:** Personalized ranking with recency, followed creator boosts (+35), and soft interleaving to prevent consecutive identical content types.
  2. **Trending:** Time-decayed momentum formula `(engagement / (ageHours + 2)^1.5) * qualityMultiplier` ensuring recent momentum outranks stale high totals.
  3. **Following:** Restricted to authenticated users; queries eligible content authored by followed accounts. Shows honest empty state (`emptyReason: 'no_follows'`) if the user follows nobody.
  4. **Latest:** Strict chronological sort (`createdAt` desc) across Posts, Discussions, and Knowledge.
- Connected `DiscoverView.jsx` with stable pagination ("Load more items"), honest empty states, and content type filtering.

### 6. Automated Test Suite
- Extended `backend/tests/verifyFixes.test.js` to validate:
  - Canonical 3-contribution / 2-contributor logic.
  - Trending time-decay algorithm.
  - Feed diversity interleaving.
