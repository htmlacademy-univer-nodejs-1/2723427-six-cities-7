import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { StatusCodes } from 'http-status-codes';
import { Logger } from '../../shared/libs/logger/index.js';
import { Config, RestSchema } from '../../shared/libs/config/index.js';
import { Component } from '../../shared/types/index.js';
import { OfferService } from '../../shared/modules/offer/index.js';
import { UserService } from '../../shared/modules/user/index.js';
import { HttpError } from '../errors/http-error.js';
import { toOfferListItemResponse } from '../helpers/response.mapper.js';
import { ValidateObjectIdMiddleware } from '../middleware/validate-object-id.middleware.js';
import { HttpMethod } from '../types/http-method.enum.js';
import { Controller } from './controller.js';

@injectable()
export class FavoritesController extends Controller {
  constructor(
    @inject(Component.Logger) logger: Logger,
    @inject(Component.Config) config: Config<RestSchema>,
    @inject(Component.UserService) private readonly userService: UserService,
    @inject(Component.OfferService) private readonly offerService: OfferService,
  ) {
    super(logger, config);

    const userId = new ValidateObjectIdMiddleware('userId', 'query');
    const offerId = new ValidateObjectIdMiddleware('offerId');
    this.addRoute({ path: '/favorites', method: HttpMethod.Get, handler: this.index, middleware: [userId] });
    this.addRoute({
      path: '/offers/:offerId/favorites', method: HttpMethod.Post, handler: this.create,
      middleware: [offerId, userId],
    });
    this.addRoute({
      path: '/offers/:offerId/favorites', method: HttpMethod.Delete, handler: this.delete,
      middleware: [offerId, userId],
    });
  }

  public async index(req: Request, res: Response): Promise<void> {
    const userId = req.query.userId as string;
    const offers = await this.userService.findFavoriteOffers(userId);

    if (!offers) {
      throw new HttpError(StatusCodes.NOT_FOUND, `User with id «${userId}» not found`);
    }

    this.ok(res, offers.map(toOfferListItemResponse));
  }

  public async create(req: Request, res: Response): Promise<void> {
    const userId = req.query.userId as string;
    const favoriteOffer = await this.offerService.addFavorite(req.params.offerId, userId);

    if (favoriteOffer === 'offer-not-found') {
      throw new HttpError(StatusCodes.NOT_FOUND, `Offer with id «${req.params.offerId}» not found`);
    }

    if (favoriteOffer === 'user-not-found') {
      throw new HttpError(StatusCodes.NOT_FOUND, `User with id «${userId}» not found`);
    }

    this.created(res, toOfferListItemResponse(favoriteOffer));
  }

  public async delete(req: Request, res: Response): Promise<void> {
    const userId = req.query.userId as string;
    const offer = await this.offerService.findById(req.params.offerId);

    if (!offer) {
      throw new HttpError(StatusCodes.NOT_FOUND, `Offer with id «${req.params.offerId}» not found`);
    }

    if (!await this.userService.removeFavoriteOffer(userId, req.params.offerId)) {
      throw new HttpError(StatusCodes.NOT_FOUND, `User with id «${userId}» not found`);
    }

    this.noContent(res);
  }
}
