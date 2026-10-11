import { createWriteStream, WriteStream } from 'node:fs';
import { once } from 'node:events';
import { FileWriter } from './file-writer.interface.js';

export class TSVFileWriter implements FileWriter {
  private readonly stream: WriteStream;

  constructor(filePath: string) {
    this.stream = createWriteStream(filePath, { encoding: 'utf-8' });
  }

  public async write(line: string): Promise<void> {
    const canContinue = this.stream.write(`${line}\n`);

    if (! canContinue) {
      await once(this.stream, 'drain');
    }
  }

  public async close(): Promise<void> {
    if (this.stream.destroyed || this.stream.writableFinished) {
      return;
    }

    this.stream.end();
    await once(this.stream, 'finish');
  }
}
