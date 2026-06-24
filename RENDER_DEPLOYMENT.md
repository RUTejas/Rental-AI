# Deploy RentWise AI on Render

This deploys the real RentWise AI application. The Streamlit app is optional and is not used for tenant, admin, or master-admin workflows.

## Create the deployment

1. In Render, select **New** → **Blueprint**.
2. Connect the `RUTejas/Rental-AI` repository and select the `main` branch.
3. Render reads `render.yaml` and creates:
   - `rentwise-ai-db` — managed PostgreSQL
   - `rentwise-ai-api` — Express API
   - `rentwise-ai-web` — Next.js public application
4. Enter a unique `MASTER_ADMIN_EMAIL` and a strong `MASTER_ADMIN_PASSWORD` when Render requests the two protected values.
5. Create the Blueprint. The API runs its Prisma migration before deployment and then creates the single Master Admin on its first successful start.

## Set the API address

After both services are live, open the **rentwise-ai-web** service in Render:

1. Go to **Environment**.
2. Set `NEXT_PUBLIC_API_URL` to the exact public API service address followed by `/api`, for example `https://rentwise-ai-api.onrender.com/api`.
3. Save and select **Manual Deploy** → **Clear build cache & deploy**. This rebuild is required because Next.js exposes public environment variables at build time.
4. In **rentwise-ai-api** → **Environment**, set `FRONTEND_URL` to the exact public web service address, for example `https://rentwise-ai-web.onrender.com`.
5. Redeploy the API once more.

## Verify

- API: `https://YOUR-API-SERVICE.onrender.com/health` returns a JSON health response.
- Web: `https://YOUR-WEB-SERVICE.onrender.com` shows the RentWise landing page.
- Master login: `/master/login` using the email and password entered during Blueprint creation.

## Production notes

Use paid Render plans or an equivalent autoscaling service for a public 500+ user workload. Configure a custom domain, HTTPS, managed backups, and an external private object-store provider before accepting real ID documents. Local disk uploads are suitable only for development and single-instance testing.
