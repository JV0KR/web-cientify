import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';        // ⬅️ IMPORTANTE
import { AuthService } from '../services/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [FormsModule, CommonModule],              // ⬅️ IMPORTANTE
  templateUrl: './login.html',
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigate(['/feed']),
      error: err => this.error = err.error.message
    });
  }
}
