import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import { KPI, Indicador, DatosGrafico } from '../models/estadistica.model';

export interface PaginaEstadisticas<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface PaginacionEstadisticasParams {
  page?: number;
  size?: number;
  proyectoId?: number;
  responsableId?: number;
}

export interface ResumenCostosProyecto {
  totalMateriales: number;
  totalManoObra: number;
  totalAdicionales: number;
  costoTotalProyecto: number;
  presupuestoOriginal: number;
  diferencia: number;
}

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

  obtenerIndicadoresPorProyecto(
    proyectoId: number,
    params: PaginacionEstadisticasParams = {},
  ): Observable<PaginaEstadisticas<Indicador>> {
    return this.http.get<PaginaEstadisticas<any>>(`${this.apiBase}/proyectos-indicadores`, params).pipe(
      map((response) => ({
        ...response,
        content: (response?.content || [])
        .filter((item) => !proyectoId || Number(item?.id) === proyectoId)
        .map((item) => ({
          id: Number(item?.id || 0),
          nombre: item?.nombre || 'Proyecto',
          descripcion: item?.descripcion || '',
          categoria: item?.estado || 'General',
          valor: Number(item?.avance || 0),
          fechaCalculo: new Date(),
          parametros: item,
        })),
      }))
    );
  }

  obtenerIndicadoresRendimiento(
    params: PaginacionEstadisticasParams = {},
  ): Observable<PaginaEstadisticas<Indicador>> {
    return this.http.get<PaginaEstadisticas<any>>(`${this.apiBase}/responsables-indicadores`, params).pipe(
      map((response) => ({
        ...response,
        content: (response?.content || []).map((item) => this.mapResponsable(item)),
      }))
    );
  }

  obtenerDetalleResponsable(responsableId: number): Observable<Indicador> {
    return this.http.get<any>(`${this.apiBase}/responsables-indicadores/${responsableId}`).pipe(
      map((item) => this.mapResponsable(item))
    );
  }

  obtenerDetalleProyecto(proyectoId: number): Observable<Indicador> {
    return this.http.get<any>(`${this.apiBase}/proyectos-indicadores/${proyectoId}`).pipe(
      map((item) => ({
        id: Number(item?.id || 0),
        nombre: item?.nombre || 'Proyecto',
        descripcion: item?.descripcion || '',
        categoria: item?.estado || 'General',
        valor: Number(item?.avance || 0),
        fechaCalculo: new Date(),
        parametros: item,
      }))
    );
  }

  obtenerTareasEncargados(
    params: PaginacionEstadisticasParams = {},
  ): Observable<PaginaEstadisticas<any>> {
    return this.http.get<PaginaEstadisticas<any>>(`${this.apiBase}/tareas-encargados`, params).pipe(
      map((response) => ({
        ...response,
        content: response?.content || [],
      }))
    );
  }

  obtenerResumenCostosProyecto(proyectoId: number): Observable<ResumenCostosProyecto> {
    return this.http.get<any>(`/v1/proyectos/${proyectoId}/costos/resumen`).pipe(
      map((resumen) => ({
        totalMateriales: Number(resumen?.totalMateriales || 0),
        totalManoObra: Number(resumen?.totalManoObra || 0),
        totalAdicionales: Number(resumen?.totalAdicionales || 0),
        costoTotalProyecto: Number(resumen?.costoTotalProyecto || 0),
        presupuestoOriginal: Number(resumen?.presupuestoOriginal || 0),
        diferencia: Number(resumen?.diferencia || 0),
      }))
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

  private mapResponsable(item: any): Indicador {
    return {
      id: Number(item?.id || 0),
      nombre: item?.nombre || 'Responsable',
      descripcion: item?.rol || '',
      categoria: 'Responsables',
      valor: Number(item?.eficienciaGeneral || 0),
      fechaCalculo: new Date(),
      parametros: item,
    };
  }
}
