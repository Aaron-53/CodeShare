import { io } from "socket.io-client";
import { useEffect, useState } from "react";
import FileSystem from "./components/fileSystem";

function App() {
  const [files, setFiles] = useState(null);
  const [content, setContent] = useState("");
  const socket = io("http://localhost:5000");

  const handleFileClick = (name) => {
    console.log(`${name} clicked`);
    socket.emit("reqFileContent", name);
  };

  useEffect(() => {
    // Emit the 'reqFileSystem' event only once when the component mounts
    socket.emit("reqFileSystem", { message: "Requesting file system data" });

    // Listen for the 'sendFileSystem' event and update state with file data
    socket.on("sendFileSystem", (data) => {
      setFiles(data);
      console.log(data);
    });

    socket.on("sendFileContent", (content) => {
      console.log("received contents in client");
      setContent(content);
    });

    // Cleanup function to remove event listener and close the socket connection
    return () => {
      socket.off("sendFileSystem");
      socket.off("sendFileContent");
      socket.disconnect(); // Close the socket connection when component unmounts
    };
  }, [socket]); // Empty dependency array ensures this runs only on mount

  return (
    <div>
      <h3>File Structure</h3>
      {files && (
        <div>
          {/* <h3>Received Files:</h3> */}
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
