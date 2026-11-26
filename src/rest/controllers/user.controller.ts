import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { StatusCodes } from 'http-status-codes';
import { Logger } from '../../shared/libs/logger/index.js';
import { Config, RestSchema } from '../../shared/libs/config/index.js';
import { Component } from '../../shared/types/index.js';
import { CreateUserDto, LoginUserDto, UserService } from '../../shared/modules/user/index.js';
import { HttpError } from '../errors/http-error.js';
import { createAccessToken } from '../helpers/auth.js';
import { storeAvatar, validateAvatar } from '../helpers/avatar.js';
import { fillDTO } from '../helpers/fill-dto.js';
import { toUserResponse } from '../helpers/response.mapper.js';
import { UploadAvatarMiddleware } from '../middleware/upload-avatar.middleware.js';
import { ValidateDtoMiddleware } from '../middleware/validate-dto.middleware.js';
import { ValidateObjectIdMiddleware } from '../middleware/validate-object-id.middleware.js';
import { LoggedUserResponse } from '../responses/index.js';
import { HttpMethod } from '../types/http-method.enum.js';
import { Controller } from './controller.js';

@injectable()
export class UserController extends Controller {
  constructor(
    @inject(Component.Logger) logger: Logger,
    @inject(Component.Config) config: Config<RestSchema>,
    @inject(Component.UserService) private readonly userService: UserService,
  ) {
    super(logger, config);

    this.addRoute({
      path: '/users/register', method: HttpMethod.Post, handler: this.create,
      middleware: [new ValidateDtoMiddleware(CreateUserDto)],
    });
    this.addRoute({
      path: '/users/login', method: HttpMethod.Post, handler: this.login,
      middleware: [new ValidateDtoMiddleware(LoginUserDto)],
    });
    this.addRoute({ path: '/users/login', method: HttpMethod.Get, handler: this.checkLoginStatus });
    this.addRoute({ path: '/users/logout', method: HttpMethod.Post, handler: this.logout });
    this.addRoute({
      path: '/users/avatar', method: HttpMethod.Post, handler: this.uploadAvatar,
      middleware: [new UploadAvatarMiddleware(), new ValidateObjectIdMiddleware('userId', 'body')],
    });
  }

  public async create(
    { body }: Request<Record<string, string>, Record<string, unknown>, CreateUserDto>,
    res: Response,
  ): Promise<void> {
    const existedUser = await this.userService.findByEmail(body.email);

    if (existedUser) {
      throw new HttpError(StatusCodes.CONFLICT, `User with email «${body.email}» already exists`);
    }

    const user = await this.userService.create(body, this.config.get('SALT'));

    this.created(res, toUserResponse(user));
  }

  public async login(
    { body }: Request<Record<string, string>, Record<string, unknown>, LoginUserDto>,
    res: Response,
  ): Promise<void> {
    const user = await this.userService.verifyUser(body, this.config.get('SALT'));

    if (!user) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');
    }

    const token = createAccessToken(user.id, this.config.get('SALT'));

    this.ok(res, fillDTO(LoggedUserResponse, {
      token,
      user: toUserResponse(user),
    }));
  }

  public async checkLoginStatus(req: Request, res: Response): Promise<void> {
    const userId = this.requireUserId(req);
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Unauthorized');
    }

    this.ok(res, toUserResponse(user));
  }

  public async logout(_req: Request, res: Response): Promise<void> {
    this.noContent(res);
  }

  public async uploadAvatar(req: Request, res: Response): Promise<void> {
    const userId: string = req.body.userId;
    const { image, extension } = await validateAvatar(req.file);

    if (!await this.userService.findById(userId)) {
      throw new HttpError(StatusCodes.NOT_FOUND, `User with id «${userId}» not found`);
    }

    const avatarUrl = await storeAvatar(userId, image, extension);

    if (!await this.userService.updateAvatar(userId, avatarUrl)) {
      throw new HttpError(StatusCodes.NOT_FOUND, `User with id «${userId}» not found`);
    }

    this.ok(res, { avatarUrl });
  }
}
