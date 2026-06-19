# ==================================================
# production-ready Dockerfile for Node Express Server
# Serves both the React frontend and Payments API
# ==================================================
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --silent

# Copy frontend source files and payments router
COPY . .

# Build React production static bundle into dist/
ENV NODE_ENV=production
RUN npm run build

EXPOSE 3000

# Start the Express server which serves frontend dist/ and handles payments endpoints
CMD ["node", "server.js"]