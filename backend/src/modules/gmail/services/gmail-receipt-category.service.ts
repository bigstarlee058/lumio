import { Injectable } from '@nestjs/common';
import { Receipt } from '../../../entities';
import { ReceiptCategoryService } from '../../receipts/services/receipt-category.service';

@Injectable()
export class GmailReceiptCategoryService {
  constructor(private readonly receiptCategoryService: ReceiptCategoryService) {}

  suggestCategory(receipt: Receipt) {
    return this.receiptCategoryService.suggestCategory(receipt, 'via-statement');
  }
}
