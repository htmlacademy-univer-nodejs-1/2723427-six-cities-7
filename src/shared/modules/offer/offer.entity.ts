import { defaultClasses, getModelForClass, modelOptions, prop, Ref } from '@typegoose/typegoose';
import { Amenity, City, HousingType } from '../../types/index.js';
import { UserEntity } from '../user/index.js';

export interface OfferEntity extends defaultClasses.Base {}

class LocationEntity {
  @prop({ required: true, type: () => Number })
  public latitude!: number;

  @prop({ required: true, type: () => Number })
  public longitude!: number;
}

@modelOptions({
  schemaOptions: {
    collection: 'offers',
    timestamps: true,
  }
})
export class OfferEntity extends defaultClasses.TimeStamps {
  @prop({ required: true, trim: true, type: () => String })
  public title!: string;

  @prop({ required: true, trim: true, type: () => String })
  public description!: string;

  @prop({ required: true, type: () => Date })
  public postDate!: Date;

  @prop({ required: true, type: () => String, enum: City })
  public city!: City;

  @prop({ required: true, type: () => String })
  public previewImage!: string;

  @prop({ required: true, type: () => [String] })
  public images!: string[];

  @prop({ required: true, type: () => Boolean })
  public isPremium!: boolean;

  @prop({ required: true, type: () => Boolean })
  public isFavorite!: boolean;

  @prop({ required: true, type: () => Number })
  public rating!: number;

  @prop({ required: true, type: () => String, enum: HousingType })
  public type!: HousingType;

  @prop({ required: true, type: () => Number })
  public bedrooms!: number;

  @prop({ required: true, type: () => Number })
  public maxAdults!: number;

  @prop({ required: true, type: () => Number })
  public price!: number;

  @prop({ required: true, type: () => [String], enum: Amenity })
  public amenities!: Amenity[];

  @prop({ required: true, ref: () => UserEntity })
  public authorId!: Ref<UserEntity>;

  @prop({ default: 0, type: () => Number })
  public commentCount!: number;

  @prop({ required: true, type: () => LocationEntity, _id: false })
  public location!: LocationEntity;
}

export const OfferModel = getModelForClass(OfferEntity);
