import React, { useState } from "react";

function FileSystem({ files, onFileClick }) {
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
                <FileSystem files={file.subFolder} onFileClick={onFileClick} />
              )}
            </li>
          ) : (
            <li key={index}>
              <button onClick={() => onFileClick(file.name)}>
                {file.name}
              </button>
            </li>
          );
        })}
    </ul>
  );
}

export default FileSystem;
