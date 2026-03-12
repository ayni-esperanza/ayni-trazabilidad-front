import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ProyectoEnCurso,
  TareaEncargado,
  GastoProyecto,
  ResumenTablero,
  DatoGrafico,
  EstadoProyecto,
  EstadoTarea,
} from '../models/tablero.model';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Injectable({
  providedIn: 'root',
})
export class TableroControlService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el resumen completo del tablero combinando datos del dashboard,
   * proyectos y tareas desde la API real.
   */
  obtenerResumenTablero(): Observable<ResumenTablero> {
    return forkJoin({
      dashboard: this.http.get<any>(`${this.baseUrl}/v1/dashboard/resumen`).pipe(
        catchError(() => of({
          totalProyectos: 0,
          proyectosEnProceso: 0,
          totalTareas: 0,
          distribucionEstadosProyectos: {},
          distribucionEstadosTareas: {},
          costoTotalGlobal: 0,
        }))
      ),
      proyectos: this.obtenerProyectosEnCurso(),
      tareas: this.obtenerTareasEncargados(),
    }).pipe(
      map(({ dashboard, proyectos, tareas }) => {
        const completados = (dashboard.distribucionEstadosProyectos?.['COMPLETADO'] || 0) +
          (dashboard.distribucionEstadosProyectos?.['FINALIZADO'] || 0);
        const activos = dashboard.proyectosEnProceso || 0;

        const costoTotal = Number(dashboard.costoTotalGlobal) || 0;

        const datosFinalizados = this.generarDatosGraficoPorMes(
          proyectos.filter(p => p.estado === 'Completado')
        );
        const datosActivos = this.generarDatosGraficoPorMes(
          proyectos.filter(p => p.estado === 'En Proceso')
        );

        const resumen: ResumenTablero = {
          proyectosFinalizados: completados,
          proyectosActivos: activos,
          gastos: {
            hoy: 0,
            mes: costoTotal,
            ayer: 0,
          },
          datosProyectosFinalizados: datosFinalizados,
          datosProyectosActivos: datosActivos,
          datosGastos: this.generarDatosGastos(dashboard.distribucionEstadosProyectos || {}),
          proyectosEnCurso: proyectos,
          tareasEncargados: tareas,
          gastosProyectos: [],
        };
        return resumen;
      })
    );
  }

  /**
   * Obtiene proyectos en curso desde la API real y los mapea al modelo del frontend.
   */
  obtenerProyectosEnCurso(): Observable<ProyectoEnCurso[]> {
    return this.http.get<any>(`${this.baseUrl}/v1/proyectos`, {
      params: new HttpParams().set('size', '100'),
    }).pipe(
      map((response: any) => {
        const content = response.content || [];
        return content.map((p: any) => this.mapProyectoEnCurso(p));
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Obtiene tareas desde la API real y las mapea al modelo del frontend.
   */
  obtenerTareasEncargados(): Observable<TareaEncargado[]> {
    return this.http.get<any>(`${this.baseUrl}/v1/tareas`, {
      params: new HttpParams().set('size', '100'),
    }).pipe(
      map((response: any) => {
        const content = response.content || [];
        return content.map((t: any) => this.mapTareaEncargado(t));
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Obtiene gastos de un proyecto desde la API real.
   */
  obtenerGastosProyecto(proyectoId: number): Observable<GastoProyecto[]> {
    return this.http.get<any>(`${this.baseUrl}/v1/proyectos/${proyectoId}/costos/resumen`).pipe(
      map((resumen: any) => {
        const gastos: GastoProyecto[] = [];
        if (resumen.totalMateriales > 0) {
          gastos.push({
            id: 1,
            proyectoId,
            proyecto: '',
            categoria: 'Materiales',
            descripcion: 'Total materiales',
            monto: Number(resumen.totalMateriales) || 0,
            fecha: new Date(),
          });
        }
        if (resumen.totalManoObra > 0) {
          gastos.push({
            id: 2,
            proyectoId,
            proyecto: '',
            categoria: 'Mano de Obra',
            descripcion: 'Total mano de obra',
            monto: Number(resumen.totalManoObra) || 0,
            fecha: new Date(),
          });
        }
        return gastos;
      }),
      catchError(() => of([]))
    );
  }

  // ==================== MAPPERS ====================

  private mapProyectoEnCurso(p: any): ProyectoEnCurso {
    const fechaInicio = p.fechaInicio ? new Date(p.fechaInicio) : new Date();
    const fechaFin = p.fechaFinalizacion ? new Date(p.fechaFinalizacion) : new Date();
    const mes = MESES[fechaInicio.getMonth()];

    return {
      id: p.id,
      proyecto: p.nombreProyecto || '',
      empresa: p.cliente || '',
      responsable: p.responsableNombre || '',
      etapa: p.etapaActual ? `Etapa ${p.etapaActual}/${p.cantidadEtapas || '?'}` : 'Sin etapas',
      fechas: `${this.formatDate(fechaInicio)} – ${this.formatDate(fechaFin)}`,
      estado: this.mapEstadoProyecto(p.estado),
      mes,
      fechaCreacion: fechaInicio,
      gastoTotal: Number(p.costo) || 0,
      lugar: '',
    };
  }

  private mapTareaEncargado(t: any): TareaEncargado {
    const fechaInicio = t.fechaInicio ? new Date(t.fechaInicio) : new Date();
    const fechaFin = t.fechaFin ? new Date(t.fechaFin) : new Date();

    return {
      id: t.id,
      responsable: t.responsableNombre || '',
      tarea: t.titulo || '',
      proyecto: t.proyectoNombre || '',
      proyectoId: t.proyectoId || 0,
      etapa: t.etapaNombre || '',
      fechas: `${this.formatDate(fechaInicio)} – ${this.formatDate(fechaFin)}`,
      estado: this.mapEstadoTarea(t.estado),
    };
  }

  private mapEstadoProyecto(estado: string): EstadoProyecto {
    const mapping: Record<string, EstadoProyecto> = {
      'PENDIENTE': 'Pendiente',
      'EN_PROCESO': 'En Proceso',
      'COMPLETADO': 'Completado',
      'FINALIZADO': 'Completado',
      'CANCELADO': 'Cancelado',
      'RETRASADO': 'Retrasado',
    };
    return mapping[estado] || 'Pendiente';
  }

  private mapEstadoTarea(estado: string): EstadoTarea {
    const mapping: Record<string, EstadoTarea> = {
      'PENDIENTE': 'Pendiente',
      'EN_PROCESO': 'En Proceso',
      'COMPLETADA': 'Completado',
      'RETRASADA': 'Retrasado',
    };
    return mapping[estado] || 'Pendiente';
  }

  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = MESES[date.getMonth()];
    return `${day} ${month}`;
  }

  private generarDatosGraficoPorMes(proyectos: ProyectoEnCurso[]): DatoGrafico[] {
    const conteoPorMes: Record<string, number> = {};
    MESES.forEach(m => (conteoPorMes[m] = 0));

    proyectos.forEach(p => {
      if (p.mes && conteoPorMes[p.mes] !== undefined) {
        conteoPorMes[p.mes]++;
      }
    });

    return MESES.map(m => ({ name: m, value: conteoPorMes[m] }));
  }

  private generarDatosGastos(distribucion: Record<string, number>): DatoGrafico[] {
    return Object.entries(distribucion).map(([estado, count]) => ({
      name: this.mapEstadoProyecto(estado),
      value: count as number,
    }));
  }
}
