import chalk from 'chalk';
import { Command } from './command.interface.js';
import { TSVFileReader } from '../../shared/libs/file-reader/index.js';

export class ImportCommand implements Command {
  public getName(): string {
    return '--import';
  }

  public async execute(...parameters: string[]): Promise<void> {
    const [filename] = parameters;

    if (! filename) {
      console.error(chalk.red('Не указан путь к файлу. Пример: --import <path>'));
      process.exitCode = 1;
      return;
    }

    const fileReader = new TSVFileReader(filename.trim());
    let offerCount = 0;

    fileReader.on('offer', () => {
      offerCount++;
    });

    try {
      await fileReader.read();
      console.info(chalk.green(`Импортировано предложений: ${offerCount}`));
    } catch (error: unknown) {
      console.error(chalk.red(`Не удалось импортировать данные из файла: ${filename}`));

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }

      process.exitCode = 1;
    }
  }
}
