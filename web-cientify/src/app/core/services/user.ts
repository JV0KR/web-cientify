import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserProfile {
  _id: string;
  nombre: string;
  email: string;
  rol: string;
  bio?: string;
  avatarUrl?: string;
  createdAt?: Date;
  followersCount?: number;
  followingCount?: number;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = 'http://localhost:4000/api/users';

  constructor(private http: HttpClient) {}

  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.api}/profile`);
  }

  updateProfile(data: Partial<UserProfile>): Observable<any> {
    return this.http.put<any>(`${this.api}/profile`, data);
  }

  updateProfileWithAvatar(formData: FormData): Observable<any> {
    // No especificar Content-Type, dejar que el navegador lo maneje
    return this.http.put<any>(`${this.api}/profile`, formData);
  }

  listUsers(): Observable<any> {
    return this.http.get<any>(`${this.api}`);
  }

  follow(userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${userId}/follow`, {});
  }

  unfollow(userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${userId}/unfollow`, {});
  }

  getUserById(userId: string): Observable<any> {
    return this.http.get<any>(`${this.api}/${userId}`);
  }

  deleteAccount(): Observable<any> {
    return this.http.delete<any>(`${this.api}/profile`);
  }
}

