# Use Node.js LTS as the base image
FROM node:lts-alpine

# Set working directory
WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Expose port (adjust if your frontend uses a different port)
EXPOSE 8000

# Start the development server
CMD ["yarn", "dev"]