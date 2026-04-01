import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import { KPI, Indicador, DatosGrafico } from '../models/estadistica.model';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasIndicadoresService {

  private readonly apiBase = '/v1/dashboard';

  constructor(private readonly http: HttpService) { }

  // Métodos para obtener KPIs
  obtenerKPIsPrincipales(): Observable<KPI[]> {
    return this.http.get<any>(`${this.apiBase}/resumen`).pipe(
      map((resumen) => [
        {
          id: 1,
          nombre: 'Total Proyectos',
          valor: Number(resumen?.totalProyectos || 0),
          unidad: 'proyectos',
          tendencia: 'neutral',
          variacion: 0,
          periodo: 'actual'
        },
        {
          id: 2,
          nombre: 'Proyectos en Proceso',
          valor: Number(resumen?.proyectosEnProceso || 0),
          unidad: 'proyectos',
          tendencia: 'neutral',
          variacion: 0,
          periodo: 'actual'
        },
        {
          id: 3,
          nombre: 'Costo Global',
          valor: Number(resumen?.costoTotalGlobal || 0),
          unidad: 'S/.',
          tendencia: 'neutral',
          variacion: 0,
          periodo: 'actual'
        }
      ])
    );
  }

  obtenerIndicadoresPorProyecto(proyectoId: number): Observable<Indicador[]> {
    return this.http.get<any[]>(`${this.apiBase}/proyectos-indicadores`).pipe(
      map((items) => (items || [])
        .filter((item) => !proyectoId || Number(item?.id) === proyectoId)
        .map((item) => ({
          id: Number(item?.id || 0),
          nombre: item?.nombre || 'Proyecto',
          descripcion: item?.descripcion || '',
          categoria: item?.estado || 'General',
          valor: Number(item?.avance || 0),
          fechaCalculo: new Date(),
          parametros: item,
        })))
    );
  }

  obtenerIndicadoresRendimiento(): Observable<Indicador[]> {
    return this.http.get<any[]>(`${this.apiBase}/responsables-indicadores`).pipe(
      map((items) => (items || []).map((item) => ({
        id: Number(item?.id || 0),
        nombre: item?.nombre || 'Responsable',
        descripcion: item?.cargo || '',
        categoria: 'Responsables',
        valor: Number(item?.eficienciaGeneral || 0),
        fechaCalculo: new Date(),
        parametros: item,
      })))
    );
  }

  obtenerDatosTendencias(periodo: string): Observable<DatosGrafico> {
    return this.http.get<any>(`${this.apiBase}/resumen`).pipe(
      map((resumen) => {
        const distribucion = resumen?.distribucionEstadosProyectos || {};
        return {
          labels: Object.keys(distribucion),
          datasets: [
            {
              label: `Tendencia ${periodo}`,
              data: Object.values(distribucion).map((item) => Number(item || 0)),
            }
          ]
        };
      })
    );
  }

  obtenerComparativas(tipo: string, periodos: string[]): Observable<any> {
    return this.obtenerDatosTendencias(tipo).pipe(
      map((datos) => ({
        tipo,
        periodos,
        datos,
      }))
    );
  }

  exportarEstadisticas(formato: 'PDF' | 'Excel'): Observable<Blob> {
    return this.http.downloadFile(`${this.apiBase}/resumen?format=${formato}`);
  }
}
