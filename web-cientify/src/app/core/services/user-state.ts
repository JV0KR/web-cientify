import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UserState {
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

@Injectable({
  providedIn: 'root'
})
export class UserStateService {
  private userSubject = new BehaviorSubject<UserState | null>(null);
  public user$ = this.userSubject.asObservable();

  private avatarSubject = new BehaviorSubject<string | null>(null);
  public avatar$ = this.avatarSubject.asObservable();

  constructor() {}

  /**
   * Actualizar el estado del usuario
   */
  setUser(user: UserState | null) {
    this.userSubject.next(user);
    if (user?.avatarUrl) {
      this.avatarSubject.next(user.avatarUrl);
    }
  }

  /**
   * Obtener el estado actual del usuario
   */
  getUser(): UserState | null {
    return this.userSubject.value;
  }

  /**
   * Obtener el avatar actual
   */
  getAvatar(): string | null {
    return this.avatarSubject.value;
  }

  /**
   * Actualizar solo el avatar (útil cuando solo cambia la foto)
   */
  setAvatar(avatarUrl: string | null) {
    this.avatarSubject.next(avatarUrl);

    // También actualizar en el usuario si existe
    const currentUser = this.userSubject.value;
    if (currentUser) {
      currentUser.avatarUrl = avatarUrl || undefined;
      this.userSubject.next(currentUser);
    }
  }

  /**
   * Limpiar estado (al logout)
   */
  clearUser() {
    this.userSubject.next(null);
    this.avatarSubject.next(null);
  }
}
