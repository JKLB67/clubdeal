import { IsNumber, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvestmentDto {
  @ApiProperty({ example: 'demo-project-001' })
  @IsString()
  projectId: string;

  @ApiProperty({ example: 10000, description: 'Montant en euros (entier)' })
  @IsNumber()
  @IsPositive()
  amount: number;
}
