import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PostService, Post } from '../../core/services/post';
import { CommentService, Comment } from '../../core/services/comment';
import { UserService } from '../../core/services/user';
import { UserStateService } from '../../core/services/user-state';
import { Auth } from '../../auth/services/auth';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feed.html',
  styleUrl: './feed.css',
})
export class Feed implements OnInit, OnDestroy {
  posts: Post[] = [];
  allPosts: Post[] = [];
  loading = false;
  currentUser: any = null;
  isDarkMode = false;
  private destroy$ = new Subject<void>();
  // edición en línea
  editingPostId: string | null = null;

  // Filtro de vista
  viewFilter: 'todos' | 'mios' | 'guardados' = 'todos';
  showingSavedPosts: boolean = false;

  // Crear post
  showCreateForm = false;
  newPost = {
    title: '',
    subtitle: '',
    summary: '',
    content: '',
    tags: '',
    published: true,
    file: null as File | null
  };

  // Comentarios
  commentsMap: { [postId: string]: Comment[] } = {};
  showCommentsMap: { [postId: string]: boolean } = {};
  newCommentMap: { [postId: string]: string } = {};

  // Posts guardados
  savedPosts: Post[] = [];
  private readonly themeStorageKey = 'cientify-theme';

  constructor(
    private postService: PostService,
    private commentService: CommentService,
    private userService: UserService,
    private userStateService: UserStateService,
    private auth: Auth
  ) {}

  ngOnInit() {
    this.initializeTheme();
    this.loadUserProfile();
    this.subscribeToUserState();
    this.loadSavedPosts();
    this.loadPosts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem(this.themeStorageKey, this.isDarkMode ? 'dark' : 'light');
    this.applyThemeClass();
  }

  private initializeTheme() {
    this.isDarkMode = localStorage.getItem(this.themeStorageKey) === 'dark';
    this.applyThemeClass();
  }

  private applyThemeClass() {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('dark-mode', this.isDarkMode);
    }
  }

  subscribeToUserState() {
    this.userStateService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          this.currentUser = user;
          // Actualizar avatar en todos los posts del usuario actual
          this.updateUserAvatarInPosts(user);
        }
      });
  }

  updateUserAvatarInPosts(user: any) {
    const userId = user._id || user.id;
    this.posts.forEach(post => {
      if (post.author._id === userId) {
        post.author.avatarUrl = user.avatarUrl;
      }
      // También actualizar en comentarios
      const comments = this.commentsMap[post._id];
      if (comments) {
        comments.forEach(comment => {
          if (comment.author._id === userId) {
            comment.author.avatarUrl = user.avatarUrl;
          }
        });
      }
    });
  }

  loadUserProfile() {
    this.userService.getProfile().subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: (err) => {
        console.error('Error loading user profile:', err);
      }
    });
  }

  loadPosts() {
    this.loading = true;
    console.log('Cargando publicaciones...');
    // Si es admin, cargar todos los posts (incluidos los ocultos). Si no, solo publicados.
    const params: any = { page: 1, limit: 20 };
    if (!this.isAdmin()) params.published = true;

    this.postService.list(params).subscribe({
      next: (response) => {
        console.log('Publicaciones cargadas:', response.posts);
        this.allPosts = response.posts;
        this.reconstructSavedPosts();
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar publicaciones:', err);
        this.loading = false;
      }
    });
  }

  reconstructSavedPosts() {
    const savedPostIds = localStorage.getItem('savedPostIds');
    if (savedPostIds) {
      try {
        const postIds: string[] = JSON.parse(savedPostIds);
        this.savedPosts = this.allPosts.filter(post => postIds.includes(post._id));
        console.log('Posts guardados reconstruidos:', this.savedPosts.length);
        console.log('Posts guardados:', this.savedPosts);
      } catch (e) {
        console.error('Error al reconstruir posts guardados:', e);
        this.savedPosts = [];
      }
    } else {
      this.savedPosts = [];
    }
  }

  applyFilter() {
    // Ahora el feed solo muestra todos los posts
    // Los filtros "Mis Posts" y "Guardados" están en el perfil
    this.posts = this.allPosts;
  }

  setViewFilter(filter: 'todos' | 'mios' | 'guardados') {
    if (this.editingPostId) {
      const confirmExit = confirm('¿Estás seguro de que quieres dejar de editar? Se perderán los cambios no guardados.');
      if (!confirmExit) {
        return;
      }
      this.cancelEditPost();
    }
    this.viewFilter = 'todos';
    this.showingSavedPosts = false;
    this.applyFilter();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newPost.file = file;
    }
  }

  createPost() {
    // Verificar permisos antes de crear
    if (!this.canCreate()) {
      alert('No tienes permisos para crear contenido');
      return;
    }
    if (!this.newPost.title || !this.newPost.content) {
      alert('Título y contenido son obligatorios');
      return;
    }
    // Si estamos editando un post existente
    if (this.editingPostId) {
      const updateData = new FormData();
      updateData.append('title', this.newPost.title);
      updateData.append('content', this.newPost.content);
      if (this.newPost.subtitle) updateData.append('subtitle', this.newPost.subtitle);
      if (this.newPost.summary) updateData.append('summary', this.newPost.summary);
      if (this.newPost.tags) {
        const tags = this.newPost.tags.split(',').map(t => t.trim()).filter(t => t);
        tags.forEach(tag => updateData.append('tags', tag));
      }
      updateData.append('published', this.newPost.published.toString());
      if (this.newPost.file) {
        updateData.append('file', this.newPost.file);
      }

      this.postService.update(this.editingPostId, updateData).subscribe({
        next: (updated) => {
          const idx = this.allPosts.findIndex(p => p._id === updated._id);
          if (idx !== -1) this.allPosts[idx] = updated;
          this.applyFilter();
          this.resetCreateForm();
          this.showCreateForm = false;
          this.editingPostId = null;
        },
        error: (err) => {
          console.error('Error updating post:', err);
          alert(err.error?.message || 'Error al actualizar el post');
        }
      });
      return;
    }

    // Crear nuevo post
    const formData = new FormData();
    formData.append('title', this.newPost.title);
    formData.append('content', this.newPost.content);
    if (this.newPost.subtitle) formData.append('subtitle', this.newPost.subtitle);
    if (this.newPost.summary) formData.append('summary', this.newPost.summary);
    if (this.newPost.tags) {
      const tags = this.newPost.tags.split(',').map(t => t.trim()).filter(t => t);
      tags.forEach(tag => formData.append('tags', tag));
    }
    formData.append('published', this.newPost.published.toString());
    if (this.newPost.file) {
      formData.append('file', this.newPost.file);
    }

    this.postService.create(formData).subscribe({
      next: (post) => {
        this.allPosts.unshift(post);
        this.applyFilter();
        this.resetCreateForm();
        this.showCreateForm = false;
      },
      error: (err) => {
        console.error('Error creating post:', err);
        alert(err.error?.message || 'Error al crear el post');
      }
    });
  }

  /** Roles y permisos */
  private roleAllowedToCreate(): string[] {
    // admin y los roles científicos (incluye investigador y profesor)
    return ['admin', 'cientifico', 'investigador', 'profesor'];
  }

  isAdmin(): boolean {
    const role = this.currentUser?.rol || this.currentUser?.role;
    return role === 'admin';
  }

  canCreate(): boolean {
    const role = this.currentUser?.rol || this.currentUser?.role;
    return this.roleAllowedToCreate().includes(role);
  }

  /** Acciones administrativas */
  adminDelete(post: Post) {
    if (!this.isAdmin()) {
      alert('Solo administradores pueden eliminar publicaciones');
      return;
    }
    if (!confirm('¿Deseas eliminar esta publicación? Esta acción no se puede deshacer.')) return;
    this.postService.delete(post._id).subscribe({
      next: () => {
        this.posts = this.posts.filter(p => p._id !== post._id);
      },
      error: (err) => {
        console.error('Error eliminando post:', err);
        alert('Error al eliminar la publicación');
      }
    });
  }

  adminTogglePublish(post: Post) {
    if (!this.isAdmin()) {
      alert('Solo administradores pueden ocultar/mostrar publicaciones');
      return;
    }
    this.postService.togglePublish(post._id, !post.published).subscribe({
      next: (updated) => {
        const idx = this.posts.findIndex(p => p._id === post._id);
        if (idx !== -1) this.posts[idx] = updated;
      },
      error: (err) => {
        console.error('Error toggling publish:', err);
        alert('Error al actualizar visibilidad de la publicación');
      }
    });
  }

  /** Edición: iniciar edición en el formulario */
  startEditPost(post: Post) {
    if (!this.canEdit(post)) {
      alert('No tienes permiso para editar esta publicación');
      return;
    }
    this.editingPostId = post._id;
    this.showCreateForm = true;
    this.newPost = {
      title: post.title,
      subtitle: post.subtitle || '',
      summary: post.summary || '',
      content: post.content,
      tags: post.tags ? post.tags.join(', ') : '',
      published: post.published,
      file: null
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEditPost() {
    this.editingPostId = null;
    this.resetCreateForm();
    this.showCreateForm = false;
  }

  canEdit(post: Post): boolean {
    const userId = this.currentUser?._id || this.currentUser?.id;
    if (!userId) return false;
    return this.isAdmin() || post.author._id === userId;
  }

  resetCreateForm() {
    this.newPost = {
      title: '',
      subtitle: '',
      summary: '',
      content: '',
      tags: '',
      published: true,
      file: null
    };
  }

  toggleLike(post: Post) {
    this.postService.toggleLike(post._id).subscribe({
      next: (response) => {
        const postIndex = this.posts.findIndex(p => p._id === post._id);
        if (postIndex !== -1) {
          // Actualizar likes localmente
          const currentUserId = this.currentUser?._id || this.currentUser?.id;
          const hasLiked = post.likes.includes(currentUserId);
          if (hasLiked) {
            this.posts[postIndex].likes = post.likes.filter(id => id !== currentUserId);
          } else {
            this.posts[postIndex].likes = [...post.likes, currentUserId];
          }
        }
      },
      error: (err) => {
        console.error('Error toggling like:', err);
      }
    });
  }

  toggleSave(post: Post) {
    const index = this.savedPosts.findIndex(savedPost => savedPost._id === post._id);
    if (index === -1) {
      this.savedPosts.push(post);
      console.log('Post guardado:', post.title);
    } else {
      this.savedPosts.splice(index, 1);
      console.log('Post eliminado de guardados:', post.title);
    }
    console.log('Posts guardados:', this.savedPosts);
    this.saveSavedPostsToLocalStorage();
    // Refrescar el filtro actual si estamos en "Mis Posts"
    if (this.viewFilter === 'mios') {
      this.applyFilter();
    }
    // Si estamos mostrando guardados, hacer una copia de la referencia para forzar detección de cambios
    if (this.showingSavedPosts) {
      this.savedPosts = [...this.savedPosts];
    }
  }

  saveSavedPostsToLocalStorage() {
    const postIds = this.savedPosts.map(p => p._id);
    localStorage.setItem('savedPostIds', JSON.stringify(postIds));
  }

  loadSavedPosts() {
    const savedPostIds = localStorage.getItem('savedPostIds');
    if (savedPostIds) {
      try {
        const postIds: string[] = JSON.parse(savedPostIds);
        // Los posts reales se cargarán desde allPosts cuando estén disponibles
        console.log('IDs de posts guardados recuperados:', postIds);
      } catch (e) {
        console.error('Error al cargar posts guardados:', e);
      }
    }
  }

  isSaved(post: Post): boolean {
    return this.savedPosts.some(savedPost => savedPost._id === post._id);
  }

  hasLiked(post: Post): boolean {
    const currentUserId = this.currentUser?._id || this.currentUser?.id;
    return post.likes.includes(currentUserId);
  }

  toggleComments(postId: string) {
    this.showCommentsMap[postId] = !this.showCommentsMap[postId];

    if (this.showCommentsMap[postId] && !this.commentsMap[postId]) {
      this.loadComments(postId);
    }
  }

  loadComments(postId: string) {
    this.commentService.listByPost(postId).subscribe({
      next: (response) => {
        this.commentsMap[postId] = response.comments;
      },
      error: (err) => {
        console.error('Error loading comments:', err);
      }
    });
  }

  addComment(postId: string) {
    const content = this.newCommentMap[postId]?.trim();
    if (!content) return;

    this.commentService.create({ content, post: postId }).subscribe({
      next: (comment) => {
        if (!this.commentsMap[postId]) {
          this.commentsMap[postId] = [];
        }
        this.commentsMap[postId].unshift(comment);
        this.newCommentMap[postId] = '';
      },
      error: (err) => {
        console.error('Error adding comment:', err);
        alert(err.error?.message || 'Error al agregar comentario');
      }
    });
  }

  toggleCommentLike(comment: Comment) {
    this.commentService.like(comment._id).subscribe({
      next: (response) => {
        const currentUserId = this.currentUser?._id || this.currentUser?.id;
        const hasLiked = comment.likes.includes(currentUserId);
        const postId = typeof comment.post === 'string' ? comment.post : comment.post._id;
        const comments = this.commentsMap[postId];
        if (comments) {
          const commentIndex = comments.findIndex(c => c._id === comment._id);
          if (commentIndex !== -1) {
            if (hasLiked) {
              comments[commentIndex].likes = comment.likes.filter(id => id !== currentUserId);
            } else {
              comments[commentIndex].likes = [...comment.likes, currentUserId];
            }
          }
        }
      },
      error: (err) => {
        console.error('Error toggling comment like:', err);
      }
    });
  }

  hasLikedComment(comment: Comment): boolean {
    const currentUserId = this.currentUser?._id || this.currentUser?.id;
    return comment.likes.includes(currentUserId);
  }

  getCommentsCount(postId: string): number {
    return this.commentsMap[postId]?.length || 0;
  }

  hasComments(postId: string): boolean {
    return !!(this.commentsMap[postId] && this.commentsMap[postId].length > 0);
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
