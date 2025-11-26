import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private api = 'http://localhost:4000/api/comments';

  constructor(private http: HttpClient) {}

  create(data: any) {
    return this.http.post(`${this.api}/create`, data);
  }

  listByPost(postId: string) {
    return this.http.get(`${this.api}/list?post=${postId}`);
  }

  like(id: string) {
    return this.http.put(`${this.api}/like/${id}`, {});
  }

  get(id: string) {
    return this.http.get(`${this.api}/get/${id}`);
  }

  update(id: string, data: any) {
    return this.http.put(`${this.api}/update/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete(`${this.api}/delete/${id}`);
  }
}
