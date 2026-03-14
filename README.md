# Bowen Web

Next.js 15 photo gallery deployed with OpenNext on Cloudflare Workers, backed by Prisma 7 and Neon Postgres.

## Local setup

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example` and fill in:

```bash
DATABASE_URL=...
DIRECT_URL=...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
SESSION_SECRET=...
```

`DIRECT_URL` is optional but recommended for Prisma CLI and migrations. Runtime reads `DATABASE_URL`.

## Development

Run the Next.js dev server:

```bash
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
```

## Database

Generate the Prisma client:

```bash
npm run db:generate
```

Apply committed migrations to the target database:

```bash
npm run db:migrate:deploy
```

Seed the database from the legacy Vite dataset:

```bash
npm run db:seed
```

## Cloudflare Workers

Local Workers preview expects a `.dev.vars` file. Start from `.dev.vars.example` and fill in the same runtime secrets used above.

Build and preview the Workers bundle locally:

```bash
npm run preview
```

Build and deploy to Cloudflare Workers:

```bash
npm run deploy
```

Required Cloudflare runtime secrets:

- `DATABASE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

The Wrangler config already enables `nodejs_compat` and targets the OpenNext worker output in `.open-next/worker.js`.
