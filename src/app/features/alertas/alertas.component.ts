import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertasActividadesService, AlertaActividadGlobal } from '../../core/services/alertas-actividades.service';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alertas.component.html',
  styleUrl: './alertas.component.css'
})
export class AlertasComponent implements OnInit, OnDestroy {
  private readonly alertasService = inject(AlertasActividadesService);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  alertas: AlertaActividadGlobal[] = [];

  ngOnInit(): void {
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

  cargarAlertas(): void {
    this.alertasService.refrescarAlertas().subscribe({
      next: (items) => {
        this.alertas = items;
      },
      error: () => {
        this.alertas = this.alertasService.obtenerAlertas();
      }
    });
  }

  getClaseAlerta(alerta: AlertaActividadGlobal): string {
    return alerta.nivel === 'alta'
      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300'
      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300';
  }
}
