import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './events/socket';
import dotenv from 'dotenv';
import app from './app';

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server listening on http://0.0.0.0:${PORT}`);
});

const startServer = async () => {
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  setupSocketHandlers(io);

  app.set('io', io);

  httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Socket.io is ready`);
  });
};

startServer();
