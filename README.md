# Ticket Hub

A lightweight, modern ticketing system for managing work across multiple groups (projects), built with Next.js and MongoDB.

## Overview

Ticket Hub is designed for simple admin-only workflows with strict data-size limits and clean project segregation:

- One admin login
- Multiple work groups (projects)
- Tickets isolated by project
- Hard-delete operations for storage control
- Ready for Vercel deployment

## Core Features

- Authentication
	- Single admin account login
	- Signed, HTTP-only cookie session
- Project segmentation
	- Create, select, and delete work groups
	- Tickets are scoped per project (no cross-mixing)
- Ticket management
	- Create, update status/priority, filter, search, and delete
	- CSV export for visible ticket results
- Storage-conscious design
	- Tight field length limits
	- Hard delete for tickets and projects

## Tech Stack

- Next.js (App Router)
- React
- MongoDB + Mongoose
- CSS Modules

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local`:

```env
MONGODB_URI=your_mongodb_connection_string
AUTH_SECRET=your_long_random_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
```

Notes:

- `ADMIN_USERNAME` and `ADMIN_PASSWORD` default to `admin/admin` if not set.
- Use a strong, unique `AUTH_SECRET` in production.

### 3. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` - start local development server
- `npm run lint` - run ESLint
- `npm run build` - build production bundle
- `npm run start` - run production server

## Data Model and Limits

### Project

- `name` (required, max 40 chars)

### Ticket

- `title` (required, max 80 chars)
- `description` (optional, max 280 chars)
- `status`: `open`, `in_progress`, `resolve`, `delete`
- `priority`: `not_priority`, `medium`, `high_priority`, `critical`

## API Surface

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`

### Projects

- `GET /api/projects`
- `POST /api/projects`
- `DELETE /api/projects/:id`

### Tickets

- `GET /api/tickets?projectId=<id>`
- `POST /api/tickets`
- `PATCH /api/tickets/:id`
- `DELETE /api/tickets/:id`

## Deletion and Storage Behavior

- Ticket deletion is hard delete.
- Project deletion also hard-deletes all tickets under that project.
- This is optimized for limited free-tier database storage.

## Deployment (Vercel)

1. Push repository to GitHub.
2. Import project in Vercel.
3. Set environment variables:
	 - `MONGODB_URI`
	 - `AUTH_SECRET`
	 - `ADMIN_USERNAME`
	 - `ADMIN_PASSWORD`
4. Deploy.

## Security Recommendations

- Change default admin credentials before public deployment.
- Rotate `AUTH_SECRET` if compromised.
- Restrict MongoDB network access appropriately.
- Keep dependencies updated.

## Roadmap Ideas

- Multi-user role support
- Ticket assignment and due dates
- Activity history/audit log
- Attachments and comments
