import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'cientify-theme';
  private readonly darkModeSubject = new BehaviorSubject<boolean>(this.resolveInitialTheme());
  readonly isDarkMode$ = this.darkModeSubject.asObservable();

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.applyThemeClass(this.darkModeSubject.value);
  }

  toggleTheme(): void {
    const nextValue = !this.darkModeSubject.value;
    this.darkModeSubject.next(nextValue);
    this.persistTheme(nextValue);
    this.applyThemeClass(nextValue);
  }

  private resolveInitialTheme(): boolean {
    if (typeof window === 'undefined') return false;

    const storedPreference = window.localStorage.getItem(this.storageKey);
    if (storedPreference) {
      return storedPreference === 'dark';
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  private persistTheme(isDarkMode: boolean): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.storageKey, isDarkMode ? 'dark' : 'light');
  }

  private applyThemeClass(isDarkMode: boolean): void {
    if (!this.document) return;
    this.document.body.classList.toggle('dark-mode', isDarkMode);
    this.document.documentElement.classList.toggle('dark-mode', isDarkMode);
  }
}

