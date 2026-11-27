# Orvexa

## What is Orvexa?

Most platforms suffer from one of two problems:
1. **Chat apps & social media (Twitter/Reddit):** Great conversations happen every day, but after 48 hours, they vanish down the feed and are lost forever.
2. **Wikis & docs (Notion/Wikipedia):** Well-organized and permanent, but boring and disconnected from where people actually talk.

Orvexa combines both into one smooth journey:

**Post** (Quick thought) ➔ **Discussion** (Community debate) ➔ **Knowledge** (Permanent guide)

Everything in Orvexa is connected. When you read a Knowledge article, you can click back and see the exact discussion and original post that sparked it.

---

## The Walkthrough

> "Orvexa is a social publishing platform designed around an organic content progression:
> 1. It starts with a **Post** — a casual thought or question.
> 2. When it sparks energy, the author graduates it into a **Discussion** — a dedicated space with nested threads for deep community debate.
> 3. Finally, when the community reaches great conclusions, anyone can click **Create Knowledge** to synthesize the conversation into a permanent, structured Knowledge Article. Best of all, every article keeps a live link back to the discussion and credits the people who contributed the ideas."

---

## Feature Breakdown

### 1. Discover Feed

**What it is:**  
The main homepage where users explore everything happening in the community.

**Nested Features & How They Work:**
* **Smart Interleaved Feed:** Instead of showing 10 posts in a row, the feed intelligently mixes Posts, Discussions, and Knowledge articles so the user always discovers fresh types of content.
* **Trending Cards Carousel:** Big, beautiful colored cards at the top highlighting the hottest discussions with real avatar stacks, total replies, and direct one-click navigation.
* **3 Feed Modes:**
  * **For You:** Algorithmic balance of recent activity and popular content.
  * **Trending:** Uses time-decay math (recent momentum matters more than old high view counts).
  * **Following:** Clean stream of content only from people you follow.
* **Content Type Filter Pills:** One-click filtering between All, Posts, Discussions, and Knowledge.
* **Live Search Bar:** Instant client-side search across titles, author names, tags, and body text without annoying page reloads.
* **True Dark Mode:** System-wide dark mode with dark navy/slate themes that remember your preference across the whole platform.

---

### 2. Posts

**What it is:**  
A quick, casual way to share thoughts, questions, or pictures without needing to write a full article.

**Nested Features & How They Work:**
* **Rich Block Creator Modal:**
  * Write headings, paragraphs, and quotes.
  * Attach images either by uploading your own file, entering an image URL, or choosing from curated presets.
  * Add tags (like `#Design`, `#Engineering`, `#RemoteWork`) and categories.
* **Social Interactions:**
  * **Like:** One-click heart reaction with live counters.
  * **Bookmark/Save:** Save posts to your personal Library for later.
* **Nested Comments (Reddit/YouTube Style):**
  * Clean indentation lines show who is talking to whom.
  * An **OP (Original Poster)** badge highlights when the post author replies.
  * Collapse threads with a single click to hide long arguments and skip to the next comment.
* **Author Control (Edit & Delete):**
  * Only the person who wrote the post (or staff) can edit the text or delete it.
  * Other users never see edit or delete buttons on posts they don't own.

---

### 3. Post-to-Discussion Conversion (Graduation)

**What it is:**  
When a casual post sparks an intense, valuable conversation, the author can "graduate" the post into a full Discussion.

**Nested Features & How They Work:**
* **Preserves the Original Post:** The original post is never deleted. It stays exactly where it was with its original likes and timestamps intact.
* **Migrates All Existing Replies:** Every reply written on the post is automatically transferred into the new Discussion as an initial contribution, keeping original timestamps, authors, and nested reply hierarchy.
* **Lockdown & Single Active Room:**
  * Once converted, the post's comment box turns into a clear notice: *"Conversation moved to Discussion"* with a blue button: **[View Discussion]**.
  * This prevents confusing split conversations where half the people comment on the post and half on the discussion.
* **Safe from Duplication (Idempotent):** Clicking convert twice or retrying will never create duplicate discussions or duplicate comments.
* **Author-Only Permission:** Only the original post author (or an admin) can initiate the conversion.

---

### 4. Discussions

**What it is:**  
A dedicated room built for deep conversations, problem-solving, and brainstorming around a specific challenge.

**Nested Features & How They Work:**
* **Dedicated Full-Page Reader (`/discussions/:id`):** Not a cramped modal popup. Discussions get their own clean reading room.
* **Origin Provenance Banner:** If the discussion was born from a post, a banner at the top announces: *"Originally catalyzed by [Author] in [Post Title]"* with a working link back to the post.
* **Community Upvoting:** Members upvote the discussion topic and individual contributions.
* **Category & Tagging Badges:** Filter by Culture, Tech, Design, Productivity, etc.
* **Inline Discussion Editor:** The discussion author can update the title, premise, tags, and category at any time.

---

### 5. Knowledge Base & The Knowledge Studio

**What it is:**  
The crown jewel of Orvexa. While discussions are great, nobody wants to read 200 comments to find the solution. The Knowledge Base turns that conversation into a structured, permanent article (like an official playbook or guide).

**Nested Features & How They Work:**
* **Create from Anywhere:**
  * **From a Post:** Turn any post directly into knowledge (even with zero replies!).
  * **From a Discussion:** Pull insights from a deep debate.
  * **Independent:** Write a brand new guide from scratch.
* **Smart Outline Builder (Free & Instant):**
  * Orvexa uses built-in smart analysis (TF-IDF keyword grouping) to automatically break the source text into suggested section titles and key takeaways.
  * **Zero Cost:** This runs completely locally on the server without charging for expensive AI tokens.
* **Section Block Editor:** Add headings, summaries, formatted text blocks, and bullet points.
* **Provenance & Source Citations:**
  * At the top of every article, a badge displays: *"Derived from community [Post/Discussion]"*.
  * You can click to see the exact contributors whose comments were synthesized to make the article.
* **Version History & Instant Rollback:**
  * Every time an article is updated, a version snapshot is saved.
  * If a mistake is made, authors can click **Rollback** to restore any previous version.
* **Reading Time Estimator:** Automatically calculates reading time (e.g., `"5 min read"`) based on total words.

---

### 6. Circles

**What it is:**  
The "subreddits" or "spaces" of Orvexa. Circles allow groups of people with shared interests to gather.

**Nested Features & How They Work:**
* **3 Privacy Levels:**
  * **Public:** Anyone can view, join, and post.
  * **Private:** Anyone can see the circle exists, but they must request to join or be invited to view content.
  * **Invite-Only:** Completely hidden unless invited.
* **Circle-Specific Feed:** Posts, discussions, and knowledge created inside a circle appear exclusively on that circle’s page.
* **Circle Management:**
  * The creator is assigned as Circle Admin.
  * Can customize circle avatar, banner cover image, description, and community rules.

---

### 7. User Profiles & Personal Library

**What it is:**  
A user's home base and identity on the platform.

**Nested Features & How They Work:**
* **Comprehensive Profile Page (`/profile/:username`):**
  * Profile photo, custom avatar color, initials, headline, and bio.
  * Followers and Following counters with one-click follow button.
* **3 Dedicated Content Tabs:**
  * **Posts Tab:** All micro-posts published by the user. Clicking opens the post modal.
  * **Discussions Tab:** All discussions started by the user. Clicking takes you straight to the discussion reader.
  * **Knowledge Tab:** All published articles authored by the user.
* **My Library (`/library`):**
  * A private collection of everything you have clicked "Save" or "Bookmark" on across the platform.

---

### 8. Real-time Notifications & Direct Messaging

**What it is:**  
Keeps users connected with one another and alerted to community activity.

**Nested Features & How They Work:**
* **Notifications Hub (`/notifications`):**
  * Alerts when someone replies to your post or discussion.
  * Alerts when someone likes your content or follows you.
  * **Moderation Notices:** If staff deletes a post or discussion, a notification arrives explaining the reason (e.g., *"Removed: Violating community standards"*).
* **Direct Messaging (`/messages`):**
  * Start private 1-on-1 conversations with any member.
  * Real-time chat powered by Socket.IO so messages arrive instantly without refreshing.

---

### 9. Platform Moderation & Admin Console

**What it is:**  
A secure back-office dashboard only accessible to users with the role of moderator or admin.

**Nested Features & How They Work:**
* **System Health & Counter Metrics:** Real-time counters showing total active users, posts, discussions, knowledge guides, circles, and pending reports.
* **User Content Inspection Tool:**
  * Staff can search any user and click **Inspect Content**.
  * A modal displays all posts, discussions, and articles published by that user.
  * **Direct View/Open Buttons:** Staff can click **View** or **Open** to inspect the full item before taking action.
* **Safe Content Removal with Notification Reason:**
  * When an admin deletes inappropriate content, a prompt asks for a reason.


---

## Architecture & Tech Stack

* **Pattern:** Traditional Monolithic MVC (MongoDB, Express, React, Node.js)
* **Frontend (`/frontend`):** React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide icons
* **Backend (`/backend`):** Node.js, Express, MongoDB (Mongoose), Socket.IO

---

## Getting Started

### 1. Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Runs the Vite development server at `http://localhost:5173`.

### 2. Backend Development

```bash
cd backend
npm install
npm run dev
```

Runs the Express server with nodemon at `http://localhost:5001`.

### 3. Backend Tests

```bash
cd backend
npm test
```

The suite includes regression checks for post/discussion conversion, post ownership, Circle membership authorization, and messaging access.

