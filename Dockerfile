# --- Stage 1: build do front (Vite) ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 2: runtime ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY server ./server
COPY migrations ./migrations
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "server/index.js"]
