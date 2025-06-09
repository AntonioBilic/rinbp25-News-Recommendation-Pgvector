# Use official Node.js LTS version
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the entire app
COPY . .

# Expose port (default for Express)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
