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
        files
          .filter(file => !file.isHidden) // Filter out hidden items
          .map((file, index) => {
            if (file.isFolder) {
              const isOpen = openFolders[file.name];

              return (
                <li key={index}>
                  <button onClick={() => toggleFolder(file.name)}>
                    {file.name}
                  </button>
                  {isOpen && file.subFolder && (
                    <FileSystem files={file.subFolder} onFileClick={onFileClick} />
                  )}
                </li>
              );
            }
            return null; // Skip rendering files here
          })}
      {files &&
        files
          .filter(file => !file.isHidden) // Filter out hidden items
          .map((file, index) => {
            if (!file.isFolder) {
              return (
                <li key={index}>
                  <button onClick={() => onFileClick(file.name)}>
                    {file.name}
                  </button>
                </li>
              );
            }
            return null; // Skip rendering folders here
          })}
    </ul>
  );
}

export default FileSystem;
