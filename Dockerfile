# AI Talk Radio (Ungated) — studio + API in one container
#
#   docker build -t ai-talk-radio .
#   docker run -p 7860:7860 -e GEMINI_API_KEY=... ai-talk-radio
#
# Runs without a key too: episode writing falls back to the built-in synthesizer, then to the
# browser-side writer. PORT defaults to 7860 for Hugging Face Docker Spaces.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm run build:server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7860
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||7860)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist-server/server.js"]
