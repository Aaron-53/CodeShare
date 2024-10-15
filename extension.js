const vscode = require("vscode");
const { Server } = require("socket.io");
const cors = require("cors");
const express = require("express");
const http = require("http"); // Add this line to import http
const { io } = require("socket.io-client");
require("dotenv").config();

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const socket = io("https://codeshare-azkv.onrender.com");
  socket.on('connect', () => {
    socket.emit("Extension");
});

  socket.on("reqFileSystemFromExtension", (msg) => {
    console.log("req")
    fileSystemRetreive(socket, msg)});
  socket.on("reqFileContentFromExtension", (msg) => {
    getFileContent(socket, msg);
  });

  vscode.workspace.onDidSaveTextDocument((document) => {
    socket.emit("fileSavedFromExtension", { docName: document.fileName });
  });

  console.log('Congratulations, your extension "codeshare" is now active!');

  // Register a VS Code command
  const disposable = vscode.commands.registerCommand(
    "codeshare.helloWorld",
    function () {
      vscode.window.showInformationMessage("Hello World from CodeShare!");
    }
  );

  // Push disposables to context subscriptions
  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

const getFileContent = async (socket, msg) => {
  try {
    const path = await getFileUri(msg.name);
    const doc = await vscode.workspace.openTextDocument(path);
    const text = doc.getText();
    socket.emit("sendFileContentFromExtension", {text, socket:msg.socket, name:msg.name});
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

const fileSystemRetreive = async (socket, id) => {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const folderUri = workspaceFolders[0].uri;
      const files = await folderSearch(folderUri);
      socket.emit("sendFileSystemFromExtension", {files, socket:id});
    } else {
      vscode.window.showInformationMessage("No workspace folder found.");
    }
  } catch (error) {
    console.error("Error reading directory:", error);
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
    console.error(`Error checking if hidden: ${error}`);
    return false; // Default to false if there's an error
  }
};

