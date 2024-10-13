import { io } from "socket.io-client";
import { useEffect, useState, useRef } from "react";
import FileSystem from "./components/fileSystem";

function App() {
  const [files, setFiles] = useState(null);
  const [content, setContent] = useState("");
  const socket = useRef(null); // Use useRef to store the socket instance

  const handleFileClick = (name) => {
    console.log(`${name} clicked`);
    socket.current.emit("reqFileContent", name);
  };

  useEffect(() => {
    // Initialize socket only once
    socket.current = io("http://localhost:5000");

    // Emit the 'reqFileSystem' event only once when the component mounts
    socket.current.emit("reqFileSystem", { message: "Requesting file system data" });

    // Listen for the 'sendFileSystem' event and update state with file data
    socket.current.on("sendFileSystem", (data) => {
      setFiles(data);
      console.log(data);
    });

    socket.current.on("sendFileContent", (content) => {
      console.log("received contents in client");
      setContent(content);
    });

    // Cleanup function to remove event listener and close the socket connection
    return () => {
      socket.current.off("sendFileSystem");
      socket.current.off("sendFileContent");
      socket.current.disconnect(); // Close the socket connection when component unmounts
    };
  }, []); // Empty dependency array ensures this runs only on mount

  return (
    <div>
      <h3>File Structure</h3>
      {files && (
        <div>
          <FileSystem files={files} onFileClick={handleFileClick} />
        </div>
      )}
      <div>
        <h3>Content</h3>
        <pre>{content}</pre>
      </div>
    </div>
  );
}

export default App;
