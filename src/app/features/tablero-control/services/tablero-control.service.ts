import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import {
  ProyectoEnCurso,
  TareaEncargado,
  Gastos,
  DatoGrafico,
  ResumenTablero,
  GastoProyecto,
} from '../models/tablero.model';

type DashboardSerieApi = {
  name: string;
  value: number;
};

type DashboardProyectoApi = {
  id: number;
  nombre: string;
  responsable?: string;
  responsableId?: number;
  cliente?: string;
  etapa?: string;
  estado?: string;
  avance?: number;
  eficiencia?: number;
  inversion?: number;
  gasto?: number;
  retorno?: number;
  durationStart?: string;
  durationEnd?: string;
  tasaRetorno?: number;
  descripcion?: string;
  ubicacion?: string;
  areas?: string[];
  fechaRegistro?: string;
};

type DashboardTareaApi = {
  id: number;
  responsable?: string;
  tarea?: string;
  proyecto?: string;
  proyectoId?: number;
  etapa?: string;
  fechas?: string;
  estado?: string;
};

type DashboardGastoApi = {
  id: number;
  proyectoId?: number;
  proyecto?: string;
  categoria?: string;
  descripcion?: string;
  monto?: number;
  fecha?: string;
  responsable?: string;
};

@Injectable({
  providedIn: 'root'
})
export class TableroControlService {

  private readonly API_URL = '/v1/dashboard';
  private readonly MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  constructor(private http: HttpService) { }

  obtenerResumenTablero(): Observable<ResumenTablero> {
    return forkJoin({
      proyectos: this.http.get<DashboardProyectoApi[]>(`${this.API_URL}/proyectos-indicadores`),
      tareas: this.http.get<DashboardTareaApi[]>(`${this.API_URL}/tareas-encargados`),
      gastos: this.http.get<DashboardGastoApi[]>(`${this.API_URL}/gastos-proyectos`),
      datosFinalizados: this.http.get<DashboardSerieApi[]>(`${this.API_URL}/grafico/finalizados`),
      datosActivos: this.http.get<DashboardSerieApi[]>(`${this.API_URL}/grafico/activos`),
      datosGastos: this.http.get<DashboardSerieApi[]>(`${this.API_URL}/grafico/gastos`),
    }).pipe(
      map(({ proyectos, tareas, gastos, datosFinalizados, datosActivos, datosGastos }) => {
        const proyectosNorm = (proyectos || []).map((item) => this.mapProyectoIndicador(item));
        const tareasNorm = (tareas || []).map((item) => this.mapTareaEncargado(item));
        const gastosNorm = (gastos || []).map((item) => this.mapGastoProyecto(item));
        const metricasGastos = this.calcularMetricasGastos(gastosNorm);

        const proyectosActivos = proyectosNorm.filter((p) => p.estado === 'En Proceso' || p.estado === 'Pendiente').length;
        const proyectosFinalizados = proyectosNorm.filter((p) => p.estado === 'Completado').length;

        return {
          proyectosFinalizados,
          proyectosActivos,
          gastos: metricasGastos,
          datosProyectosFinalizados: this.mapSerie(datosFinalizados || []),
          datosProyectosActivos: this.mapSerie(datosActivos || []),
          datosGastos: this.mapSerie(datosGastos || []),
          proyectosEnCurso: proyectosNorm,
          tareasEncargados: tareasNorm,
          gastosProyectos: gastosNorm,
        } as ResumenTablero;
      })
    );
  }

  private mapProyectoIndicador(item: DashboardProyectoApi): ProyectoEnCurso {
    const inicio = this.toDate(item?.durationStart) || this.toDate(item?.fechaRegistro) || new Date();
    const fin = this.toDate(item?.durationEnd) || inicio;
    const fechaRegistro = this.toDate(item?.fechaRegistro) || inicio;
    const estado = this.mapEstadoProyecto(item?.estado);
    const area = Array.isArray(item?.areas) && item.areas.length ? item.areas[0] : '';

    return {
      id: Number(item?.id || 0),
      proyecto: item?.nombre || 'Proyecto',
      empresa: item?.cliente || 'Cliente',
      responsable: item?.responsable || 'Sin responsable',
      etapa: item?.etapa || estado,
      fechas: `${this.formatDate(inicio)} - ${this.formatDate(fin)}`,
      estado,
      mes: this.getMonthLabel(inicio),
      mesActivo: this.getMonthLabel(inicio),
      mesFinalizado: this.getMonthLabel(fin),
      fechaCreacion: fechaRegistro,
      fechaInicio: inicio,
      fechaFinalizacion: fin,
      fechaRegistro,
      gastoTotal: Number(item?.gasto || 0),
      lugar: item?.ubicacion || '',
      area,
    };
  }

  private mapTareaEncargado(item: DashboardTareaApi): TareaEncargado {
    return {
      id: Number(item?.id || 0),
      responsable: item?.responsable || 'Sin responsable',
      tarea: item?.tarea || 'Actividad',
      proyecto: item?.proyecto || 'Proyecto',
      proyectoId: Number(item?.proyectoId || 0),
      etapa: item?.etapa || 'En Proceso',
      fechas: item?.fechas || '',
      estado: this.mapEstadoTarea(item?.estado),
    };
  }

  private mapGastoProyecto(item: DashboardGastoApi): GastoProyecto {
    const fecha = this.toDate(item?.fecha) || new Date();
    return {
      id: Number(item?.id || 0),
      proyectoId: Number(item?.proyectoId || 0),
      proyecto: item?.proyecto || 'Proyecto',
      categoria: item?.categoria || 'Otros Costos',
      descripcion: item?.descripcion || 'Sin descripcion',
      monto: Number(item?.monto || 0),
      fecha,
      mes: this.getMonthLabel(fecha),
      responsable: item?.responsable || 'Sin responsable',
    };
  }

  private mapSerie(series: DashboardSerieApi[]): DatoGrafico[] {
    return (series || []).map((item) => ({
      name: item?.name || 'N/A',
      value: Number(item?.value || 0),
    }));
  }

  private calcularMetricasGastos(gastos: GastoProyecto[]): Gastos {
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    let totalHoy = 0;
    let totalAyer = 0;
    let totalMes = 0;

    for (const gasto of gastos || []) {
      const fecha = this.toDate(gasto.fecha);
      if (!fecha) continue;

      const monto = Number(gasto.monto || 0);
      if (fecha.getFullYear() === hoy.getFullYear() && fecha.getMonth() === hoy.getMonth()) {
        totalMes += monto;
      }
      if (this.isSameDay(fecha, hoy)) {
        totalHoy += monto;
      }
      if (this.isSameDay(fecha, ayer)) {
        totalAyer += monto;
      }
    }

    return {
      mes: totalMes,
      hoy: totalHoy,
      ayer: totalAyer,
    };
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  private toDate(value?: string | Date | null): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private mapEstadoProyecto(value?: string): ProyectoEnCurso['estado'] {
    const normalized = (value || '').toUpperCase();
    if (normalized.includes('COMPLET') || normalized.includes('FINALIZ')) return 'Completado';
    if (normalized.includes('CANCEL')) return 'Cancelado';
    if (normalized.includes('PEND')) return 'Pendiente';
    return 'En Proceso';
  }

  private mapEstadoTarea(value?: string): TareaEncargado['estado'] {
    const normalized = (value || '').toUpperCase();
    if (normalized.includes('COMPLET')) return 'Completado';
    if (normalized.includes('RETRAS')) return 'Retrasado';
    if (normalized.includes('PEND')) return 'Pendiente';
    return 'En Proceso';
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private getMonthLabel(date: Date): string {
    return this.MONTHS[date.getMonth()] || 'Ene';
  }

  obtenerProyectosFinalizados(): Observable<number> {
    return this.obtenerProyectosEnCurso().pipe(
      map((items) => items.filter((item) => item.estado === 'Completado').length)
    );
  }

  obtenerProyectosActivos(): Observable<number> {
    return this.obtenerProyectosEnCurso().pipe(
      map((items) => items.filter((item) => item.estado === 'En Proceso' || item.estado === 'Pendiente').length)
    );
  }

  obtenerGastos(): Observable<Gastos> {
    return this.obtenerGastosProyectos().pipe(
      map((items) => this.calcularMetricasGastos(items))
    );
  }

  obtenerDatosGraficoFinalizados(): Observable<DatoGrafico[]> {
    return this.http.get<DashboardSerieApi[]>(`${this.API_URL}/grafico/finalizados`).pipe(map((items) => this.mapSerie(items || [])));
  }

  obtenerDatosGraficoActivos(): Observable<DatoGrafico[]> {
    return this.http.get<DashboardSerieApi[]>(`${this.API_URL}/grafico/activos`).pipe(map((items) => this.mapSerie(items || [])));
  }

  obtenerDatosGraficoGastos(): Observable<DatoGrafico[]> {
    return this.http.get<DashboardSerieApi[]>(`${this.API_URL}/grafico/gastos`).pipe(map((items) => this.mapSerie(items || [])));
  }

  obtenerProyectosEnCurso(): Observable<ProyectoEnCurso[]> {
    return this.http.get<DashboardProyectoApi[]>(`${this.API_URL}/proyectos-indicadores`).pipe(
      map((items) => (items || []).map((item) => this.mapProyectoIndicador(item)))
    );
  }

  obtenerTareasEncargados(): Observable<TareaEncargado[]> {
    return this.http.get<DashboardTareaApi[]>(`${this.API_URL}/tareas-encargados`).pipe(
      map((items) => (items || []).map((item) => this.mapTareaEncargado(item)))
    );
  }

  obtenerGastosProyectos(): Observable<GastoProyecto[]> {
    return this.http.get<DashboardGastoApi[]>(`${this.API_URL}/gastos-proyectos`).pipe(
      map((items) => (items || []).map((item) => this.mapGastoProyecto(item)))
    );
  }
}
