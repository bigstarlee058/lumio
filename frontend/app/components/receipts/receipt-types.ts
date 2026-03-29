export interface EditableReceiptLineItem {
  id: string;
  description: string;
  amount: number;
}

export interface ReceiptCategoryOption {
  id: string;
  name: string;
  isEnabled?: boolean;
}

export interface EditableReceiptParsedData {
  vendor: string;
  amount: number | '';
  currency: string;
  date: string;
  tax: number | '';
  paymentMethod: string;
  transactionType: 'income' | 'expense' | 'transfer' | 'unknown';
  categoryId: string;
  lineItems: EditableReceiptLineItem[];
}
