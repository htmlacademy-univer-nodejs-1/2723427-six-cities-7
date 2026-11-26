import express, { Express } from 'express';
import { inject, injectable } from 'inversify';
import { StatusCodes } from 'http-status-codes';
import { Logger } from '../shared/libs/logger/index.js';
import { Config, RestSchema } from '../shared/libs/config/index.js';
import { DatabaseClient } from '../shared/libs/database-client/index.js';
import { getMongoURI } from '../shared/helpers/database.js';
import { Component } from '../shared/types/index.js';
import { AVATAR_DIRECTORY, AVATAR_URL_PATH, DEFAULT_AVATAR_FILE, DEFAULT_AVATAR_URL } from './helpers/avatar.js';
import { ControllerInterface } from './types/controller.interface.js';
import { ExceptionFilter } from './exception-filters/index.js';

@injectable()
export class RestApplication {
  private readonly expressApp: Express;

  constructor(
    @inject(Component.Logger) private readonly logger: Logger,
    @inject(Component.Config) private readonly config: Config<RestSchema>,
    @inject(Component.DatabaseClient) private readonly databaseClient: DatabaseClient,
    @inject(Component.UserController) private readonly userController: ControllerInterface,
    @inject(Component.OfferController) private readonly offerController: ControllerInterface,
    @inject(Component.FavoritesController) private readonly favoritesController: ControllerInterface,
    @inject(Component.CommentController) private readonly commentController: ControllerInterface,
    @inject(Component.HttpErrorExceptionFilter) private readonly httpErrorExceptionFilter: ExceptionFilter,
    @inject(Component.AppExceptionFilter) private readonly appExceptionFilter: ExceptionFilter,
  ) {
    this.expressApp = express();
  }

  private async initDb(): Promise<void> {
    const mongoUri = getMongoURI(
      this.config.get('DB_USER'),
      this.config.get('DB_PASSWORD'),
      this.config.get('DB_HOST'),
      this.config.get('DB_PORT'),
      this.config.get('DB_NAME'),
    );

    await this.databaseClient.connect(mongoUri);
  }

  public registerMiddleware(): void {
    this.expressApp.use(express.json());
    this.expressApp.use(AVATAR_URL_PATH, express.static(AVATAR_DIRECTORY, { index: false }));
    this.expressApp.get(DEFAULT_AVATAR_URL, (_req, res) => res.sendFile(DEFAULT_AVATAR_FILE));
  }

  public registerRoutes(): void {
    this.expressApp.use('/api', this.userController.router);
    this.expressApp.use('/api', this.offerController.router);
    this.expressApp.use('/api', this.favoritesController.router);
    this.expressApp.use('/api', this.commentController.router);

    this.expressApp.use((_req, res) => {
      res.status(StatusCodes.NOT_FOUND).json({
        statusCode: StatusCodes.NOT_FOUND,
        message: 'Not Found',
      });
    });
  }

  public registerExceptionFilters(): void {
    this.expressApp.use(this.httpErrorExceptionFilter.catch);
    this.expressApp.use(this.appExceptionFilter.catch);
  }

  public async init(): Promise<void> {
    this.logger.info('Application initialization…');
    this.logger.info(`Get value from env $PORT: ${this.config.get('PORT')}`);

    this.logger.info('Init database…');
    await this.initDb();
    this.logger.info('Init database completed');

    this.registerMiddleware();
    this.registerRoutes();
    this.registerExceptionFilters();

    const port = this.config.get('PORT');

    this.expressApp.listen(port, () => {
      this.logger.info(`Server started on http://localhost:${port}/api`);
    });
  }
}
