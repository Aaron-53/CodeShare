const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const port = 3000;

const server = http.createServer(app);
let roomToExtension = new Map(); // Map room codes to extension socket IDs

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  
  let fileSystemChunks = {};

  socket.on("Extension", () => {
    console.log("Extension:", socket.id);
    // Generate random room code
    const roomCode = crypto.randomBytes(4).toString('hex');
    socket.join(roomCode);
    roomToExtension.set(roomCode, socket.id);
    console.log(`Extension joined room: ${roomCode}`);
    // Send room code back to extension
    socket.emit("roomCode", roomCode);
  })

  socket.on("reqFileSystemFromServer", ({roomCode}) => {
    const extensionId = roomToExtension.get(roomCode);
    console.log(`FileSystemRequest from ${socket.id} in room ${roomCode}`);
    if (!roomToExtension.has(roomCode)) {
      socket.emit("roomNotFound");
      return;
    }
    if (extensionId) {
      socket.join(roomCode);
      io.to(extensionId).emit("reqFileSystemFromExtension", socket.id);
    } else {
      socket.emit("roomCrashed");
    }
  });

  socket.on("reqFileContentFromServer", ({name, roomCode}) => {
    const extensionId = roomToExtension.get(roomCode);
    console.log(`FileContentRequest from ${socket.id} in room ${roomCode}`);
    if (!roomToExtension.has(roomCode)) {
      socket.emit("roomNotFound");
      return;
    }
    if (extensionId) {
      socket.join(roomCode);
      io.to(extensionId).emit("reqFileContentFromExtension", {name, socket:socket.id});
    } else {
      socket.emit("roomCrashed");
    }
  });

  socket.on("fileSystemChunkStart", ({totalChunks, socket, roomCode}) => {
    fileSystemChunks[socket] = {
      chunks: new Array(totalChunks),
      received: 0,
      total: totalChunks,
      roomCode
    };
  });

  socket.on("fileSystemChunk", ({chunk, chunkIndex, socket, roomCode}) => {
    if (fileSystemChunks[socket]) {
      fileSystemChunks[socket].chunks[chunkIndex] = chunk;
      fileSystemChunks[socket].received++;

      if (fileSystemChunks[socket].received === fileSystemChunks[socket].total) {
        const completeData = fileSystemChunks[socket].chunks.join('');
        const files = JSON.parse(completeData);
        console.log(`SendingFileSystem to ${socket} in room ${roomCode}`);
        io.to(socket).emit("sendFileSystemFromServer", files);
        delete fileSystemChunks[socket];
      }
    }
  });

  socket.on("fileSystemChunkEnd", ({socket, roomCode}) => {
    if (fileSystemChunks[socket] && 
        fileSystemChunks[socket].received < fileSystemChunks[socket].total) {
      console.log(`Warning: Chunks missing for ${socket} in room ${roomCode}`);
      delete fileSystemChunks[socket];
    }
  });

  socket.on("sendFileContentFromExtension", (data) => {
    console.log(`SendingFileContent to ${data.socket} in room ${data.roomCode}`);
    io.to(data.socket).emit("sendFileContentFromServer", {content:data.text, name:data.name});
  });

  socket.on("fileSavedFromExtension", (data) => {
    console.log(`\nfileSaved in room ${data.roomCode}`);
    io.to(data.roomCode).emit("fileSavedFromServer", data.docName);
  });

  socket.on("disconnect", () => {
    // Find the room code by iterating through roomToExtension
    let disconnectedRoomCode;
    for (const [roomCode, extensionId] of roomToExtension.entries()) {
      if (extensionId === socket.id) {
        disconnectedRoomCode = roomCode;
        break;
      }
    }

    console.log(`A user disconnected: ${socket.id} from room ${disconnectedRoomCode}`);
    
    // Clean up room mapping when extension disconnects
    if (disconnectedRoomCode) {
      roomToExtension.delete(disconnectedRoomCode);
      io.to(disconnectedRoomCode).emit("roomCrashed");
    }
  });
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
