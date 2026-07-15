import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { EstadisticasIndicadoresService, ResumenCostosProyecto } from './services/estadisticas-indicadores.service';
import { VideoTutorialComponent } from '../../shared/components/video-tutorial/video-tutorial.component';
import { SelectSearchableComponent, SelectSearchableOption } from '../../shared/components/select-searchable/select-searchable.component';
import { forkJoin } from 'rxjs';
import { FlujoNodo } from '../registro-solicitudes/models/solicitud.model';
import { RegistroSolicitudesService } from '../registro-solicitudes/services/registro-solicitudes.service';

export interface ProyectoIndicador {
  id: number;
  nombre: string;
  responsable: string;
  responsableId: number;
  cliente: string;
  etapa: string;
  estado: 'En Proceso' | 'Completado' | 'Cancelado' | 'Registrada' | 'Finalizada' | 'Archivado';
  avance: number;
  tareasCompletadas: number;
  tareasTotal: number;
  eficiencia: number;
  inversion: number;
  gasto: number;
  retorno: number;
  durationStart: string;
  durationEnd: string;
  tasaRetorno: number;
  descripcion: string;
  fechaRegistro: string;
  fechaActualizacion: string;
  rangoRegistroActualizacion: string;
  rangoDuracion: string;
}

export interface TareaProyecto {
  id: number;
  responsable: string;
  proyecto: string;
  proyectoId: number; // ID del proyecto asociado
  tarea: string;
  etapa: string;
  inicioFin: string;
  status: 'pendiente' | 'en_proceso' | 'completado' | 'alerta';
}

export interface ResponsableIndicador {
  id: number;
  nombre: string;
  rol: string;
  area: string;
  antiguedad: string;
  participacionProyectos: number;
  tareasRealizadas: number;
  tareasRealizadasPorcentaje: number;
  tareasRealizadasTiempo: number; // TRT - Tareas Realizadas a Tiempo
  tareasPorcentajeProyectos: number; // TPE - % de Tareas de Proyectos
  promedio: number;
  eficienciaGeneral: number;
}

interface ROIData {
  name: string;
  series: { name: string; value: number }[];
}

@Component({
  selector: 'app-estadisticas-indicadores',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxChartsModule, VideoTutorialComponent, SelectSearchableComponent],
  templateUrl: './estadisticas-indicadores.component.html',
  styleUrls: ['./estadisticas-indicadores.component.css']
})
export class EstadisticasIndicadoresComponent implements OnInit {
  
  filtroCategoria: 'responsables' | 'proyectos' = 'responsables';
  proyectoSeleccionado: ProyectoIndicador | null = null;
  responsableSeleccionado: ResponsableIndicador | null = null;
  
  // Control de modo de visualización de tareas
  modoVisualizacionTareas: 'tabla' | 'timeline' = 'tabla';
  modoVisualizacionTareasResponsable: 'tabla' | 'timeline' = 'tabla';
  get categoriaOptions(): SelectSearchableOption[] {
    return [
      { value: 'responsables', label: 'Responsables' },
      { value: 'proyectos', label: 'Proyectos' }
    ];
  }

  get proyectoOptions(): SelectSearchableOption[] {
    return this.proyectos.map((proyecto) => ({ value: proyecto, label: proyecto.nombre }));
  }

  get responsableOptions(): SelectSearchableOption[] {
    return this.responsables.map((responsable) => ({ value: responsable, label: responsable.nombre }));
  }

  onCategoriaSeleccionada(value: unknown): void {
    this.cambiarFiltro(value === 'proyectos' ? 'proyectos' : 'responsables');
  }

  onProyectoSeleccionado(value: unknown): void {
    if (value) {
      this.seleccionarProyecto(value as ProyectoIndicador);
    }
  }

  onResponsableSeleccionado(value: unknown): void {
    if (value) {
      this.seleccionarResponsable(value as ResponsableIndicador);
    }
  }
  
  // Filtro de proyecto en vista de responsable
  proyectoResponsableSeleccionado: number | null = null;
  
  // Control para expandir/compactar descripción del proyecto
  descripcionProyectoExpandida = false;
  
  // Control de visibilidad de cards compactables
  infoProyectoVisible = true;
  kpisGraficoVisible = true;
  tareasProyectoVisible = true;
  
  // Control de visibilidad para vista de responsable
  participacionProyectosVisible = true;
  tareasAsignadasVisible = true;
  
  // Filtro de etapa para ROI
  etapaSeleccionada: string | null = null;
  
  responsables: ResponsableIndicador[] = [];

  proyectos: ProyectoIndicador[] = [];

  // Datos para gráficos de proyecto
  roiData: ROIData[] = [];
  inversionData: any[] = [];
  gastoData: any[] = [];
  retornoData: any[] = [];
  resumenCostosProyecto: ResumenCostosProyecto | null = null;

  // Tareas del proyecto seleccionado
  tareasProyecto: TareaProyecto[] = [];
  tareasProyectoDetalle: TareaProyecto[] = [];
  tareasProyectoDetalleCargado = false;
  
  // Tareas filtradas según el proyecto seleccionado
  tareasProyectoFiltradas: TareaProyecto[] = [];
  
  // Tareas del responsable seleccionado
  tareasResponsableFiltradas: TareaProyecto[] = [];
  proyectosResponsableFiltrados: ProyectoIndicador[] = [];

  // Datos de gráficos para responsable
  tareasRealizadasData: any[] = [];
  eficienciaData: any[] = [];
  metricasResponsableData: any[] = [];

  // Color scheme para gráficos
  colorScheme: any = {
    domain: ['#22c55e']
  };
  colorSchemeRed: any = {
    domain: ['#ef4444']
  };
  colorSchemeBlue: any = {
    domain: ['#3b82f6']
  };
  colorSchemePurple: any = {
    domain: ['#8b5cf6']
  };
  
  constructor(
    private estadisticasService: EstadisticasIndicadoresService,
    private registroSolicitudesService: RegistroSolicitudesService,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    forkJoin({
      responsables: this.estadisticasService.obtenerIndicadoresRendimiento(),
      proyectos: this.estadisticasService.obtenerIndicadoresPorProyecto(0),
      tareas: this.estadisticasService.obtenerTareasEncargados(),
    }).subscribe({
      next: ({ responsables, proyectos, tareas }) => {
        if ((responsables || []).length > 0) {
          this.responsables = this.mapResponsablesDesdeBackend(responsables);
        }
        if ((proyectos || []).length > 0) {
          this.proyectos = this.mapProyectosDesdeBackend(proyectos);
        }
        if ((tareas || []).length > 0) {
          this.tareasProyecto = this.mapTareasDesdeBackend(tareas);
        } else {
          this.tareasProyecto = [];
        }
        this.actualizarROI();
        this.aplicarFiltrosTareas();
      },
      error: () => {
        this.actualizarROI();
        this.aplicarFiltrosTareas();
      }
    });
  }

  private mapResponsablesDesdeBackend(items: any[]): ResponsableIndicador[] {
    return (items || []).map((item: any) => {
      const p = item.parametros || {};
      return {
        id: Number(p.id || item.id || 0),
        nombre: p.nombre || item.nombre || 'Responsable',
        rol: p.rol || item.descripcion || '',
        area: p.area || '',
        antiguedad: p.antiguedad || 'N/A',
        participacionProyectos: Number(p.participacionProyectos || 0),
        tareasRealizadas: Number(p.tareasRealizadas || 0),
        tareasRealizadasPorcentaje: Number(p.tareasRealizadasPorcentaje || 0),
        tareasRealizadasTiempo: Number(p.tareasRealizadasTiempo || 0),
        tareasPorcentajeProyectos: Number(p.tareasPorcentajeProyectos || 0),
        promedio: Number(p.promedio || 0),
        eficienciaGeneral: Number(p.eficienciaGeneral || item.valor || 0),
      };
    });
  }

  private mapProyectosDesdeBackend(items: any[]): ProyectoIndicador[] {
    return (items || []).map((item: any) => {
      const p = item.parametros || {};
      return {
        id: Number(p.id || item.id || 0),
        nombre: p.nombre || item.nombre || 'Proyecto',
        responsable: p.responsable || 'Sin responsable',
        responsableId: Number(p.responsableId || 0),
        cliente: p.cliente || 'Cliente',
        etapa: p.etapa || 'Ejecucion',
        estado: this.mapEstadoProyecto(p.estado),
        avance: Number(p.avance || item.valor || 0),
        tareasCompletadas: Number(p.tareasCompletadas || 0),
        tareasTotal: Number(p.tareasTotal || 0),
        eficiencia: Number(p.eficiencia || 0),
        inversion: Number(p.inversion || 0),
        gasto: Number(p.gasto || 0),
        retorno: Number(p.retorno || 0),
        durationStart: p.durationStart || '',
        durationEnd: p.durationEnd || '',
        tasaRetorno: Number(p.tasaRetorno || 0),
        descripcion: p.descripcion || '',
        fechaRegistro: this.formatDateOnly(p.fechaRegistro),
        fechaActualizacion: this.formatDateOnly(p.fechaActualizacion),
        rangoRegistroActualizacion: this.buildDateRange(p.fechaRegistro, p.fechaActualizacion),
        rangoDuracion: this.buildDateRange(p.durationStart, p.durationEnd),
      };
    });
  }

  private mapTareasDesdeBackend(items: any[]): TareaProyecto[] {
    return (items || []).map((item: any) => ({
      id: Number(item?.id || 0),
      responsable: item?.responsable || 'Sin responsable',
      proyecto: item?.proyecto || 'Proyecto',
      proyectoId: Number(item?.proyectoId || 0),
      tarea: item?.tarea || 'Actividad',
      etapa: item?.etapa || 'En Proceso',
      inicioFin: item?.fechas || '',
      status: this.mapEstadoTarea(item?.estado),
    }));
  }

  private mapEstadoProyecto(estado?: string): ProyectoIndicador['estado'] {
    const clean = (estado || '').toUpperCase();
    if (clean.includes('ARCHIV')) return 'Archivado';
    if (clean.includes('COMPLET')) return 'Completado';
    if (clean.includes('CANCEL')) return 'Cancelado';
    if (clean.includes('FINAL')) return 'Finalizada';
    return 'En Proceso';
  }

  private mapEstadoTarea(estado?: string): TareaProyecto['status'] {
    const clean = (estado || '').toUpperCase();
    if (clean.includes('COMPLET')) return 'completado';
    if (clean.includes('RETRAS') || clean.includes('ALERT')) return 'alerta';
    if (clean.includes('PROCES')) return 'en_proceso';
    return 'pendiente';
  }

  private formatDateOnly(value?: string): string {
    if (!value) {
      return '';
    }

    const raw = String(value).trim();
    if (!raw) {
      return '';
    }

    const localDate = this.parseLocalDate(raw);
    if (localDate) {
      return this.formatDate(localDate);
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }

    return this.formatDate(parsed);
  }

  private buildDateRange(fechaRegistro?: string, fechaActualizacion?: string): string {
    const registro = this.formatDateOnly(fechaRegistro);
    const actualizacion = this.formatDateOnly(fechaActualizacion);

    if (registro && actualizacion) {
      return `${registro} - ${actualizacion}`;
    }
    if (registro) {
      return registro;
    }
    if (actualizacion) {
      return actualizacion;
    }
    return '—';
  }

  private parseLocalDate(value: string): Date | null {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const midnightUtcMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T00:00(?::00(?:\.\d{1,3})?)?(?:Z|[+\-]00:00)?$/);
    if (midnightUtcMatch) {
      const [, year, month, day] = midnightUtcMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    return null;
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  cambiarFiltro(categoria: 'responsables' | 'proyectos'): void {
    this.filtroCategoria = categoria;
    this.proyectoSeleccionado = null;
    this.responsableSeleccionado = null;
    this.aplicarFiltrosTareas();
  }

  seleccionarProyecto(proyecto: ProyectoIndicador): void {
    this.proyectoSeleccionado = proyecto;
    this.resumenCostosProyecto = null;
    this.tareasProyectoDetalle = [];
    this.tareasProyectoDetalleCargado = false;
    this.actualizarROI();
    this.aplicarFiltrosTareas();
    this.sincronizarResumenCostosProyecto(proyecto.id);
    this.sincronizarActividadesProyecto(proyecto);
  }
/**
   * Cambia la etapa seleccionada para el cálculo del ROI
   */
  cambiarEtapa(etapa: string | null): void {
    this.etapaSeleccionada = etapa;
    this.actualizarROI();
  }
  
  /**
   * Obtiene las etapas únicas del proyecto seleccionado
   */
  get etapasDisponibles(): string[] {
    if (!this.proyectoSeleccionado) {
      return [];
    }
    
    // Obtener las etapas únicas de las tareas del proyecto seleccionado
    const tareasProyecto = this.tareasProyecto.filter(
      tarea => tarea.proyectoId === this.proyectoSeleccionado!.id
    );
    
    const etapasUnicas = [...new Set(tareasProyecto.map(tarea => tarea.etapa))];
    return etapasUnicas.sort();
  }

  seleccionarResponsable(responsable: ResponsableIndicador): void {
    this.responsableSeleccionado = responsable;
    this.proyectoResponsableSeleccionado = null; // Limpiar filtro de proyecto
    this.aplicarFiltrosTareas();
    this.actualizarMetricasResponsable();
  }

  cerrarDetalle(): void {
    this.proyectoSeleccionado = null;
    this.responsableSeleccionado = null;
    this.proyectoResponsableSeleccionado = null;
    this.resumenCostosProyecto = null;
    this.tareasProyectoDetalle = [];
    this.tareasProyectoDetalleCargado = false;
    this.aplicarFiltrosTareas();
  }
  
  /**
   * Cambia el modo de visualización de tareas entre tabla y timeline (para proyectos)
   */
  cambiarModoVisualizacionTareas(modo: 'tabla' | 'timeline'): void {
    this.modoVisualizacionTareas = modo;
  }
  
  /**
   * Cambia el modo de visualización de tareas entre tabla y timeline (para responsables)
   */
  cambiarModoVisualizacionTareasResponsable(modo: 'tabla' | 'timeline'): void {
    this.modoVisualizacionTareasResponsable = modo;
  }
  
  /**
   * Selecciona un proyecto en la tabla de participación para filtrar tareas asignadas
   */
  seleccionarProyectoResponsable(proyectoId: number): void {
    // Si ya está seleccionado, deseleccionar
    if (this.proyectoResponsableSeleccionado === proyectoId) {
      this.proyectoResponsableSeleccionado = null;
    } else {
      this.proyectoResponsableSeleccionado = proyectoId;
    }
    this.aplicarFiltrosTareas();
  }
  
  /**
   * Limpia el filtro de proyecto en la vista de responsable
   */
  limpiarFiltroProyectoResponsable(): void {
    this.proyectoResponsableSeleccionado = null;
    this.aplicarFiltrosTareas();
  }
  
  /**
   * Alterna entre expandir y compactar la descripción del proyecto
   */
  toggleDescripcionProyecto(): void {
    this.descripcionProyectoExpandida = !this.descripcionProyectoExpandida;
  }
  
  /**
   * Alterna la visibilidad de la card de información del proyecto
   */
  toggleInfoProyecto(): void {
    this.infoProyectoVisible = !this.infoProyectoVisible;
  }
  
  /**
   * Alterna la visibilidad de la card de KPIs y Gráfico
   */
  toggleKpisGrafico(): void {
    this.kpisGraficoVisible = !this.kpisGraficoVisible;
  }
  
  /**
   * Alterna la visibilidad de la card de tareas del proyecto
   */
  toggleTareasProyecto(): void {
    this.tareasProyectoVisible = !this.tareasProyectoVisible;
  }
  
  /**
   * Alterna la visibilidad de la card de participación en proyectos
   */
  toggleParticipacionProyectos(): void {
    this.participacionProyectosVisible = !this.participacionProyectosVisible;
  }
  
  /**
   * Alterna la visibilidad de la card de tareas asignadas
   */
  toggleTareasAsignadas(): void {
    this.tareasAsignadasVisible = !this.tareasAsignadasVisible;
  }
  
  /**
   * Aplica los filtros de tareas según el proyecto o responsable seleccionado
   */
  private aplicarFiltrosTareas(): void {
    if (this.proyectoSeleccionado) {
      const tareasProyectoDashboard = this.tareasProyecto.filter(
        tarea => tarea.proyectoId === this.proyectoSeleccionado!.id
      );

      this.tareasProyectoFiltradas = this.tareasProyectoDetalleCargado
        ? this.tareasProyectoDetalle
        : tareasProyectoDashboard;
    } else {
      // Mostrar todas las tareas
      this.tareasProyectoFiltradas = this.tareasProyecto;
    }
    
    if (this.responsableSeleccionado) {
      const tareasDelResponsable = this.tareasProyecto.filter(
        tarea => tarea.responsable === this.responsableSeleccionado!.nombre
      );

      const proyectoIdsConTareas = new Set(
        tareasDelResponsable
          .map(tarea => tarea.proyectoId)
          .filter((id) => Number.isFinite(id) && id > 0)
      );

      let proyectosFiltrados = this.proyectos.filter(
        proyecto => proyecto.responsableId === this.responsableSeleccionado!.id || proyectoIdsConTareas.has(proyecto.id)
      );

      let tareasFiltradas = tareasDelResponsable;

      if (this.proyectoResponsableSeleccionado) {
        proyectosFiltrados = proyectosFiltrados.filter(
          proyecto => proyecto.id === this.proyectoResponsableSeleccionado
        );
        tareasFiltradas = tareasFiltradas.filter(
          tarea => tarea.proyectoId === this.proyectoResponsableSeleccionado
        );
      }

      this.proyectosResponsableFiltrados = proyectosFiltrados;
      this.tareasResponsableFiltradas = tareasFiltradas;
    } else {
      this.proyectosResponsableFiltrados = [];
      this.tareasResponsableFiltradas = [];
    }
  }

  private actualizarROI(): void {
    // Generar datos de gráficos a partir de los proyectos cargados del backend
    const proyectosParaROI = this.proyectos.filter(p => {
      if (!this.etapaSeleccionada) return true;
      return p.etapa === this.etapaSeleccionada;
    });

    this.roiData = [
      {
        name: 'ROI',
        series: proyectosParaROI.map(p => ({
          name: p.nombre.length > 10 ? p.nombre.substring(0, 10) + '…' : p.nombre,
          value: p.tasaRetorno
        }))
      }
    ];

    this.inversionData = proyectosParaROI.map(p => ({
      name: p.nombre.length > 10 ? p.nombre.substring(0, 10) + '…' : p.nombre,
      value: p.inversion
    }));

    this.gastoData = proyectosParaROI.map(p => ({
      name: p.nombre.length > 10 ? p.nombre.substring(0, 10) + '…' : p.nombre,
      value: p.gasto
    }));

    this.retornoData = proyectosParaROI.map(p => ({
      name: p.nombre.length > 10 ? p.nombre.substring(0, 10) + '…' : p.nombre,
      value: p.retorno
    }));
  }

  /**
   * Actualiza los datos de métricas para el responsable seleccionado
   */
  private actualizarMetricasResponsable(): void {
    if (!this.responsableSeleccionado) {
      return;
    }

    // Datos de tareas realizadas (una sola barra)
    this.tareasRealizadasData = [
      { name: 'Actividades Realizadas', value: this.responsableSeleccionado.tareasRealizadas }
    ];

    // Datos de eficiencia (una sola barra)
    this.eficienciaData = [
      { name: 'Eficiencia General', value: this.responsableSeleccionado.eficienciaGeneral }
    ];

    // Datos de métricas comparativas
    this.metricasResponsableData = [
      { name: '% Realizadas', value: this.responsableSeleccionado.tareasRealizadasPorcentaje },
      { name: '% A Tiempo', value: this.responsableSeleccionado.tareasRealizadasTiempo },
      { name: '% Proyectos', value: this.responsableSeleccionado.tareasPorcentajeProyectos }
    ];

  }

  private sincronizarResumenCostosProyecto(proyectoId: number): void {
    if (!Number.isFinite(proyectoId) || proyectoId <= 0) {
      return;
    }

    this.estadisticasService.obtenerResumenCostosProyecto(proyectoId).subscribe({
      next: (resumen) => {
        this.aplicarResumenCostosProyecto(proyectoId, resumen);
      },
      error: (error) => {
        console.error('Error cargando resumen de costos del proyecto:', error);
      }
    });
  }

  private sincronizarActividadesProyecto(proyecto: ProyectoIndicador): void {
    if (!Number.isFinite(proyecto.id) || proyecto.id <= 0) {
      return;
    }

    this.registroSolicitudesService.obtenerActividades(proyecto.id).subscribe({
      next: (actividades) => {
        if (this.proyectoSeleccionado?.id !== proyecto.id) {
          return;
        }

        this.tareasProyectoDetalle = this.mapActividadesProyecto(actividades, proyecto);
        this.tareasProyectoDetalleCargado = true;
        this.aplicarFiltrosTareas();
      },
      error: (error) => {
        console.error('Error cargando actividades del proyecto:', error);
        if (this.proyectoSeleccionado?.id !== proyecto.id) {
          return;
        }

        this.tareasProyectoDetalle = [];
        this.tareasProyectoDetalleCargado = false;
        this.aplicarFiltrosTareas();
      }
    });
  }

  private mapActividadesProyecto(actividades: FlujoNodo[], proyecto: ProyectoIndicador): TareaProyecto[] {
    return (actividades || [])
      .filter((actividad) => actividad?.tipo === 'tarea')
      .map((actividad) => ({
        id: Number(actividad.id || 0),
        responsable: actividad.responsableNombre || proyecto.responsable || 'Sin responsable',
        proyecto: proyecto.nombre,
        proyectoId: proyecto.id,
        tarea: actividad.nombre || 'Actividad',
        etapa: actividad.tipoActividad || 'En Proceso',
        inicioFin: this.buildDateRange(
          actividad.fechaRegistro,
          actividad.fechaActualizacion || actividad.fechaCambioEstado
        ),
        status: this.mapEstadoTarea(actividad.estadoActividad),
      }));
  }

  private aplicarResumenCostosProyecto(proyectoId: number, resumen: ResumenCostosProyecto): void {
    const resumenNormalizado: ResumenCostosProyecto = {
      totalMateriales: Number(resumen.totalMateriales || 0),
      totalManoObra: Number(resumen.totalManoObra || 0),
      totalAdicionales: Number(resumen.totalAdicionales || 0),
      costoTotalProyecto: Number(resumen.costoTotalProyecto || 0),
      presupuestoOriginal: Number(resumen.presupuestoOriginal || 0),
      diferencia: Number(resumen.diferencia || 0),
    };
    const inversion = resumenNormalizado.presupuestoOriginal;
    const gasto = resumenNormalizado.totalMateriales
      + resumenNormalizado.totalManoObra
      + resumenNormalizado.totalAdicionales;
    const retorno = inversion - gasto;
    const tasaRetorno = inversion > 0 ? Math.round((retorno * 100) / inversion) : 0;

    this.proyectos = this.proyectos.map((proyecto) => {
      if (proyecto.id !== proyectoId) {
        return proyecto;
      }

      return {
        ...proyecto,
        inversion,
        gasto,
        retorno,
        tasaRetorno,
      };
    });

    if (this.proyectoSeleccionado?.id === proyectoId) {
      const proyectoActualizado = this.proyectos.find((proyecto) => proyecto.id === proyectoId) || null;
      this.proyectoSeleccionado = proyectoActualizado;
      this.resumenCostosProyecto = resumenNormalizado;
    }

    this.actualizarROI();
  }

  formatearMontoProyecto(value: number | null | undefined): string {
    const monto = Number(value || 0);
    const absMonto = Math.abs(monto);

    if (absMonto >= 1000) {
      return `S/. ${(monto / 1000).toLocaleString('es-PE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}k`;
    }

    return `S/. ${monto.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}
