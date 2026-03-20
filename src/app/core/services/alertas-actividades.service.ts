import { Injectable } from '@angular/core';
import { EstadoTarea, FlujoNodo } from '../../features/registro-solicitudes/models/solicitud.model';

export type NivelAlertaActividad = 'media' | 'alta';

export interface AlertaActividadGlobal {
  proyectoId: number;
  nodoId: number;
  nombreActividad: string;
  estado: EstadoTarea;
  nivel: NivelAlertaActividad;
  horasSinCambio: number;
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertasActividadesService {
  private readonly flujoStoragePrefix = 'ayni:registro-solicitudes:flujo:';
  private readonly umbralesAlertaHoras: Record<EstadoTarea, { advertencia: number; critica: number } | null> = {
    Pendiente: { advertencia: 48, critica: 120 },
    'En Proceso': { advertencia: 72, critica: 168 },
    Completado: null,
    Cancelado: null,
    Retrasado: { advertencia: 24, critica: 24 }
  };

  obtenerAlertas(): AlertaActividadGlobal[] {
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
