import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  toggleSidebar(): void {
    this.isExpanded.update(v => !v);
  }

  toggleDarkMode(): void {
    this.isDarkMode.update(v => !v);
  }
}
