import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { HttpService } from './http.service';
import { EstadoTarea, FlujoNodo } from '../../features/registro-solicitudes/models/solicitud.model';

export type NivelAlertaActividad = 'media' | 'alta';

export interface AlertaActividadGlobal {
  proyectoId: number;
  proyectoNombre?: string;
  nodoId: number;
  nombreActividad: string;
  estado: EstadoTarea;
  nivel: NivelAlertaActividad;
  horasSinCambio: number;
  mensaje: string;
}

type AlertaActividadApi = AlertaActividadGlobal & {
  proyecto?: string;
  nombreProyecto?: string;
  proyectoNombre?: string;
  proyecto_nombre?: string;
  nombre_proyecto?: string;
};

type ProyectoNombreApi = {
  id: number;
  nombreProyecto?: string;
  nombre?: string;
  proyectoNombre?: string;
};

type PaginatedResponse<T> = {
  content: T[];
};

@Injectable({
  providedIn: 'root'
})
export class AlertasActividadesService {
  private readonly flujoStoragePrefix = 'ayni:registro-solicitudes:flujo:';
  private readonly endpoint = '/v1/alertas/actividades';
  private alertasCache: AlertaActividadGlobal[] = [];
  private readonly umbralesAlertaHoras: Record<EstadoTarea, { advertencia: number; critica: number } | null> = {
    Pendiente: { advertencia: 48, critica: 120 },
    'En Proceso': { advertencia: 72, critica: 168 },
    Completado: null,
    Cancelado: null,
    Retrasado: { advertencia: 24, critica: 24 }
  };

  constructor(private readonly http: HttpService) {}

  obtenerAlertas(): AlertaActividadGlobal[] {
    return this.alertasCache;
  }

  refrescarAlertas(): Observable<AlertaActividadGlobal[]> {
    return this.http.get<AlertaActividadApi[]>(this.endpoint).pipe(
      map((items) => (items || []).map((item) => ({
        ...item,
        proyectoNombre: this.resolveProyectoNombre(item),
        estado: this.normalizarEstado(item.estado),
      }))),
      switchMap((items) => {
        const sinNombre = items.filter((item) => !item.proyectoNombre);
        if (!sinNombre.length) {
          return of(items);
        }

        const ids = [...new Set(sinNombre.map((item) => Number(item.proyectoId || 0)).filter((id) => id > 0))];
        if (!ids.length) {
          return of(items);
        }

        return this.obtenerMapaNombresProyecto(ids).pipe(
          map((mapaNombres) => items.map((item) => ({
            ...item,
            proyectoNombre: item.proyectoNombre || mapaNombres.get(Number(item.proyectoId || 0)) || undefined,
          })))
        );
      }),
      tap((items) => {
        this.alertasCache = items;
      }),
      catchError(() => {
        const local = this.obtenerAlertasDesdeLocalStorage();
        this.alertasCache = local;
        return of(local);
      })
    );
  }

  private resolveProyectoNombre(item: AlertaActividadApi): string | undefined {
    const nombre = String(
      item.proyectoNombre ||
      item.nombreProyecto ||
      item.proyecto_nombre ||
      item.nombre_proyecto ||
      item.proyecto ||
      ''
    ).trim();

    if (!nombre) return undefined;

    // Evita mostrar IDs como nombre cuando backend envía solo el número en string.
    if (/^\d+$/.test(nombre)) return undefined;

    return nombre;
  }

  private obtenerMapaNombresProyecto(ids: number[]): Observable<Map<number, string>> {
    const idsSet = new Set(ids);

    return this.http.get<PaginatedResponse<ProyectoNombreApi>>('/v1/proyectos', { size: 500 }).pipe(
      map((response) => {
        const mapa = new Map<number, string>();
        for (const proyecto of response?.content || []) {
          const id = Number(proyecto?.id || 0);
          if (!id || !idsSet.has(id)) continue;

          const nombre = String(
            proyecto?.nombreProyecto ||
            proyecto?.proyectoNombre ||
            proyecto?.nombre ||
            ''
          ).trim();

          if (nombre) {
            mapa.set(id, nombre);
          }
        }
        return mapa;
      }),
      catchError(() => of(new Map<number, string>()))
    );
  }

  private normalizarEstado(value?: string): EstadoTarea {
    const clean = (value || '').toLowerCase();
    if (clean.includes('complet')) return 'Completado';
    if (clean.includes('cancel')) return 'Cancelado';
    if (clean.includes('retras')) return 'Retrasado';
    if (clean.includes('proceso')) return 'En Proceso';
    return 'Pendiente';
  }

  private obtenerAlertasDesdeLocalStorage(): AlertaActividadGlobal[] {
    if (typeof window === 'undefined') return [];

    const alertas: AlertaActividadGlobal[] = [];

    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(this.flujoStoragePrefix)) continue;

      const proyectoId = Number(key.slice(this.flujoStoragePrefix.length));
      if (!Number.isFinite(proyectoId)) continue;

      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as { nodos?: FlujoNodo[] };
        if (!Array.isArray(parsed?.nodos)) continue;

        for (const nodo of parsed.nodos) {
          const alerta = this.construirAlertaDesdeNodo(proyectoId, nodo);
          if (alerta) {
            alertas.push(alerta);
          }
        }
      } catch {
        continue;
      }
    }

    return alertas.sort((a, b) => b.horasSinCambio - a.horasSinCambio);
  }

  private construirAlertaDesdeNodo(proyectoId: number, nodo: FlujoNodo): AlertaActividadGlobal | null {
    if (nodo.tipo !== 'tarea') return null;

    const estado = nodo.estadoActividad || 'Pendiente';
    const umbrales = this.umbralesAlertaHoras[estado];
    if (!umbrales) return null;

    const fechaBase = this.convertirAFecha(nodo.fechaCambioEstado || nodo.fechaFin || nodo.fechaInicio);
    if (!fechaBase) return null;

    const horasSinCambio = Math.floor((Date.now() - fechaBase.getTime()) / (1000 * 60 * 60));
    if (horasSinCambio < umbrales.advertencia) return null;

    const nivel: NivelAlertaActividad = horasSinCambio >= umbrales.critica ? 'alta' : 'media';
    const prefijo = nivel === 'alta' ? 'Urgente:' : 'Atencion:';
    const mensajeEstado = estado === 'Retrasado'
      ? `${prefijo} ${this.formatearTiempoSinCambio(horasSinCambio)} sin cambio de estado a Completado o Cancelado`
      : `${prefijo} ${this.formatearTiempoSinCambio(horasSinCambio)} sin cambio de estado`;

    return {
      proyectoId,
      proyectoNombre: undefined,
      nodoId: nodo.id,
      nombreActividad: nodo.nombre || 'Actividad sin nombre',
      estado,
      nivel,
      horasSinCambio,
      mensaje: mensajeEstado
    };
  }

  private formatearTiempoSinCambio(horas: number): string {
    const dias = Math.floor(horas / 24);
    if (dias > 0) {
      const horasRestantes = horas % 24;
      return horasRestantes > 0 ? `${dias}d ${horasRestantes}h` : `${dias}d`;
    }

    return `${Math.max(horas, 0)}h`;
  }

  private convertirAFecha(valor?: string): Date | null {
    if (!valor) return null;

    const directa = new Date(valor);
    if (!Number.isNaN(directa.getTime())) return directa;

    const valorConT = valor.includes(' ') ? valor.replace(' ', 'T') : valor;
    const isoSimple = new Date(valorConT);
    if (!Number.isNaN(isoSimple.getTime())) return isoSimple;

    const match = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (match) {
      const dia = Number(match[1]);
      const mes = Number(match[2]) - 1;
      const anio = Number(match[3]);
      const hora = Number(match[4] || '0');
      const minuto = Number(match[5] || '0');
      const fecha = new Date(anio, mes, dia, hora, minuto);
      return Number.isNaN(fecha.getTime()) ? null : fecha;
    }

    return null;
  }
}
