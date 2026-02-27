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
    },
    {
      id: 4,
      nombre: 'Ana Martínez',
      cargo: 'Desarrolladora Senior',
      antiguedad: '4 años 6 meses',
      participacionProyectos: 6,
      tareasRealizadas: 142,
      tareasRealizadasPorcentaje: 55,
      tareasRealizadasTiempo: 92,
      tareasPorcentajeProyectos: 28,
      promedio: 4.7,
      eficienciaGeneral: 88
    },
    {
      id: 5,
      nombre: 'Pedro Sánchez',
      cargo: 'Analista',
      antiguedad: '1 año 9 meses',
      participacionProyectos: 2,
      tareasRealizadas: 54,
      tareasRealizadasPorcentaje: 30,
      tareasRealizadasTiempo: 75,
      tareasPorcentajeProyectos: 12,
      promedio: 3.8,
      eficienciaGeneral: 68
    },
    {
      id: 6,
      nombre: 'Laura Díaz',
      cargo: 'Gerente de Proyecto',
      antiguedad: '6 años 2 meses',
      participacionProyectos: 8,
      tareasRealizadas: 165,
      tareasRealizadasPorcentaje: 62,
      tareasRealizadasTiempo: 97,
      tareasPorcentajeProyectos: 32,
      promedio: 4.8,
      eficienciaGeneral: 92
    },
    {
      id: 7,
      nombre: 'Roberto Fernández',
      cargo: 'Desarrollador',
      antiguedad: '2 años 7 meses',
      participacionProyectos: 3,
      tareasRealizadas: 88,
      tareasRealizadasPorcentaje: 40,
      tareasRealizadasTiempo: 85,
      tareasPorcentajeProyectos: 18,
      promedio: 4.1,
      eficienciaGeneral: 76
    },
    {
      id: 8,
      nombre: 'Carmen Ruiz',
      cargo: 'Diseñadora UX/UI',
      antiguedad: '3 años 4 meses',
      participacionProyectos: 5,
      tareasRealizadas: 110,
      tareasRealizadasPorcentaje: 48,
      tareasRealizadasTiempo: 90,
      tareasPorcentajeProyectos: 22,
      promedio: 4.4,
      eficienciaGeneral: 82
    },
    {
      id: 9,
      nombre: 'Miguel Torres',
      cargo: 'QA Tester',
      antiguedad: '1 año 5 meses',
      participacionProyectos: 2,
      tareasRealizadas: 62,
      tareasRealizadasPorcentaje: 32,
      tareasRealizadasTiempo: 78,
      tareasPorcentajeProyectos: 14,
      promedio: 3.9,
      eficienciaGeneral: 70
    },
    {
      id: 10,
      nombre: 'Sofía Moreno',
      cargo: 'Arquitecta de Software',
      antiguedad: '7 años 1 mes',
      participacionProyectos: 7,
      tareasRealizadas: 156,
      tareasRealizadasPorcentaje: 58,
      tareasRealizadasTiempo: 96,
      tareasPorcentajeProyectos: 30,
      promedio: 4.9,
      eficienciaGeneral: 94
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
      gasto: 265000,
      retorno: 47000,
      durationStart: '01/01/2025',
      durationEnd: '31/03/2025',
      tasaRetorno: 25,
      descripcion: 'Sistema de gestión integral para la optimización de procesos empresariales, que incluye módulos de facturación, inventario y recursos humanos con integración en tiempo real.'
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
      retorno: 30000,
      durationStart: '15/01/2025',
      durationEnd: '15/02/2025',
      tasaRetorno: 23,
      descripcion: 'Plataforma de e-commerce con pasarela de pagos integrada, sistema de gestión de pedidos y panel de administración avanzado con analytics en tiempo real.'
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
      retorno: 70000,
      durationStart: '20/02/2025',
      durationEnd: '30/04/2025',
      tasaRetorno: 20,
      descripcion: 'Aplicación móvil multiplataforma para servicios de delivery con geolocalización en tiempo real, sistema de calificaciones y programa de fidelización.'
    },
    {
      id: 4,
      nombre: 'Proyecto Delta',
      responsable: 'Ana Martínez',
      responsableId: 4,
      cliente: 'TechCorp Solutions',
      etapa: 'Testing',
      estado: 'En Proceso',
      avance: 85,
      tareasCompletadas: 22,
      tareasTotal: 26,
      eficiencia: 88,
      inversion: 380000,
      gasto: 340000,
      retorno: 40000,
      durationStart: '10/01/2025',
      durationEnd: '25/03/2025',
      tasaRetorno: 28,
      descripcion: 'Sistema de gestión de recursos humanos cloud con módulos de nómina, evaluación de desempeño, capacitación y gestión de vacaciones integrado con biométricos.'
    },
    {
      id: 5,
      nombre: 'Proyecto Epsilon',
      responsable: 'Laura Díaz',
      responsableId: 6,
      cliente: 'Innovate Inc',
      etapa: 'Implementación',
      estado: 'En Proceso',
      avance: 65,
      tareasCompletadas: 18,
      tareasTotal: 28,
      eficiencia: 82,
      inversion: 520000,
      gasto: 465000,
      retorno: 55000,
      durationStart: '05/02/2025',
      durationEnd: '30/05/2025',
      tasaRetorno: 30,
      descripcion: 'Plataforma educativa virtual con videoconferencias, sistema de evaluaciones automáticas, foros de discusión y seguimiento personalizado del progreso del estudiante.'
    },
    {
      id: 6,
      nombre: 'Proyecto Zeta',
      responsable: 'Roberto Fernández',
      responsableId: 7,
      cliente: 'DataFlow Systems',
      etapa: 'Desarrollo',
      estado: 'En Proceso',
      avance: 45,
      tareasCompletadas: 12,
      tareasTotal: 27,
      eficiencia: 76,
      inversion: 295000,
      gasto: 245000,
      retorno: 50000,
      durationStart: '15/02/2025',
      durationEnd: '15/05/2025',
      tasaRetorno: 22,
      descripcion: 'Sistema de Business Intelligence con dashboards interactivos, reportes personalizables y predicciones basadas en machine learning para toma de decisiones.'
    },
    {
      id: 7,
      nombre: 'Proyecto Eta',
      responsable: 'Carmen Ruiz',
      responsableId: 8,
      cliente: 'Creative Studio',
      etapa: 'Diseño',
      estado: 'En Proceso',
      avance: 70,
      tareasCompletadas: 14,
      tareasTotal: 20,
      eficiencia: 85,
      inversion: 185000,
      gasto: 155000,
      retorno: 30000,
      durationStart: '01/02/2025',
      durationEnd: '31/03/2025',
      tasaRetorno: 18,
      descripcion: 'Rediseño completo de portal web corporativo con enfoque en experiencia de usuario, accesibilidad WCAG 2.1 y optimización de conversión mediante A/B testing.'
    },
    {
      id: 8,
      nombre: 'Proyecto Theta',
      responsable: 'Sofía Moreno',
      responsableId: 10,
      cliente: 'SecureBank',
      etapa: 'Análisis',
      estado: 'En Proceso',
      avance: 35,
      tareasCompletadas: 8,
      tareasTotal: 23,
      eficiencia: 78,
      inversion: 650000,
      gasto: 580000,
      retorno: 70000,
      durationStart: '20/02/2025',
      durationEnd: '30/06/2025',
      tasaRetorno: 35,
      descripcion: 'Migración de infraestructura bancaria a arquitectura de microservicios cloud con alta disponibilidad, seguridad mejorada y cumplimiento normativo PCI-DSS.'
    },
    {
      id: 9,
      nombre: 'Proyecto Iota',
      responsable: 'Pedro Sánchez',
      responsableId: 5,
      cliente: 'HealthCare Plus',
      etapa: 'Planificación',
      estado: 'En Proceso',
      avance: 25,
      tareasCompletadas: 5,
      tareasTotal: 20,
      eficiencia: 70,
      inversion: 420000,
      gasto: 385000,
      retorno: 35000,
      durationStart: '25/02/2025',
      durationEnd: '25/05/2025',
      tasaRetorno: 26,
      descripcion: 'Sistema de gestión hospitalaria con historias clínicas electrónicas, agendamiento de citas, control de inventario médico y telemedicina integrados.'
    },
    {
      id: 10,
      nombre: 'Proyecto Kappa',
      responsable: 'Juan García',
      responsableId: 1,
      cliente: 'LogiTrans',
      etapa: 'Finalizado',
      estado: 'Completado',
      avance: 100,
      tareasCompletadas: 30,
      tareasTotal: 30,
      eficiencia: 95,
      inversion: 340000,
      gasto: 315000,
      retorno: 25000,
      durationStart: '01/12/2024',
      durationEnd: '15/02/2025',
      tasaRetorno: 24,
      descripcion: 'Sistema de gestión logística con tracking de envíos en tiempo real, optimización de rutas mediante IA y portal de clientes con notificaciones automáticas.'
    }
  ];

  // Datos para gráficos de proyecto
  roiData: ROIData[] = [];
  inversionData: any[] = [];
  gastoData: any[] = [];
  retornoData: any[] = [];

  // Tareas del proyecto seleccionado
  tareasProyecto: TareaProyecto[] = [
    // Proyecto Alpha (ID: 1)
    { id: 1, responsable: 'Juan García', proyecto: 'Proyecto Alpha', proyectoId: 1, tarea: 'Desarrollo Frontend', etapa: 'Desarrollo', inicioFin: '01/01 - 15/01', status: 'completado' },
    { id: 2, responsable: 'Ana Martínez', proyecto: 'Proyecto Alpha', proyectoId: 1, tarea: 'Desarrollo Backend', etapa: 'Desarrollo', inicioFin: '02/01 - 16/01', status: 'completado' },
    { id: 3, responsable: 'Miguel Torres', proyecto: 'Proyecto Alpha', proyectoId: 1, tarea: 'Pruebas QA', etapa: 'Testing', inicioFin: '17/01 - 20/01', status: 'alerta' },
    { id: 4, responsable: 'Carmen Ruiz', proyecto: 'Proyecto Alpha', proyectoId: 1, tarea: 'Diseño de UI', etapa: 'Diseño', inicioFin: '05/01 - 12/01', status: 'completado' },
    
    // Proyecto Beta (ID: 2)
    { id: 5, responsable: 'María López', proyecto: 'Proyecto Beta', proyectoId: 2, tarea: 'Análisis de Requerimientos', etapa: 'Planificación', inicioFin: '15/01 - 18/01', status: 'completado' },
    { id: 6, responsable: 'Roberto Fernández', proyecto: 'Proyecto Beta', proyectoId: 2, tarea: 'Diseño de la Aplicación', etapa: 'Diseño', inicioFin: '19/01 - 22/01', status: 'completado' },
    { id: 7, responsable: 'Sofía Moreno', proyecto: 'Proyecto Beta', proyectoId: 2, tarea: 'Arquitectura de Sistema', etapa: 'Diseño', inicioFin: '18/01 - 24/01', status: 'completado' },
    { id: 8, responsable: 'Ana Martínez', proyecto: 'Proyecto Beta', proyectoId: 2, tarea: 'Integración de Pagos', etapa: 'Desarrollo', inicioFin: '25/01 - 05/02', status: 'completado' },
    
    // Proyecto Gamma (ID: 3)
    { id: 9, responsable: 'Carlos Rodríguez', proyecto: 'Proyecto Gamma', proyectoId: 3, tarea: 'Configuración Inicial', etapa: 'Planificación', inicioFin: '20/02 - 23/02', status: 'alerta' },
    { id: 10, responsable: 'Roberto Fernández', proyecto: 'Proyecto Gamma', proyectoId: 3, tarea: 'Desarrollo de Módulos', etapa: 'Desarrollo', inicioFin: '24/02 - 10/03', status: 'completado' },
    { id: 11, responsable: 'Carmen Ruiz', proyecto: 'Proyecto Gamma', proyectoId: 3, tarea: 'Diseño UX Mobile', etapa: 'Diseño', inicioFin: '21/02 - 28/02', status: 'completado' },
    
    // Proyecto Delta (ID: 4)
    { id: 12, responsable: 'Ana Martínez', proyecto: 'Proyecto Delta', proyectoId: 4, tarea: 'Módulo de Nómina', etapa: 'Desarrollo', inicioFin: '10/01 - 25/01', status: 'completado' },
    { id: 13, responsable: 'Juan García', proyecto: 'Proyecto Delta', proyectoId: 4, tarea: 'Integración Biométrica', etapa: 'Testing', inicioFin: '26/01 - 05/02', status: 'alerta' },
    { id: 14, responsable: 'Miguel Torres', proyecto: 'Proyecto Delta', proyectoId: 4, tarea: 'Pruebas de Seguridad', etapa: 'Testing', inicioFin: '06/02 - 15/02', status: 'completado' },
    { id: 15, responsable: 'Sofía Moreno', proyecto: 'Proyecto Delta', proyectoId: 4, tarea: 'Diseño de Arquitectura Cloud', etapa: 'Diseño', inicioFin: '05/01 - 12/01', status: 'completado' },
    
    // Proyecto Epsilon (ID: 5)
    { id: 16, responsable: 'Laura Díaz', proyecto: 'Proyecto Epsilon', proyectoId: 5, tarea: 'Sistema de Videoconferencias', etapa: 'Implementación', inicioFin: '05/02 - 20/02', status: 'completado' },
    { id: 17, responsable: 'Ana Martínez', proyecto: 'Proyecto Epsilon', proyectoId: 5, tarea: 'Módulo de Evaluaciones', etapa: 'Implementación', inicioFin: '21/02 - 10/03', status: 'alerta' },
    { id: 18, responsable: 'Carmen Ruiz', proyecto: 'Proyecto Epsilon', proyectoId: 5, tarea: 'Diseño de Interfaz Educativa', etapa: 'Diseño', inicioFin: '08/02 - 18/02', status: 'completado' },
    { id: 19, responsable: 'Roberto Fernández', proyecto: 'Proyecto Epsilon', proyectoId: 5, tarea: 'Backend de Foros', etapa: 'Desarrollo', inicioFin: '12/02 - 25/02', status: 'completado' },
    
    // Proyecto Zeta (ID: 6)
    { id: 20, responsable: 'Roberto Fernández', proyecto: 'Proyecto Zeta', proyectoId: 6, tarea: 'Dashboard Interactivo', etapa: 'Desarrollo', inicioFin: '15/02 - 05/03', status: 'alerta' },
    { id: 21, responsable: 'Sofía Moreno', proyecto: 'Proyecto Zeta', proyectoId: 6, tarea: 'Motor de Predicciones ML', etapa: 'Desarrollo', inicioFin: '18/02 - 10/03', status: 'alerta' },
    { id: 22, responsable: 'Carlos Rodríguez', proyecto: 'Proyecto Zeta', proyectoId: 6, tarea: 'Reportes Personalizables', etapa: 'Desarrollo', inicioFin: '20/02 - 08/03', status: 'completado' },
    
    // Proyecto Eta (ID: 7)
    { id: 23, responsable: 'Carmen Ruiz', proyecto: 'Proyecto Eta', proyectoId: 7, tarea: 'Rediseño Homepage', etapa: 'Diseño', inicioFin: '01/02 - 10/02', status: 'completado' },
    { id: 24, responsable: 'Carmen Ruiz', proyecto: 'Proyecto Eta', proyectoId: 7, tarea: 'Optimización UX', etapa: 'Diseño', inicioFin: '11/02 - 20/02', status: 'completado' },
    { id: 25, responsable: 'María López', proyecto: 'Proyecto Eta', proyectoId: 7, tarea: 'A/B Testing Setup', etapa: 'Testing', inicioFin: '21/02 - 28/02', status: 'alerta' },
    { id: 26, responsable: 'Ana Martínez', proyecto: 'Proyecto Eta', proyectoId: 7, tarea: 'Implementación Responsive', etapa: 'Desarrollo', inicioFin: '15/02 - 25/02', status: 'completado' },
    
    // Proyecto Theta (ID: 8)
    { id: 27, responsable: 'Sofía Moreno', proyecto: 'Proyecto Theta', proyectoId: 8, tarea: 'Análisis de Arquitectura', etapa: 'Análisis', inicioFin: '20/02 - 05/03', status: 'alerta' },
    { id: 28, responsable: 'Juan García', proyecto: 'Proyecto Theta', proyectoId: 8, tarea: 'Planificación de Microservicios', etapa: 'Análisis', inicioFin: '22/02 - 08/03', status: 'alerta' },
    { id: 29, responsable: 'Laura Díaz', proyecto: 'Proyecto Theta', proyectoId: 8, tarea: 'Gestión de Proyecto', etapa: 'Planificación', inicioFin: '20/02 - 30/06', status: 'completado' },
    
    // Proyecto Iota (ID: 9)
    { id: 30, responsable: 'Pedro Sánchez', proyecto: 'Proyecto Iota', proyectoId: 9, tarea: 'Análisis de Requerimientos Médicos', etapa: 'Planificación', inicioFin: '25/02 - 10/03', status: 'alerta' },
    { id: 31, responsable: 'Sofía Moreno', proyecto: 'Proyecto Iota', proyectoId: 9, tarea: 'Arquitectura de Seguridad', etapa: 'Planificación', inicioFin: '26/02 - 12/03', status: 'alerta' },
    { id: 32, responsable: 'Carmen Ruiz', proyecto: 'Proyecto Iota', proyectoId: 9, tarea: 'Diseño de Interfaz Médica', etapa: 'Diseño', inicioFin: '01/03 - 15/03', status: 'completado' },
    
    // Proyecto Kappa (ID: 10)
    { id: 33, responsable: 'Juan García', proyecto: 'Proyecto Kappa', proyectoId: 10, tarea: 'Sistema de Tracking', etapa: 'Desarrollo', inicioFin: '01/12 - 20/12', status: 'completado' },
    { id: 34, responsable: 'Ana Martínez', proyecto: 'Proyecto Kappa', proyectoId: 10, tarea: 'Optimización de Rutas IA', etapa: 'Desarrollo', inicioFin: '21/12 - 10/01', status: 'completado' },
    { id: 35, responsable: 'Roberto Fernández', proyecto: 'Proyecto Kappa', proyectoId: 10, tarea: 'Portal de Clientes', etapa: 'Desarrollo', inicioFin: '15/12 - 30/01', status: 'completado' },
    { id: 36, responsable: 'Miguel Torres', proyecto: 'Proyecto Kappa', proyectoId: 10, tarea: 'Pruebas Finales', etapa: 'Testing', inicioFin: '01/02 - 10/02', status: 'completado' },
    { id: 37, responsable: 'Carmen Ruiz', proyecto: 'Proyecto Kappa', proyectoId: 10, tarea: 'Diseño del Portal', etapa: 'Diseño', inicioFin: '05/12 - 15/12', status: 'completado' }
  ];
  
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
    this.actualizarROI();
    this.aplicarFiltrosTareas();
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
