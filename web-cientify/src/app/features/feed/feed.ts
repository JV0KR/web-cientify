import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PostService, Post } from '../../core/services/post';
import { CommentService, Comment } from '../../core/services/comment';
import { UserService } from '../../core/services/user';
import { Auth } from '../../auth/services/auth';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feed.html',
  styleUrl: './feed.css',
})
export class Feed implements OnInit {
  posts: Post[] = [];
  loading = false;
  currentUser: any = null;
  
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

  constructor(
    private postService: PostService,
    private commentService: CommentService,
    private userService: UserService,
    private auth: Auth
  ) {}

  ngOnInit() {
    this.loadUserProfile();
    this.loadPosts();
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
    this.postService.list({ page: 1, limit: 20, published: true }).subscribe({
      next: (response) => {
        this.posts = response.posts;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading posts:', err);
        this.loading = false;
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newPost.file = file;
    }
  }

  createPost() {
    if (!this.newPost.title || !this.newPost.content) {
      alert('Título y contenido son obligatorios');
      return;
    }

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
        this.posts.unshift(post);
        this.resetCreateForm();
        this.showCreateForm = false;
      },
      error: (err) => {
        console.error('Error creating post:', err);
        alert(err.error?.message || 'Error al crear el post');
      }
    });
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
    this.postService.toggleSave(post._id).subscribe({
      next: (response) => {
        console.log(response.message);
      },
      error: (err) => {
        console.error('Error toggling save:', err);
      }
    });
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
