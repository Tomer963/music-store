import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User, AuthResponse, LoginCredentials, RegistrationData } from '../models/user.model';
import { ApiResponse } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  initializeAuth(): void {
    // TODO: Implement
  }

  isAuthenticated(): boolean {
    return false; // TODO: Implement
  }

  getToken(): string | null {
    return localStorage.getItem(environment.tokenKey);
  }

  logout(): void {
    // TODO: Implement
  }
}