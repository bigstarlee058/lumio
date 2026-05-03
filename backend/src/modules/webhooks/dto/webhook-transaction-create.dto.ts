import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class WebhookTransactionCreateDto {
  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsDateString()
  transactionDate: string;

  @IsString()
  @IsNotEmpty()
  counterpartyName: string;

  @IsString()
  @IsOptional()
  paymentPurpose?: string;

  @IsString()
  @IsNotEmpty()
  transactionType: string;

  @IsString()
  @IsOptional()
  categoryId?: string;
}
