import { inject, injectable } from 'inversify';
import { DocumentType, types } from '@typegoose/typegoose';
import { CommentService } from './comment-service.interface.js';
import { CommentEntity } from './comment.entity.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { OfferService } from '../offer/offer-service.interface.js';
import { Component } from '../../types/index.js';

const MAX_COMMENTS_COUNT = 50;

@injectable()
export class DefaultCommentService implements CommentService {
  constructor(
    @inject(Component.CommentModel) private readonly commentModel: types.ModelType<CommentEntity>,
    @inject(Component.OfferService) private readonly offerService: OfferService
  ) {}

  public async create(dto: CreateCommentDto): Promise<DocumentType<CommentEntity> | null> {
    return this.commentModel.db.transaction(async (session) => {
      if (!await this.offerService.incCommentCount(dto.offerId, session)) {
        return null;
      }

      const [comment] = await this.commentModel.create([dto], { session });
      await this.offerService.updateRating(dto.offerId, session);
      return comment.populate('authorId');
    });
  }

  public async findByOfferId(offerId: string): Promise<DocumentType<CommentEntity>[]> {
    return this.commentModel
      .find({ offerId })
      .sort({ postDate: -1 })
      .limit(MAX_COMMENTS_COUNT)
      .populate('authorId')
      .exec();
  }

  public async deleteByOfferId(offerId: string): Promise<number> {
    const result = await this.commentModel.deleteMany({ offerId }).exec();

    return result.deletedCount;
  }
}
