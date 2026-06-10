import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ProfileType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'jean.dupont@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MotDePasse123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: ProfileType, default: ProfileType.PHYSICAL })
  @IsEnum(ProfileType)
  profileType: ProfileType;
}
