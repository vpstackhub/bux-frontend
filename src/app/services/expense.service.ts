import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Expense } from '../models/expense.model';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private apiUrl = `${environment.apiUrl}/expenses`;

  constructor(private http: HttpClient) {}

  /** 🔐 AUTH HEADER HELPER */
  private getAuthHeaders() {
    const email = localStorage.getItem('authEmail');
    const password = localStorage.getItem('authPassword');

    if (!email || !password) {
      console.warn('Missing credentials in localStorage');
      return {};
    }

    const basicAuth = btoa(`${email}:${password}`);
    return {
      headers: {
        Authorization: `Basic ${basicAuth}`
      }
    };
  }

  /** CREATE */
  addExpense(expense: Expense): Observable<{ expense: Expense; emailSent: boolean }> {
    return this.http.post<{ expense: Expense; emailSent: boolean }>(
      this.apiUrl,
      expense,
      this.getAuthHeaders()
    );
  }

  /** READ */
  getExpensesByUserId(userId: number): Observable<Expense[]> {
    return this.http.get<Expense[]>(
      `${environment.apiUrl}/expenses/user/${userId}`,
      this.getAuthHeaders()
    );
  }

  /** REFUND */
  markExpenseAsRefund(expenseId: number): Observable<Expense> {
    return this.http.put<Expense>(
      `${this.apiUrl}/refund/${expenseId}`,
      {},
      this.getAuthHeaders()
    );
  }

  /** ADMIN VIEW */
  getAllExpenses(): Observable<Expense[]> {
    return this.http.get<Expense[]>(
      `${this.apiUrl}`,
      this.getAuthHeaders()
    );
  }

  /** RESET ALL */
  deleteAllExpenses(): Observable<string> {
  return this.http.delete<string>(
    `${this.apiUrl}/reset`,
    this.getAuthHeaders()
  );
}
}
