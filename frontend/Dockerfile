FROM node:20-slim

WORKDIR /app

# Install build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy dependency files and install
COPY package*.json ./
RUN npm install -g pnpm && pnpm install

# Copy source and build
COPY . .
RUN pnpm run build

# Create data directory for persistent SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["pnpm", "start"]
