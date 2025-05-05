# Use official Node.js LTS base image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Bundle app source
COPY src ./src

COPY . .

# Set environment variables
ENV NODE_ENV=production

# Define the command to run the app
CMD ["npm", "start"]
