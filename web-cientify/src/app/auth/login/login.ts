import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../services/auth';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  error = '';
  isDarkMode = false;
  private readonly themeStorageKey = 'cientify-theme';

  constructor(private auth: Auth, private router: Router) {}

  ngOnInit() {
    this.isDarkMode = localStorage.getItem(this.themeStorageKey) === 'dark';
    this.applyThemeClass();
  }

  submit() {
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigate(['/feed']),
      error: err => this.error = err.error.message
    });
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem(this.themeStorageKey, this.isDarkMode ? 'dark' : 'light');
    this.applyThemeClass();
  }

  private applyThemeClass() {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('dark-mode', this.isDarkMode);
    }
  }
}
