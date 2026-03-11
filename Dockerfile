FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies
RUN cd server && npm install --production
RUN cd client && npm install

# Copy source files
COPY . .

# Build client
RUN cd client && npm run build

# ── Production Stage ──
FROM node:20-alpine

WORKDIR /app

# Copy server + built client
COPY --from=build /app/server ./server
COPY --from=build /app/scanner ./scanner
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/package.json ./

# Install production deps only
RUN cd server && npm install --production

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server/server.js"]
