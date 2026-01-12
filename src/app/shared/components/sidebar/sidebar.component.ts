import { Component, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private platformId = inject(PLATFORM_ID);
  
  isExpanded = signal(true);
  isDarkMode = signal(false);

  sidebarWidth = computed(() => this.isExpanded() ? 'w-64' : 'w-20');

  menuItems: MenuItem[] = [
    { icon: '📊', label: 'Tablero de control', route: '/tablero-control' },
    { icon: '📝', label: 'Registro de solicitudes', route: '/registro-solicitudes' },
    { icon: '✅', label: 'Asignación de tareas', route: '/asignacion-tareas' },
    { icon: '📄', label: 'Informes y evidencias', route: '/informes-evidencias' },
    { icon: '📈', label: 'Estadísticas e indicadores', route: '/estadisticas-indicadores' },
    { icon: '👥', label: 'Gestión de usuarios', route: '/gestion-usuarios' },
    { icon: '⚙️', label: 'Configuración de procesos', route: '/configuracion-procesos' }
  ];

  constructor() {
    // Inicializar desde localStorage
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode.set(savedTheme === 'dark' || (!savedTheme && prefersDark));
    }

    // Effect para aplicar la clase dark al documento
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const isDark = this.isDarkMode();
        if (isDark) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        }
      }
    });
  }

  toggleSidebar(): void {
    this.isExpanded.update(v => !v);
  }

  toggleDarkMode(): void {
    this.isDarkMode.update(v => !v);
  }
}
