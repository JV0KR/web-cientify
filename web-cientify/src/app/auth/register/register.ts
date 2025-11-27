import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  nombre = '';
  email = '';
  password = '';
  confirmPassword = '';
  rol = 'usuario';
  bio = '';
  error = '';
  loading = false;

  constructor(private auth: Auth, private router: Router) {}

  submit() {
    this.error = '';
    
    // Validaciones del lado del cliente
    if (!this.nombre || !this.email || !this.password) {
      this.error = 'Por favor completa todos los campos requeridos';
      return;
    }

    if (this.password.length < 8) {
      this.error = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.loading = true;

    const userData = {
      nombre: this.nombre,
      email: this.email,
      password: this.password,
      rol: this.rol,
      ...(this.bio && { bio: this.bio })
    };

    this.auth.register(userData).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/feed']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Error al registrar usuario';
      }
    });
  }
}
