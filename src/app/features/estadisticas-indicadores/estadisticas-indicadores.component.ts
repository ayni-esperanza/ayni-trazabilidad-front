import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';
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
  
  responsables: ResponsableIndicador[] = [
    {
      id: 1,
      nombre: 'Juan García',
      cargo: 'Gerente',
      antiguedad: '5 años 3 meses',
      participacionProyectos: 5,
      tareasRealizadas: 126,
      tareasRealizadasPorcentaje: 50,
      tareasRealizadasTiempo: 95, // TRT
      tareasPorcentajeProyectos: 25, // TPE
      promedio: 4.5,
      eficienciaGeneral: 85
    },
    {
      id: 2,
      nombre: 'María López',
      cargo: 'Coordinadora',
      antiguedad: '3 años 8 meses',
      participacionProyectos: 4,
      tareasRealizadas: 98,
      tareasRealizadasPorcentaje: 45,
      tareasRealizadasTiempo: 88,
      tareasPorcentajeProyectos: 20,
      promedio: 4.2,
      eficienciaGeneral: 78
    },
    {
      id: 3,
      nombre: 'Carlos Rodríguez',
      cargo: 'Especialista',
      antiguedad: '2 años 1 mes',
      participacionProyectos: 3,
      tareasRealizadas: 76,
      tareasRealizadasPorcentaje: 35,
      tareasRealizadasTiempo: 82,
      tareasPorcentajeProyectos: 15,
      promedio: 4.0,
      eficienciaGeneral: 72
    }
  ];

  proyectos: ProyectoIndicador[] = [
    {
      id: 1,
      nombre: 'Proyecto Alpha',
      responsable: 'Juan García',
      responsableId: 1,
      cliente: 'Empresa ABC',
      etapa: 'Desarrollo',
      estado: 'En Proceso',
      avance: 75,
      tareasCompletadas: 15,
      tareasTotal: 20,
      eficiencia: 85,
      inversion: 312000,
      gasto: 312000,
      retorno: 312000,
      durationStart: '01/01/2025',
      durationEnd: '31/03/2025',
      tasaRetorno: 25,
      descripcion: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    },
    {
      id: 2,
      nombre: 'Proyecto Beta',
      responsable: 'María López',
      responsableId: 2,
      cliente: 'Empresa XYZ',
      etapa: 'Finalizado',
      estado: 'Completado',
      avance: 100,
      tareasCompletadas: 25,
      tareasTotal: 25,
      eficiencia: 92,
      inversion: 450000,
      gasto: 420000,
      retorno: 520000,
      durationStart: '15/01/2025',
      durationEnd: '15/02/2025',
      tasaRetorno: 23,
      descripcion: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    },
    {
      id: 3,
      nombre: 'Proyecto Gamma',
      responsable: 'Carlos Rodríguez',
      responsableId: 3,
      cliente: 'Empresa DEF',
      etapa: 'Planificación',
      estado: 'En Proceso',
      avance: 50,
      tareasCompletadas: 10,
      tareasTotal: 20,
      eficiencia: 72,
      inversion: 280000,
      gasto: 210000,
      retorno: 280000,
      durationStart: '20/02/2025',
      durationEnd: '30/04/2025',
      tasaRetorno: 20,
      descripcion: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    }
  ];

  // Datos para gráficos de proyecto
  roiData: ROIData[] = [];
  inversionData: any[] = [];
  gastoData: any[] = [];
  retornoData: any[] = [];

  // Tareas del proyecto seleccionado
  tareasProyecto: TareaProyecto[] = [
    { id: 1, responsable: 'Ejemplo1', proyecto: 'Ejemplo1', tarea: 'Ejemplo1', etapa: 'Ejemplo1', inicioFin: 'Ejemplo1', status: 'alerta' },
    { id: 2, responsable: 'Ejemplo1', proyecto: 'Ejemplo1', tarea: 'Ejemplo1', etapa: 'Ejemplo1', inicioFin: 'Ejemplo1', status: 'alerta' },
    { id: 3, responsable: 'Ejemplo1', proyecto: 'Ejemplo1', tarea: 'Ejemplo1', etapa: 'Ejemplo1', inicioFin: 'Ejemplo1', status: 'completado' },
    { id: 4, responsable: 'Ejemplo1', proyecto: 'Ejemplo1', tarea: 'Ejemplo1', etapa: 'Ejemplo1', inicioFin: 'Ejemplo1', status: 'completado' },
    { id: 5, responsable: 'Ejemplo1', proyecto: 'Ejemplo1', tarea: 'Ejemplo1', etapa: 'Ejemplo1', inicioFin: 'Ejemplo1', status: 'completado' }
  ];

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
    this.actualizarROI();
  }

  cambiarFiltro(categoria: 'responsables' | 'proyectos'): void {
    this.filtroCategoria = categoria;
    this.proyectoSeleccionado = null;
    this.responsableSeleccionado = null;
  }

  seleccionarProyecto(proyecto: ProyectoIndicador): void {
    this.proyectoSeleccionado = proyecto;
    this.actualizarROI();
  }

  cambiarGrafico(tipo: 'inversion' | 'gasto' | 'retorno'): void {
    this.graficoSeleccionado = tipo;
  }

  seleccionarResponsable(responsable: ResponsableIndicador): void {
    this.responsableSeleccionado = responsable;
  }

  cerrarDetalle(): void {
    this.proyectoSeleccionado = null;
    this.responsableSeleccionado = null;
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
}
