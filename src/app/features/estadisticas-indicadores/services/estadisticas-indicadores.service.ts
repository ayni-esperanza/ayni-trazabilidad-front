import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { KPI, Indicador, DatosGrafico } from '../models/estadistica.model';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasIndicadoresService {

  constructor() { }

  // Métodos para obtener KPIs
  obtenerKPIsPrincipales(): Observable<KPI[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  obtenerIndicadoresPorProyecto(proyectoId: number): Observable<Indicador[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  obtenerIndicadoresRendimiento(): Observable<Indicador[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  obtenerDatosTendencias(periodo: string): Observable<DatosGrafico> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  obtenerComparativas(tipo: string, periodos: string[]): Observable<any> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  exportarEstadisticas(formato: 'PDF' | 'Excel'): Observable<Blob> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }
}
