import { io } from "socket.io-client";
import { useEffect, useState } from "react";
import FileSystem from "./components/fileSystem";

function App() {
  const [files, setFiles] = useState(null);

  useEffect(() => {
    const socket = io("http://localhost:5000");

    // Emit the 'reqFileSystem' event only once when the component mounts
    socket.emit("reqFileSystem", { message: "Requesting file system data" });

    // Listen for the 'sendFileSystem' event and update state with file data
    socket.on("sendFileSystem", (data) => {
      setFiles(data);
      console.log(data); // Log received data
    });

    // Cleanup function to remove event listener and close the socket connection
    return () => {
      socket.off("sendFileSystem"); // Properly remove the 'sendFileSystem' listener
      socket.disconnect(); // Close the socket connection when component unmounts
    };
  }, []); // Empty dependency array ensures this runs only on mount

  return (
    <div>
      <button> halo </button>
      {files && (
        <div>
          <h3>Received Files:</h3>
          <FileSystem files = {files} />
        </div>
      )}
    </div>
  );
}

export default App;
