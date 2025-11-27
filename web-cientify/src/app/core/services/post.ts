import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Post {
  _id: string;
  title: string;
  subtitle?: string;
  summary?: string;
  content: string;
  author: {
    _id: string;
    nombre: string;
    email: string;
    rol: string;
    avatarUrl?: string;
  };
  tags?: string[];
  published: boolean;
  publishedAt?: Date;
  likes: string[];
  guardados: string[];
  fileUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostListResponse {
  total: number;
  page: number;
  limit: number;
  posts: Post[];
}

@Injectable({
  providedIn: 'root',
})
export class PostService {
  private api = 'http://localhost:4000/api/posts';

  constructor(private http: HttpClient) {}

  create(data: FormData): Observable<Post> {
    // FormData maneja automáticamente los arrays
    return this.http.post<Post>(`${this.api}`, data);
  }

  list(params?: { page?: number; limit?: number; tag?: string; author?: string; published?: boolean }): Observable<PostListResponse> {
    let queryParams = '';
    if (params) {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
      if (params.tag) query.append('tag', params.tag);
      if (params.author) query.append('author', params.author);
      if (params.published !== undefined) query.append('published', params.published.toString());
      queryParams = '?' + query.toString();
    }
    return this.http.get<PostListResponse>(`${this.api}/list${queryParams}`);
  }

  get(id: string): Observable<Post> {
    return this.http.get<Post>(`${this.api}/findPost/${id}`);
  }

  update(id: string, data: FormData): Observable<Post> {
    return this.http.put<Post>(`${this.api}/update/${id}`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/remove/${id}`);
  }

  toggleLike(id: string): Observable<{ message: string; totalLikes: number }> {
    return this.http.post<{ message: string; totalLikes: number }>(`${this.api}/${id}/like`, {});
  }

  toggleSave(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${id}/save`, {});
  }
}
