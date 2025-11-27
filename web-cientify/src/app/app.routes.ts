import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.Register) },
  { path: 'feed', loadComponent: () => import('./features/feed/feed').then(m => m.Feed) },
  { path: 'perfil', loadComponent: () => import('./features/perfil/perfil').then(m => m.Perfil) },
  { path: 'cientifico', loadComponent: () => import('./features/cientifico/cientifico').then(m => m.Cientifico) },
  { path: 'admin', loadComponent: () => import('./features/admin/admin').then(m => m.Admin) },
];
