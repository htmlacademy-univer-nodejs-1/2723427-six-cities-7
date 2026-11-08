import chalk from 'chalk';
import { Command } from './command.interface.js';
import { FetchHTTPClient, HTTPClient } from '../../shared/libs/http-client/index.js';
import { TSVOfferGenerator } from '../../shared/libs/offer-generator/index.js';
import { TSVFileWriter } from '../../shared/libs/file-writer/index.js';
import { MockServerData } from '../../shared/types/index.js';

const REQUIRED_MOCK_DATA_KEYS = [
  'titles',
  'descriptions',
  'cities',
  'previewImages',
  'images',
  'housingTypes',
  'amenities',
  'users',
];

function isMockServerData(value: unknown): value is MockServerData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return REQUIRED_MOCK_DATA_KEYS.every((key) => Array.isArray(candidate[key]));
}

export class GenerateCommand implements Command {
  constructor(
    private readonly httpClient: HTTPClient = new FetchHTTPClient()
  ) {}

  public getName(): string {
    return '--generate';
  }

  private async fetchMockData(url: string): Promise<MockServerData> {
    const data = await this.httpClient.get<unknown>(url);

    if (! isMockServerData(data)) {
      throw new Error(`Сервер по адресу ${url} вернул данные в неизвестном формате`);
    }

    return data;
  }

  public async execute(...parameters: string[]): Promise<void> {
    const [count, filepath, url] = parameters;

    if (! count || ! /^\d+$/.test(count) || Number.parseInt(count, 10) <= 0) {
      console.error(chalk.red('Не указано количество предложений. Пример: --generate <n> <path> <url>'));
      process.exitCode = 1;
      return;
    }

    if (! filepath) {
      console.error(chalk.red('Не указан путь к файлу. Пример: --generate <n> <path> <url>'));
      process.exitCode = 1;
      return;
    }

    if (! url) {
      console.error(chalk.red('Не указан адрес сервера с данными. Пример: --generate <n> <path> <url>'));
      process.exitCode = 1;
      return;
    }

    const offerCount = Number.parseInt(count, 10);

    try {
      const mockData = await this.fetchMockData(url);
      const generator = new TSVOfferGenerator(mockData);
      const fileWriter = new TSVFileWriter(filepath);

      try {
        for (let index = 0; index < offerCount; index++) {
          await fileWriter.write(generator.generate());
        }
      } finally {
        await fileWriter.close();
      }

      console.info(chalk.green(`Сгенерировано предложений: ${offerCount} в файл ${filepath}`));
    } catch (error: unknown) {
      console.error(chalk.red(`Не удалось сгенерировать данные в файл: ${filepath}`));

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }

      process.exitCode = 1;
    }
  }
}
