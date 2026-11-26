import { Expose } from 'class-transformer';
import { IsDefined, IsLatitude, IsLongitude, IsNumber } from 'class-validator';
import { Location } from '../../../types/index.js';

export class CoordinatesDto implements Location {
  @Expose()
  @IsDefined()
  @IsNumber()
  @IsLatitude()
  public latitude!: number;

  @Expose()
  @IsDefined()
  @IsNumber()
  @IsLongitude()
  public longitude!: number;
}
