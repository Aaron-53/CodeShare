import React, { useState } from "react";

function FileSystem({ files }) {
  const [openFolders, setOpenFolders] = useState({});

  const toggleFolder = (name) => {
    setOpenFolders((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <ul>
      {files &&
        files.map((file, index) => {
          const isOpen = openFolders[file.name];

          return file.isFolder ? (
            <li key={index}>
              <button onClick={() => toggleFolder(file.name)}>
                {file.name}
              </button>
              {isOpen && file.subFolder && (
                <FileSystem files={file.subFolder} />
              )}
            </li>
          ) : (
            <li key={index}>
              <p>{file.name}</p>
            </li>
          );
        })}
    </ul>
  );
}

export default FileSystem;
