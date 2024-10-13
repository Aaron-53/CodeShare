import { io } from "socket.io-client";
import { useEffect, useState, useRef } from "react";
import FileSystem from "./components/FileSystem";

function App() {
  const [files, setFiles] = useState(null);
  const [content, setContent] = useState("");
  const [openFile, setOpenFile] = useState("");
  const openFileRef = useRef(openFile);
  const socket = useRef(null); // Use useRef to store the socket instance

  const handleFileClick = (name) => {
    console.log(`${name} clicked`);
    setOpenFile(name);
    openFileRef.current = name;
    socket.current.emit("reqFileContentFromServer", name);
  };

  useEffect(() => {
    // Initialize socket only once
    socket.current = io(import.meta.env.VITE_API_URL);

    // Emit the 'reqFileSystem' event only once when the component mounts
    socket.current.emit("reqFileSystemFromServer", {
      message: "Requesting file system data",
    });

    // Listen for the 'sendFileSystem' event and update state with file data
    socket.current.on("sendFileSystemFromServer", (data) => {
      setFiles(data);
      console.log(data);
    });

    socket.current.on("sendFileContentFromServer", (content) => {
      setContent(content);
      console.log("Received file content");
    });

    socket.current.on("fileSavedFromServer", (docName) => {
      console.log(`${docName} saved. Refreshing...`);
      socket.current.emit("reqFileSystemFromServer", {
        message: "Refreshing file system",
      });
      if (openFileRef.current) {
        socket.current.emit("reqFileContentFromServer", openFileRef.current);
      }
    });

    // Cleanup function to remove event listener and close the socket connection
    return () => {
      socket.current.off("sendFileSystem");
      socket.current.off("sendFileContent");
      socket.current.off("fileSaved");
      socket.current.disconnect(); // Close the socket connection when component unmounts
    };
  }, []); // Empty dependency array ensures this runs only on mount

  return (
    <div className="flex flex-col">
      <div className="w-[20vw]">
        <h3>File Structure</h3>
        {files && (
          <div>
            <FileSystem files={files} onFileClick={handleFileClick} />
          </div>
        )}
      </div>
      <div>
        <h3>Content</h3>
        <pre>{content}</pre>
      </div>
    </div>
  );
}

export default App;
