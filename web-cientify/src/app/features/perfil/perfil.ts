import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user';
import { UserStateService } from '../../core/services/user-state';
import { Auth } from '../../auth/services/auth';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface UserProfile {
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

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit, OnDestroy {
  user: UserProfile | null = null;
  isEditing = false;
  loading = false;
  error = '';
  success = '';
  avatarFile: File | null = null;
  avatarPreview: string | null = null;

  // Formulario de edición
  editForm = {
    nombre: '',
    email: '',
    bio: ''
  };

  roles = ['usuario', 'cientifico', 'investigador', 'profesor'];

  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private userStateService: UserStateService,
    private auth: Auth,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProfile() {
    this.loading = true;
    this.userService.getProfile().subscribe({
      next: (data: any) => {
        // Verificar que data es válido
        if (data && typeof data === 'object') {
          this.user = data;
          // Actualizar el estado global del usuario
          this.userStateService.setUser(data);
          this.loadEditForm();
        } else {
          console.error('Respuesta del servidor inválida:', data);
          this.error = 'Datos del perfil inválidos';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        this.error = err.error?.message || 'No se pudo cargar el perfil';
        this.loading = false;
      }
    });
  }

  loadEditForm() {
    if (this.user) {
      this.editForm = {
        nombre: this.user.nombre,
        email: this.user.email,
        bio: this.user.bio || ''
      };
    }
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    this.error = '';
    this.success = '';
    if (this.isEditing) {
      this.loadEditForm();
      this.avatarFile = null;
      this.avatarPreview = null;
    }
  }

  onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      console.log('Avatar seleccionado:', file.name, file.type, file.size);

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        this.error = 'Por favor selecciona una imagen válida';
        console.error('Tipo de archivo no válido:', file.type);
        return;
      }

      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.error = 'La imagen no debe exceder 5MB';
        console.error('Archivo demasiado grande:', file.size);
        return;
      }

      this.avatarFile = file;

      // Mostrar preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarPreview = e.target.result;
        console.log('Preview cargado');
      };
      reader.onerror = () => {
        this.error = 'Error al leer la imagen';
        console.error('Error al leer FileReader');
      };
      reader.readAsDataURL(file);
      this.error = '';
    }
  }

  saveProfile() {
    if (!this.editForm.nombre || !this.editForm.email) {
      this.error = 'Nombre y email son obligatorios';
      return;
    }

    if (this.editForm.nombre.length < 3) {
      this.error = 'El nombre debe tener al menos 3 caracteres';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    // Si hay avatar, crear FormData
    if (this.avatarFile) {
      const formData = new FormData();
      formData.append('nombre', this.editForm.nombre);
      formData.append('email', this.editForm.email);
      formData.append('bio', this.editForm.bio);
      formData.append('avatar', this.avatarFile);

      this.userService.updateProfileWithAvatar(formData).subscribe({
        next: (data: any) => {
          // Validar que la respuesta sea válida
          if (data && typeof data === 'object') {
            this.user = data;
            // 🔄 Actualizar estado global para que se vea en Navbar y otros componentes
            this.userStateService.setUser(data);
            this.loadEditForm();
            this.isEditing = false;
            this.success = 'Perfil actualizado correctamente';
            this.avatarFile = null;
            this.avatarPreview = null;
            setTimeout(() => this.success = '', 3000);
          } else {
            throw new Error('Respuesta inválida del servidor');
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error actualizando perfil:', err);
          this.error = err.error?.message || err.error || 'Error al actualizar el perfil';
          this.loading = false;
        }
      });
    } else {
      // Sin avatar, enviar JSON
      const updateData = {
        nombre: this.editForm.nombre,
        email: this.editForm.email,
        bio: this.editForm.bio
      };

      this.userService.updateProfile(updateData).subscribe({
        next: (data: any) => {
          // Validar que la respuesta sea válida
          if (data && typeof data === 'object') {
            this.user = data;
            // 🔄 Actualizar estado global para que se vea en Navbar y otros componentes
            this.userStateService.setUser(data);
            this.loadEditForm();
            this.isEditing = false;
            this.success = 'Perfil actualizado correctamente';
            setTimeout(() => this.success = '', 3000);
          } else {
            throw new Error('Respuesta inválida del servidor');
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error actualizando perfil:', err);
          this.error = err.error?.message || err.error || 'Error al actualizar el perfil';
          this.loading = false;
        }
      });
    }
  }

  cancelEdit() {
    this.isEditing = false;
    this.error = '';
    this.avatarFile = null;
    this.avatarPreview = null;
  }

  logout() {
    // Limpiar estado del usuario
    this.userStateService.clearUser();
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  getInitials(): string {
    if (this.user?.nombre) {
      return this.user.nombre
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
    return rolColors[this.user?.rol || 'usuario'] || '#3498db';
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
}
