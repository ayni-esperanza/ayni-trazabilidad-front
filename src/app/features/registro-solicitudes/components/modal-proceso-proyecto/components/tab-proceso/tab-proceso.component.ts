import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Proyecto, EtapaProyecto, TareaAsignada, Responsable, FlujoNodo } from '../../../../models/solicitud.model';
import { DatePickerComponent } from '../../../../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'app-tab-proceso',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  templateUrl: './tab-proceso.component.html'
})
export class TabProcesoComponent {
  @Input() proyecto: Proyecto | null = null;
  @Input() etapas: EtapaProyecto[] = [];
  @Input() etapaSeleccionada: EtapaProyecto | null = null;
  @Input() etapaForm!: { presupuesto: number | undefined; responsableId: number; fechaInicio: string; fechaFinalizacion: string };
  @Input() responsables: Responsable[] = [];
  @Input() modoSoloLectura = false;
  @Input() proyectoFinalizado = false;
  @Input() proyectoCancelado = false;
  @Input() todasEtapasCompletadas = false;
  @Input() intentoFinalizarEtapa = false;
  @Input() erroresEtapa: { [key: string]: string } = {};
  @Input() flujoNodos: FlujoNodo[] = [];

  @Output() seleccionarEtapaEvt = new EventEmitter<EtapaProyecto>();
  @Output() abrirActividadEvt = new EventEmitter<void>();

  Object = Object;

  formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  formatDisplayDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  isRetrasado(tarea: TareaAsignada): boolean {
    return tarea.estado === 'Retrasado';
  }

  tieneErrorEtapa(campo: string): boolean {
    return this.intentoFinalizarEtapa && !!this.erroresEtapa[campo];
  }

  getResponsableNombre(responsableId: number): string {
    const resp = this.responsables.find(r => r.id === responsableId);
    return resp?.nombre || 'Sin asignar';
  }

  getSiguientesNombres(nodo: FlujoNodo): string {
    if (!nodo.siguientesIds.length) return 'Sin conexiones';
    const nombres = nodo.siguientesIds
      .map(id => this.flujoNodos.find(n => n.id === id)?.nombre)
      .filter((nombre): nombre is string => !!nombre);
    return nombres.length ? nombres.join(', ') : 'Sin conexiones';
  }

  private getEtapaAnteriorLocal(): EtapaProyecto | null {
    if (!this.etapaSeleccionada) return null;
    const index = this.etapas.findIndex(e => e.id === this.etapaSeleccionada!.id);
    return index > 0 ? this.etapas[index - 1] : null;
  }

  getMinFechaInicio(): string {
    if (!this.proyecto) return '';
    const fechaInicioProyecto = this.formatDate(this.proyecto.fechaInicio);
    const etapaAnterior = this.getEtapaAnteriorLocal();
    if (etapaAnterior && etapaAnterior.fechaFinalizacion) {
      const fechaFinAnterior = this.formatDate(etapaAnterior.fechaFinalizacion);
      return fechaFinAnterior > fechaInicioProyecto ? fechaFinAnterior : fechaInicioProyecto;
    }
    return fechaInicioProyecto;
  }

  getMaxFechaFin(): string {
    if (!this.proyecto) return '';
    return this.formatDate(this.proyecto.fechaFinalizacion);
  }
}
