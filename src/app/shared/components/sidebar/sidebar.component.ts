import { Component, signal, inject, HostListener, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertasActividadesService } from '../../../core/services/alertas-actividades.service';
import { filter } from 'rxjs/operators';

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
  styleUrl: './sidebar.component.css',
  animations: [
    trigger('routeChange', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('activeIndicator', [
      state('active', style({
        transform: 'scale(1)'
      })),
      state('inactive', style({
        transform: 'scale(1)'
      })),
      transition('inactive => active', [
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)')
      ]),
      transition('active => inactive', [
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)')
      ])
    ]),
    trigger('pulseEffect', [
      transition('* => active', [
        animate('400ms ease-out', style({ transform: 'scale(1.02)' })),
        animate('200ms ease-in', style({ transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class SidebarComponent implements OnInit, OnDestroy {
  protected themeService = inject(ThemeService);
  protected authService = inject(AuthService);
  private alertasService = inject(AlertasActividadesService);
  private elementRef = inject(ElementRef);
  private router = inject(Router);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  
  isExpanded = signal(true);
  showUserMenu = signal(false);
  currentRoute = signal('');
  animationState = signal<Record<string, string>>({});
  alertasPendientes = signal(0);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute.set(event.urlAfterRedirects);
      this.triggerRouteAnimation(event.urlAfterRedirects);
      this.actualizarAlertasPendientes();
    });
  }

  ngOnInit(): void {
    this.currentRoute.set(this.router.url);
    this.triggerRouteAnimation(this.router.url);
    this.actualizarAlertasPendientes();

    if (typeof window !== 'undefined') {
      this.refreshTimer = setInterval(() => {
        this.actualizarAlertasPendientes();
      }, 60_000);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private triggerRouteAnimation(route: string): void {
    const newState: Record<string, string> = {};
    this.menuItems.forEach(item => {
      newState[item.route] = route.startsWith(item.route) ? 'active' : 'inactive';
    });
    this.animationState.set(newState);
  }

  getAnimationState(route: string): string {
    return this.animationState()[route] || 'inactive';
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute().startsWith(route);
  }

  menuItems: MenuItem[] = [
    { icon: '📊', label: 'Tablero de control', route: '/tablero-control' },
    { icon: '📝', label: 'Registro de solicitudes', route: '/registro-solicitudes' },
    { icon: '📈', label: 'Estadísticas e indicadores', route: '/estadisticas-indicadores' },
    { icon: '📄', label: 'Informes y evidencias', route: '/informes-evidencias' },
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

  @HostListener('window:ayni-alertas-updated')
  onAlertasUpdated(): void {
    this.actualizarAlertasPendientes();
  }

  private actualizarAlertasPendientes(): void {
    this.alertasPendientes.set(this.alertasService.obtenerAlertas().length);
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
