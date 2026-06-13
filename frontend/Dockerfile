# ==========================================
# Stage 1: Build static assets using Node.js
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --silent

# Copy frontend source files
COPY . .

# Build production static bundle
ENV NODE_ENV=production
RUN npm run build

# ==========================================
# Stage 2: Serve assets using Nginx
# ==========================================
FROM nginx:1.25-alpine

# Copy compiled build to Nginx serving directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Apply custom single-page application routing configurations
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
