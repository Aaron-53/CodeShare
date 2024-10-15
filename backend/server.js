const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const port = 3000;

const server = http.createServer(app);
let extension;

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("Extension", () => {
    extension = socket.id;
  })

  socket.on("reqFileSystemFromServer", (msg) => {
    console.log("FileSystemRequest from", socket.id);
    io.to(extension).emit("reqFileSystemFromExtension", socket.id);
  });

  socket.on("reqFileContentFromServer", (name) => {
    console.log("FileContentRequest from", socket.id);
    io.to(extension).emit("reqFileContentFromExtension", {name, socket:socket.id});
  });

  socket.on("sendFileSystemFromExtension", (msg) => {
    console.log("SendingFileSystem to", msg.socket);
    io.emit("sendFileSystemFromServer", msg.files);
  });

  socket.on("sendFileContentFromExtension", (data) => {
    console.log("SendingFileContent to", data.socket);
    io.to(data.socket).emit("sendFileContentFromServer", {content:data.text, name:data.name});
  });

  socket.on("fileSavedFromExtension", (data) => {
    console.log("\nfileSaved");
    io.emit("fileSavedFromServer", data.docName);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
