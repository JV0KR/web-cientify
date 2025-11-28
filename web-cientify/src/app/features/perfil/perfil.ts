import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user';
import { UserStateService } from '../../core/services/user-state';
import { Auth } from '../../auth/services/auth';
import { PostService, Post } from '../../core/services/post';
import { Router, ActivatedRoute } from '@angular/router';
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
export class PerfilComponent implements OnInit, OnDestroy {
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
    darkMode: false
  };
  settingsSaved = false;
  deleteAccountConfirmation = '';
  deleteAccountStep = 0; // 0: initial, 1: confirmation text entered, 2: ready to delete

  // Post editing
  editingPostId: string | null = null;
  editingPost: any = null;
  postEditForm = {
    title: '',
    subtitle: '',
    summary: '',
    content: '',
    tags: '',
    published: true
  };
  postEditFile: File | null = null;

  // Formulario de edición
  editForm = {
    nombre: '',
    email: '',
    bio: ''
  };

  roles = ['usuario', 'cientifico', 'investigador', 'profesor'];

  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.loadSettings();
    
    // Suscribirse a cambios de param para recargar si cambia la ruta
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('id');
      console.log('🔍 [Perfil] Param id desde ruta:', id);

      if (id && id.trim() !== '') {
        // Hay id en la ruta → cargar perfil del usuario externo
        console.log('📌 Cargando perfil externo para id:', id);
        this.loadProfileById(id);
      } else {
        // Sin id en ruta → cargar perfil propio
        console.log('📌 Sin id en ruta, cargando MI PERFIL');
        this.loadProfile();
      }

      this.loadUserPosts();
      this.loadSavedPosts();
    });
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
    this.success = 'Configuración guardada correctamente';
    setTimeout(() => {
      this.settingsSaved = false;
      this.success = '';
    }, 3000);
  }

  applyTheme() {
    if (this.settings.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  initiateDeleteAccount() {
    this.deleteAccountStep = 1;
    this.deleteAccountConfirmation = '';
  }

  cancelDeleteAccount() {
    this.deleteAccountStep = 0;
    this.deleteAccountConfirmation = '';
  }

  checkDeleteConfirmation() {
    if (this.deleteAccountConfirmation.toLowerCase() === 'eliminar mi cuenta') {
      this.deleteAccountStep = 2;
    } else {
      this.error = 'El texto no coincide. Por favor, escribe "eliminar mi cuenta" exactamente.';
      setTimeout(() => this.error = '', 3000);
    }
  }

  deleteAccount() {
    if (this.deleteAccountStep !== 2) {
      this.error = 'Por favor, confirma tu intención de eliminar la cuenta';
      return;
    }

    const confirmation = confirm(
      '⚠️ ADVERTENCIA: Esta acción eliminará permanentemente tu cuenta, todos tus posts, comentarios y datos asociados. Esta acción NO se puede deshacer.\\n\\n¿Estás completamente seguro de que deseas continuar?'
    );

    if (!confirmation) {
      this.deleteAccountStep = 1;
      this.deleteAccountConfirmation = '';
      return;
    }

    this.loading = true;
    this.userService.deleteAccount().subscribe({
      next: () => {
        this.success = 'Cuenta eliminada correctamente. Redirigiendo...';
        setTimeout(() => {
          this.auth.logout();
          this.router.navigate(['/']);
        }, 2000);
      },
      error: (err: any) => {
        this.loading = false;
        this.deleteAccountStep = 0;
        this.deleteAccountConfirmation = '';
        console.error('Error deleting account:', err);
        this.error = err.error?.message || 'Error al eliminar la cuenta. Por favor, intenta más tarde';
        setTimeout(() => this.error = '', 3000);
      }
    });
  }

  constructor(
    private userService: UserService,
    private userStateService: UserStateService,
    private auth: Auth,
    private postService: PostService,
    private router: Router,
    private route: ActivatedRoute
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

  loadProfileById(id: string) {
    this.loading = true;
    console.log('🌐 Llamando a getUserById con id:', id);
    
    this.userService.getUserById(id).subscribe({
      next: (data: any) => {
        console.log('✅ Perfil del científico cargado:', data);
        if (data && typeof data === 'object') {
          this.user = data;
          this.loadEditForm();
        } else {
          console.error('Respuesta del servidor inválida:', data);
          this.error = 'Datos del perfil inválidos';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error cargando científico:', err?.status, err?.message);
        this.loading = false;
        if (err?.status === 404) {
          this.error = 'Científico no encontrado';
          setTimeout(() => this.router.navigate(['/cientifico']), 2000);
        } else if (err?.status === 401) {
          this.error = 'No autorizado. Inicia sesión.';
          setTimeout(() => this.router.navigate(['/login']), 2000);
        } else {
          this.error = 'Error al cargar el perfil';
        }
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
            //  Actualizar estado global para que se vea en Navbar y otros componentes
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
            //  Actualizar estado global para que se vea en Navbar y otros componentes
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
    // El feed guarda 'savedPostIds' con los IDs de los posts guardados
    const savedPostIds = localStorage.getItem('savedPostIds');

    if (savedPostIds) {
      try {
        const postIds: string[] = JSON.parse(savedPostIds);

        if (postIds.length > 0) {
          // Cargar todos los posts para filtrar por IDs guardados
          this.postService.list().subscribe({
            next: (response: any) => {
              const allPosts = response.posts || [];
              this.savedPosts = allPosts.filter((p: any) => postIds.includes(p._id));
              console.log('Posts guardados cargados:', this.savedPosts.length);
            },
            error: (err: any) => {
              console.error('Error loading saved posts from backend:', err);
              // Fallback: intentar cargar directamente del localStorage
              const saved = localStorage.getItem('savedPosts');
              if (saved) {
                try {
                  const savedArray = JSON.parse(saved);
                  this.savedPosts = Array.isArray(savedArray) ? savedArray : [];
                } catch (e) {
                  console.error('Error parsing saved posts:', e);
                  this.savedPosts = [];
                }
              }
            }
          });
        } else {
          this.savedPosts = [];
        }
      } catch (e) {
        console.error('Error parsing saved post IDs:', e);
        this.savedPosts = [];
      }
    } else {
      // Fallback: intentar cargar directamente del localStorage
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

  startEditPost(post: any) {
    this.editingPostId = post._id;
    this.editingPost = post;
    this.postEditForm = {
      title: post.title || '',
      subtitle: post.subtitle || '',
      summary: post.summary || '',
      content: post.content || '',
      tags: post.tags ? post.tags.join(', ') : '',
      published: post.published !== undefined ? post.published : true
    };
    this.postEditFile = null;
  }

  cancelEditPost() {
    this.editingPostId = null;
    this.editingPost = null;
    this.postEditFile = null;
    this.postEditForm = {
      title: '',
      subtitle: '',
      summary: '',
      content: '',
      tags: '',
      published: true
    };
  }

  onPostFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.postEditFile = file;
    }
  }

  saveEditPost() {
    if (!this.postEditForm.title || !this.postEditForm.content) {
      this.error = 'Título y contenido son obligatorios';
      return;
    }

    const formData = new FormData();
    formData.append('title', this.postEditForm.title);
    formData.append('subtitle', this.postEditForm.subtitle);
    formData.append('summary', this.postEditForm.summary);
    formData.append('content', this.postEditForm.content);
    formData.append('published', this.postEditForm.published.toString());

    if (this.postEditForm.tags) {
      const tags = this.postEditForm.tags.split(',').map(t => t.trim()).filter(t => t);
      tags.forEach(tag => formData.append('tags', tag));
    }

    if (this.postEditFile) {
      formData.append('file', this.postEditFile);
    }

    this.loading = true;
    this.postService.update(this.editingPostId!, formData).subscribe({
      next: (updated: any) => {
        const idx = this.userPosts.findIndex(p => p._id === updated._id);
        if (idx !== -1) {
          this.userPosts[idx] = updated;
        }
        this.success = 'Post actualizado correctamente';
        this.cancelEditPost();
        this.loading = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        console.error('Error updating post:', err);
        this.error = err.error?.message || 'Error al actualizar el post';
        this.loading = false;
        setTimeout(() => this.error = '', 3000);
      }
    });
  }
}
