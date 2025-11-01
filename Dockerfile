# Dockerfile à la racine pour Render.com
# Ce fichier pointe vers le Dockerfile dans api/
FROM node:20-alpine

WORKDIR /app

# Copy package files from api directory
COPY api/package.json api/package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy application code from api directory
COPY api/server.js .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

# Use node directly instead of npm start (no nodemon in prod)
CMD ["node", "server.js"]

