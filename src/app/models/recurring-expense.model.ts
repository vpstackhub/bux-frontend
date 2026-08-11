import { Category } from './category.model';

export interface CreateRecurringExpenseRequest {
  accountId: number;
  amount: number;
  category: Category;
  description: string;
  startDate: string;
}

export interface RecurringExpense {
  id: number;
  accountId: number;
  amount: number;
  category: Category;
  description?: string | null;
  startDate: string;
  active: boolean;
  createdDate: string;
  stoppedDate?: string | null;
}
