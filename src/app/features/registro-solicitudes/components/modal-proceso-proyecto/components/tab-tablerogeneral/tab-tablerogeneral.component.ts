import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComentarioAdicionalActividad, FlujoAdjunto, FlujoNodo, OrdenCompra, Proyecto, RepresentanteHistorialProyecto, Responsable, ResponsableHistorialProyecto } from '../../../../models/solicitud.model';
import { DocumentoResumen } from '../../models/documento-resumen.model';
import { LinkifyPipe } from '../../../../../../shared/pipes/linkify.pipe';

type CostoResumenMoneda = {
  costoTotal: number;
  costoTotalUsd?: number;
};

type ResumenMonedas = {
  pen: number;
  usd: number;
};

type FiltroMoneda = 'TODAS' | 'PEN' | 'USD';

@Component({
  selector: 'app-tab-tablero-general, app-tab-tablerogeneral',
  standalone: true,
  imports: [CommonModule, LinkifyPipe],
  templateUrl: './tab-tablerogeneral.component.html'
})
export class TabTableroGeneralComponent {
  @Input() proyecto: Proyecto | null = null;
  @Input() costosHabilitados = false;
  @Input() totalMateriales = 0;
  @Input() totalManoObra = 0;
  @Input() totalOtrosCostos = 0;
  @Input() totalCostosGeneral = 0;
  @Input() costosMateriales: CostoResumenMoneda[] = [];
  @Input() costosManoObra: CostoResumenMoneda[] = [];
  @Input() costosOtros: Array<{ items: CostoResumenMoneda[] }> = [];
  @Input() flujoTimelineResumen: FlujoNodo[] = [];
  @Input() responsables: Responsable[] = [];
  @Input() comentariosAdicionalesActividad: ComentarioAdicionalActividad[] = [];
  @Input() documentosActividadResumen: DocumentoResumen[] = [];
  @Input() puedeDescargarDocumentoFn: (doc: DocumentoResumen) => boolean = () => false;

  @Output() abrirVistaPreviaDocumentoEvt = new EventEmitter<DocumentoResumen>();
  @Output() descargarDocumentoEvt = new EventEmitter<DocumentoResumen>();
  @Output() descargarTodosDocumentosEvt = new EventEmitter<void>();
  @Output() navegarACostosEvt = new EventEmitter<'materiales' | 'manoObra' | 'otrosCostos'>();
  filtroMonedaCostos: FiltroMoneda = 'TODAS';

  navegarACostos(seccion: 'materiales' | 'manoObra' | 'otrosCostos'): void {
    if (window.getSelection()?.toString().trim()) return;
    this.navegarACostosEvt.emit(seccion);
  }

  seleccionarFiltroMonedaCostos(filtro: FiltroMoneda): void {
    this.filtroMonedaCostos = filtro;
  }

  totalOrdenCompraVisible(orden: OrdenCompra): number {
    return orden.moneda === 'USD' ? Number(orden.totalUsd || 0) : Number(orden.total || 0);
  }

  mostrarMonedaCostos(moneda: 'PEN' | 'USD'): boolean {
    return this.filtroMonedaCostos === 'TODAS' || this.filtroMonedaCostos === moneda;
  }

  tieneMontoCostosVisible(resumen: ResumenMonedas): boolean {
    return (this.mostrarMonedaCostos('PEN') && resumen.pen > 0)
      || (this.mostrarMonedaCostos('USD') && resumen.usd > 0);
  }

  get totalMaterialesPorMoneda(): ResumenMonedas {
    return this.resumirPorMoneda(this.costosMateriales);
  }

  get totalManoObraPorMoneda(): ResumenMonedas {
    return this.resumirPorMoneda(this.costosManoObra);
  }

  get totalOtrosCostosPorMoneda(): ResumenMonedas {
    return this.resumirPorMoneda(this.costosOtros.flatMap((tabla) => tabla.items || []));
  }

  get totalCostosPorMoneda(): ResumenMonedas {
    return {
      pen: this.totalMaterialesPorMoneda.pen + this.totalManoObraPorMoneda.pen + this.totalOtrosCostosPorMoneda.pen,
      usd: this.totalMaterialesPorMoneda.usd + this.totalManoObraPorMoneda.usd + this.totalOtrosCostosPorMoneda.usd
    };
  }
  get responsablesHistorialAnterior(): ResponsableHistorialProyecto[] {
    return (this.proyecto?.responsablesHistorial || []).filter((registro) =>
      Boolean(registro.responsableAnteriorId || registro.responsableAnteriorNombre || registro.fechaCambio)
    );
  }

  get representantesHistorialAnterior(): RepresentanteHistorialProyecto[] {
    return (this.proyecto?.representantesHistorial || []).filter((registro) => Boolean(registro.vigenteHasta));
  }

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

  getResponsableHistorialNombre(historial: ResponsableHistorialProyecto): string {
    if (historial.responsableAnteriorNombre) return historial.responsableAnteriorNombre;
    if (historial.responsableAnteriorId) return this.getResponsableNombre(historial.responsableAnteriorId);
    return 'Sin responsable registrado';
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

  crearDocOrdenCompra(orden: any, adjunto: any): DocumentoResumen {
    return {
      actividad: `Orden ${orden.numero || '-'}`,
      origen: 'Orden Compra',
      nombre: adjunto?.nombre || 'Adjunto',
      tipo: adjunto?.tipo || '-',
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
    // Verificar si ya tiene formato dd-mm-yyyy o dd/mm/yyyy
    if (typeof value === 'string' && /^\d{2}[-/]\d{2}[-/]\d{4}/.test(value)) {
      return value.replace(/\//g, '-');
    }
    
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  }

  private resumirPorMoneda(items: CostoResumenMoneda[]): ResumenMonedas {
    return (items || []).reduce<ResumenMonedas>((resumen, item) => {
      resumen.pen += Number(item.costoTotal || 0);
      resumen.usd += Number(item.costoTotalUsd || 0);
      return resumen;
    }, { pen: 0, usd: 0 });
  }
}
