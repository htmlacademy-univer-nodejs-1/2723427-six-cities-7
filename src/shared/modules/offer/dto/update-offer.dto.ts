import { Expose, Transform, Type } from 'class-transformer';
import {
  ArrayMinSize, ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsUrl, Length, Max, Min, ValidateNested,
} from 'class-validator';
import { Amenity, City, HousingType } from '../../../types/index.js';
import { CoordinatesDto } from './coordinates.dto.js';

const imageUrlOptions = { protocols: ['http', 'https'], require_protocol: true, require_tld: false };

export class UpdateOfferDto {
  @Expose()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Length(10, 100)
  public title?: string;

  @Expose()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Length(20, 1024)
  public description?: string;

  @Expose()
  @IsEnum(City)
  public city?: City;

  @Expose()
  @IsUrl(imageUrlOptions)
  public preview?: string;

  @Expose()
  @IsArray()
  @ArrayMinSize(6)
  @ArrayMaxSize(6)
  @IsUrl(imageUrlOptions, { each: true })
  public photos?: string[];

  @Expose()
  @IsBoolean()
  public isPremium?: boolean;

  @Expose()
  @IsEnum(HousingType)
  public housingType?: HousingType;

  @Expose()
  @IsInt()
  @Min(1)
  @Max(8)
  public rooms?: number;

  @Expose()
  @IsInt()
  @Min(1)
  @Max(10)
  public guests?: number;

  @Expose()
  @IsInt()
  @Min(100)
  @Max(100000)
  public price?: number;

  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Amenity, { each: true })
  public amenities?: Amenity[];

  @Expose()
  @Type(() => CoordinatesDto)
  @IsObject()
  @ValidateNested()
  public coordinates?: CoordinatesDto;
}
