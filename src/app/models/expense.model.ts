import { Category } from './category.model';

export interface Expense {
  id?: number;
  amount: number;
  category: Category;
  description?: string;
  date: string;
  isRefund?: boolean;
  isRecurring?: boolean;
  recurringFrequency?: 'Monthly' | 'Weekly' | 'Yearly';
  accountId: number | null;
  username?: string;
}
