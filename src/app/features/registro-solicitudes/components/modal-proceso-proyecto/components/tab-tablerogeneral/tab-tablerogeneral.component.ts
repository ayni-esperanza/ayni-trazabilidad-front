import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComentarioAdicionalActividad, FlujoAdjunto, FlujoNodo, Proyecto, Responsable } from '../../../../models/solicitud.model';
import { DocumentoResumen } from '../../models/documento-resumen.model';

@Component({
  selector: 'app-tab-tablero-general, app-tab-tablerogeneral',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-tablerogeneral.component.html'
})
export class TabTableroGeneralComponent {
  @Input() proyecto: Proyecto | null = null;
  @Input() costosHabilitados = false;
  @Input() totalMateriales = 0;
  @Input() totalManoObra = 0;
  @Input() totalOtrosCostos = 0;
  @Input() totalCostosGeneral = 0;
  @Input() flujoTimelineResumen: FlujoNodo[] = [];
  @Input() responsables: Responsable[] = [];
  @Input() comentariosAdicionalesActividad: ComentarioAdicionalActividad[] = [];
  @Input() documentosActividadResumen: DocumentoResumen[] = [];
  @Input() puedeDescargarDocumentoFn: (doc: DocumentoResumen) => boolean = () => false;

  @Output() abrirVistaPreviaDocumentoEvt = new EventEmitter<DocumentoResumen>();
  @Output() descargarDocumentoEvt = new EventEmitter<DocumentoResumen>();
  @Output() descargarTodosDocumentosEvt = new EventEmitter<void>();

  get totalAdjuntosResumen(): number {
    return this.documentosActividadResumen.length;
  }

  esPrimeraDeSeguimiento(index: number): boolean {
    if (!this.flujoTimelineResumen || index < 0 || index >= this.flujoTimelineResumen.length) return false;
    const actual = this.flujoTimelineResumen[index];
    const tipo = actual.tipoActividad?.toUpperCase() || '';
    if (tipo !== 'SEGUIMIENTO') return false;
    if (index === 0) return true;
    const anterior = this.flujoTimelineResumen[index - 1];
    return (anterior.tipoActividad?.toUpperCase() || '') !== 'SEGUIMIENTO';
  }

  getResponsableNombre(responsableId: number): string {
    const resp = this.responsables.find(r => r.id === responsableId);
    return resp?.nombre || 'Sin asignar';
  }

  getComentariosActividadResumen(actividadId: number): ComentarioAdicionalActividad[] {
    return (this.comentariosAdicionalesActividad || []).filter((comentario) => Number(comentario.actividadId) === Number(actividadId));
  }

  puedeDescargarDocumento(doc: DocumentoResumen): boolean {
    return this.puedeDescargarDocumentoFn(doc);
  }

  crearDocActividad(nodo: FlujoNodo, adjunto: FlujoAdjunto): DocumentoResumen {
    return {
      actividad: nodo.nombre,
      origen: 'Actividad',
      nombre: adjunto.nombre,
      tipo: adjunto.tipo,
      adjunto
    };
  }

  crearDocComentario(nodo: FlujoNodo, adjunto: FlujoAdjunto): DocumentoResumen {
    return {
      actividad: nodo.nombre,
      origen: 'Comentario',
      nombre: adjunto.nombre,
      tipo: adjunto.tipo,
      adjunto
    };
  }

  formatDateResumen(value?: string | Date): string {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
