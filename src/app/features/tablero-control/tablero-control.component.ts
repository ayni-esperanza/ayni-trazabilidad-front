import { Component, OnInit, AfterViewInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { DashboardConsultaService } from './services/dashboard-consulta.service';
import { DashboardFiltros, DashboardPaginacion } from './models/dashboard-consulta.model';
import { NgxChartsModule, Color, ScaleType, LegendPosition } from '@swimlane/ngx-charts';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  ProyectoEnCurso, 
  TareaEncargado, 
  DatoGrafico,
  GastoProyecto,
  EstadoProyecto,
  FiltroMonedaDashboard,
  MonedaDashboard,
  SerieGrafico
} from './models/tablero.model';

// Importar componentes hijos
import { MetricasCardComponent } from './components/metricas-card/metricas-card.component';
import { GraficosCardComponent } from './components/graficos-card/graficos-card.component';
import { ProyectosTablaCardComponent } from './components/proyectos-tabla-card/proyectos-tabla-card.component';
import { EncargadosTablaCardComponent } from './components/encargados-tabla-card/encargados-tabla-card.component';
import { VideoTutorialComponent } from '../../shared/components/video-tutorial/video-tutorial.component';

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
    EncargadosTablaCardComponent,
    VideoTutorialComponent
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
  gastosMesUSD: number | null = null;
  gastosHoyUSD: number | null = null;
  gastosAyerUSD: number | null = null;

  // El tablero muestra una sola moneda a la vez. Los registros antiguos se consideran PEN.
  monedaSeleccionada: FiltroMonedaDashboard = 'PEN';
  
  // Métrica seleccionada para el gráfico
  metricaSeleccionada: 'finalizados' | 'activos' | 'gastos' = 'activos';
  
  // Datos de los gráficos
  datosProyectosFinalizados: DatoGrafico[] = [];
  datosProyectosActivos: DatoGrafico[] = [];
  datosGastos: DatoGrafico[] = [];
  datosGastosPEN: DatoGrafico[] = [];
  datosGastosUSD: DatoGrafico[] = [];
  
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

  colorSchemeMonedas: Color = {
    name: 'monedas',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#10b981', '#3b82f6']
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
  totalesGastosCategorias: Record<string, number> = {};
  totalesGastosCategoriasUsd: Record<string, number> = {};

  
  /**
   * Obtiene la lista de empresas únicas de los proyectos (filtrados por métrica actual)
   */
  get empresasDisponibles(): string[] {
    let proyectos = [...this.proyectosEnCurso];
    
    // Filtrar por estado según la métrica seleccionada
    if (this.metricaSeleccionada === 'finalizados') {
      proyectos = proyectos.filter(p => p.estado === 'Completado' || p.estado === 'Cancelado');
    } else if (this.metricaSeleccionada === 'activos') {
      proyectos = proyectos.filter(p => p.estado === 'En Proceso' || p.estado === 'Pendiente');
    }
    
    const empresasSet = new Set(proyectos.map(p => p.empresa).filter(Boolean));
    return Array.from(empresasSet).sort();
  }

  /**
   * Obtiene los lugares únicos según la métrica actual
   */
  get lugaresDisponibles(): string[] {
    const proyectosBase = this.proyectosEnCurso.filter(p => this.matchMetrica(p));
    const lugaresSet = new Set(proyectosBase.map(p => p.lugar).filter((l): l is string => !!l));
    return Array.from(lugaresSet).sort();
  }

  /**
   * Obtiene las áreas únicas según la métrica actual
   */
  get areasDisponibles(): string[] {
    const proyectosBase = this.proyectosEnCurso.filter(p => this.matchMetrica(p));
    const areasSet = new Set(
      proyectosBase.flatMap(p => this.obtenerAreasProyecto(p))
    );
    return Array.from(areasSet).sort();
  }

  private obtenerAreasProyecto(proyecto: ProyectoEnCurso): string[] {
    const areas = (proyecto.areas || [])
      .map(area => String(area || '').trim())
      .filter(area => !!area);

    if (areas.length > 0) return areas;

    const areaUnica = String(proyecto.area || '').trim();
    return areaUnica ? [areaUnica] : [];
  }

  /**
   * Obtiene los estados disponibles según la métrica actual
   */
  get estadosFinalizadosDisponibles(): string[] {
    if (this.metricaSeleccionada === 'finalizados') {
      return ['Completado', 'Cancelado'];
    }
    const proyectosBase = this.proyectosEnCurso.filter(p => this.matchMetrica(p));
    const estadosSet = new Set(proyectosBase.map(p => p.estado));
    return Array.from(estadosSet).sort();
  }

  /** Auxiliar: comprueba si un proyecto corresponde a la métrica seleccionada */
  private matchMetrica(p: ProyectoEnCurso): boolean {
    if (this.metricaSeleccionada === 'finalizados')
      return p.estado === 'Completado' || p.estado === 'Cancelado';
    if (this.metricaSeleccionada === 'activos')
      return p.estado === 'En Proceso' || p.estado === 'Pendiente';
    return true; // gastos: todos
  }

  // Filtros de selección
  mesSeleccionado: string | null = null;
  proyectoSeleccionado: ProyectoEnCurso | null = null;
  categoriaSeleccionada: string | null = null;
  empresaSeleccionada: string | null = null;
  // Filtros adicionales para proyectos finalizados
  lugarSeleccionado: string | null = null;
  areaSeleccionada: string | null = null;
  estadoProyecto: string | null = null;
  fechaDesde: string | null = null;
  fechaHasta: string | null = null;
  
  paginacionProyectos: DashboardPaginacion = { page: 0, size: 100 };
  paginacionActividades: DashboardPaginacion = { page: 0, size: 100 };
  paginacionGastos: DashboardPaginacion = { page: 0, size: 100 };
  cargandoProyectos = false;
  cargandoActividades = false;
  cargandoGastos = false;
  totalProyectos = 0;
  totalPaginasProyectos = 0;
  totalActividades = 0;
  totalPaginasActividades = 0;
  totalGastos = 0;
  totalPaginasGastos = 0;
  // Control de visibilidad de tablas (compactables)
  tablaProyectosVisible = true;
  tablaDetalleVisible = true;
  
  // Control de modo de visualización de tareas (tabla o timeline)
  modoVisualizacionTareas: 'tabla' | 'timeline' = 'tabla';
  
  constructor(
    private tableroService: DashboardConsultaService,
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
    this.cargarMetricas();
    this.cargarGraficos();
    this.cargarProyectos();
    this.cargarActividades();
    this.cargarGastos();
  }

  private filtrosGlobales(): DashboardFiltros {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const moneda = this.metricaSeleccionada === 'gastos' && this.monedaSeleccionada !== 'TODAS'
      ? this.monedaSeleccionada
      : undefined;
    return { moneda, metrica: this.metricaSeleccionada, empresa: this.empresaSeleccionada, lugar: this.lugarSeleccionado,
      area: this.areaSeleccionada, estado: this.estadoProyecto, fechaDesde: this.fechaDesde, fechaHasta: this.fechaHasta,
      mes: this.mesSeleccionado ? meses.indexOf(this.mesSeleccionado) + 1 : null,
      proyectoId: this.proyectoSeleccionado?.id ?? null, categoria: this.categoriaSeleccionada };
  }

  private filtrosResumen(): DashboardFiltros {
    const filtros = this.filtrosGlobales();
    return { ...filtros, proyectoId: null, categoria: null };
  }
  private cargarMetricas(): void {
    if (this.monedaSeleccionada === 'TODAS') {
      forkJoin({
        pen: this.tableroService.resumen({ moneda: 'PEN' }),
        usd: this.tableroService.resumen({ moneda: 'USD' })
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: ({ pen, usd }) => {
          this.proyectosFinalizados = pen.proyectosFinalizados;
          this.proyectosActivos = pen.proyectosActivos;
          this.gastosMes = pen.gastosMes;
          this.gastosHoy = pen.gastosHoy;
          this.gastosAyer = pen.gastosAyer;
          this.gastosMesUSD = usd.gastosMes;
          this.gastosHoyUSD = usd.gastosHoy;
          this.gastosAyerUSD = usd.gastosAyer;
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: () => { this.error = 'Error al cargar el resumen del tablero.'; this.cargando = false; }
      });
      return;
    }

    this.tableroService.resumen({ moneda: this.monedaSeleccionada }).pipe(takeUntil(this.destroy$)).subscribe({
      next: resumen => { this.proyectosFinalizados = resumen.proyectosFinalizados; this.proyectosActivos = resumen.proyectosActivos;
        this.gastosMes = resumen.gastosMes; this.gastosHoy = resumen.gastosHoy; this.gastosAyer = resumen.gastosAyer;
        this.gastosMesUSD = null; this.gastosHoyUSD = null; this.gastosAyerUSD = null;
        this.cargando = false; this.cdr.detectChanges(); },
      error: () => { this.error = 'Error al cargar el resumen del tablero.'; this.cargando = false; }
    });
  }

  private cargarGraficos(): void {
    if (this.metricaSeleccionada === 'gastos' && this.monedaSeleccionada === 'TODAS') {
      const filtros = this.filtrosResumen();
      forkJoin({
        pen: this.tableroService.resumen({ ...filtros, moneda: 'PEN' }),
        usd: this.tableroService.resumen({ ...filtros, moneda: 'USD' })
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: ({ pen, usd }) => {
          this.datosGastosPEN = pen.datosGastos || [];
          this.datosGastosUSD = usd.datosGastos || [];
          this.datosGastos = [];
          this.cdr.detectChanges();
        },
        error: () => { this.error = 'Error al cargar los gráficos del tablero.'; }
      });
      return;
    }

    this.tableroService.resumen(this.filtrosResumen()).pipe(takeUntil(this.destroy$)).subscribe({
      next: resumen => {
        this.datosProyectosFinalizados = resumen.datosProyectosFinalizados || [];
        this.datosProyectosActivos = resumen.datosProyectosActivos || [];
        this.datosGastos = resumen.datosGastos || [];
        if (this.metricaSeleccionada === 'gastos') {
          this.datosGastosPEN = this.monedaSeleccionada === 'PEN' ? this.datosGastos : [];
          this.datosGastosUSD = this.monedaSeleccionada === 'USD' ? this.datosGastos : [];
        }
        this.cdr.detectChanges();
      },
      error: () => { this.error = 'Error al cargar los gráficos del tablero.'; }
    });
  }

  cargarProyectos(): void {
    this.cargandoProyectos = true;
    this.tableroService.proyectos(this.filtrosGlobales(), this.paginacionProyectos).pipe(takeUntil(this.destroy$)).subscribe({
      next: pagina => { this.proyectosEnCurso = pagina.content.map(item => this.mapProyecto(item)); this.proyectosEnCursoFiltrados = this.proyectosEnCurso; this.totalProyectos = pagina.totalElements; this.totalPaginasProyectos = pagina.totalPages; this.cargandoProyectos = false; },
      error: () => { this.cargandoProyectos = false; }
    });
  }

  cambiarPaginaProyectos(delta: number): void {
    const page = this.paginacionProyectos.page + delta;
    if (page < 0 || page >= this.totalPaginasProyectos) return;
    this.paginacionProyectos = { ...this.paginacionProyectos, page };
    this.cargarProyectos();
  }

  cambiarTamanoProyectos(size: 100 | 500 | 1000): void {
    this.paginacionProyectos = { page: 0, size };
    this.cargarProyectos();
  }
  cargarActividades(): void {
    this.cargandoActividades = true;
    this.tableroService.actividades(this.filtrosGlobales(), this.paginacionActividades).pipe(takeUntil(this.destroy$)).subscribe({
      next: pagina => { this.tareasEncargados = pagina.content; this.tareasFiltradas = pagina.content; this.totalActividades = pagina.totalElements; this.totalPaginasActividades = pagina.totalPages; this.cargandoActividades = false; }, error: () => { this.cargandoActividades = false; }
    });
  }

  cargarGastos(): void {
    this.cargandoGastos = true;
    this.cargarTotalesGastos();
    this.tableroService.gastos(this.filtrosGlobales(), this.paginacionGastos).pipe(takeUntil(this.destroy$)).subscribe({
      next: pagina => { this.gastosProyectos = pagina.content; this.gastosFiltrados = pagina.content; this.totalGastos = pagina.totalElements; this.totalPaginasGastos = pagina.totalPages; this.cargandoGastos = false; }, error: () => { this.cargandoGastos = false; }
    });
  }

  private cargarTotalesGastos(): void {
    if (this.monedaSeleccionada === 'TODAS') {
      const filtros = this.filtrosGlobales();
      forkJoin({
        pen: this.tableroService.totalesGastos({ ...filtros, moneda: 'PEN' }),
        usd: this.tableroService.totalesGastos({ ...filtros, moneda: 'USD' })
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: ({ pen, usd }) => {
          this.totalesGastosCategorias = pen || {};
          this.totalesGastosCategoriasUsd = usd || {};
        },
        error: () => { this.totalesGastosCategorias = {}; this.totalesGastosCategoriasUsd = {}; }
      });
      return;
    }
    this.tableroService.totalesGastos(this.filtrosGlobales()).pipe(takeUntil(this.destroy$)).subscribe({
      next: totales => {
        this.totalesGastosCategorias = totales || {};
        this.totalesGastosCategoriasUsd = {};
      },
      error: () => { this.totalesGastosCategorias = {}; this.totalesGastosCategoriasUsd = {}; }
    });
  }
  get paginaDetalle(): DashboardPaginacion { return this.metricaSeleccionada === 'gastos' ? this.paginacionGastos : this.paginacionActividades; }
  get totalDetalle(): number { return this.metricaSeleccionada === 'gastos' ? this.totalGastos : this.totalActividades; }
  get totalPaginasDetalle(): number { return this.metricaSeleccionada === 'gastos' ? this.totalPaginasGastos : this.totalPaginasActividades; }
  get cargandoDetalle(): boolean { return this.metricaSeleccionada === 'gastos' ? this.cargandoGastos : this.cargandoActividades; }

  cambiarPaginaDetalle(delta: number): void {
    const actual = this.paginaDetalle;
    const page = actual.page + delta;
    if (page < 0 || page >= this.totalPaginasDetalle) return;
    if (this.metricaSeleccionada === 'gastos') { this.paginacionGastos = { ...actual, page }; this.cargarGastos(); }
    else { this.paginacionActividades = { ...actual, page }; this.cargarActividades(); }
  }

  cambiarTamanoDetalle(size: 100 | 500 | 1000): void {
    if (this.metricaSeleccionada === 'gastos') { this.paginacionGastos = { page: 0, size }; this.cargarGastos(); }
    else { this.paginacionActividades = { page: 0, size }; this.cargarActividades(); }
  }
  private mapProyecto(item: any): ProyectoEnCurso {
    const inicio = item.durationStart ? new Date(item.durationStart) : new Date(); const fin = item.durationEnd ? new Date(item.durationEnd) : inicio;
    const estado: EstadoProyecto = item.estado === 'PENDIENTE' ? 'Pendiente' : item.estado === 'CANCELADO' ? 'Cancelado' : item.estado === 'COMPLETADO' || item.estado === 'FINALIZADO' ? 'Completado' : 'En Proceso';
    return {
      id: item.id,
      proyecto: item.nombre || 'Proyecto',
      empresa: item.cliente || '',
      responsable: item.responsable || 'Sin responsable',
      etapa: item.etapa || estado,
      fechas: '',
      estado,
      mes: '',
      fechaCreacion: inicio,
      fechaInicio: inicio,
      fechaFinalizacion: fin,
      fechaRegistro: item.fechaRegistro || undefined,
      fechaActualizacion: item.fechaActualizacion || undefined,
      lugar: item.ubicacion || '',
      areas: item.areas || [],
      area: item.areas?.[0] || '',
      gastoTotal: Number(item.gasto || 0),
      gastoTotalPen: Number(item.gastoPen || 0),
      gastoTotalUsd: Number(item.gastoUsd || 0)
    };
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
      case 'gastos': return this.monedaSeleccionada === 'TODAS'
        ? 'Gastos Mensuales por Moneda'
        : `Gastos Mensuales (${this.simboloMoneda})`;
      default: return 'Proyectos Finalizados';
    }
  }

  get simboloMoneda(): 'S/' | '$' {
    return this.monedaSeleccionada === 'USD' ? '$' : 'S/';
  }

  get monedaVisual(): MonedaDashboard {
    return this.monedaSeleccionada === 'USD' ? 'USD' : 'PEN';
  }

  get compararMonedas(): boolean {
    return this.metricaSeleccionada === 'gastos' && this.monedaSeleccionada === 'TODAS';
  }

  get datosGastosComparativosBarras(): SerieGrafico[] {
    const nombres = [...new Set([...this.datosGastosPEN, ...this.datosGastosUSD].map(dato => dato.name))];
    const pen = new Map(this.datosGastosPEN.map(dato => [dato.name, dato.value]));
    const usd = new Map(this.datosGastosUSD.map(dato => [dato.name, dato.value]));
    return nombres.map(name => ({
      name,
      series: [
        { name: 'Soles', value: pen.get(name) || 0 },
        { name: 'Dólares', value: usd.get(name) || 0 }
      ]
    }));
  }

  get datosGastosComparativosLineas(): SerieGrafico[] {
    return [
      { name: 'Soles', series: this.datosGastosPEN },
      { name: 'Dólares', series: this.datosGastosUSD }
    ];
  }

  get datosGastosComparativosPie(): DatoGrafico[] {
    return [
      { name: 'Soles', value: this.datosGastosPEN.reduce((total, dato) => total + dato.value, 0) },
      { name: 'Dólares', value: this.datosGastosUSD.reduce((total, dato) => total + dato.value, 0) }
    ].filter(dato => dato.value > 0);
  }

  seleccionarMoneda(moneda: FiltroMonedaDashboard): void {
    if (this.monedaSeleccionada === moneda) return;

    this.monedaSeleccionada = moneda;
    this.proyectoSeleccionado = null;
    this.categoriaSeleccionada = null;
    this.cargarMetricas();
    this.aplicarFiltros();
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
    this.lugarSeleccionado = null;
    this.areaSeleccionada = null;
    this.estadoProyecto = null;
    this.fechaDesde = null;
    this.fechaHasta = null;
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

  onLugarChange(lugar: string | null): void {
    this.lugarSeleccionado = lugar;
    this.proyectoSeleccionado = null;
    this.aplicarFiltros();
  }

  onAreaChange(area: string | null): void {
    this.areaSeleccionada = area;
    this.proyectoSeleccionado = null;
    this.aplicarFiltros();
  }

  onEstadoProyectoChange(estado: string | null): void {
    this.estadoProyecto = estado;
    this.proyectoSeleccionado = null;
    this.aplicarFiltros();
  }

  onFechaDesdeChange(fecha: string | null): void {
    this.fechaDesde = fecha;
    this.proyectoSeleccionado = null;
    this.aplicarFiltros();
  }

  onFechaHastaChange(fecha: string | null): void {
    this.fechaHasta = fecha;
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
    const simbolo = this.simboloMoneda;
    if (valor >= 1000) {
      return simbolo + ' ' + (valor / 1000).toFixed(1) + 'k';
    }
    return simbolo + ' ' + valor.toFixed(0);
  }
  
  /**
   * Maneja el clic en una barra/punto/segmento del gráfico
   * Filtra los proyectos en curso por el mes seleccionado
   */
  onSelectGrafico(event: any): void {
    if (this.compararMonedas && this.tipoGrafico === 'pie') return;

    const meses = new Set(['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']);
    const mes = this.compararMonedas
      ? (meses.has(event?.name) ? event.name : meses.has(event?.series) ? event.series : null)
      : (event.name || event);
    if (!mes) return;
    
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
    
    this.paginacionActividades = { ...this.paginacionActividades, page: 0 };
    this.paginacionGastos = { ...this.paginacionGastos, page: 0 };
    this.cargarActividades();
    this.cargarGastos();
  }
  
  /**
   * Limpia todos los filtros y muestra todos los datos
   */
  limpiarFiltros(): void {
    this.mesSeleccionado = null;
    this.proyectoSeleccionado = null;
    this.categoriaSeleccionada = null;
    this.empresaSeleccionada = null;
    this.lugarSeleccionado = null;
    this.areaSeleccionada = null;
    this.estadoProyecto = null;
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.aplicarFiltros();
  }
  
  /**
   * Aplica los filtros actuales a proyectos y tareas
   */
  private aplicarFiltros(): void {
    this.paginacionProyectos.page = 0;
    this.paginacionActividades.page = 0;
    this.paginacionGastos.page = 0;
    this.cargarGraficos();
    this.cargarProyectos();
    this.cargarActividades();
    this.cargarGastos();
  }
  /**
   * Obtiene la clase CSS para el estado del proyecto
   */
  getEstadoClass(estado: EstadoProyecto): string {
    const classes: Record<string, string> = {
      'Completado': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      'En Proceso': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      'Cancelado': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      'Archivado': 'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300',
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

  get totalGastosFiltradosPen(): number {
    return this.gastosFiltrados.filter(g => (g.moneda || 'PEN') === 'PEN').reduce((sum, g) => sum + g.monto, 0);
  }

  get totalGastosFiltradosUsd(): number {
    return this.gastosFiltrados.filter(g => g.moneda === 'USD').reduce((sum, g) => sum + g.monto, 0);
  }
  
  /**
   * Obtiene el total de gastos por categoría (considera el proyecto seleccionado)
   */
  getTotalPorCategoria(categoria: string): number {
    return Number(this.totalesGastosCategorias[categoria] || 0);
  }

  getTotalUsdPorCategoria(categoria: string): number {
    return Number(this.totalesGastosCategoriasUsd[categoria] || 0);
  }
}

