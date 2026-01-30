import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { HttpService } from '../../../core/services/http.service';
import { 
  ProyectoEnCurso, 
  TareaEncargado, 
  Gastos, 
  DatoGrafico, 
  ResumenTablero 
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
      { id: 1, proyecto: 'Ejemplo1', responsable: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'warning' as const },
      { id: 2, proyecto: 'Ejemplo1', responsable: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'warning' as const },
      { id: 3, proyecto: 'Ejemplo1', responsable: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'success' as const },
      { id: 4, proyecto: 'Ejemplo1', responsable: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'success' as const },
      { id: 5, proyecto: 'Ejemplo1', responsable: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'success' as const }
    ]).pipe(delay(100));
  }

  /**
   * Obtiene la lista de tareas de los encargados
   */
  obtenerTareasEncargados(): Observable<TareaEncargado[]> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<TareaEncargado[]>(`${this.API_URL}/tareas-encargados`);
    
    return of([
      { id: 1, responsable: 'Ejemplo1', tarea: 'Ejemplo1', proyecto: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'warning' as const },
      { id: 2, responsable: 'Ejemplo1', tarea: 'Ejemplo1', proyecto: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'warning' as const },
      { id: 3, responsable: 'Ejemplo1', tarea: 'Ejemplo1', proyecto: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'success' as const },
      { id: 4, responsable: 'Ejemplo1', tarea: 'Ejemplo1', proyecto: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'success' as const },
      { id: 5, responsable: 'Ejemplo1', tarea: 'Ejemplo1', proyecto: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'success' as const }
    ]).pipe(delay(100));
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
      ],
      proyectosEnCurso: [
        { id: 1, proyecto: 'Ejemplo1', responsable: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'warning' },
        { id: 2, proyecto: 'Ejemplo1', responsable: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'warning' },
        { id: 3, proyecto: 'Ejemplo1', responsable: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'success' },
        { id: 4, proyecto: 'Ejemplo1', responsable: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'success' },
        { id: 5, proyecto: 'Ejemplo1', responsable: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'success' }
      ],
      tareasEncargados: [
        { id: 1, responsable: 'Ejemplo1', tarea: 'Ejemplo1', proyecto: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'warning' },
        { id: 2, responsable: 'Ejemplo1', tarea: 'Ejemplo1', proyecto: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'warning' },
        { id: 3, responsable: 'Ejemplo1', tarea: 'Ejemplo1', proyecto: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'success' },
        { id: 4, responsable: 'Ejemplo1', tarea: 'Ejemplo1', proyecto: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'success' },
        { id: 5, responsable: 'Ejemplo1', tarea: 'Ejemplo1', proyecto: 'Ejemplo1', etapa: 'Ejemplo1', fechas: 'Ejemplo1', estado: 'success' }
      ]
    };
  }
}
