import { Request, Response, Router } from 'express';
import { injectable } from 'inversify';
import { StatusCodes } from 'http-status-codes';
import asyncHandler from 'express-async-handler';
import { Logger } from '../../shared/libs/logger/index.js';
import { Config, RestSchema } from '../../shared/libs/config/index.js';
import { HttpError } from '../errors/http-error.js';
import { getUserIdFromRequest } from '../helpers/auth.js';
import { Route } from '../types/route.interface.js';
import { ControllerInterface } from '../types/controller.interface.js';

@injectable()
export abstract class Controller implements ControllerInterface {
  private readonly _router: Router = Router();

  constructor(
    protected readonly logger: Logger,
    protected readonly config: Config<RestSchema>,
  ) {}

  public get router(): Router {
    return this._router;
  }

  public addRoute(route: Route): void {
    this._router[route.method](
      route.path,
      ...(route.middleware ?? []).map((middleware) => asyncHandler(middleware.execute.bind(middleware))),
      asyncHandler(route.handler.bind(this)),
    );

    this.logger.info(`Route registered: ${route.method.toUpperCase()} ${route.path}`);
  }

  public send<T>(res: Response, statusCode: number, data: T): void {
    res
      .type('application/json')
      .status(statusCode)
      .json(data);
  }

  public ok<T>(res: Response, data: T): void {
    this.send(res, StatusCodes.OK, data);
  }

  public created<T>(res: Response, data: T): void {
    this.send(res, StatusCodes.CREATED, data);
  }

  public noContent(res: Response): void {
    res.status(StatusCodes.NO_CONTENT).send();
  }

  public badRequest(res: Response, message: string): void {
    this.send(res, StatusCodes.BAD_REQUEST, { statusCode: StatusCodes.BAD_REQUEST, message });
  }

  public unauthorized(res: Response, message: string): void {
    this.send(res, StatusCodes.UNAUTHORIZED, { statusCode: StatusCodes.UNAUTHORIZED, message });
  }

  public forbidden(res: Response, message: string): void {
    this.send(res, StatusCodes.FORBIDDEN, { statusCode: StatusCodes.FORBIDDEN, message });
  }

  public notFound(res: Response, message: string): void {
    this.send(res, StatusCodes.NOT_FOUND, { statusCode: StatusCodes.NOT_FOUND, message });
  }

  public conflict(res: Response, message: string): void {
    this.send(res, StatusCodes.CONFLICT, { statusCode: StatusCodes.CONFLICT, message });
  }

  protected getUserId(req: Request): string | null {
    return getUserIdFromRequest(req, this.config.get('SALT'));
  }

  protected requireUserId(req: Request): string {
    const userId = this.getUserId(req);

    if (!userId) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Unauthorized');
    }

    return userId;
  }
}
