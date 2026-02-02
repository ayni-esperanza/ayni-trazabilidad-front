import { Component, OnInit, AfterViewInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { TableroControlService } from './services/tablero-control.service';
import { NgxChartsModule, Color, ScaleType, LegendPosition } from '@swimlane/ngx-charts';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  ProyectoEnCurso, 
  TareaEncargado, 
  DatoGrafico 
} from './models/tablero.model';

// Registrar locale español
registerLocaleData(localeEs);

@Component({
  selector: 'app-tablero-control',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  templateUrl: './tablero-control.component.html',
  styleUrls: ['./tablero-control.component.css']
})
export class TableroControlComponent implements OnInit, AfterViewInit, OnDestroy {
  
  // Subject para manejar la desuscripción
  private destroy$ = new Subject<void>();
  
  // Estado de carga
  cargando = true;
  error: string | null = null;
  
  // Fecha actual
  fechaActual = new Date();
  
  // Control de visibilidad de gráficos
  graficosListos = false;
  
  // Métricas principales
  proyectosFinalizados = 0;
  proyectosActivos = 0;
  gastosMes = 0;
  gastosHoy = 0;
  gastosAyer = 0;
  
  // Métrica seleccionada para el gráfico
  metricaSeleccionada: 'finalizados' | 'activos' | 'gastos' = 'finalizados';
  
  // Datos de los gráficos
  datosProyectosFinalizados: DatoGrafico[] = [];
  datosProyectosActivos: DatoGrafico[] = [];
  datosGastos: DatoGrafico[] = [];
  
  // Tipo de gráfico seleccionado
  tipoGrafico: 'barras' | 'linea' | 'pie' = 'barras';
  
  // Posición de la leyenda para el pie chart
  legendPosition: LegendPosition = LegendPosition.Right;
  
  // Personalización de colores para dark mode
  customColors = {
    domain: [] as string[]
  };
  
  // Obtener el color del texto según el modo
  get textColor(): string {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151';
    }
    return '#374151';
  }
  
  get gridColor(): string {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb';
    }
    return '#e5e7eb';
  }
  
  // Configuración de colores para cada tipo de métrica
  colorSchemeFinalizados: Color = {
    name: 'red',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#f87171', '#ef4444', '#dc2626', '#b91c1c']
  };
  
  colorSchemeActivos: Color = {
    name: 'green',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#4ade80', '#22c55e', '#16a34a', '#15803d']
  };
  
  colorSchemeGastos: Color = {
    name: 'blue',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8']
  };
  
  // Proyectos en curso
  proyectosEnCurso: ProyectoEnCurso[] = [];
  
  // Tareas de los encargados
  tareasEncargados: TareaEncargado[] = [];
  
  constructor(
    private tableroService: TableroControlService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fechaActual = new Date();
    this.cargarDatos();
  }
  
  ngAfterViewInit(): void {
    // Forzar carga de gráficos después de que la vista esté lista
    setTimeout(() => {
      this.graficosListos = true;
      this.cdr.detectChanges();
    }, 100);
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Carga todos los datos del tablero desde el servicio
   */
  private cargarDatos(): void {
    this.cargando = true;
    this.error = null;
    
    // Cargar todos los datos en paralelo usando el resumen
    this.tableroService.obtenerResumenTablero()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resumen) => {
          // Métricas principales
          this.proyectosFinalizados = resumen.proyectosFinalizados;
          this.proyectosActivos = resumen.proyectosActivos;
          this.gastosMes = resumen.gastos.mes;
          this.gastosHoy = resumen.gastos.hoy;
          this.gastosAyer = resumen.gastos.ayer;
          
          // Datos de gráficos
          this.datosProyectosFinalizados = resumen.datosProyectosFinalizados;
          this.datosProyectosActivos = resumen.datosProyectosActivos;
          this.datosGastos = resumen.datosGastos;
          
          // Tablas
          this.proyectosEnCurso = resumen.proyectosEnCurso;
          this.tareasEncargados = resumen.tareasEncargados;
          
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar datos del tablero:', err);
          this.error = 'Error al cargar los datos del tablero. Por favor, intente nuevamente.';
          this.cargando = false;
          this.cdr.detectChanges();
        }
      });
  }
  
  /**
   * Recargar los datos del tablero
   */
  recargarDatos(): void {
    this.cargarDatos();
  }
  
  // Getter para obtener el título del gráfico según la métrica seleccionada
  get tituloGrafico(): string {
    switch (this.metricaSeleccionada) {
      case 'finalizados': return 'Proyectos Finalizados';
      case 'activos': return 'Proyectos Activos';
      case 'gastos': return 'Gastos Mensuales';
      default: return 'Proyectos Finalizados';
    }
  }
  
  // Getter para obtener los datos del gráfico según la métrica seleccionada
  get datosGraficoActual(): DatoGrafico[] {
    switch (this.metricaSeleccionada) {
      case 'finalizados': return this.datosProyectosFinalizados;
      case 'activos': return this.datosProyectosActivos;
      case 'gastos': return this.datosGastos;
      default: return this.datosProyectosFinalizados;
    }
  }
  
  // Getter para datos del pie chart - Solo los top 6 con valores > 0
  get datosPieChart(): DatoGrafico[] {
    const datos = this.datosGraficoActual
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    return datos;
  }
  
  // Getter para obtener el color scheme según la métrica seleccionada
  get colorSchemeActual(): Color {
    switch (this.metricaSeleccionada) {
      case 'finalizados': return this.colorSchemeFinalizados;
      case 'activos': return this.colorSchemeActivos;
      case 'gastos': return this.colorSchemeGastos;
      default: return this.colorSchemeFinalizados;
    }
  }
  
  seleccionarMetrica(metrica: 'finalizados' | 'activos' | 'gastos'): void {
    this.metricaSeleccionada = metrica;
  }
  
  cambiarTipoGrafico(tipo: 'barras' | 'linea' | 'pie'): void {
    this.tipoGrafico = tipo;
  }
  
  formatearMoneda(valor: number): string {
    if (valor >= 1000) {
      return 'S/. ' + (valor / 1000).toFixed(1) + 'k';
    }
    return 'S/. ' + valor.toFixed(0);
  }
}
