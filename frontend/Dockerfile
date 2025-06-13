# Use an official Node.js image (lightweight Alpine variant)
FROM node:lts-alpine

# Set working directory inside the container
WORKDIR /app

# Copy only package.json and package-lock.json first (for efficient caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy the rest of frontend code
COPY . .

# Expose React dev server port
EXPOSE 3000

# Default command: start React dev server
# CMD ["npm", "start"]