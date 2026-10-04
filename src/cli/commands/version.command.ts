import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { Command } from './command.interface.js';

const DEFAULT_PACKAGE_JSON_PATH = fileURLToPath(new URL('../../../package.json', import.meta.url));

type PackageJSONConfig = {
  version: string;
};

function isPackageJSONConfig(value: unknown): value is PackageJSONConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.hasOwn(value, 'version')
  );
}

export class VersionCommand implements Command {
  constructor(
    private readonly filePath: string = DEFAULT_PACKAGE_JSON_PATH
  ) {}

  private readVersion(): string {
    const jsonContent = readFileSync(resolve(this.filePath), 'utf-8');
    const importedContent: unknown = JSON.parse(jsonContent);

    if (! isPackageJSONConfig(importedContent)) {
      throw new Error('Failed to parse json content.');
    }

    return importedContent.version;
  }

  public getName(): string {
    return '--version';
  }

  public async execute(..._parameters: string[]): Promise<void> {
    try {
      const version = this.readVersion();
      console.info(chalk.green(version));
    } catch (error: unknown) {
      console.error(chalk.red(`Failed to read version from ${this.filePath}`));

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }

      process.exitCode = 1;
    }
  }
}
