import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { HttpService } from '../../../core/services/http.service';
import { 
  ProyectoEnCurso, 
  TareaEncargado, 
  Gastos, 
  DatoGrafico, 
  ResumenTablero,
  GastoProyecto 
} from '../models/tablero.model';

@Injectable({
  providedIn: 'root'
})
export class TableroControlService {
  
  private readonly API_URL = '/tablero-control';

  constructor(private http: HttpService) { }

  // ==================== MÉTODOS PARA BACKEND ====================
  
  /**
   * Obtiene el resumen completo del tablero de control
   * @returns Observable con todos los datos del tablero
   */
  obtenerResumenTablero(): Observable<ResumenTablero> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<ResumenTablero>(`${this.API_URL}/resumen`);
    
    // Datos de ejemplo para desarrollo
    return of(this.getDatosMock()).pipe(delay(300));
  }

  /**
   * Obtiene el total de proyectos finalizados
   */
  obtenerProyectosFinalizados(): Observable<number> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<number>(`${this.API_URL}/proyectos-finalizados`);
    
    return of(20).pipe(delay(100));
  }

  /**
   * Obtiene el total de proyectos activos
   */
  obtenerProyectosActivos(): Observable<number> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<number>(`${this.API_URL}/proyectos-activos`);
    
    return of(15).pipe(delay(100));
  }

  /**
   * Obtiene los gastos (hoy, ayer, mes)
   */
  obtenerGastos(): Observable<Gastos> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<Gastos>(`${this.API_URL}/gastos`);
    
    return of({
      mes: 312000,
      hoy: 3200,
      ayer: 4100
    }).pipe(delay(100));
  }

  /**
   * Obtiene los datos para el gráfico de proyectos finalizados por mes
   */
  obtenerDatosGraficoFinalizados(): Observable<DatoGrafico[]> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<DatoGrafico[]>(`${this.API_URL}/grafico/finalizados`);
    
    return of([
      { name: 'Ene', value: 3 },
      { name: 'Feb', value: 2 },
      { name: 'Mar', value: 4 },
      { name: 'Abr', value: 3 },
      { name: 'May', value: 5 },
      { name: 'Jun', value: 2 },
      { name: 'Jul', value: 3 },
      { name: 'Ago', value: 1 },
      { name: 'Sep', value: 8 },
      { name: 'Oct', value: 2 },
      { name: 'Nov', value: 1 },
      { name: 'Dic', value: 0 }
    ]).pipe(delay(100));
  }

  /**
   * Obtiene los datos para el gráfico de proyectos activos por mes
   */
  obtenerDatosGraficoActivos(): Observable<DatoGrafico[]> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<DatoGrafico[]>(`${this.API_URL}/grafico/activos`);
    
    return of([
      { name: 'Ene', value: 5 },
      { name: 'Feb', value: 7 },
      { name: 'Mar', value: 6 },
      { name: 'Abr', value: 8 },
      { name: 'May', value: 10 },
      { name: 'Jun', value: 9 },
      { name: 'Jul', value: 11 },
      { name: 'Ago', value: 12 },
      { name: 'Sep', value: 14 },
      { name: 'Oct', value: 13 },
      { name: 'Nov', value: 15 },
      { name: 'Dic', value: 15 }
    ]).pipe(delay(100));
  }

  /**
   * Obtiene los datos para el gráfico de gastos por mes
   */
  obtenerDatosGraficoGastos(): Observable<DatoGrafico[]> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<DatoGrafico[]>(`${this.API_URL}/grafico/gastos`);
    
    return of([
      { name: 'Ene', value: 250 },
      { name: 'Feb', value: 280 },
      { name: 'Mar', value: 320 },
      { name: 'Abr', value: 290 },
      { name: 'May', value: 350 },
      { name: 'Jun', value: 310 },
      { name: 'Jul', value: 340 },
      { name: 'Ago', value: 300 },
      { name: 'Sep', value: 380 },
      { name: 'Oct', value: 330 },
      { name: 'Nov', value: 312 },
      { name: 'Dic', value: 0 }
    ]).pipe(delay(100));
  }

  /**
   * Obtiene la lista de proyectos en curso
   */
  obtenerProyectosEnCurso(): Observable<ProyectoEnCurso[]> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<ProyectoEnCurso[]>(`${this.API_URL}/proyectos-en-curso`);
    
    return of([
      { id: 1, proyecto: 'Línea Producción Textil', responsable: 'Juan Pérez', etapa: 'Ingeniería', fechas: '15/01 - 30/03', estado: 'En Proceso' as const, mes: 'Ene', fechaCreacion: new Date('2026-01-15'), gastoTotal: 45000 },
      { id: 2, proyecto: 'Sistema Ventilación Industrial', responsable: 'María García', etapa: 'Instalación', fechas: '20/01 - 15/04', estado: 'En Proceso' as const, mes: 'Ene', fechaCreacion: new Date('2026-01-20'), gastoTotal: 32000 },
      { id: 3, proyecto: 'Diseño Puente Vehicular', responsable: 'Carlos López', etapa: 'Cálculo Estructural', fechas: '01/02 - 28/02', estado: 'Completado' as const, mes: 'Feb', fechaCreacion: new Date('2026-02-01'), gastoTotal: 28000 },
      { id: 4, proyecto: 'Mantenimiento Maquinaria', responsable: 'Ana Martínez', etapa: 'Diagnóstico', fechas: '05/02 - 20/03', estado: 'En Proceso' as const, mes: 'Feb', fechaCreacion: new Date('2026-02-05'), gastoTotal: 15500 },
      { id: 5, proyecto: 'Sistema Automatización', responsable: 'Pedro Sánchez', etapa: 'Diseño', fechas: '10/02 - 30/04', estado: 'Pendiente' as const, mes: 'Feb', fechaCreacion: new Date('2026-02-10'), gastoTotal: 22000 }
    ]).pipe(delay(100));
  }

  /**
   * Obtiene la lista de tareas de los encargados
   */
  obtenerTareasEncargados(): Observable<TareaEncargado[]> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<TareaEncargado[]>(`${this.API_URL}/tareas-encargados`);
    
    return of([
      { id: 1, responsable: 'Juan Pérez', tarea: 'Diseño de layout de planta', proyecto: 'Línea Producción Textil', proyectoId: 1, etapa: 'Ingeniería', fechas: '15/01 - 25/01', estado: 'En Proceso' as const },
      { id: 2, responsable: 'Juan Pérez', tarea: 'Selección de equipos', proyecto: 'Línea Producción Textil', proyectoId: 1, etapa: 'Ingeniería', fechas: '26/01 - 30/01', estado: 'Completado' as const },
      { id: 3, responsable: 'María García', tarea: 'Instalación de ductos', proyecto: 'Sistema Ventilación Industrial', proyectoId: 2, etapa: 'Instalación', fechas: '20/01 - 28/01', estado: 'Completado' as const },
      { id: 4, responsable: 'María García', tarea: 'Montaje de extractores', proyecto: 'Sistema Ventilación Industrial', proyectoId: 2, etapa: 'Instalación', fechas: '29/01 - 10/02', estado: 'Retrasado' as const },
      { id: 5, responsable: 'Carlos López', tarea: 'Cálculo de cargas', proyecto: 'Diseño Puente Vehicular', proyectoId: 3, etapa: 'Cálculo Estructural', fechas: '01/02 - 15/02', estado: 'Completado' as const }
    ]).pipe(delay(100));
  }

  /**
   * Obtiene los gastos detallados por proyecto
   */
  obtenerGastosProyectos(): Observable<GastoProyecto[]> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<GastoProyecto[]>(`${this.API_URL}/gastos-proyectos`);
    
    return of(this.getDatosMock().gastosProyectos).pipe(delay(100));
  }

  // ==================== DATOS MOCK PARA DESARROLLO ====================
  
  private getDatosMock(): ResumenTablero {
    return {
      proyectosFinalizados: 20,
      proyectosActivos: 15,
      gastos: {
        mes: 312000,
        hoy: 3200,
        ayer: 4100
      },
      datosProyectosFinalizados: [
        { name: 'Ene', value: 3 },
        { name: 'Feb', value: 2 },
        { name: 'Mar', value: 4 },
        { name: 'Abr', value: 3 },
        { name: 'May', value: 5 },
        { name: 'Jun', value: 2 },
        { name: 'Jul', value: 3 },
        { name: 'Ago', value: 1 },
        { name: 'Sep', value: 8 },
        { name: 'Oct', value: 2 },
        { name: 'Nov', value: 1 },
        { name: 'Dic', value: 0 }
      ],
      datosProyectosActivos: [
        { name: 'Ene', value: 5 },
        { name: 'Feb', value: 7 },
        { name: 'Mar', value: 6 },
        { name: 'Abr', value: 8 },
        { name: 'May', value: 10 },
        { name: 'Jun', value: 9 },
        { name: 'Jul', value: 11 },
        { name: 'Ago', value: 12 },
        { name: 'Sep', value: 14 },
        { name: 'Oct', value: 13 },
        { name: 'Nov', value: 15 },
        { name: 'Dic', value: 15 }
      ],
      datosGastos: [
        { name: 'Ene', value: 45000 },
        { name: 'Feb', value: 52000 },
        { name: 'Mar', value: 48000 },
        { name: 'Abr', value: 35000 },
        { name: 'May', value: 42000 },
        { name: 'Jun', value: 38000 },
        { name: 'Jul', value: 0 },
        { name: 'Ago', value: 0 },
        { name: 'Sep', value: 0 },
        { name: 'Oct', value: 0 },
        { name: 'Nov', value: 0 },
        { name: 'Dic', value: 0 }
      ],
      proyectosEnCurso: [
        { id: 1, proyecto: 'Línea Producción Textil', responsable: 'Juan Pérez', etapa: 'Ingeniería', fechas: '15/01 - 30/03', estado: 'En Proceso', mes: 'Ene', fechaCreacion: new Date('2026-01-15'), gastoTotal: 45000 },
        { id: 2, proyecto: 'Sistema Ventilación Industrial', responsable: 'María García', etapa: 'Instalación', fechas: '20/01 - 15/04', estado: 'En Proceso', mes: 'Ene', fechaCreacion: new Date('2026-01-20'), gastoTotal: 32000 },
        { id: 3, proyecto: 'Diseño Puente Vehicular', responsable: 'Carlos López', etapa: 'Cálculo Estructural', fechas: '01/02 - 28/02', estado: 'Completado', mes: 'Feb', fechaCreacion: new Date('2026-02-01'), gastoTotal: 28000 },
        { id: 4, proyecto: 'Mantenimiento Maquinaria', responsable: 'Ana Martínez', etapa: 'Diagnóstico', fechas: '05/02 - 20/03', estado: 'En Proceso', mes: 'Feb', fechaCreacion: new Date('2026-02-05'), gastoTotal: 15500 },
        { id: 5, proyecto: 'Sistema Automatización', responsable: 'Pedro Sánchez', etapa: 'Diseño', fechas: '10/02 - 30/04', estado: 'Pendiente', mes: 'Feb', fechaCreacion: new Date('2026-02-10'), gastoTotal: 22000 },
        { id: 6, proyecto: 'Planta Tratamiento Agua', responsable: 'Luis Torres', etapa: 'Completado', fechas: '01/01 - 30/01', estado: 'Completado', mes: 'Ene', fechaCreacion: new Date('2026-01-01'), gastoTotal: 52000 },
        { id: 7, proyecto: 'Sistema Transportador', responsable: 'Rosa Díaz', etapa: 'Completado', fechas: '15/01 - 15/02', estado: 'Completado', mes: 'Ene', fechaCreacion: new Date('2026-01-15'), gastoTotal: 38000 }
      ],
      tareasEncargados: [
        { id: 1, responsable: 'Juan Pérez', tarea: 'Diseño de layout de planta', proyecto: 'Línea Producción Textil', proyectoId: 1, etapa: 'Ingeniería', fechas: '15/01 - 25/01', estado: 'En Proceso' },
        { id: 2, responsable: 'Juan Pérez', tarea: 'Selección de equipos', proyecto: 'Línea Producción Textil', proyectoId: 1, etapa: 'Ingeniería', fechas: '26/01 - 30/01', estado: 'Completado' },
        { id: 3, responsable: 'María García', tarea: 'Instalación de ductos', proyecto: 'Sistema Ventilación Industrial', proyectoId: 2, etapa: 'Instalación', fechas: '20/01 - 28/01', estado: 'Completado' },
        { id: 4, responsable: 'María García', tarea: 'Montaje de extractores', proyecto: 'Sistema Ventilación Industrial', proyectoId: 2, etapa: 'Instalación', fechas: '29/01 - 10/02', estado: 'Retrasado' },
        { id: 5, responsable: 'Carlos López', tarea: 'Cálculo de cargas', proyecto: 'Diseño Puente Vehicular', proyectoId: 3, etapa: 'Cálculo Estructural', fechas: '01/02 - 15/02', estado: 'Completado' },
        { id: 6, responsable: 'Ana Martínez', tarea: 'Inspección de equipos', proyecto: 'Mantenimiento Maquinaria', proyectoId: 4, etapa: 'Diagnóstico', fechas: '05/02 - 12/02', estado: 'En Proceso' },
        { id: 7, responsable: 'Pedro Sánchez', tarea: 'Planos de automatización', proyecto: 'Sistema Automatización', proyectoId: 5, etapa: 'Diseño', fechas: '10/02 - 28/02', estado: 'Pendiente' }
      ],
      gastosProyectos: [
        // Línea Producción Textil - Gastos
        { id: 1, proyectoId: 1, proyecto: 'Línea Producción Textil', categoria: 'Materiales', descripcion: 'Rodillos y poleas industriales', monto: 15000, fecha: '2026-01-20', responsable: 'Juan Pérez' },
        { id: 2, proyectoId: 1, proyecto: 'Línea Producción Textil', categoria: 'Mano de Obra', descripcion: 'Ingeniería de diseño', monto: 18000, fecha: '2026-01-25', responsable: 'Juan Pérez' },
        { id: 3, proyectoId: 1, proyecto: 'Línea Producción Textil', categoria: 'Equipos', descripcion: 'Sistema de control PLC', monto: 10000, fecha: '2026-01-28', responsable: 'Juan Pérez' },
        { id: 4, proyectoId: 1, proyecto: 'Línea Producción Textil', categoria: 'Instalación', descripcion: 'Montaje mecánico', monto: 2000, fecha: '2026-02-01', responsable: 'Juan Pérez' },
        // Sistema Ventilación Industrial - Gastos
        { id: 5, proyectoId: 2, proyecto: 'Sistema Ventilación Industrial', categoria: 'Materiales', descripcion: 'Ductos galvanizados', monto: 8000, fecha: '2026-01-22', responsable: 'María García' },
        { id: 6, proyectoId: 2, proyecto: 'Sistema Ventilación Industrial', categoria: 'Equipos', descripcion: 'Extractores industriales', monto: 18000, fecha: '2026-01-30', responsable: 'María García' },
        { id: 7, proyectoId: 2, proyecto: 'Sistema Ventilación Industrial', categoria: 'Mano de Obra', descripcion: 'Instalación especializada', monto: 6000, fecha: '2026-02-05', responsable: 'María García' },
        // Diseño Puente Vehicular - Gastos
        { id: 8, proyectoId: 3, proyecto: 'Diseño Puente Vehicular', categoria: 'Mano de Obra', descripcion: 'Ingeniería estructural', monto: 12000, fecha: '2026-02-01', responsable: 'Carlos López' },
        { id: 9, proyectoId: 3, proyecto: 'Diseño Puente Vehicular', categoria: 'Software', descripcion: 'Licencia SAP2000', monto: 8000, fecha: '2026-02-10', responsable: 'Carlos López' },
        { id: 10, proyectoId: 3, proyecto: 'Diseño Puente Vehicular', categoria: 'Estudios', descripcion: 'Estudio de suelos', monto: 8000, fecha: '2026-02-15', responsable: 'Carlos López' },
        // Mantenimiento Maquinaria - Gastos
        { id: 11, proyectoId: 4, proyecto: 'Mantenimiento Maquinaria', categoria: 'Mano de Obra', descripcion: 'Personal técnico', monto: 8000, fecha: '2026-02-08', responsable: 'Ana Martínez' },
        { id: 12, proyectoId: 4, proyecto: 'Mantenimiento Maquinaria', categoria: 'Repuestos', descripcion: 'Rodamientos y sellos', monto: 7500, fecha: '2026-02-12', responsable: 'Ana Martínez' },
        // Sistema Automatización - Gastos
        { id: 13, proyectoId: 5, proyecto: 'Sistema Automatización', categoria: 'Equipos', descripcion: 'Controladores PLC Siemens', monto: 16000, fecha: '2026-02-10', responsable: 'Pedro Sánchez' },
        { id: 14, proyectoId: 5, proyecto: 'Sistema Automatización', categoria: 'Mano de Obra', descripcion: 'Programación de sistemas', monto: 6000, fecha: '2026-02-15', responsable: 'Pedro Sánchez' }
      ]
    };
  }
}
