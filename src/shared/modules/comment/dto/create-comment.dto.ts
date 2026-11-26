import { Expose, Transform } from 'class-transformer';
import { IsInt, IsMongoId, Length, Max, Min } from 'class-validator';

export class CreateCommentDto {
  @Expose()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Length(5, 1024)
  public text!: string;

  @Expose()
  @IsInt()
  @Min(1)
  @Max(5)
  public rating!: number;

  public offerId!: string;

  @Expose()
  @IsMongoId()
  public authorId!: string;
}
