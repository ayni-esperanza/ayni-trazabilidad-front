import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { forkJoin } from 'rxjs';
import { EstadisticasIndicadoresService } from './services/estadisticas-indicadores.service';

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
      responsables: this.estadisticasService.obtenerIndicadoresResponsables(),
      proyectos: this.estadisticasService.obtenerIndicadoresProyectos(),
      tareas: this.estadisticasService.obtenerTodasLasTareas()
    }).subscribe({
      next: (resultado) => {
        this.responsables = resultado.responsables;
        this.proyectos = resultado.proyectos;
        
        // Mapear tareas del backend al formato TareaProyecto UI
        this.tareasProyecto = resultado.tareas.map(t => ({
          id: t.id,
          responsable: t.responsableNombre || 'N/A',
          proyecto: t.proyectoNombre || 'N/A',
          proyectoId: t.proyectoId || 0,
          tarea: t.titulo || 'Sin Título',
          etapa: t.etapaNombre || '-',
          inicioFin: `${t.fechaInicio ? t.fechaInicio : '?'} - ${t.fechaFin ? t.fechaFin : '?'}`,
          status: t.estado === 'COMPLETADA' ? 'completado' : (t.estaRetrasada ? 'alerta' : 'pendiente')
        }));
        
        this.actualizarROI();
        this.aplicarFiltrosTareas();
      },
      error: (err) => console.error('Error cargando los indicadores:', err)
    });
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
    // Datos para combo chart (barras con línea)
    this.roiData = [
      {
        name: 'ROI',
        series: [
          { name: 'Ene', value: 4 },
          { name: 'Feb', value: 5 },
          { name: 'Mar', value: 3 },
          { name: 'Abr', value: 6 },
          { name: 'May', value: 5 },
          { name: 'Jun', value: 8 },
          { name: 'Jul', value: 10 },
          { name: 'Ago', value: 8 },
          { name: 'Sep', value: 9 },
          { name: 'Oct', value: 10 },
          { name: 'Nov', value: 9 },
          { name: 'Dic', value: 7 }
        ]
      }
    ];

    // Datos individuales para cada KPI
    this.inversionData = [
      { name: 'Ene', value: 250 },
      { name: 'Feb', value: 280 },
      { name: 'Mar', value: 300 },
      { name: 'Abr', value: 312 }
    ];

    this.gastoData = [
      { name: 'Ene', value: 220 },
      { name: 'Feb', value: 260 },
      { name: 'Mar', value: 290 },
      { name: 'Abr', value: 312 }
    ];

    // Calcular retorno como inversión - gasto
    this.retornoData = this.inversionData.map((inv, index) => ({
      name: inv.name,
      value: inv.value - this.gastoData[index].value
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
