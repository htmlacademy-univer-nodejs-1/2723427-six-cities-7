import chalk from 'chalk';
import { Command } from './command.interface.js';

export class HelpCommand implements Command {
  public getName(): string {
    return '--help';
  }

  public async execute(..._parameters: string[]): Promise<void> {
    console.info(`
${chalk.bold.cyan('Программа для подготовки данных для REST API сервера.')}

${chalk.bold('Пример:')} ${chalk.green('cli.js --<command> [--arguments]')}

${chalk.bold('Команды:')}

 ${chalk.yellow('--version')}:                                                 ${chalk.gray('# выводит номер версии')}
 ${chalk.yellow('--help')}:                                                    ${chalk.gray('# печатает этот текст')}
 ${chalk.yellow('--import')} ${chalk.magenta('<path> <login> <password> <host> <dbname> <salt>')}:  ${chalk.gray('# импортирует данные из TSV в MongoDB')}
 ${chalk.yellow('--generate')} ${chalk.magenta('<n> <path> <url>')}                                ${chalk.gray('# генерирует произвольное количество тестовых данных')}
`);
  }
}
