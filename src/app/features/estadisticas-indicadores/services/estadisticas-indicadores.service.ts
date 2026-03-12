import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { KPI, Indicador, DatosGrafico } from '../models/estadistica.model';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasIndicadoresService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  obtenerKPIsPrincipales(): Observable<KPI[]> {
    return this.http.get<any>(`${this.baseUrl}/v1/dashboard/resumen`).pipe(
      map(response => {
        const kpis: KPI[] = [
          {
            id: 1,
            nombre: 'Total Solicitudes',
            valor: response.totalSolicitudes || 0,
            unidad: '',
            tendencia: 'neutral',
            variacion: 0,
            periodo: 'Total',
          },
          {
            id: 2,
            nombre: 'Proyectos en Proceso',
            valor: response.proyectosEnProceso || 0,
            unidad: '',
            tendencia: 'positiva',
            variacion: 0,
            periodo: 'Actual',
          },
          {
            id: 3,
            nombre: 'Tareas Retrasadas',
            valor: response.tareasRetrasadas || 0,
            unidad: '',
            tendencia: response.tareasRetrasadas > 0 ? 'negativa' : 'positiva',
            variacion: 0,
            periodo: 'Actual',
          },
          {
            id: 4,
            nombre: 'Progreso Promedio',
            valor: response.promedioProgresoProyectos || 0,
            unidad: '%',
            tendencia: 'positiva',
            variacion: 0,
            periodo: 'Proyectos',
          },
        ];
        return kpis;
      })
    );
  }

  obtenerIndicadoresResponsables(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v1/dashboard/responsables-indicadores`);
  }

  obtenerIndicadoresProyectos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v1/dashboard/proyectos-indicadores`);
  }

  obtenerTodasLasTareas(): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/v1/tareas?size=1000`).pipe(
      map(response => response.content || [])
    );
  }

  obtenerIndicadoresPorProyecto(proyectoId: number): Observable<Indicador[]> {
    return of([]);
  }

  obtenerIndicadoresRendimiento(): Observable<Indicador[]> {
    return of([]);
  }

  obtenerDatosTendencias(periodo: string): Observable<DatosGrafico> {
    return this.http.get<any>(`${this.baseUrl}/v1/dashboard/resumen`).pipe(
      map(response => {
        const labels = Object.keys(response.distribucionEstadosProyectos || {});
        const data = Object.values(response.distribucionEstadosProyectos || {}) as number[];
        return {
          labels,
          datasets: [{
            label: 'Proyectos por Estado',
            data,
          }]
        };
      })
    );
  }

  obtenerComparativas(tipo: string, periodos: string[]): Observable<any> {
    return of({});
  }

  exportarEstadisticas(formato: 'PDF' | 'Excel'): Observable<Blob> {
    return of(new Blob());
  }
}
