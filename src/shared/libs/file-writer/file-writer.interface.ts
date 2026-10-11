export interface FileWriter {
  write(line: string): Promise<void>;
  close(): Promise<void>;
}
