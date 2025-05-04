import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private storageKey = 'currentUser';
  private apiUrl    = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  register(user: User): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, user);
  }

  login(user: User): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, user);
  }

  setCurrentUser(user: User) {
    localStorage.setItem(this.storageKey, JSON.stringify(user));
  }

  getCurrentUser(): User | null {
    const json = localStorage.getItem(this.storageKey);
    return json ? JSON.parse(json) : null;
  }

  logout() {
    localStorage.removeItem(this.storageKey);
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }
}