import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user';
import { UserStateService } from '../../core/services/user-state';
import { Auth } from '../../auth/services/auth';
import { PostService, Post } from '../../core/services/post';
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

  // Posts y guardados
  userPosts: any[] = [];
  savedPosts: any[] = [];
  activeTab: 'posts' | 'saved' | 'settings' = 'posts';
  postsLoading = false;

  // Configuración
  settings = {
    darkMode: false,
    privateProfile: false
  };
  settingsSaved = false;

  // Formulario de edición
  editForm = {
    nombre: '',
    email: '',
    bio: ''
  };

  roles = ['usuario', 'cientifico', 'investigador', 'profesor'];

  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.loadProfile();
    this.loadSettings();
    this.loadUserPosts();
    this.loadSavedPosts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSettings() {
    const saved = localStorage.getItem('perfilSettings');
    if (saved) {
      try {
        this.settings = JSON.parse(saved);
        this.applyTheme();
      } catch {}
    }
  }

  saveSettings() {
    localStorage.setItem('perfilSettings', JSON.stringify(this.settings));
    this.settingsSaved = true;
    this.applyTheme();
    setTimeout(() => this.settingsSaved = false, 2000);
  }

  applyTheme() {
    if (this.settings.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  constructor(
    private userService: UserService,
    private userStateService: UserStateService,
    private auth: Auth,
    private postService: PostService,
    private router: Router
  ) {}

  // Removed duplicate ngOnInit and ngOnDestroy

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

  loadUserPosts() {
    this.postsLoading = true;
    this.postService.list().subscribe({
      next: (response: any) => {
        const allPosts = response.posts || [];
        this.userPosts = allPosts.filter((p: any) =>
          p.author._id === this.user?._id || p.author.id === this.user?._id
        );
        this.postsLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading user posts:', err);
        this.postsLoading = false;
      }
    });
  }

  loadSavedPosts() {
    const saved = localStorage.getItem('savedPosts');
    if (saved) {
      try {
        const savedArray = JSON.parse(saved);
        this.savedPosts = Array.isArray(savedArray) ? savedArray : [];
      } catch (e) {
        console.error('Error parsing saved posts:', e);
        this.savedPosts = [];
      }
    } else {
      this.savedPosts = [];
    }
  }

  setActiveTab(tab: 'posts' | 'saved' | 'settings') {
    this.activeTab = tab;
    // Refrescar posts guardados cuando se abre la pestaña
    if (tab === 'saved') {
      this.loadSavedPosts();
    }
    // Refrescar posts propios cuando se abre la pestaña
    if (tab === 'posts') {
      this.loadUserPosts();
    }
  }

  // Post Management Methods
  deletePost(postId: string, postTitle: string) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el post \"${postTitle}\"? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.postService.delete(postId).subscribe({
      next: () => {
        this.userPosts = this.userPosts.filter(p => p._id !== postId);
        this.success = 'Post eliminado correctamente';
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        console.error('Error deleting post:', err);
        this.error = err.error?.message || 'Error al eliminar el post';
        setTimeout(() => this.error = '', 3000);
      }
    });
  }

  togglePublishPost(post: any) {
    const newState = !post.published;
    this.postService.togglePublish(post._id, newState).subscribe({
      next: (updated: any) => {
        const idx = this.userPosts.findIndex(p => p._id === post._id);
        if (idx !== -1) {
          this.userPosts[idx] = updated;
        }
        this.success = newState ? 'Post publicado correctamente' : 'Post ocultado correctamente';
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        console.error('Error toggling publish:', err);
        this.error = err.error?.message || 'Error al cambiar visibilidad del post';
        setTimeout(() => this.error = '', 3000);
      }
    });
  }

  unsavePost(postId: string) {
    this.postService.toggleSave(postId).subscribe({
      next: () => {
        this.savedPosts = this.savedPosts.filter(p => p._id !== postId);
        this.success = 'Post removido de guardados';
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        console.error('Error unsaving post:', err);
        this.error = err.error?.message || 'Error al remover de guardados';
        setTimeout(() => this.error = '', 3000);
      }
    });
  }
}
