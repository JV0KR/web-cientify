import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    nombre: string;
    email: string;
    avatarUrl?: string;
  };
  post: string | {
    _id: string;
    title: string;
  };
  likes: string[];
  respuestas?: Comment[];
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentListResponse {
  total: number;
  page: number;
  limit: number;
  comments: Comment[];
}

@Injectable({ providedIn: 'root' })
export class CommentService {
  private api = 'http://localhost:4000/api/comments';

  constructor(private http: HttpClient) {}

  create(data: { content: string; post: string }): Observable<Comment> {
    return this.http.post<Comment>(`${this.api}/create`, data);
  }

  listByPost(postId: string, page: number = 1, limit: number = 20): Observable<CommentListResponse> {
    return this.http.get<CommentListResponse>(`${this.api}/list?post=${postId}&page=${page}&limit=${limit}`);
  }

  like(id: string): Observable<{ message: string; totalLikes: number }> {
    return this.http.put<{ message: string; totalLikes: number }>(`${this.api}/like/${id}`, {});
  }

  get(id: string): Observable<Comment> {
    return this.http.get<Comment>(`${this.api}/get/${id}`);
  }

  update(id: string, data: { content: string }): Observable<Comment> {
    return this.http.put<Comment>(`${this.api}/update/${id}`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/delete/${id}`);
  }
}
