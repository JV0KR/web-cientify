import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../auth/services/auth';
import { UserService } from '../../../core/services/user';
import { UserStateService } from '../../../core/services/user-state';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit, OnDestroy {
  isAuthenticated = false;
  userName = '';
  userRole = '';
  userAvatar = '';
  menuOpen = false;

  private destroy$ = new Subject<void>();

  constructor(
    private auth: Auth,
    private userService: UserService,
    private userStateService: UserStateService,
    private router: Router
  ) {}

  ngOnInit() {
    this.auth.authSubject.subscribe((isAuth) => {
      this.isAuthenticated = isAuth;
      if (isAuth) {
        this.loadUserInfo();
      } else {
        this.clearUserInfo();
      }
    });

    // Si ya está autenticado al cargar
    if (this.auth.isAuthenticated()) {
      this.isAuthenticated = true;
      this.loadUserInfo();
    }

    // 🔄 Suscribirse a cambios del estado del usuario (avatar, nombre, etc)
    this.userStateService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          this.userName = user.nombre;
          this.userRole = user.rol;
          this.userAvatar = user.avatarUrl || '';
          console.log('🔄 Avatar actualizado en navbar:', user.avatarUrl);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserInfo() {
    this.userService.getProfile().subscribe({
      next: (user: any) => {
        this.userName = user.nombre;
        this.userRole = user.rol;
        this.userAvatar = user.avatarUrl;
        // Actualizar el estado global
        this.userStateService.setUser(user);
      },
      error: (err) => {
        console.error('Error loading user info:', err);
      }
    });
  }

  clearUserInfo() {
    this.userName = '';
    this.userRole = '';
    this.userAvatar = '';
    this.userStateService.clearUser();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  logout() {
    this.userStateService.clearUser();
    this.auth.logout();
    this.router.navigate(['/login']);
    this.menuOpen = false;
  }

  getInitials(): string {
    if (this.userName) {
      return this.userName
        .split(' ')
        .map(n => n.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'U';
  }

  getRolColor(): string {
    const rolColors: { [key: string]: string } = {
      'usuario': '#3498db',
      'cientifico': '#e74c3c',
      'investigador': '#9b59b6',
      'profesor': '#16a085',
      'admin': '#e67e22'
    };
    return rolColors[this.userRole] || '#3498db';
  }
}
