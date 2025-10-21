# Use a Node.js base image
FROM node:20

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json (or yarn.lock) to the container
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the project files to the container
COPY . .

# Build the Vite app
RUN npm run build

# Expose port 3000 for the app
EXPOSE 3000

# Use a static server (like serve) to serve the built app
RUN npm install -g serve

# Start the app using 'serve'
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:3000"]
