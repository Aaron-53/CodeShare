export interface FileSystemNode {
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: FileSystemNode[];
}

export interface ServerFileNode {
  name: string;
  isFolder: boolean;
  isHidden?: boolean;
  content?: string;
  subFolder?: ServerFileNode[];
}
