import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Expense } from '../models/expense.model';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private apiUrl = `${environment.apiUrl}/expenses`;

  constructor(private http: HttpClient) {}

  /** CREATE */
  addExpense(expense: Expense): Observable<{ expense: Expense; emailSent: boolean }> {
    return this.http.post<{ expense: Expense; emailSent: boolean }>(
      this.apiUrl,
      expense
    );
  }

  /** READ */
  getAllExpenses(): Observable<Expense[]> {
    return this.http.get<Expense[]>(this.apiUrl);
  }

  /** REFUND */
  markExpenseAsRefund(expenseId: number): Observable<Expense> {
    return this.http.put<Expense>(`${this.apiUrl}/refund/${expenseId}`, {});
  }

  /** RESET ALL */
  deleteAllExpenses(): Observable<string> {
    return this.http.delete(`${this.apiUrl}/reset`, { responseType: 'text' });
  }
}