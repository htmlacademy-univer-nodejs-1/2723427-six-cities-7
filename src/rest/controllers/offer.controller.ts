import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { StatusCodes } from 'http-status-codes';
import { Logger } from '../../shared/libs/logger/index.js';
import { Config, RestSchema } from '../../shared/libs/config/index.js';
import { City, Component } from '../../shared/types/index.js';
import { CreateOfferRequestDto, OfferService, UpdateOfferDto } from '../../shared/modules/offer/index.js';
import { UserService } from '../../shared/modules/user/index.js';
import { HttpError } from '../errors/http-error.js';
import {
  toDetailedOfferResponse,
  toOfferListItemResponse,
} from '../helpers/response.mapper.js';
import { ValidateDtoMiddleware } from '../middleware/validate-dto.middleware.js';
import { ValidateObjectIdMiddleware } from '../middleware/validate-object-id.middleware.js';
import { HttpMethod } from '../types/http-method.enum.js';
import { Controller } from './controller.js';

@injectable()
export class OfferController extends Controller {
  constructor(
    @inject(Component.Logger) logger: Logger,
    @inject(Component.Config) config: Config<RestSchema>,
    @inject(Component.OfferService) private readonly offerService: OfferService,
    @inject(Component.UserService) private readonly userService: UserService,
  ) {
    super(logger, config);

    const offerId = new ValidateObjectIdMiddleware('offerId');
    this.addRoute({ path: '/offers', method: HttpMethod.Get, handler: this.index });
    this.addRoute({
      path: '/offers', method: HttpMethod.Post, handler: this.create,
      middleware: [new ValidateDtoMiddleware(CreateOfferRequestDto)],
    });
    this.addRoute({ path: '/offers/:offerId', method: HttpMethod.Get, handler: this.show, middleware: [offerId] });
    this.addRoute({
      path: '/offers/:offerId', method: HttpMethod.Put, handler: this.update,
      middleware: [offerId, new ValidateDtoMiddleware(UpdateOfferDto, true)],
    });
    this.addRoute({ path: '/offers/:offerId', method: HttpMethod.Delete, handler: this.delete, middleware: [offerId] });
    this.addRoute({ path: '/cities/:city/premium', method: HttpMethod.Get, handler: this.indexPremium });
  }

  public async index(req: Request, res: Response): Promise<void> {
    const limit = this.parseLimit(req.query.limit);
    const userId = this.getUserId(req) ?? undefined;
    const offers = await this.offerService.find(limit, userId);

    this.ok(res, offers.map(toOfferListItemResponse));
  }

  public async create(
    { body }: Request<Record<string, string>, Record<string, unknown>, CreateOfferRequestDto>,
    res: Response,
  ): Promise<void> {
    if (!await this.userService.findById(body.authorId)) {
      throw new HttpError(StatusCodes.NOT_FOUND, `User with id «${body.authorId}» not found`);
    }

    const offer = await this.offerService.create(body, body.authorId);

    this.created(res, toDetailedOfferResponse(offer));
  }

  public async show(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req) ?? undefined;
    const offer = await this.offerService.findById(req.params.offerId, userId);

    if (!offer) {
      throw new HttpError(StatusCodes.NOT_FOUND, `Offer with id «${req.params.offerId}» not found`);
    }

    this.ok(res, toDetailedOfferResponse(offer));
  }

  public async update(
    req: Request<Record<string, string>, Record<string, unknown>, UpdateOfferDto>,
    res: Response,
  ): Promise<void> {
    const { params, body } = req;
    const updatedOffer = await this.offerService.updateById(params.offerId, body, this.getUserId(req) ?? undefined);

    if (!updatedOffer) {
      throw new HttpError(StatusCodes.NOT_FOUND, `Offer with id «${params.offerId}» not found`);
    }

    this.ok(res, toDetailedOfferResponse(updatedOffer));
  }

  public async delete(req: Request, res: Response): Promise<void> {
    const offer = await this.offerService.deleteById(req.params.offerId);

    if (!offer) {
      throw new HttpError(StatusCodes.NOT_FOUND, `Offer with id «${req.params.offerId}» not found`);
    }

    this.noContent(res);
  }

  public async indexPremium(req: Request, res: Response): Promise<void> {
    const city = req.params.city as City;

    if (!Object.values(City).includes(city)) {
      throw new HttpError(StatusCodes.BAD_REQUEST, `Unknown city «${req.params.city}»`);
    }

    const userId = this.getUserId(req) ?? undefined;
    const offers = await this.offerService.findPremiumByCity(city, userId);

    this.ok(res, offers.map(toOfferListItemResponse));
  }

  private parseLimit(value: unknown): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) > 2147483647) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Limit must be an integer between 0 and 2147483647');
    }

    return Number(value);
  }
}
