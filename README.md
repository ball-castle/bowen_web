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
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
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

Dry-run the legacy photo migration to Cloudinary:

```bash
npm run db:migrate:legacy-cloudinary:dry-run
```

Run the live migration after secrets are configured:

```bash
npm run db:migrate:legacy-cloudinary
```

## Cloudflare Workers

Local Workers preview expects a `.dev.vars` file. Start from `.dev.vars.example` and fill in the same runtime secrets used above.

Build and preview the Workers bundle locally:

```bash
npm run preview
```

Build and deploy to Cloudflare Workers:

```bash
npm run cf:secrets
npm run deploy
```

Preview the Cloudflare secret sync without uploading anything:

```bash
npm run cf:secrets:dry-run
```

Required Cloudflare runtime secrets:

- `DATABASE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

The Wrangler config already enables `nodejs_compat` and targets the OpenNext worker output in `.open-next/worker.js`.

## Production checklist

1. Replace `.env` `DATABASE_URL` with a real Neon connection string.
2. Run `npm run db:migrate:deploy`.
3. Optionally run `npm run db:seed`.
4. Log in to Cloudflare with `wrangler login`.
5. Run `npm run cf:secrets`.
6. Run `npm run db:migrate:legacy-cloudinary:dry-run`.
7. Run `npm run db:migrate:legacy-cloudinary`.
8. Run `npm run deploy`.
9. In Cloudflare, attach your custom domain to the `bowen-web` worker.
