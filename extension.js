const vscode = require("vscode");
const { Server } = require("socket.io");
const cors = require("cors");
const express = require("express");
const http = require("http"); // Add this line to import http
const { io } = require("socket.io-client");
require("dotenv").config();

let cachedFileSystem = null; // Cache for file system data
const CHUNK_SIZE = 1000; // Number of files per chunk
let currentRoomCode = null; // Add this to store the room code

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const socket = io("http://localhost:3000");
  socket.on('connect', () => {
    socket.emit("Extension");
  });

  socket.on('roomCode', (code) => {
    currentRoomCode = code; // Store the room code
    vscode.window.showInformationMessage(`Room Code: ${code}`);
    console.log(`Connected to room: ${code}`);
  });

  // Initialize file system cache when extension activates
  initializeFileSystem();

  // Update cache when files change
  vscode.workspace.onDidChangeWorkspaceFolders(() => initializeFileSystem());
  vscode.workspace.onDidCreateFiles(() => initializeFileSystem());
  vscode.workspace.onDidDeleteFiles(() => initializeFileSystem());
  vscode.workspace.onDidRenameFiles(() => initializeFileSystem());

  socket.on("reqFileSystemFromExtension", (msg) => {
    console.log(`Requesting file system from extension by socket ${msg} in room ${currentRoomCode}`);
    if (cachedFileSystem) {
      console.log(`Sending cached file system in chunks for socket ${msg} in room ${currentRoomCode}`);
      sendFileSystemInChunks(socket, cachedFileSystem, msg);
    } else {
      fileSystemRetreive(socket, msg);
    }
  });

  socket.on("reqFileContentFromExtension", (msg) => {
    getFileContent(socket, msg);
  });

  vscode.workspace.onDidChangeTextDocument((document) => {
    socket.emit("fileSavedFromExtension", { docName: document.fileName, roomCode: currentRoomCode });
  });
  vscode.workspace.onDidCreateFiles((document) => {
    socket.emit("fileSavedFromExtension", { docName: document.fileName, roomCode: currentRoomCode });
  });

  console.log(`Extension "codeshare" is now active in room ${currentRoomCode}!`);

  // Register VS Code commands
  const disposables = [
    vscode.commands.registerCommand("codeshare.helloWorld", function () {
      vscode.window.showInformationMessage("Hello World from CodeShare!");
    }),
    vscode.commands.registerCommand("codeshare.showRoomCode", function () {
      if (currentRoomCode) {
        vscode.window.showInformationMessage(`Current Room Code: ${currentRoomCode}`);
      } else {
        vscode.window.showInformationMessage("No active room code");
      }
    })
  ];

  // Push disposables to context subscriptions
  context.subscriptions.push(...disposables);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

const sendFileSystemInChunks = (socket, files, socketId) => {
  const fileStr = JSON.stringify(files);
  const chunks = Math.ceil(fileStr.length / CHUNK_SIZE);
  
  // Send total number of chunks first
  socket.emit("fileSystemChunkStart", { totalChunks: chunks, socket: socketId, roomCode: currentRoomCode });

  // Send chunks
  for(let i = 0; i < chunks; i++) {
    const chunk = fileStr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    socket.emit("fileSystemChunk", {
      chunk,
      chunkIndex: i,
      socket: socketId,
      roomCode: currentRoomCode
    });
  }

  // Send completion message
  socket.emit("fileSystemChunkEnd", { socket: socketId, roomCode: currentRoomCode });
  console.log(`File system sent in chunks to socket ${socketId} in room ${currentRoomCode}`);
};

const getFileContent = async (socket, msg) => {
  try {
    const path = await getFileUri(msg.name);
    const doc = await vscode.workspace.openTextDocument(path);
    const text = doc.getText();
    socket.emit("sendFileContentFromExtension", {
      text,
      socket: msg.socket,
      name: msg.name,
      roomCode: currentRoomCode
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Error: ${error}`);
  }
};

const getFileUri = async (name) => {
  try {
    const files = await vscode.workspace.findFiles(`**/${name}`);
    if (files.length > 0) {
      const fileUri = files[0];
      return fileUri;
    } else {
      vscode.window.showErrorMessage(`File "${filename}" not found.`);
      return null;
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error: ${error}`);
  }
};

const initializeFileSystem = async () => {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const folderUri = workspaceFolders[0].uri;
      cachedFileSystem = await folderSearch(folderUri);
      console.log(`File system cache initialized in room ${currentRoomCode}`);
    }
  } catch (error) {
    console.error(`Error initializing file system cache in room ${currentRoomCode}:`, error);
    cachedFileSystem = null;
  }
};

const fileSystemRetreive = async (socket, id) => {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const folderUri = workspaceFolders[0].uri;
      const files = await folderSearch(folderUri);
      cachedFileSystem = files; // Update cache
      console.log(`File structure retrieved for socket ${id} in room ${currentRoomCode}`);
      sendFileSystemInChunks(socket, files, id);
      console.log(`File structure sent in chunks to socket ${id} in room ${currentRoomCode}`);
    } else {
      vscode.window.showInformationMessage("No workspace folder found.");
    }
  } catch (error) {
    console.error(`Error reading directory in room ${currentRoomCode}:`, error);
    vscode.window.showErrorMessage("Error reading the workspace folder.");
  }
};

const folderSearch = async (uri) => {
  const files = await vscode.workspace.fs.readDirectory(uri);
  const formattedFiles = await Promise.all(
    files.map(async ([name, type]) => {
      const newUri = vscode.Uri.joinPath(uri, name);
      const isHidden = await checkIfHidden(newUri); // Check if the file is hidden

      let subFolder = [];
      if (type === vscode.FileType.Directory) {
        subFolder = await folderSearch(newUri);
      }

      return {
        name: name,
        isFolder: type === vscode.FileType.Directory,
        opened: false,
        isHidden: isHidden, // Add isHidden property
        subFolder: subFolder,
      };
    })
  );
  return formattedFiles;
};

// Function to check if a file is hidden
const checkIfHidden = async (uri) => {
  try {
    const stats = await vscode.workspace.fs.stat(uri);
    // Check if the name starts with '.' (common for hidden files)
    return uri.path.split('/').pop().startsWith('.');
  } catch (error) {
    console.error(`Error checking if hidden in room ${currentRoomCode}: ${error}`);
    return false; // Default to false if there's an error
  }
};
