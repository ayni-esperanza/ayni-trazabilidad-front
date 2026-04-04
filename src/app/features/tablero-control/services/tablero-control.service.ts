import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { catchError, map } from 'rxjs/operators';
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
  
  private readonly API_URL = '/v1/dashboard';

  constructor(private http: HttpService) { }

  // ==================== MÉTODOS PARA BACKEND ====================
  
  /**
   * Obtiene el resumen completo del tablero de control
   * @returns Observable con todos los datos del tablero
   */
  obtenerResumenTablero(): Observable<ResumenTablero> {
    return forkJoin({
      resumen: this.http.get<any>(`${this.API_URL}/resumen`),
      proyectos: this.http.get<any[]>(`${this.API_URL}/proyectos-indicadores`),
      responsables: this.http.get<any[]>(`${this.API_URL}/responsables-indicadores`),
    }).pipe(
      map(({ resumen, proyectos, responsables }) => {
        const proyectosNorm = (proyectos || []).map((p) => this.mapProyectoIndicador(p));
        const tareas = this.mapTareasDesdeResponsables(responsables || [], proyectosNorm);
        const gastos = this.mapGastosDesdeProyectos(proyectosNorm);

        return {
          proyectosFinalizados: Number(resumen?.totalProyectos || 0) - Number(resumen?.proyectosEnProceso || 0),
          proyectosActivos: Number(resumen?.proyectosEnProceso || 0),
          gastos: {
            mes: Number(resumen?.costoTotalGlobal || 0),
            hoy: 0,
            ayer: 0,
          },
          datosProyectosFinalizados: this.mapDistribucion(resumen?.distribucionEstadosProyectos, ['COMPLETADO', 'FINALIZADO']),
          datosProyectosActivos: this.mapDistribucion(resumen?.distribucionEstadosProyectos, ['EN_PROCESO', 'PENDIENTE']),
          datosGastos: this.mapGastosPorMes(proyectosNorm),
          proyectosEnCurso: proyectosNorm,
          tareasEncargados: tareas,
          gastosProyectos: gastos,
        } as ResumenTablero;
      })
    );
  }

  private mapProyectoIndicador(item: any): ProyectoEnCurso {
    const inicio = item?.durationStart ? new Date(item.durationStart) : new Date();
    const fin = item?.durationEnd ? new Date(item.durationEnd) : inicio;
    const estado = this.mapEstadoProyecto(item?.estado);
    return {
      id: Number(item?.id || 0),
      proyecto: item?.nombre || 'Proyecto',
      empresa: item?.cliente || 'Cliente',
      responsable: item?.responsable || 'Sin responsable',
      etapa: item?.etapa || estado,
      fechas: `${this.formatDate(inicio)} - ${this.formatDate(fin)}`,
      estado,
      mes: this.getMonthLabel(inicio),
      fechaCreacion: inicio,
      gastoTotal: Number(item?.gasto || 0),
      lugar: '',
      area: 'Sistemas',
    };
  }

  private mapTareasDesdeResponsables(responsables: any[], proyectos: ProyectoEnCurso[]): TareaEncargado[] {
    const projectByResp = new Map<string, ProyectoEnCurso>();
    for (const p of proyectos) {
      if (p.responsable && !projectByResp.has(p.responsable)) {
        projectByResp.set(p.responsable, p);
      }
    }

    return (responsables || []).map((r, idx) => {
      const proyecto = projectByResp.get(r?.nombre || '') || proyectos[0];
      return {
        id: idx + 1,
        responsable: r?.nombre || 'Sin responsable',
        tarea: 'Seguimiento general del proyecto',
        proyecto: proyecto?.proyecto || 'Proyecto',
        proyectoId: proyecto?.id || 0,
        etapa: proyecto?.etapa || 'Ejecucion',
        fechas: proyecto?.fechas || '',
        estado: this.mapEstadoTarea(proyecto?.estado),
      };
    });
  }

  private mapGastosDesdeProyectos(proyectos: ProyectoEnCurso[]): GastoProyecto[] {
    return proyectos.map((p, idx) => ({
      id: idx + 1,
      proyectoId: p.id,
      proyecto: p.proyecto,
      categoria: 'Total',
      descripcion: 'Gasto acumulado del proyecto',
      monto: Number(p.gastoTotal || 0),
      fecha: p.fechaCreacion,
      responsable: p.responsable,
    }));
  }

  private mapDistribucion(distribucion: Record<string, number> | undefined, estados: string[]): DatoGrafico[] {
    if (!distribucion) return [];
    return estados.map((estado) => ({
      name: estado,
      value: Number(distribucion[estado] || 0),
    }));
  }

  private mapGastosPorMes(proyectos: ProyectoEnCurso[]): DatoGrafico[] {
    const acumulado = new Map<string, number>();
    for (const p of proyectos) {
      const mes = p.mes || 'N/A';
      acumulado.set(mes, (acumulado.get(mes) || 0) + Number(p.gastoTotal || 0));
    }
    return Array.from(acumulado.entries()).map(([name, value]) => ({ name, value }));
  }

  private mapEstadoProyecto(value?: string): ProyectoEnCurso['estado'] {
    const normalized = (value || '').toUpperCase();
    if (normalized.includes('COMPLET') || normalized.includes('FINALIZ')) return 'Completado';
    if (normalized.includes('CANCEL')) return 'Cancelado';
    if (normalized.includes('RETRAS')) return 'Retrasado';
    if (normalized.includes('PEND')) return 'Pendiente';
    return 'En Proceso';
  }

  private mapEstadoTarea(estadoProyecto?: string): TareaEncargado['estado'] {
    if (estadoProyecto === 'Completado') return 'Completado';
    if (estadoProyecto === 'Retrasado') return 'Retrasado';
    if (estadoProyecto === 'Pendiente') return 'Pendiente';
    return 'En Proceso';
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private getMonthLabel(date: Date): string {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months[date.getMonth()] || 'Ene';
  }

  /**
   * Obtiene el total de proyectos finalizados
   */
  obtenerProyectosFinalizados(): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/proyectos-finalizados`);
  }

  /**
   * Obtiene el total de proyectos activos
   */
  obtenerProyectosActivos(): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/proyectos-activos`);
  }

  /**
   * Obtiene los gastos (hoy, ayer, mes)
   */
  obtenerGastos(): Observable<Gastos> {
    return this.http.get<Gastos>(`${this.API_URL}/gastos`);
  }

  /**
   * Obtiene los datos para el gráfico de proyectos finalizados por mes
   */
  obtenerDatosGraficoFinalizados(): Observable<DatoGrafico[]> {
    return this.http.get<DatoGrafico[]>(`${this.API_URL}/grafico/finalizados`);
  }

  /**
   * Obtiene los datos para el gráfico de proyectos activos por mes
   */
  obtenerDatosGraficoActivos(): Observable<DatoGrafico[]> {
    return this.http.get<DatoGrafico[]>(`${this.API_URL}/grafico/activos`);
  }

  /**
   * Obtiene los datos para el gráfico de gastos por mes
   */
  obtenerDatosGraficoGastos(): Observable<DatoGrafico[]> {
    return this.http.get<DatoGrafico[]>(`${this.API_URL}/grafico/gastos`);
  }

  /**
   * Obtiene la lista de proyectos en curso
   */
  obtenerProyectosEnCurso(): Observable<ProyectoEnCurso[]> {
    return this.http.get<ProyectoEnCurso[]>(`${this.API_URL}/proyectos-en-curso`);
  }

  /**
   * Obtiene la lista de tareas de los encargados
   */
  obtenerTareasEncargados(): Observable<TareaEncargado[]> {
    return this.http.get<TareaEncargado[]>(`${this.API_URL}/tareas-encargados`);
  }

  /**
   * Obtiene los gastos detallados por proyecto
   */
  obtenerGastosProyectos(): Observable<GastoProyecto[]> {
    return this.http.get<GastoProyecto[]>(`${this.API_URL}/gastos-proyectos`);
  }
}
