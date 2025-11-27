import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface User {
  email: string;
  password: string;
  nombre?: string;
  rol?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface Jwtres {
  user: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUri = 'http://localhost:4000/api/users';
  authSubject = new BehaviorSubject<boolean>(false);
  private token: string | null = '';

  constructor(private httpClient: HttpClient) {
    // Verificar si hay token al inicializar
    this.token = localStorage.getItem("ACCESS_TOKEN");
    this.authSubject.next(!!this.token);
  }

  register(user: User): Observable<Jwtres> {
    return this.httpClient.post<Jwtres>(`${this.apiUri}/register`, user).pipe(
      tap((res: Jwtres) => {
        if (res && res.token) {
          this.saveToken(res.token);
          this.authSubject.next(true);
        }
      })
    );
  }

  login(user: User): Observable<Jwtres> {
    return this.httpClient.post<Jwtres>(`${this.apiUri}/login`, user).pipe(
      tap((res: Jwtres) => {
        if (res && res.token) {
          this.saveToken(res.token);
          this.authSubject.next(true);
        }
      })
    );
  }

  logout() {
    this.token = '';
    localStorage.removeItem("ACCESS_TOKEN");
    localStorage.removeItem("EXPIRES_IN");
    this.authSubject.next(false);
  }

  private saveToken(token: string) {
    localStorage.setItem("ACCESS_TOKEN", token);
    this.token = token;
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem("ACCESS_TOKEN");
    }
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}