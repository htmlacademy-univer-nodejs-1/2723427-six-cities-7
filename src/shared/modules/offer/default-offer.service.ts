import { inject, injectable } from 'inversify';
import { DocumentType, types } from '@typegoose/typegoose';
import { ClientSession, Types } from 'mongoose';
import { OfferService } from './offer-service.interface.js';
import { OfferEntity } from './offer.entity.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import { Logger } from '../../libs/logger/index.js';
import { City, Component } from '../../types/index.js';
import { UserService } from '../user/user-service.interface.js';
import type { CommentEntity } from '../comment/comment.entity.js';

const DEFAULT_OFFERS_COUNT = 60;
const MAX_PREMIUM_OFFERS_COUNT = 3;

@injectable()
export class DefaultOfferService implements OfferService {
  constructor(
    @inject(Component.Logger) private readonly logger: Logger,
    @inject(Component.OfferModel) private readonly offerModel: types.ModelType<OfferEntity>,
    @inject(Component.CommentModel) private readonly commentModel: types.ModelType<CommentEntity>,
    @inject(Component.UserService) private readonly userService: UserService
  ) {}

  public async create(
    dto: CreateOfferDto,
    authorId: string,
    postDate?: Date
  ): Promise<DocumentType<OfferEntity>> {
    const result = await this.offerModel.create({
      title: dto.title,
      description: dto.description,
      city: dto.city,
      previewImage: dto.preview,
      images: dto.photos,
      isPremium: dto.isPremium,
      type: dto.housingType,
      bedrooms: dto.rooms,
      maxAdults: dto.guests,
      price: dto.price,
      amenities: dto.amenities,
      authorId,
      location: dto.coordinates,
      ...(postDate ? { postDate } : {}),
    });
    this.logger.info(`New offer created: ${dto.title}`);

    return result.populate('authorId');
  }

  public async findById(id: string, userId?: string): Promise<DocumentType<OfferEntity> | null> {
    const offer = await this.offerModel
      .findById(id)
      .populate('authorId')
      .exec();

    if (!offer) {
      return null;
    }

    const [result] = await this.setFavoriteStatus([offer], userId);

    return result;
  }

  public async find(limit = DEFAULT_OFFERS_COUNT, userId?: string): Promise<DocumentType<OfferEntity>[]> {
    if (limit <= 0) {
      return [];
    }

    const offers = await this.offerModel
      .find()
      .sort({ postDate: -1 })
      .limit(limit)
      .exec();

    return this.setFavoriteStatus(offers, userId);
  }

  public async updateById(
    id: string,
    dto: UpdateOfferDto,
    userId?: string
  ): Promise<DocumentType<OfferEntity> | null> {
    const offer = await this.offerModel
      .findByIdAndUpdate(id, this.mapUpdateDto(dto), { new: true })
      .populate('authorId')
      .exec();

    if (!offer) {
      return null;
    }

    const [result] = await this.setFavoriteStatus([offer], userId);

    return result;
  }

  public async deleteById(id: string): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel.db.transaction(async (session) => {
      const offer = await this.offerModel.findByIdAndDelete(id, { session }).exec();
      if (!offer) {
        return null;
      }

      await this.commentModel.deleteMany({ offerId: id }).session(session).exec();
      await this.userService.removeFavoriteOfferFromAllUsers(id, session);
      return offer;
    });
  }

  public async addFavorite(
    offerId: string,
    userId: string,
  ): Promise<DocumentType<OfferEntity> | 'offer-not-found' | 'user-not-found'> {
    return this.offerModel.db.transaction(async (session) => {
      const offer = await this.offerModel
        .findByIdAndUpdate(offerId, { $inc: { __v: 1 } }, { session, timestamps: false })
        .exec();
      if (!offer) {
        return 'offer-not-found';
      }

      if (!await this.userService.addFavoriteOffer(userId, offerId, session)) {
        return 'user-not-found';
      }

      offer.isFavorite = true;
      return offer;
    });
  }

  public async findPremiumByCity(city: City, userId?: string): Promise<DocumentType<OfferEntity>[]> {
    const offers = await this.offerModel
      .find({ city, isPremium: true })
      .sort({ postDate: -1 })
      .limit(MAX_PREMIUM_OFFERS_COUNT)
      .exec();

    return this.setFavoriteStatus(offers, userId);
  }

  public async incCommentCount(id: string, session: ClientSession): Promise<boolean> {
    const result = await this.offerModel.updateOne({ _id: id }, { $inc: { commentCount: 1 } }, { session }).exec();
    return result.matchedCount === 1;
  }

  public async updateRating(id: string, session: ClientSession): Promise<void> {
    const [ratingData] = await this.commentModel.aggregate<{ rating: number }>([
      { $match: { offerId: new Types.ObjectId(id) } },
      { $group: { _id: null, rating: { $avg: '$rating' } } },
    ]).session(session).exec();

    const rating = ratingData ? Math.round(ratingData.rating * 10) / 10 : 0;

    await this.offerModel.updateOne({ _id: id }, { rating }, { session }).exec();
  }

  private mapUpdateDto(dto: UpdateOfferDto): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (dto.title !== undefined) {
      result.title = dto.title;
    }

    if (dto.description !== undefined) {
      result.description = dto.description;
    }

    if (dto.city !== undefined) {
      result.city = dto.city;
    }

    if (dto.preview !== undefined) {
      result.previewImage = dto.preview;
    }

    if (dto.photos !== undefined) {
      result.images = dto.photos;
    }

    if (dto.isPremium !== undefined) {
      result.isPremium = dto.isPremium;
    }

    if (dto.housingType !== undefined) {
      result.type = dto.housingType;
    }

    if (dto.rooms !== undefined) {
      result.bedrooms = dto.rooms;
    }

    if (dto.guests !== undefined) {
      result.maxAdults = dto.guests;
    }

    if (dto.price !== undefined) {
      result.price = dto.price;
    }

    if (dto.amenities !== undefined) {
      result.amenities = dto.amenities;
    }

    if (dto.coordinates !== undefined) {
      result.location = dto.coordinates;
    }

    return result;
  }

  private async setFavoriteStatus(
    offers: DocumentType<OfferEntity>[],
    userId?: string
  ): Promise<DocumentType<OfferEntity>[]> {
    const favoriteOfferIds = userId ? await this.userService.findFavoriteOfferIds(userId) : [];
    const favoriteOfferIdSet = new Set(favoriteOfferIds);

    offers.forEach((offer) => {
      offer.isFavorite = favoriteOfferIdSet.has(offer.id);
    });

    return offers;
  }
}
