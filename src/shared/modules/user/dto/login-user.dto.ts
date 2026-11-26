import { Expose } from 'class-transformer';
import { IsEmail, Length } from 'class-validator';

export class LoginUserDto {
  @Expose()
  @IsEmail()
  public email!: string;

  @Expose()
  @Length(6, 12)
  public password!: string;
}
