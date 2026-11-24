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
