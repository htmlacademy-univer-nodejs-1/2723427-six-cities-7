import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { StatusCodes } from 'http-status-codes';
import { Logger } from '../../shared/libs/logger/index.js';
import { Config, RestSchema } from '../../shared/libs/config/index.js';
import { Component } from '../../shared/types/index.js';
import { CommentService, CreateCommentDto } from '../../shared/modules/comment/index.js';
import { OfferService } from '../../shared/modules/offer/index.js';
import { UserService } from '../../shared/modules/user/index.js';
import { HttpError } from '../errors/http-error.js';
import { toCommentResponse } from '../helpers/response.mapper.js';
import { ValidateDtoMiddleware } from '../middleware/validate-dto.middleware.js';
import { ValidateObjectIdMiddleware } from '../middleware/validate-object-id.middleware.js';
import { HttpMethod } from '../types/http-method.enum.js';
import { Controller } from './controller.js';

@injectable()
export class CommentController extends Controller {
  constructor(
    @inject(Component.Logger) logger: Logger,
    @inject(Component.Config) config: Config<RestSchema>,
    @inject(Component.CommentService) private readonly commentService: CommentService,
    @inject(Component.OfferService) private readonly offerService: OfferService,
    @inject(Component.UserService) private readonly userService: UserService,
  ) {
    super(logger, config);

    const offerId = new ValidateObjectIdMiddleware('offerId');
    this.addRoute({
      path: '/offers/:offerId/comments', method: HttpMethod.Get, handler: this.index, middleware: [offerId],
    });
    this.addRoute({
      path: '/offers/:offerId/comments', method: HttpMethod.Post, handler: this.create,
      middleware: [offerId, new ValidateDtoMiddleware(CreateCommentDto)],
    });
  }

  public async index(req: Request, res: Response): Promise<void> {
    await this.checkOfferExists(req.params.offerId);
    const comments = await this.commentService.findByOfferId(req.params.offerId);

    this.ok(res, comments.map(toCommentResponse));
  }

  public async create(
    req: Request<Record<string, string>, Record<string, unknown>, Omit<CreateCommentDto, 'offerId'>>,
    res: Response,
  ): Promise<void> {
    const { text, rating, authorId } = req.body;
    await this.checkOfferExists(req.params.offerId);

    if (!await this.userService.findById(authorId)) {
      throw new HttpError(StatusCodes.NOT_FOUND, `User with id «${authorId}» not found`);
    }

    const comment = await this.commentService.create({
      text, rating, authorId, offerId: req.params.offerId,
    });

    if (!comment) {
      throw new HttpError(StatusCodes.NOT_FOUND, `Offer with id «${req.params.offerId}» not found`);
    }

    this.created(res, toCommentResponse(comment));
  }

  private async checkOfferExists(offerId: string): Promise<void> {
    const offer = await this.offerService.findById(offerId);

    if (!offer) {
      throw new HttpError(StatusCodes.NOT_FOUND, `Offer with id «${offerId}» not found`);
    }
  }
}
