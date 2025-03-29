export interface ServerToClientEvents {
  sendFileSystemFromServer: (data: ServerFile[]) => void;
  sendFileContentFromServer: (data: { name: string; content: string }) => void;
  fileSavedFromServer: (docName: string) => void;
}

export interface ClientToServerEvents {
  reqFileSystemFromServer: (data: { message: string }) => void;
  reqFileContentFromServer: (fileName: string) => void;
  saveFileToServer: (data: { name: string; content: string }) => void;
}

export interface ServerFile {
  name: string;
  isFolder: boolean;
  isHidden: boolean;
  subFolder?: ServerFile[];
}
