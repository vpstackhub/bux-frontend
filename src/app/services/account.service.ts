import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Account } from '../models/account.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private apiUrl = `${environment.apiUrl}/accounts`;

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

  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(this.apiUrl, this.getAuthHeaders());
  }

  createAccount(account: { name: string }): Observable<Account> {
    return this.http.post<Account>(this.apiUrl, account, this.getAuthHeaders());
  }
}
