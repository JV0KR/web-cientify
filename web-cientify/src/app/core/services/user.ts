import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = 'http://localhost:4000/api/users';

  constructor(private http: HttpClient) {}

  getProfile() {
    return this.http.get(`${this.api}/profile`);
  }

  updateProfile(data: any) {
    return this.http.put(`${this.api}/profile`, data);
  }

  listUsers() {
    return this.http.get(`${this.api}`);
  }

  follow(userId: string) {
    return this.http.post(`${this.api}/${userId}/follow`, {});
  }
}
