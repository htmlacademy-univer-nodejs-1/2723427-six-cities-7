import { DocumentType } from '@typegoose/typegoose';
import { CommentEntity } from '../../shared/modules/comment/index.js';
import { OfferEntity } from '../../shared/modules/offer/index.js';
import { UserEntity } from '../../shared/modules/user/index.js';
import { CITY_COORDINATES } from '../../shared/types/city-coordinates.js';
import {
  CommentResponse,
  DetailedOfferResponse,
  OfferListItemResponse,
  UserResponse,
} from '../responses/index.js';
import { DEFAULT_AVATAR_URL } from './avatar.js';
import { fillDTO } from './fill-dto.js';

type UserSource = Partial<DocumentType<UserEntity>> | null | undefined;

export function getReferenceId(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  const reference = value as { id?: unknown; _id?: unknown; toString?: () => string };

  if (typeof reference.id === 'string') {
    return reference.id;
  }

  if (reference._id) {
    return String(reference._id);
  }

  return typeof reference.toString === 'function' ? reference.toString() : '';
}

function toUserPlain(user: UserSource) {
  return {
    id: getReferenceId(user),
    name: user?.name ?? '',
    email: user?.email ?? '',
    avatarUrl: user?.avatarPath || DEFAULT_AVATAR_URL,
    userType: user?.type,
  };
}

function toOfferListItemPlain(offer: DocumentType<OfferEntity>) {
  return {
    id: getReferenceId(offer),
    title: offer.title,
    publishDate: offer.postDate,
    city: {
      name: offer.city,
      coordinates: CITY_COORDINATES[offer.city],
    },
    preview: offer.previewImage,
    isPremium: offer.isPremium,
    isFavorite: offer.isFavorite,
    rating: offer.rating,
    housingType: offer.type,
    price: offer.price,
    commentsCount: offer.commentCount,
  };
}

export function toUserResponse(user: UserSource): UserResponse {
  return fillDTO(UserResponse, toUserPlain(user));
}

export function toOfferListItemResponse(offer: DocumentType<OfferEntity>): OfferListItemResponse {
  return fillDTO(OfferListItemResponse, toOfferListItemPlain(offer));
}

export function toDetailedOfferResponse(offer: DocumentType<OfferEntity>): DetailedOfferResponse {
  return fillDTO(DetailedOfferResponse, {
    ...toOfferListItemPlain(offer),
    description: offer.description,
    photos: offer.images,
    rooms: offer.bedrooms,
    guests: offer.maxAdults,
    amenities: offer.amenities,
    coordinates: {
      latitude: offer.location.latitude,
      longitude: offer.location.longitude,
    },
    author: toUserPlain(offer.authorId as UserSource),
  });
}

export function toCommentResponse(comment: DocumentType<CommentEntity>): CommentResponse {
  return fillDTO(CommentResponse, {
    id: getReferenceId(comment),
    text: comment.text,
    publishDate: comment.postDate,
    rating: comment.rating,
    author: toUserPlain(comment.authorId as UserSource),
  });
}
