# Use a Node.js base image with Bun pre-installed
FROM oven/bun:latest

# Set the working directory in the container
WORKDIR /app

# Copy package.json and bun.lockb to the working directory
COPY package.json bun.lock ./

# Install dependencies using Bun
RUN bun install

# Copy the rest of the application code to the working directory
COPY . .

# Set environment variables
ENV NEXT_PUBLIC_CHAT_HUB_URL=https://chat-api.whysocket.dev

# Build the Next.js application for production
RUN bun run build

# Expose the port the Next.js application will run on
EXPOSE 3000

# Start the Next.js application using bun start
CMD ["bun", "start"]