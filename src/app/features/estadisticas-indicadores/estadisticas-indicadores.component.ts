import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { EstadisticasIndicadoresService } from './services/estadisticas-indicadores.service';
import { forkJoin } from 'rxjs';

export interface ProyectoIndicador {
  id: number;
  nombre: string;
  responsable: string;
  responsableId: number;
  cliente: string;
  etapa: string;
  estado: 'En Proceso' | 'Completado' | 'Cancelado' | 'Registrada' | 'Finalizada';
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
}

export interface TareaProyecto {
  id: number;
  responsable: string;
  proyecto: string;
  proyectoId: number; // ID del proyecto asociado
  tarea: string;
  etapa: string;
  inicioFin: string;
  status: 'pendiente' | 'completado' | 'alerta';
}

export interface ResponsableIndicador {
  id: number;
  nombre: string;
  cargo: string;
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
  imports: [CommonModule, FormsModule, NgxChartsModule],
  templateUrl: './estadisticas-indicadores.component.html',
  styleUrls: ['./estadisticas-indicadores.component.css']
})
export class EstadisticasIndicadoresComponent implements OnInit {
  
  filtroCategoria: 'responsables' | 'proyectos' = 'responsables';
  proyectoSeleccionado: ProyectoIndicador | null = null;
  responsableSeleccionado: ResponsableIndicador | null = null;
  graficoSeleccionado: 'inversion' | 'gasto' | 'retorno' = 'inversion';
  
  // Control de modo de visualización de tareas
  modoVisualizacionTareas: 'tabla' | 'timeline' = 'tabla';
  modoVisualizacionTareasResponsable: 'tabla' | 'timeline' = 'tabla';
  
  // Filtro de proyecto en vista de responsable
  proyectoResponsableSeleccionado: number | null = null;
  
  // Control para mostrar dashboard de gastos
  mostrarDashboardGastos = false;
  
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

  // Tareas del proyecto seleccionado
  tareasProyecto: TareaProyecto[] = [];
  
  // Tareas filtradas según el proyecto seleccionado
  tareasProyectoFiltradas: TareaProyecto[] = [];
  
  // Tareas del responsable seleccionado
  tareasResponsableFiltradas: TareaProyecto[] = [];

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
  
  constructor(private estadisticasService: EstadisticasIndicadoresService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    forkJoin({
      responsables: this.estadisticasService.obtenerIndicadoresRendimiento(),
      proyectos: this.estadisticasService.obtenerIndicadoresPorProyecto(0),
    }).subscribe({
      next: ({ responsables, proyectos }) => {
        if ((responsables || []).length > 0) {
          this.responsables = this.mapResponsablesDesdeBackend(responsables);
        }
        if ((proyectos || []).length > 0) {
          this.proyectos = this.mapProyectosDesdeBackend(proyectos);
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
        cargo: p.cargo || item.descripcion || '',
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
      };
    });
  }

  private mapEstadoProyecto(estado?: string): ProyectoIndicador['estado'] {
    const clean = (estado || '').toUpperCase();
    if (clean.includes('COMPLET')) return 'Completado';
    if (clean.includes('CANCEL')) return 'Cancelado';
    if (clean.includes('FINAL')) return 'Finalizada';
    return 'En Proceso';
  }

  cambiarFiltro(categoria: 'responsables' | 'proyectos'): void {
    this.filtroCategoria = categoria;
    this.proyectoSeleccionado = null;
    this.responsableSeleccionado = null;
    this.aplicarFiltrosTareas();
  }

  seleccionarProyecto(proyecto: ProyectoIndicador): void {
    this.proyectoSeleccionado = proyecto;
    this.actualizarROI();
    this.aplicarFiltrosTareas();
  }

  cambiarGrafico(tipo: 'inversion' | 'gasto' | 'retorno'): void {
    this.graficoSeleccionado = tipo;
  }
  
  /**
   * Alterna la visualización del dashboard de gastos
   */
  toggleDashboardGastos(): void {
    this.mostrarDashboardGastos = !this.mostrarDashboardGastos;
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
      // Filtrar tareas solo del proyecto seleccionado
      this.tareasProyectoFiltradas = this.tareasProyecto.filter(
        tarea => tarea.proyectoId === this.proyectoSeleccionado!.id
      );
    } else {
      // Mostrar todas las tareas
      this.tareasProyectoFiltradas = this.tareasProyecto;
    }
    
    if (this.responsableSeleccionado) {
      // Filtrar tareas solo del responsable seleccionado
      let tareasFiltradas = this.tareasProyecto.filter(
        tarea => tarea.responsable === this.responsableSeleccionado!.nombre
      );
      
      // Aplicar filtro adicional por proyecto si está seleccionado
      if (this.proyectoResponsableSeleccionado) {
        tareasFiltradas = tareasFiltradas.filter(
          tarea => tarea.proyectoId === this.proyectoResponsableSeleccionado
        );
      }
      
      this.tareasResponsableFiltradas = tareasFiltradas;
    } else {
      // Mostrar todas las tareas
      this.tareasResponsableFiltradas = this.tareasProyecto;
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
      value: p.inversion / 1000
    }));

    this.gastoData = proyectosParaROI.map(p => ({
      name: p.nombre.length > 10 ? p.nombre.substring(0, 10) + '…' : p.nombre,
      value: p.gasto / 1000
    }));

    this.retornoData = proyectosParaROI.map(p => ({
      name: p.nombre.length > 10 ? p.nombre.substring(0, 10) + '…' : p.nombre,
      value: p.retorno / 1000
    }));
  }

  // Getter para obtener los datos del gráfico según el tipo seleccionado
  get datosGrafico(): any[] {
    switch (this.graficoSeleccionado) {
      case 'inversion':
        return this.inversionData;
      case 'gasto':
        return this.gastoData;
      case 'retorno':
        return this.retornoData;
      default:
        return this.inversionData;
    }
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
      { name: 'Tareas Realizadas', value: this.responsableSeleccionado.tareasRealizadas }
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
}
