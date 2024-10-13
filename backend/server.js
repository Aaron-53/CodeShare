const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const port = 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("reqFileSystemFromServer", (msg) => {
    console.log("FileSystemRequest from", socket.id);
    io.emit("reqFileSystemFromExtension", msg);
  });

  socket.on("reqFileContentFromServer", (name) => {
    console.log("FileContentRequest from", socket.id);
    io.emit("reqFileContentFromExtension", name);
  });

  socket.on("sendFileSystemFromExtension", (msg) => {
    console.log("SendingFileSystem to", socket.id);
    io.emit("sendFileSystemFromServer", msg);
  });

  socket.on("sendFileContentFromExtension", (msg) => {
    console.log("SendingFileContent to", socket.id);
    io.emit("sendFileContentFromServer", msg);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
