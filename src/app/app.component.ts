import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, NavigationEnd, NavigationStart, RouterOutlet } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { LoadingScreenComponent } from './shared/components/loading-screen/loading-screen.component';
import { ThemeService } from './core/services/theme.service';
import { FlowbiteService } from './core/services/flowbite.service';
import { AuthService } from './core/services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, SidebarComponent, LoadingScreenComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'trazabilidad-front';
  showSidebar = false;
  initialNavigationComplete = false;
  private readonly isBrowser: boolean;
  private readonly firstOpenLoaderKey = 'ayni-first-open-loader-seen-v1';
  private startupLoaderPending = false;
  
  constructor(
    private themeService: ThemeService,
    private flowbiteService: FlowbiteService,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    // Escuchar cambios de ruta antes de solicitar cualquier redirección de arranque.
    // De esta forma ninguna navegación inicial puede liberar el contenido antes del loader.
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart || event instanceof NavigationEnd)
    ).subscribe((event: NavigationStart | NavigationEnd) => {
      const url = event instanceof NavigationEnd
        ? (event.urlAfterRedirects || event.url)
        : event.url;

      if (event instanceof NavigationStart) {
        if (!this.esRutaConLayoutProtegido(url)) {
          this.actualizarVisibilidadSidebar(url);
        }
        return;
      }

      // El HTML generado en servidor nunca debe exponer una ruta protegida:
      // el navegador resolverá primero sesión, loader y destino final.
      if (!this.isBrowser) {
        this.initialNavigationComplete = false;
        return;
      }

      const rutaProtegida = this.esRutaConLayoutProtegido(url);
      if (this.startupLoaderPending && !this.esRutaLoading(url)) {
        this.actualizarVisibilidadSidebar('/loading');
        return;
      }

      if (rutaProtegida && !this.authService.isAuthenticated()) {
        this.actualizarVisibilidadSidebar('/loading');
        return;
      }

      if (this.esRutaLoading(url)) {
        this.startupLoaderPending = false;
      }

      this.actualizarVisibilidadSidebar(url);
      this.initialNavigationComplete = true;
    });

    const initialUrl = this.obtenerUrlInicial();
    if (this.shouldRouteThroughStartupLoader(initialUrl)) {
      this.startupLoaderPending = true;
      this.actualizarVisibilidadSidebar('/loading');
      void this.router.navigate(['/loading'], {
        queryParams: {
          next: this.getStartupLoaderNextUrl(initialUrl),
          source: 'startup',
        },
        replaceUrl: true,
      });
    } else {
      this.actualizarVisibilidadSidebar(initialUrl);
    }
  }

  ngOnInit(): void {
    this.flowbiteService.loadFlowbite((flowbite) => {
      flowbite.initFlowbite();
    });
  }

  private actualizarVisibilidadSidebar(url: string): void {
    const normalizada = (url || '').split('?')[0].split('#')[0];
    this.showSidebar = this.esRutaConLayoutProtegido(normalizada);
  }

  private esRutaConLayoutProtegido(url: string): boolean {
    const normalizada = (url || '').split('?')[0].split('#')[0];
    return !normalizada.startsWith('/login') && !normalizada.startsWith('/loading');
  }

  private esRutaLoading(url: string): boolean {
    const normalizada = (url || '').split('?')[0].split('#')[0];
    return normalizada.startsWith('/loading');
  }

  private obtenerUrlInicial(): string {
    if (this.isBrowser) {
      const path = window.location.pathname || '';
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const desdeWindow = `${path}${search}${hash}`;
      if (desdeWindow) return desdeWindow;
    }

    return this.router.url || '';
  }

  private shouldRouteThroughStartupLoader(url: string): boolean {
    if (!this.isBrowser) {
      return false;
    }

    const normalized = this.normalizeNextUrl(url);
    if (normalized.startsWith('/loading')) {
      return false;
    }

    try {
      const seen = localStorage.getItem(this.firstOpenLoaderKey) === '1';
      if (seen) {
        return false;
      }

      localStorage.setItem(this.firstOpenLoaderKey, '1');
      return true;
    } catch {
      return false;
    }
  }

  private getStartupLoaderNextUrl(url: string): string {
    if (!this.authService.isAuthenticated()) {
      return '/login';
    }

    const normalized = this.normalizeNextUrl(url);
    if (normalized === '/' || normalized === '/login') {
      return this.authService.getLandingRoute();
    }

    return normalized;
  }

  private normalizeNextUrl(url: string): string {
    const value = (url || '').trim();
    if (!value) {
      return '/';
    }

    return value.startsWith('/') ? value : `/${value}`;
  }
}
