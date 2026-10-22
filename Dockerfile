FROM node:22.20-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG API_INTERNAL_URL=http://api:4000
ENV API_INTERNAL_URL=$API_INTERNAL_URL
RUN npm run build

FROM node:22.20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build /repo/.next/standalone ./
COPY --from=build /repo/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
