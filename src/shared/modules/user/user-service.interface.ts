import { DocumentType } from '@typegoose/typegoose';
import { ClientSession } from 'mongoose';
import { UserEntity } from './user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import type { OfferEntity } from '../offer/offer.entity.js';

export interface UserService {
  create(dto: CreateUserDto, salt: string): Promise<DocumentType<UserEntity>>;
  findById(id: string): Promise<DocumentType<UserEntity> | null>;
  findByEmail(email: string): Promise<DocumentType<UserEntity> | null>;
  findOrCreate(dto: CreateUserDto, salt: string): Promise<DocumentType<UserEntity>>;
  verifyUser(dto: LoginUserDto, salt: string): Promise<DocumentType<UserEntity> | null>;
  updateAvatar(id: string, avatarPath: string): Promise<DocumentType<UserEntity> | null>;
  addFavoriteOffer(userId: string, offerId: string, session: ClientSession): Promise<boolean>;
  removeFavoriteOffer(userId: string, offerId: string): Promise<DocumentType<UserEntity> | null>;
  removeFavoriteOfferFromAllUsers(offerId: string, session: ClientSession): Promise<number>;
  findFavoriteOffers(userId: string): Promise<DocumentType<OfferEntity>[] | null>;
  findFavoriteOfferIds(userId: string): Promise<string[]>;
}
