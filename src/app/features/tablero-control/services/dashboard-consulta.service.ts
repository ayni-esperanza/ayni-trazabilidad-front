import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import { GastoProyecto, ProyectoEnCurso, TareaEncargado } from '../models/tablero.model';
import { DashboardFiltros, DashboardPagina, DashboardPaginacion, DashboardResumen } from '../models/dashboard-consulta.model';

@Injectable({ providedIn: 'root' })
export class DashboardConsultaService {
  private readonly api = '/v1/dashboard';
  private readonly cache = new Map<string, Observable<unknown>>();

  constructor(private readonly http: HttpService) {}

  resumen(filtros: DashboardFiltros): Observable<DashboardResumen> {
    return this.cached<DashboardResumen>('resumen-tablero', filtros);
  }
  proyectos(filtros: DashboardFiltros, paginacion: DashboardPaginacion): Observable<DashboardPagina<ProyectoEnCurso>> {
    return this.cached<DashboardPagina<ProyectoEnCurso>>('proyectos', { ...filtros, ...paginacion });
  }
  actividades(filtros: DashboardFiltros, paginacion: DashboardPaginacion): Observable<DashboardPagina<TareaEncargado>> {
    return this.cached<DashboardPagina<TareaEncargado>>('actividades', { ...filtros, ...paginacion });
  }
  totalesGastos(filtros: DashboardFiltros): Observable<Record<string, number>> {
    return this.cached<Record<string, number>>('gastos/totales', { ...filtros, categoria: null });
  }
  gastos(filtros: DashboardFiltros, paginacion: DashboardPaginacion): Observable<DashboardPagina<GastoProyecto>> {
    return this.cached<DashboardPagina<GastoProyecto>>('gastos', { ...filtros, ...paginacion });
  }

  private cached<T>(path: string, query: object): Observable<T> {
    const normalized = Object.entries(query).filter(([, value]) => value !== null && value !== undefined && value !== '');
    const key = `${path}?${normalized.sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&')}`;
    const existing = this.cache.get(key) as Observable<T> | undefined;
    if (existing) return existing;
    const params: Record<string, string> = {};
    for (const [name, value] of normalized) params[name] = String(value);
    const request = this.http.get<T>(`${this.api}/${path}`, params).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    return request;
    this.cache.set(key, request);
  }
}


