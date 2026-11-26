# Orvexa

Orvexa is a social space to discover, explore, connect, and build on ideas and content. It blends everyday social conversations with deep discussions and a distinct publication-grade Knowledge environment.

Reference documents:
- **Product & Engineering Specification:** `ORVEXA_MASTER_BUILD_SPEC.md`
- **Application Prototype & UI Baseline:** `orbit-design-prototype (1).html`
- **Implementation Tracker:** `IMPLEMENTATION_STATUS.md`

---

## Architecture & Tech Stack

- **Pattern:** Traditional Monolithic MVC (MongoDB, Express, React, Node.js)
- **Frontend (`/frontend`):** React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide icons
- **Backend (`/backend`):** Node.js, Express, MongoDB (Mongoose), Socket.IO

## Circles and group messaging

Circles bring posts, discussions, knowledge resources, membership, announcements, and a shared group conversation together. Circle data and membership are persisted with Mongoose; Circle visibility and membership roles are enforced by the API.

- Browse, search, join, and manage Circles from **Circles**.
- Create Circle-associated posts, discussions, and knowledge using the existing content workflows.
- Circle group chats are ordinary conversations in **Messages**, with persisted message history and authenticated Socket.IO delivery.
- Owners and admins can manage Circle settings, membership requests, invitations, featured content, and analytics. Moderators can review reports and moderate messages according to Circle permissions.

The backend exposes Circle endpoints under `/api/circles` and reuses `/api/conversations` for direct and Circle group messaging. A Circle group conversation is associated with its Circle and active Circle membership is authoritative for chat access.

### Replacing Circle seed data

The explicit Circle replacement utility removes Circle records and their associated posts, discussions, knowledge, memberships, invitations, moderation records, notifications, reports, and group conversations/messages. It preserves users and non-Circle content, and performs execution in a MongoDB transaction.

Set `MONGODB_URI` in the backend environment, verify a restorable backup, and provide the intended database name explicitly. Preview counts first:

```bash
cd backend
NODE_ENV=production MONGODB_DATABASE=your_database \
CIRCLE_RESET_EXPECTED_DATABASE=your_database \
npm run seed:circles -- --dry-run
```

Only after reviewing the preview, execute the replacement with the exact database confirmation:

```bash
NODE_ENV=production MONGODB_DATABASE=your_database \
CIRCLE_RESET_EXPECTED_DATABASE=your_database \
CIRCLE_RESET_CONFIRMATION=replace-circle-data:your_database \
CIRCLE_RESET_BACKUP_CONFIRMED=yes \
npm run seed:circles -- --execute
```

The replacement seeds five public Circles with sample posts, discussions, Knowledge articles, announcements, group conversations, and memberships using existing active users. It refuses to run without the production flag, an explicitly matched database name, and execution/backup confirmations.

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

### 3. Backend tests

```bash
cd backend
npm test
```

The suite includes regression checks for post/discussion conversion, post ownership, Circle membership authorization, and messaging access.
