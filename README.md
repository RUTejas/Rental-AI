# RentWise AI

RentWise AI is a role-scoped rental administration platform for one Master Admin, multiple property Admins, and tenants. It manages properties, rental records, agreements, documents, requests, notifications, audit logs, and analytics—without any payment collection or payment tracking features.

## Start locally

1. Start PostgreSQL with `docker compose up -d db`.
2. Copy `.env.example` to `backend/.env` and replace every secret.
3. In `backend`, run `npx prisma db push`, then `npm run dev`.
4. In `frontend`, set `NEXT_PUBLIC_API_URL=http://localhost:5000/api` in `.env.local`, then run `npm run dev`.

The backend health endpoint is available at `http://localhost:5000/health`.

## Production containers

Set the secret environment variables shown in `.env.example`, then run `docker compose up --build -d`. The frontend is exposed on port 3000 and the API on port 5000.

## Streamlit Cloud companion

The repository includes `streamlit_app.py` for a public RentWise AI companion page. Streamlit Cloud installs `requirements.txt` automatically. In the Streamlit app settings, add `RENTWISE_API_URL` as a secret (for example, `https://api.example.com/health`) to enable its backend status indicator. The authenticated application itself is served by the Next.js frontend and Express API.

## Roles and entry points

- Master Admin: `/master/login` — seeded only, never publicly registered.
- Admin: `/admin/signup` and `/admin/login` — requires Master Admin approval.
- Tenant: `/user/signup` and `/user/login` — tenant registration requires an approved Admin invitation ID.

All authentication forms use the server-generated CAPTCHA endpoint. Protected API routes use JWT role checks; Admin API queries are scoped to the authenticated Admin, and tenant routes are scoped to the authenticated tenant.

## Checks

Run `npm run build` in both `backend` and `frontend`. The Jenkins pipeline installs dependencies, builds both applications, runs backend tests, builds the Docker images, and checks the backend health endpoint.

## Security notes

Use unique long production secrets, HTTPS at the reverse proxy, managed PostgreSQL backups, and private object storage for uploads in production. Do not expose the `uploads` directory directly. The project deliberately excludes all payment features.
