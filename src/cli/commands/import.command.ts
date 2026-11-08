import chalk from 'chalk';
import { Command } from './command.interface.js';
import { TSVFileReader } from '../../shared/libs/file-reader/index.js';
import { DatabaseClient, MongoDatabaseClient } from '../../shared/libs/database-client/index.js';
import { Logger, PinoLogger } from '../../shared/libs/logger/index.js';
import { DefaultUserService, UserModel, UserService } from '../../shared/modules/user/index.js';
import { DefaultOfferService, OfferModel, OfferService } from '../../shared/modules/offer/index.js';
import { getMongoURI } from '../../shared/helpers/database.js';
import { Offer } from '../../shared/types/index.js';

const DEFAULT_DB_PORT = 27017;
const DEFAULT_USER_PASSWORD = '123456';
const USAGE = 'Пример: --import <path> <login> <password> <host> <dbname> <salt>';

export class ImportCommand implements Command {
  private readonly logger: Logger;
  private readonly databaseClient: DatabaseClient;
  private readonly userService: UserService;
  private readonly offerService: OfferService;
  private salt = '';

  constructor() {
    this.logger = new PinoLogger();
    this.databaseClient = new MongoDatabaseClient(this.logger);
    this.userService = new DefaultUserService(this.logger, UserModel);
    this.offerService = new DefaultOfferService(this.logger, OfferModel);
  }

  public getName(): string {
    return '--import';
  }

  private async saveOffer(offer: Offer): Promise<void> {
    const user = await this.userService.findOrCreate({
      ...offer.author,
      password: DEFAULT_USER_PASSWORD,
    }, this.salt);

    await this.offerService.create({
      title: offer.title,
      description: offer.description,
      postDate: offer.postDate,
      city: offer.city,
      previewImage: offer.previewImage,
      images: offer.images,
      isPremium: offer.isPremium,
      isFavorite: offer.isFavorite,
      rating: offer.rating,
      type: offer.type,
      bedrooms: offer.bedrooms,
      maxAdults: offer.maxAdults,
      price: offer.price,
      amenities: offer.amenities,
      authorId: user.id,
      location: offer.location,
    });
  }

  public async execute(...parameters: string[]): Promise<void> {
    const [filename, login, password, host, dbname, salt] = parameters;

    if (! filename || ! login || ! password || ! host || ! dbname || ! salt) {
      console.error(chalk.red(`Не хватает аргументов. ${USAGE}`));
      process.exitCode = 1;
      return;
    }

    this.salt = salt;
    const fileReader = new TSVFileReader(filename.trim());
    let offerCount = 0;

    fileReader.on('offer', (offer: Offer, resolve: () => void, reject: (error: unknown) => void) => {
      this.saveOffer(offer)
        .then(() => {
          offerCount++;
          resolve();
        })
        .catch(reject);
    });

    try {
      await this.databaseClient.connect(getMongoURI(login, password, host, DEFAULT_DB_PORT, dbname));
      await fileReader.read();
      console.info(chalk.green(`Импортировано предложений: ${offerCount}`));
    } catch (error: unknown) {
      console.error(chalk.red(`Не удалось импортировать данные из файла: ${filename}`));

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }

      process.exitCode = 1;
    } finally {
      await this.databaseClient.disconnect().catch(() => undefined);
    }
  }
}
