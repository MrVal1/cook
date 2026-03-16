FROM node:20-alpine
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Ensure data directory exists for the JSON database
RUN mkdir -p data

# Environment — override HOST so the server listens on all interfaces
ENV HOST=0.0.0.0
ENV PORT=3001

EXPOSE 3001
CMD ["node", "server.js"]
