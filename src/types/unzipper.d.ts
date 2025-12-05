// Minimal typings for the unzipper package (no official @types published)
declare module 'unzipper' {
  export interface ZipEntry {
    path: string;
    type: string;
    stream(): NodeJS.ReadableStream;
  }

  export interface ZipDirectory {
    files: ZipEntry[];
  }

  export const Open: {
    buffer(data: Buffer): Promise<ZipDirectory>;
  };
}
