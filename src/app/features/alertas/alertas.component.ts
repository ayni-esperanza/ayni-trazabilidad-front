import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertasActividadesService, AlertaActividadGlobal } from '../../core/services/alertas-actividades.service';
import { CambioPaginaEvent, PaginacionComponent, PaginacionConfig } from '../../shared/components/paginacion/paginacion.component';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, PaginacionComponent],
  templateUrl: './alertas.component.html',
  styleUrl: './alertas.component.css'
})
export class AlertasComponent implements OnInit, OnDestroy {
  private readonly alertasService = inject(AlertasActividadesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly flujoStoragePrefix = 'ayni:registro-solicitudes:flujo:';
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  alertas: AlertaActividadGlobal[] = [];
  paginacion: PaginacionConfig = {
    paginaActual: 0,
    porPagina: 100,
    totalElementos: 0,
    totalPaginas: 0
  };

  ngOnInit(): void {
    this.aplicarPaginacionDesdeQuery();
    this.cargarAlertas();

    if (typeof window !== 'undefined') {
      this.refreshTimer = setInterval(() => {
        this.cargarAlertas();
      }, 60_000);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  @HostListener('window:ayni-alertas-updated')
  onAlertasUpdated(): void {
    this.cargarAlertas();
  }

  @HostListener('window:storage', ['$event'])
  onStorageChange(event: StorageEvent): void {
    if (!event.key || !event.key.startsWith(this.flujoStoragePrefix)) {
      return;
    }

    this.cargarAlertas();
  }

  cargarAlertas(): void {
    this.alertasService.refrescarAlertasPaginadas(this.paginacion.paginaActual, this.paginacion.porPagina).subscribe({
      next: (response) => {
        this.alertas = response.content;
        this.paginacion.totalElementos = response.totalElements;
        this.paginacion.totalPaginas = response.totalPages;
        this.paginacion.paginaActual = response.page;
        this.paginacion.porPagina = response.size;
      },
      error: () => {
        this.alertas = this.alertasService.obtenerAlertas();
        this.actualizarPaginacionLocal();
      }
    });
  }

  get alertasPaginadas(): AlertaActividadGlobal[] {
    return this.alertas;
  }

  onCambioPagina(event: CambioPaginaEvent): void {
    this.paginacion.paginaActual = event.pagina;
    this.paginacion.porPagina = event.porPagina;
    this.actualizarQueryPaginacion();
    this.cargarAlertas();
  }

  getClaseAlerta(alerta: AlertaActividadGlobal): string {
    return alerta.nivel === 'alta'
      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300'
      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300';
  }

  private aplicarPaginacionDesdeQuery(): void {
    const page = Number(this.route.snapshot.queryParamMap.get('page'));
    const size = Number(this.route.snapshot.queryParamMap.get('size'));
    this.paginacion.paginaActual = Number.isFinite(page) && page >= 0 ? page : 0;
    this.paginacion.porPagina = Number.isFinite(size) && size > 0 ? size : 100;
  }

  private actualizarPaginacionLocal(): void {
    const totalPaginas = Math.ceil(this.alertas.length / this.paginacion.porPagina);
    this.paginacion.totalElementos = this.alertas.length;
    this.paginacion.totalPaginas = totalPaginas;

    const paginaMaxima = Math.max(totalPaginas - 1, 0);
    if (this.paginacion.paginaActual > paginaMaxima) {
      this.paginacion.paginaActual = paginaMaxima;
      this.actualizarQueryPaginacion();
    }
  }

  private actualizarQueryPaginacion(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: this.paginacion.paginaActual || null,
        size: this.paginacion.porPagina === 100 ? null : this.paginacion.porPagina
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
