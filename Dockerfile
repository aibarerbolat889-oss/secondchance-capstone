FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3060
WORKDIR /app
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/secondChance-backend/public/uploads && chown node:node /app/secondChance-backend/public/uploads
USER node
EXPOSE 3060
CMD ["node", "secondChance-backend/app.js"]
