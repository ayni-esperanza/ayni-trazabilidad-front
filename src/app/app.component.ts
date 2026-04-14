import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, NavigationEnd, NavigationStart, RouterOutlet } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ThemeService } from './core/services/theme.service';
import { FlowbiteService } from './core/services/flowbite.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'trazabilidad-front';
  showSidebar = false;
  private readonly isBrowser: boolean;
  
  constructor(
    private themeService: ThemeService,
    private flowbiteService: FlowbiteService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.actualizarVisibilidadSidebar(this.obtenerUrlInicial());

    // Escuchar cambios de ruta para mostrar/ocultar sidebar
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart || event instanceof NavigationEnd)
    ).subscribe((event: NavigationStart | NavigationEnd) => {
      const url = event instanceof NavigationEnd
        ? (event.urlAfterRedirects || event.url)
        : event.url;
      this.actualizarVisibilidadSidebar(url);
    });
  }

  ngOnInit(): void {
    this.flowbiteService.loadFlowbite((flowbite) => {
      flowbite.initFlowbite();
    });
  }

  private actualizarVisibilidadSidebar(url: string): void {
    const normalizada = (url || '').split('?')[0].split('#')[0];
    this.showSidebar = !normalizada.startsWith('/login');
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
}
