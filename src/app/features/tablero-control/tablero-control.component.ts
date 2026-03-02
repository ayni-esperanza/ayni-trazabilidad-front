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
  DatoGrafico,
  GastoProyecto,
  EstadoProyecto
} from './models/tablero.model';

// Importar componentes hijos
import { MetricasCardComponent } from './components/metricas-card/metricas-card.component';
import { GraficosCardComponent } from './components/graficos-card/graficos-card.component';
import { ProyectosTablaCardComponent } from './components/proyectos-tabla-card/proyectos-tabla-card.component';
import { EncargadosTablaCardComponent } from './components/encargados-tabla-card/encargados-tabla-card.component';

// Registrar locale español
registerLocaleData(localeEs);

@Component({
  selector: 'app-tablero-control',
  standalone: true,
  imports: [
    CommonModule, 
    NgxChartsModule,
    MetricasCardComponent,
    GraficosCardComponent,
    ProyectosTablaCardComponent,
    EncargadosTablaCardComponent
  ],
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
  proyectosEnCursoFiltrados: ProyectoEnCurso[] = [];
  
  // Tareas de los encargados
  tareasEncargados: TareaEncargado[] = [];
  tareasFiltradas: TareaEncargado[] = [];
  
  // Gastos por proyecto (para vista de gastos)
  gastosProyectos: GastoProyecto[] = [];
  gastosFiltrados: GastoProyecto[] = [];
  
  /**
   * Obtiene la lista de empresas únicas de los proyectos (filtrados por métrica actual)
   */
  get empresasDisponibles(): string[] {
    let proyectos = [...this.proyectosEnCurso];
    
    // Filtrar por estado según la métrica seleccionada
    if (this.metricaSeleccionada === 'finalizados') {
      proyectos = proyectos.filter(p => p.estado === 'Completado');
    } else if (this.metricaSeleccionada === 'activos') {
      proyectos = proyectos.filter(p => p.estado === 'En Proceso' || p.estado === 'Pendiente');
    }
    
    const empresasSet = new Set(proyectos.map(p => p.empresa).filter(Boolean));
    return Array.from(empresasSet).sort();
  }

  // Filtros de selección
  mesSeleccionado: string | null = null;
  proyectoSeleccionado: ProyectoEnCurso | null = null;
  categoriaSeleccionada: string | null = null;
  empresaSeleccionada: string | null = null;
  
  // Control de visibilidad de tablas (compactables)
  tablaProyectosVisible = true;
  tablaDetalleVisible = true;
  
  // Control de modo de visualización de tareas (tabla o timeline)
  modoVisualizacionTareas: 'tabla' | 'timeline' = 'tabla';
  
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
    
    // Resetear filtros
    this.mesSeleccionado = null;
    this.proyectoSeleccionado = null;
    this.empresaSeleccionada = null;
    
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
          
          // Tablas - ordenar por fecha de creación (más nuevo primero)
          this.proyectosEnCurso = resumen.proyectosEnCurso.sort((a, b) => 
            new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
          );
          this.tareasEncargados = resumen.tareasEncargados;
          this.gastosProyectos = resumen.gastosProyectos || [];
          
          // Inicializar datos filtrados con todos los datos
          this.aplicarFiltros();
          
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
    // Resetear filtros al cambiar de métrica
    this.mesSeleccionado = null;
    this.proyectoSeleccionado = null;
    this.categoriaSeleccionada = null;
    this.empresaSeleccionada = null;
    this.aplicarFiltros();
  }
  
  /**
   * Filtra los proyectos por empresa seleccionada
   */
  onEmpresaChange(empresa: string | null): void {
    this.empresaSeleccionada = empresa;
    this.proyectoSeleccionado = null;
    this.aplicarFiltros();
  }

  /**
   * Toggle visibilidad de tabla de proyectos
   */
  toggleTablaProyectos(): void {
    this.tablaProyectosVisible = !this.tablaProyectosVisible;
  }
  
  /**
   * Toggle visibilidad de tabla de detalle (tareas/gastos)
   */
  toggleTablaDetalle(): void {
    this.tablaDetalleVisible = !this.tablaDetalleVisible;
  }
  
  /**
   * Cambia el modo de visualización de tareas entre tabla y timeline
   */
  cambiarModoVisualizacionTareas(modo: 'tabla' | 'timeline'): void {
    this.modoVisualizacionTareas = modo;
  }
  
  /**
   * Selecciona una categoría de gastos para filtrar
   */
  seleccionarCategoria(categoria: string): void {
    // Si ya está seleccionada, deseleccionar
    if (this.categoriaSeleccionada === categoria) {
      this.categoriaSeleccionada = null;
    } else {
      this.categoriaSeleccionada = categoria;
    }
    this.aplicarFiltros();
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
  
  /**
   * Maneja el clic en una barra/punto/segmento del gráfico
   * Filtra los proyectos en curso por el mes seleccionado
   */
  onSelectGrafico(event: any): void {
    const mes = event.name || event;
    
    // Si se hace clic en el mismo mes, deseleccionar
    if (this.mesSeleccionado === mes) {
      this.mesSeleccionado = null;
      this.proyectoSeleccionado = null;
    } else {
      this.mesSeleccionado = mes;
      this.proyectoSeleccionado = null;
    }
    
    this.aplicarFiltros();
  }
  
  /**
   * Maneja la selección de un proyecto en la tabla
   * Filtra las tareas por el proyecto seleccionado
   */
  onSelectProyecto(proyecto: ProyectoEnCurso): void {
    // Si se hace clic en el mismo proyecto, deseleccionar
    if (this.proyectoSeleccionado?.id === proyecto.id) {
      this.proyectoSeleccionado = null;
    } else {
      this.proyectoSeleccionado = proyecto;
    }
    
    this.aplicarFiltros();
  }
  
  /**
   * Limpia todos los filtros y muestra todos los datos
   */
  limpiarFiltros(): void {
    this.mesSeleccionado = null;
    this.proyectoSeleccionado = null;
    this.categoriaSeleccionada = null;
    this.empresaSeleccionada = null;
    this.aplicarFiltros();
  }
  
  /**
   * Aplica los filtros actuales a proyectos y tareas
   */
  private aplicarFiltros(): void {
    let proyectosFiltrados = [...this.proyectosEnCurso];
    
    // Filtrar por estado según la métrica seleccionada
    if (this.metricaSeleccionada === 'finalizados') {
      proyectosFiltrados = proyectosFiltrados.filter(p => 
        p.estado === 'Completado'
      );
    } else if (this.metricaSeleccionada === 'activos') {
      proyectosFiltrados = proyectosFiltrados.filter(p => 
        p.estado === 'En Proceso' || p.estado === 'Pendiente'
      );
    }
    // Para 'gastos' mostramos todos los proyectos
    
    // Filtrar por mes si está seleccionado
    if (this.mesSeleccionado) {
      proyectosFiltrados = proyectosFiltrados.filter(p => p.mes === this.mesSeleccionado);
    }
    
    // Filtrar por empresa si está seleccionada
    if (this.empresaSeleccionada) {
      proyectosFiltrados = proyectosFiltrados.filter(p => p.empresa === this.empresaSeleccionada);
    }
    
    // Ordenar del más nuevo al más viejo
    this.proyectosEnCursoFiltrados = proyectosFiltrados.sort((a, b) => 
      new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
    );
    
    // Filtrar tareas o gastos por proyecto según la métrica
    if (this.metricaSeleccionada === 'gastos') {
      // Para gastos, mostramos los gastos detallados
      let gastosTemp = [...this.gastosProyectos];
      
      // Filtrar por categoría si está seleccionada
      if (this.categoriaSeleccionada) {
        gastosTemp = gastosTemp.filter(g => g.categoria === this.categoriaSeleccionada);
      }
      
      if (this.proyectoSeleccionado) {
        this.gastosFiltrados = gastosTemp.filter(g => g.proyectoId === this.proyectoSeleccionado!.id);
      } else if (this.mesSeleccionado) {
        // Filtrar gastos de proyectos del mes seleccionado
        const idsProyectosMes = this.proyectosEnCursoFiltrados.map(p => p.id);
        this.gastosFiltrados = gastosTemp.filter(g => idsProyectosMes.includes(g.proyectoId));
      } else {
        this.gastosFiltrados = gastosTemp;
      }
      this.tareasFiltradas = [];
    } else {
      // Para otras métricas, mostramos tareas
      if (this.proyectoSeleccionado) {
        this.tareasFiltradas = this.tareasEncargados.filter(t => t.proyectoId === this.proyectoSeleccionado!.id);
      } else {
        // Filtrar tareas solo de los proyectos que están visibles en la tabla
        const idsProyectosVisibles = this.proyectosEnCursoFiltrados.map(p => p.id);
        this.tareasFiltradas = this.tareasEncargados.filter(t => idsProyectosVisibles.includes(t.proyectoId));
      }
      this.gastosFiltrados = [];
    }
  }
  
  /**
   * Obtiene la clase CSS para el estado del proyecto
   */
  getEstadoClass(estado: EstadoProyecto): string {
    const classes: Record<string, string> = {
      'Completado': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      'En Proceso': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      'Cancelado': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      'Retrasado': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
      'Pendiente': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    };
    return classes[estado] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
  }
  
  /**
   * Obtiene la clase CSS para el estado de la tarea
   */
  getEstadoTareaClass(estado: string): string {
    const classes: Record<string, string> = {
      'Completado': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      'En Proceso': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      'Pendiente': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      'Retrasado': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    };
    return classes[estado] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
  }
  
  /**
   * Agrupa los gastos por categoría para mostrar en la tabla
   */
  get gastosAgrupadosPorCategoria(): { categoria: string; total: number; gastos: GastoProyecto[] }[] {
    const grupos: Record<string, GastoProyecto[]> = {};
    
    this.gastosFiltrados.forEach(gasto => {
      if (!grupos[gasto.categoria]) {
        grupos[gasto.categoria] = [];
      }
      grupos[gasto.categoria].push(gasto);
    });
    
    return Object.keys(grupos).map(categoria => ({
      categoria,
      total: grupos[categoria].reduce((sum, g) => sum + g.monto, 0),
      gastos: grupos[categoria]
    }));
  }
  
  /**
   * Obtiene el total de gastos filtrados
   */
  get totalGastosFiltrados(): number {
    return this.gastosFiltrados.reduce((sum, g) => sum + g.monto, 0);
  }
  
  /**
   * Obtiene el total de gastos por categoría (considera el proyecto seleccionado)
   */
  getTotalPorCategoria(categoria: string): number {
    let gastos = [...this.gastosProyectos];
    
    // Filtrar por proyecto si hay uno seleccionado
    if (this.proyectoSeleccionado) {
      gastos = gastos.filter(g => g.proyectoId === this.proyectoSeleccionado!.id);
    } else if (this.mesSeleccionado) {
      const idsProyectosMes = this.proyectosEnCurso
        .filter(p => p.mes === this.mesSeleccionado)
        .map(p => p.id);
      gastos = gastos.filter(g => idsProyectosMes.includes(g.proyectoId));
    }
    
    return gastos
      .filter(g => g.categoria === categoria)
      .reduce((sum, g) => sum + g.monto, 0);
  }
}
