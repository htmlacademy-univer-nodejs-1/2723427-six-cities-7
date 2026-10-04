import { Command } from './commands/index.js';

type ParsedCommand = Record<string, string[]>;

export class CLIApplication {
  private commands: Record<string, Command> = {};

  constructor(
    private readonly defaultCommand: string = '--help'
  ) {}

  private parseCommand(cliArguments: string[]): ParsedCommand {
    const parsedCommand: ParsedCommand = {};
    let currentCommand = '';

    for (const argument of cliArguments) {
      if (argument.startsWith('--')) {
        parsedCommand[argument] = [];
        currentCommand = argument;
      } else if (currentCommand) {
        parsedCommand[currentCommand].push(argument);
      }
    }

    return parsedCommand;
  }

  public registerCommands(commandList: Command[]): void {
    commandList.forEach((command) => {
      if (Object.hasOwn(this.commands, command.getName())) {
        throw new Error(`Command ${command.getName()} is already registered`);
      }
      this.commands[command.getName()] = command;
    });
  }

  public getCommand(commandName: string): Command {
    return this.commands[commandName] ?? this.getDefaultCommand();
  }

  public getDefaultCommand(): Command {
    if (! this.commands[this.defaultCommand]) {
      throw new Error(`The default command (${this.defaultCommand}) is not registered.`);
    }
    return this.commands[this.defaultCommand];
  }

  public async processCommand(argv: string[]): Promise<void> {
    const parsedCommand = this.parseCommand(argv);
    const [commandName] = Object.keys(parsedCommand);
    const command = this.getCommand(commandName);
    const commandArguments = parsedCommand[commandName] ?? [];
    await command.execute(...commandArguments);
  }
}
