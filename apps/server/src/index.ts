import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("room:join", (roomId) => {
    socket.join("roomId");

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
