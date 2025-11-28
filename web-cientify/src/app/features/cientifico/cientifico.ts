import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user';
import { Auth } from '../../auth/services/auth';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle';

interface Scientist {
  _id: string;
  nombre: string;
  email: string;
  rol: string;
  bio?: string;
  avatarUrl?: string;
  createdAt?: Date;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

@Component({
  selector: 'app-cientifico',
  standalone: true,
  imports: [CommonModule, FormsModule, ThemeToggleComponent],
  templateUrl: './cientifico.html',
  styleUrl: './cientifico.css',
})
export class Cientifico implements OnInit, OnDestroy {
  scientists: Scientist[] = [];
  filteredScientists: Scientist[] = [];
  searchQuery = '';
  loading = false;
  error = '';
  success = '';
  selectedFilter: 'todos' | 'seguidos' | 'no-seguidos' = 'todos';
  sortBy: 'nombre' | 'followers' | 'recent' = 'nombre';
  followingCount = 0;
  totalScientists = 0;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private userService: UserService,
    private auth: Auth,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadScientists();

    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.filterAndSortScientists();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadScientists() {
    this.loading = true;
    this.userService.searchScientists({ rol: 'cientifico', limit: 100 }).subscribe({
      next: (response: any) => {
        const usuarios = response.usuarios || [];
        this.totalScientists = response.total ?? usuarios.length;
        this.scientists = usuarios
          .filter((u: any) => ['cientifico', 'investigador', 'profesor'].includes(u.rol))
          .map((u: any) => ({
            ...u,
            followersCount: u.followersCount ?? (u.seguidores?.length || 0),
            followingCount: u.followingCount ?? (u.siguiendo?.length || 0),
            isFollowing: !!u.isFollowing,
          }));
        this.refreshFollowingCount();
        this.filterAndSortScientists();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading scientists:', err);
        this.error = 'Error al cargar los científicos';
        this.loading = false;
        setTimeout(() => this.error = '', 3000);
      }
    });
  }

  onSearchChange(query: string) {
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  filterAndSortScientists() {
    let filtered = this.scientists;

    // Aplicar búsqueda
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.nombre.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        (s.bio && s.bio.toLowerCase().includes(query))
      );
    }

    // Aplicar filtro de seguimiento
    if (this.selectedFilter === 'seguidos') {
      filtered = filtered.filter(s => s.isFollowing);
    } else if (this.selectedFilter === 'no-seguidos') {
      filtered = filtered.filter(s => !s.isFollowing);
    }

    // Aplicar ordenamiento
    if (this.sortBy === 'nombre') {
      filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (this.sortBy === 'followers') {
      filtered.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
    } else if (this.sortBy === 'recent') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    }

    this.filteredScientists = filtered;
    this.refreshFollowingCount();
  }

  private refreshFollowingCount() {
    this.followingCount = this.scientists.filter(s => s.isFollowing).length;
  }

  setFilter(filter: 'todos' | 'seguidos' | 'no-seguidos') {
    this.selectedFilter = filter;
    this.filterAndSortScientists();
  }

  setSortBy(sort: 'nombre' | 'followers' | 'recent') {
    this.sortBy = sort;
    this.filterAndSortScientists();
  }

  getRolColor(rol: string): string {
    const rolColors: { [key: string]: string } = {
      'usuario': '#3498db',
      'cientifico': '#e74c3c',
      'investigador': '#9b59b6',
      'profesor': '#16a085',
      'admin': '#e67e22'
    };
    return rolColors[rol] || '#3498db';
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  toggleFollow(scientist: Scientist) {
    if (scientist.isFollowing) {
      this.unfollow(scientist);
    } else {
      this.follow(scientist);
    }
  }

  follow(scientist: Scientist) {
    this.userService.follow(scientist._id).subscribe({
      next: (response) => {
        scientist.isFollowing = true;
        scientist.followersCount = response?.target?.followersCount ?? (scientist.followersCount || 0) + 1;
        this.refreshFollowingCount();
        this.success = `Siguiendo a ${response?.target?.nombre || scientist.nombre}`;
        setTimeout(() => this.success = '', 2000);
      },
      error: (err: any) => {
        console.error('Error following scientist:', err);
        this.error = err.error?.message || 'Error al seguir';
        setTimeout(() => this.error = '', 3000);
      }
    });
  }

  unfollow(scientist: Scientist) {
    this.userService.unfollow(scientist._id).subscribe({
      next: (response) => {
        scientist.isFollowing = false;
        scientist.followersCount = response?.target?.followersCount ?? Math.max(0, (scientist.followersCount || 1) - 1);
        this.refreshFollowingCount();
        this.success = `Dejaste de seguir a ${response?.target?.nombre || scientist.nombre}`;
        setTimeout(() => this.success = '', 2000);
      },
      error: (err: any) => {
        console.error('Error unfollowing scientist:', err);
        this.error = err.error?.message || 'Error al dejar de seguir';
        setTimeout(() => this.error = '', 3000);
      }
    });
  }

  viewProfile(scientist: Scientist) {
    this.router.navigate(['/perfil', scientist._id]);
  }

}
