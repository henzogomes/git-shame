# Git Shame

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Prerequisites

- [Node.js](https://nodejs.org/)
- [Docker](https://www.docker.com/get-started)

## Database Setup

This project uses PostgreSQL. To set up the database for local development:

1. Start a PostgreSQL container:

```bash
docker run --name db_postgres -e POSTGRES_PASSWORD=docker -p 5432:5432 -d postgres
```

2. For subsequent runs, start the existing container:

```bash
docker start db_postgres
```

3. Run migrations to set up the database schema:

```bash
npm run migrate up
```

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open http://localhost:3000 with your browser to see the result.

You can start editing the page by modifying app/page.tsx. The page auto-updates as you edit the file.

This project uses next/font to automatically optimize and load Geist, a new font family for Vercel.
