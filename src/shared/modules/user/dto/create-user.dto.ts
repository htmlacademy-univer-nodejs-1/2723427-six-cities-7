import { Expose, Transform } from 'class-transformer';
import { IsEmail, IsEnum, Length, Matches, ValidateIf } from 'class-validator';
import { UserType } from '../../../types/index.js';

export class CreateUserDto {
  @Expose()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Length(1, 15)
  public name!: string;

  @Expose()
  @IsEmail()
  public email!: string;

  @Expose()
  @ValidateIf((_dto, value) => value !== undefined)
  @Matches(/\.(?:jpg|png)(?:[?#].*)?$/i)
  public avatarPath?: string;

  @Expose()
  @Length(6, 12)
  public password!: string;

  @Expose()
  @IsEnum(UserType)
  public userType!: UserType;
}
