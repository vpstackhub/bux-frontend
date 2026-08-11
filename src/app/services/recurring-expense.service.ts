import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateRecurringExpenseRequest,
  RecurringExpense
} from '../models/recurring-expense.model';

@Injectable({ providedIn: 'root' })
export class RecurringExpenseService {
  private apiUrl = `${environment.apiUrl}/recurring-expenses`;

  constructor(private http: HttpClient) {}

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

  createRecurringExpense(
    request: CreateRecurringExpenseRequest
  ): Observable<RecurringExpense> {
    return this.http.post<RecurringExpense>(this.apiUrl, request, this.getAuthHeaders());
  }

  getActiveRecurringExpenses(): Observable<RecurringExpense[]> {
    return this.http.get<RecurringExpense[]>(this.apiUrl, this.getAuthHeaders());
  }

  stopRecurringExpense(id: number): Observable<RecurringExpense> {
    return this.http.put<RecurringExpense>(
      `${this.apiUrl}/${id}/stop`,
      {},
      this.getAuthHeaders()
    );
  }
}
