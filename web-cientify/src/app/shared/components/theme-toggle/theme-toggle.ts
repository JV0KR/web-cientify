import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button" class="theme-toggle" (click)="toggleTheme()">
      <span class="theme-toggle__icon" aria-hidden="true">
        {{ (isDarkMode$ | async) ? '☀️' : '🌙' }}
      </span>
      <span class="theme-toggle__label">
        {{ (isDarkMode$ | async) ? 'Modo claro' : 'Modo oscuro' }}
      </span>
    </button>
  `,
  styleUrl: './theme-toggle.css',
})
export class ThemeToggleComponent {

  // Declaras la propiedad sin inicializar
  isDarkMode$!: Observable<boolean>;

  constructor(private themeService: ThemeService) {
    // Ahora sí la inicializas después de que Angular creó el servicio
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
