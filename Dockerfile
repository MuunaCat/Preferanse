FROM node:20-alpine

WORKDIR /app

# Build client
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Build server
COPY server/package*.json ./server/
RUN cd server && npm install

COPY server/ ./server/
RUN cd server && npm run build

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
