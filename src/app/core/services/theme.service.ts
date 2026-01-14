import { Injectable, signal, computed, effect, DestroyRef, inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  // Signal reactivo para el estado del tema
  private isDarkModeSignal = signal<boolean>(this.getInitialTheme());

  // Computed para exponer el valor como readonly
  readonly isDarkMode = computed(() => this.isDarkModeSignal());

  constructor() {
    // Solo ejecutar en el navegador (no en SSR)
    if (isPlatformBrowser(this.platformId)) {
      // Effect que se ejecuta cuando cambia isDarkMode
      effect(() => {
        const isDark = this.isDarkModeSignal();
        this.applyTheme(isDark);
        this.saveTheme(isDark);
      }, { allowSignalWrites: true });

      // Escuchar cambios en la preferencia del sistema
      this.listenToSystemPreference();
    }
  }

  /**
   * Alterna entre modo oscuro y claro
   */
  toggleTheme(): void {
    this.isDarkModeSignal.update(current => !current);
  }

  /**
   * Establece el tema directamente
   * @param isDark - true para modo oscuro, false para modo claro
   */
  setTheme(isDark: boolean): void {
    this.isDarkModeSignal.set(isDark);
  }

  /**
   * Obtiene el tema inicial basándose en localStorage o preferencia del sistema
   */
  private getInitialTheme(): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }

    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY);

      if (savedTheme === 'dark') {
        return true;
      }
      if (savedTheme === 'light') {
        return false;
      }

      // Si no hay tema guardado, usar preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark;
    } catch (error) {
      console.error('Error reading theme preference:', error);
      return false;
    }
  }

  /**
   * Aplica la clase 'dark' al html y body
   */
  private applyTheme(isDark: boolean): void {
    if (!this.document) return;

    const html = this.document.documentElement;
    const body = this.document.body;

    if (isDark) {
      html.classList.add('dark');
      if (body) body.classList.add('dark');
    } else {
      html.classList.remove('dark');
      if (body) body.classList.remove('dark');
    }
    
    // Forzar un reflow para asegurar que los cambios se apliquen
    void html.offsetHeight;
  }

  /**
   * Guarda la preferencia en localStorage
   */
  private saveTheme(isDark: boolean): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }

  /**
   * Escucha cambios en la preferencia del sistema operativo
   */
  private listenToSystemPreference(): void {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (event: MediaQueryListEvent) => {
      // Solo aplicar si no hay tema guardado (igual que en React)
      const savedTheme = localStorage.getItem(STORAGE_KEY);
      if (!savedTheme) {
        this.isDarkModeSignal.set(event.matches);
      }
    };

    // Usar addEventListener moderno con fallback para navegadores antiguos
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }

    // Cleanup cuando el servicio se destruye (equivalente al return del useEffect)
    this.destroyRef.onDestroy(() => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    });
  }
}
