import { Routes } from '@angular/router';
import { PerfilComponent } from './features/perfil/perfil';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.Register) },
  { path: 'feed', loadComponent: () => import('./features/feed/feed').then(m => m.Feed) },
  { path: 'perfil/:id', component: PerfilComponent },
  { path: 'perfil', component: PerfilComponent }, // opcional: mi perfil
  { path: 'cientifico', loadComponent: () => import('./features/cientifico/cientifico').then(m => m.Cientifico) },
  { path: 'admin', loadComponent: () => import('./features/admin/admin').then(m => m.Admin) },
];
