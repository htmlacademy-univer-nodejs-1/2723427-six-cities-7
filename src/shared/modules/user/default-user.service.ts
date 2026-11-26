import { inject, injectable } from 'inversify';
import { DocumentType, types } from '@typegoose/typegoose';
import { ClientSession } from 'mongoose';
import { UserService } from './user-service.interface.js';
import { UserEntity } from './user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { Logger } from '../../libs/logger/index.js';
import { Component } from '../../types/index.js';
import type { OfferEntity } from '../offer/offer.entity.js';

@injectable()
export class DefaultUserService implements UserService {
  constructor(
    @inject(Component.Logger) private readonly logger: Logger,
    @inject(Component.UserModel) private readonly userModel: types.ModelType<UserEntity>
  ) {}

  public async create(dto: CreateUserDto, salt: string): Promise<DocumentType<UserEntity>> {
    const user = new UserEntity({
      name: dto.name,
      email: dto.email,
      avatarPath: dto.avatarPath,
      type: dto.userType,
    });

    if (dto.password) {
      user.setPassword(dto.password, salt);
    }

    const result = await this.userModel.create(user);
    this.logger.info(`New user created: ${user.email}`);

    return result;
  }

  public async findById(id: string): Promise<DocumentType<UserEntity> | null> {
    return this.userModel.findById(id).exec();
  }

  public async findByEmail(email: string): Promise<DocumentType<UserEntity> | null> {
    return this.userModel.findOne({ email }).exec();
  }

  public async findOrCreate(dto: CreateUserDto, salt: string): Promise<DocumentType<UserEntity>> {
    const existedUser = await this.findByEmail(dto.email);

    if (existedUser) {
      return existedUser;
    }

    return this.create(dto, salt);
  }

  public async verifyUser(dto: LoginUserDto, salt: string): Promise<DocumentType<UserEntity> | null> {
    const user = await this.findByEmail(dto.email);

    if (!user || !dto.password || !user.verifyPassword(dto.password, salt)) {
      return null;
    }

    return user;
  }

  public async updateAvatar(id: string, avatarPath: string): Promise<DocumentType<UserEntity> | null> {
    return this.userModel.findByIdAndUpdate(id, { avatarPath }, { new: true }).exec();
  }

  public async addFavoriteOffer(userId: string, offerId: string, session: ClientSession): Promise<boolean> {
    const result = await this.userModel
      .updateOne({ _id: userId }, { $addToSet: { favoriteOffers: offerId } }, { session })
      .exec();
    return result.matchedCount === 1;
  }

  public async removeFavoriteOffer(userId: string, offerId: string): Promise<DocumentType<UserEntity> | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { $pull: { favoriteOffers: offerId } }, { new: true })
      .exec();
  }

  public async removeFavoriteOfferFromAllUsers(offerId: string, session: ClientSession): Promise<number> {
    const result = await this.userModel
      .updateMany({ favoriteOffers: offerId }, { $pull: { favoriteOffers: offerId } }, { session })
      .exec();

    return result.modifiedCount;
  }

  public async findFavoriteOffers(userId: string): Promise<DocumentType<OfferEntity>[] | null> {
    const user = await this.userModel
      .findById(userId)
      .populate<{ favoriteOffers: DocumentType<OfferEntity>[] }>('favoriteOffers')
      .exec();

    if (!user) {
      return null;
    }

    const favoriteOffers = (user.favoriteOffers ?? [])
      .filter((offer): offer is DocumentType<OfferEntity> => Boolean(offer));

    favoriteOffers.forEach((offer) => {
      offer.isFavorite = true;
    });

    return favoriteOffers.sort((left, right) => right.postDate.getTime() - left.postDate.getTime());
  }

  public async findFavoriteOfferIds(userId: string): Promise<string[]> {
    const user = await this.userModel
      .findById(userId)
      .select('favoriteOffers')
      .exec();

    return user ? (user.favoriteOffers ?? []).map((offerId) => offerId.toString()) : [];
  }
}
