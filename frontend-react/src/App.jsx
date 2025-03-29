import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileIcon,
  Save,
  RefreshCw,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import { io } from "socket.io-client";

export default function SocketCodeEditor() {
  const [files, setFiles] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFilePath, setSelectedFilePath] = useState([""]);
  const [expandedFolders, setExpandedFolders] = useState(
    new Set(["root"])
  );
  const [isFileTreeVisible, setIsFileTreeVisible] = useState(true);
  const [lineNumbers, setLineNumbers] = useState([]);
  const [fileContent, setFileContent] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [showModal, setShowModal] = useState(true);
  const [roomError, setRoomError] = useState(null);
  const socketRef = useRef(null);
  const selectedFileRef = useRef(null);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
    socketRef.current = io(API_URL);

    socketRef.current.on("roomNotFound", () => {
      setRoomError("Room does not exist");
      setShowModal(true);
    });

    socketRef.current.on("roomCrashed", () => {
      setRoomError("Room crashed. Please try again.");
      setShowModal(true);
    });

    socketRef.current.on("sendFileSystemFromServer", (data) => {
      const convertedData = convertServerFilesToFileSystemNode(data);
      setFiles(convertedData);
      console.log("Received file system data:", data);
    });

    socketRef.current.on("sendFileContentFromServer", (data) => {
      setSelectedFile(data.name);
      selectedFileRef.current = data.name;
      setFileContent(data.content);

      const lines = data.content.split("\n");
      setLineNumbers(Array.from({ length: lines.length }, (_, i) => i + 1));

      if (files) {
        const path = findFilePath(files, data.name);
        if (path) {
          setSelectedFilePath(path);
        }
      }

      console.log("Received file content for:", data.name);
    });

    socketRef.current.on("fileSavedFromServer", (docName) => {
      toast.success(`${docName} saved successfully`);
      console.log(`${docName} saved. Refreshing...`);

      socketRef.current.emit("reqFileSystemFromServer", {
        roomCode
      });

      if (selectedFileRef.current) {
        socketRef.current.emit("reqFileContentFromServer", {
          name: selectedFileRef.current,
          roomCode
        });
      }
    });

    return () => {
      socketRef.current.off("sendFileSystemFromServer");
      socketRef.current.off("sendFileContentFromServer");
      socketRef.current.off("fileSavedFromServer");
      socketRef.current.off("roomNotFound");
      socketRef.current.off("roomCrashed");
      socketRef.current.disconnect();
    };
  }, [roomCode]);

  const handleRoomCodeSubmit = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      toast.error("Please enter a room code");
      return;
    }
    setRoomError(null);
    setShowModal(false);
    socketRef.current.emit("reqFileSystemFromServer", {
      roomCode
    });
  };

  useEffect(() => {
    if (files && selectedFile) {
      const path = findFilePath(files, selectedFile);
      if (path) {
        setSelectedFilePath(path);
      }
    }
  }, [files, selectedFile]);

  const convertServerFilesToFileSystemNode = (serverFiles) => {
    const rootNode = {
      name: "root",
      type: "folder",
      children: [],
    };

    const processFiles = (files, parentNode) => {
      files
        .filter((file) => file.isFolder && !file.isHidden)
        .forEach((folder) => {
          const folderNode = {
            name: folder.name,
            type: "folder",
            children: [],
          };

          parentNode.children.push(folderNode);

          if (folder.subFolder) {
            processFiles(folder.subFolder, folderNode);
          }
        });

      files
        .filter((file) => !file.isFolder && !file.isHidden)
        .forEach((file) => {
          const fileNode = {
            name: file.name,
            type: "file",
            content: "",
          };

          parentNode.children.push(fileNode);
        });
    };

    if (Array.isArray(serverFiles)) {
      processFiles(serverFiles, rootNode);
    }

    return rootNode;
  };

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const findFilePath = (node, targetName, currentPath = []) => {
    if (node.type === "file" && node.name === targetName) {
      return [...currentPath, node.name];
    }
    if (node.children) {
      for (const child of node.children) {
        const path = findFilePath(
          child,
          targetName,
          [...currentPath, node.name === "root" ? "" : node.name].filter(Boolean)
        );
        if (path) return path;
      }
    }
    return null;
  };

  const copyToClipboard = async () => {
    if (!selectedFile) {
      toast.error("No file selected!");
      return;
    }

    if (fileContent) {
      await navigator.clipboard.writeText(fileContent);
      toast.success("Code copied to clipboard!");
    }
  };

  const downloadFile = () => {
    if (!selectedFile) {
      toast.error("No file selected!");
      return;
    }

    if (fileContent) {
      const blob = new Blob([fileContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("File downloaded successfully!");
    }
  };

  const saveFile = () => {
    if (!selectedFile || !fileContent) {
      toast.error("No file selected!");
      return;
    }

    socketRef.current.emit("saveFileToServer", {
      name: selectedFile,
      content: fileContent,
      roomCode
    });

    toast.info("Saving file...");
  };

  const refreshFiles = () => {
    socketRef.current.emit("reqFileSystemFromServer", {
      roomCode
    });
    toast.info("Refreshing file system...");
  };

  const selectFile = (fileName) => {
    setSelectedFile(fileName);
    selectedFileRef.current = fileName;
    socketRef.current.emit("reqFileContentFromServer", {
      name: fileName,
      roomCode
    });
  };

  const renderFileTree = (node, path = "", level = 0) => {
    if (node.name === "root" && node.children) {
      return (
        <>{node.children.map((child) => renderFileTree(child, "", level))}</>
      );
    }

    const currentPath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedFolders.has(currentPath);

    return (
      <div key={currentPath} style={{ paddingLeft: level === 0 ? 0 : 12 }}>
        <div
          className={`flex items-center py-1 my-[3px] px-[8px] rounded-lg hover:bg-[#1d1d1d] cursor-pointer ${
            selectedFile === node.name ? "bg-[#1d1d1d]" : ""
          }`}
          onClick={() => {
            if (node.type === "folder") {
              toggleFolder(currentPath);
            } else {
              selectFile(node.name);
            }
          }}
        >
          {node.type === "folder" ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 mr-[5.4px] text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-[5.4px] text-gray-400" />
              )}
            </>
          ) : (
            <FileIcon className="w-4 h-4 mr-[5.7px] text-blue-400" />
          )}
          <span className="text-sm font-normal">{node.name}</span>
        </div>
        {node.type === "folder" && isExpanded && node.children && (
          <div>
            {node.children.map((child) =>
              renderFileTree(child, currentPath, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex bg-zinc-950 text-zinc-100">
      {(showModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-6 rounded-lg shadow-xl">
            <h2 className="text-xl font-semibold mb-4">Enter Room Code</h2>
            {roomError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
                {roomError}
              </div>
            )}
            <form onSubmit={handleRoomCodeSubmit}>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="w-full p-2 mb-4 bg-zinc-800 rounded border border-zinc-700 text-white"
                placeholder="Enter room code..."
                required
              />
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>
      )}

      {!showModal && (
        <>
          {/* Sidebar */}
          {isFileTreeVisible && (
            <div className="w-64 border-r border-zinc-800 flex flex-col overflow-hidden relative px-2 py-1">
              <div className="flex justify-between items-center p-2 border-b border-zinc-800 h-[44px]">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Workspace</h3>
                  <div 
                    className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer hover:text-gray-200"
                    onClick={() => setShowModal(true)}
                  >
                    <span>({roomCode})</span>
                    <Edit2 className="w-3 h-3" />
                  </div>
                </div>
                <button
                  onClick={refreshFiles}
                  className="p-[6px] rounded hover:bg-zinc-800"
                  title="Refresh files"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto py-2">
                {files ? (
                  renderFileTree(files)
                ) : (
                  <div className="p-2 text-sm text-gray-400">Loading...</div>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar with File Path */}
            <div className="flex items-center px-4 py-2 border-b border-zinc-800 text-sm text-gray-400 min-h-[48px]">
              {selectedFilePath.map((segment, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && (
                    <ChevronRight className="w-3 h-3 mx-1 text-gray-600" />
                  )}
                  <span>{segment}</span>
                </div>
              ))}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={saveFile}
                  className="p-[6px] rounded hover:bg-zinc-800"
                  title="Save file"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={copyToClipboard}
                  className="p-[6px] rounded hover:bg-zinc-800"
                  title="Copy code"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={downloadFile}
                  className="p-[6px] rounded hover:bg-zinc-800"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto">
              {selectedFile ? (
                <div className="flex min-h-[100%] h-fit">
                  {/* Line Numbers */}
                  <div className="p-4 text-xs font-mono leading-5 text-gray-500 select-none border-r border-zinc-800 bg-zinc-900 top-0 h-full min-h-screen">
                    {lineNumbers.map((num) => (
                      <div key={num}>{num}</div>
                    ))}
                  </div>
                  {/* Code - Using textarea for editability */}
                  <textarea
                    className="p-4 text-xs font-mono leading-5 flex-1 bg-zinc-950 text-zinc-100 border-none outline-none resize-none w-full"
                    value={fileContent}
                    spellCheck={false}
                  />
                </div>
              ) : (
                <div className="flex h-screen">
                  <div className="p-4 text-xs font-mono leading-5 text-gray-500 select-none border-r border-zinc-800 bg-zinc-900 h-full top-0">
                    1
                  </div>
                  <pre className="p-4 text-xs font-mono leading-5 flex-1">
                    {`// Select a file to view its contents`}
                  </pre>
                </div>
              )}
            </div>

            {/* Toggle Button */}
            <button
              className="fixed bottom-4 left-4 w-8 h-8 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 rounded-sm shadow-lg z-50 border-2 border-white/[0.06]"
              onClick={() => setIsFileTreeVisible(!isFileTreeVisible)}
            >
              {isFileTreeVisible ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.66675 8H14"
                    stroke="currentcolor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                  <path
                    d="M8.66675 12L4.66675 8L8.66675 4"
                    stroke="currentcolor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                  <path
                    d="M2 3.33203V12.6654"
                    stroke="currentcolor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              ) : (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.3333 8H2"
                    stroke="currentcolor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                  <path
                    d="M7.33325 12L11.3333 8L7.33325 4"
                    stroke="currentcolor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                  <path
                    d="M14 3.33203V12.6654"
                    stroke="currentcolor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}