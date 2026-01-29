import { Component, signal, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';

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
  protected themeService = inject(ThemeService);
  protected authService = inject(AuthService);
  private elementRef = inject(ElementRef);
  
  isExpanded = signal(true);
  showUserMenu = signal(false);

  menuItems: MenuItem[] = [
    { icon: '📊', label: 'Tablero de control', route: '/tablero-control' },
    { icon: '📝', label: 'Registro de solicitudes', route: '/registro-solicitudes' },
    { icon: '📈', label: 'Estadísticas e indicadores', route: '/estadisticas-indicadores' },
    { icon: '✅', label: 'Asignación de tareas', route: '/asignacion-tareas' },
    { icon: '📄', label: 'Informes y evidencias', route: '/informes-evidencias' },
    { icon: '⚙️', label: 'Configuración de procesos', route: '/configuracion-procesos' },
    { icon: '👥', label: 'Gestión de usuarios', route: '/gestion-usuarios' }
  ];

  toggleSidebar(): void {
    this.isExpanded.update(v => !v);
  }

  toggleTheme(): void {
    console.log('Toggle theme clicked!', 'Current dark mode:', this.themeService.isDarkMode());
    this.themeService.toggleTheme();
    console.log('After toggle:', this.themeService.isDarkMode());
  }

  toggleUserMenu(): void {
    this.showUserMenu.update(v => !v);
  }

  logout(): void {
    this.showUserMenu.set(false);
    this.authService.logout();
  }

  getUserName(): string {
    return this.authService.getUserFullName() || 'Admin';
  }

  // Cerrar el menú al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const userMenuElement = this.elementRef.nativeElement.querySelector('.user-menu-container');
    if (userMenuElement && !userMenuElement.contains(event.target)) {
      this.showUserMenu.set(false);
    }
  }
}
