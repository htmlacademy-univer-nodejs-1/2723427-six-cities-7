import { Expose } from 'class-transformer';
import { IsMongoId } from 'class-validator';
import { Amenity, City, HousingType, Location } from '../../../types/index.js';
import { UpdateOfferDto } from './update-offer.dto.js';

export class CreateOfferDto extends UpdateOfferDto {
  declare public title: string;
  declare public description: string;
  declare public city: City;
  declare public preview: string;
  declare public photos: string[];
  declare public isPremium: boolean;
  declare public housingType: HousingType;
  declare public rooms: number;
  declare public guests: number;
  declare public price: number;
  declare public amenities: Amenity[];
  declare public coordinates: Location;
}

export class CreateOfferRequestDto extends CreateOfferDto {
  @Expose()
  @IsMongoId()
  public authorId!: string;
}
