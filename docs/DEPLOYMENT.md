# Deploying SecondChance

This application needs a Node.js/container host and MongoDB. The course uses IBM Skills Network, Kubernetes, and IBM Code Engine; use the deployment lab supplied with your enrollment for its account-specific commands and URLs.

## Required configuration

- Node.js 22.12+ (the Dockerfile uses Node.js 24).
- A reachable MongoDB database, with credentials supplied through MONGO_URL.
- MONGO_DB=secondChance (or your chosen database name).
- JWT_SECRET: generate at least 32 random characters and store it in the host's secret settings.
- PORT: the host's assigned HTTP port (default 3060).
- UPLOAD_DIR: a writable persistent directory for uploaded images.
- TRUST_PROXY=1 only if your hosting provider uses exactly one trusted reverse proxy.
- CORS_ORIGIN only if the React frontend is on a different origin.

Keep secrets out of Git. The frontend and API are served from the same host by default, so no API URL needs to be compiled into React.

## Container commands

```text
docker build -t secondchance .
```

For a local container-based verification, put a random JWT_SECRET in .env and run:

```text
docker compose up --build -d
docker compose exec app node secondChance-backend/util/import-mongo/index.js
```

This uses persistent database and upload volumes. Docker is not installed by this project.

## Hosted deployment sequence

1. Make MongoDB available to the application host using the course lab's deployment instructions.
2. Build and deploy the application container with the environment settings above.
3. Run the import script inside the application environment once. It is safe to rerun: existing IDs are not duplicated or overwritten.
4. Open the assigned HTTPS URL. Verify Get Started, item images, search, registration, and login.
5. Capture the landing page WITH the browser address bar. Save as deployed_landingpage.png.

A localhost screenshot demonstrates local execution only and should not be presented as a deployed website. No hosted deployment has been created by the local setup.
