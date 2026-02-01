# frontend/Dockerfile
#FROM node:18-alpine
FROM node:20-alpine

WORKDIR /app

# Copy dependency files first for caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 5173

# Vite needs --host to accept connections from outside the container
CMD ["npm", "run", "dev", "--", "--host"]
