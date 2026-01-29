import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Solicitud, Proyecto, Responsable, ProcesoSimple } from '../../models/solicitud.model';

@Component({
  selector: 'app-modal-iniciar-proyecto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-iniciar-proyecto.component.html'
})
export class ModalIniciarProyectoComponent implements OnChanges {
  @Input() visible = false;
  @Input() solicitud: Solicitud | null = null;
  @Input() responsables: Responsable[] = [];
  @Input() procesos: ProcesoSimple[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() cancelarProy = new EventEmitter<void>();
  @Output() iniciar = new EventEmitter<Partial<Proyecto>>();

  proyecto: Partial<Proyecto> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['solicitud'] && this.solicitud) {
      this.proyecto = {
        nombreProyecto: this.solicitud.nombreProyecto,
        cliente: this.solicitud.cliente,
        costo: this.solicitud.costo,
        responsableId: this.solicitud.responsableId,
        descripcion: this.solicitud.descripcion,
        fechaInicio: new Date(),
        fechaFinalizacion: new Date(),
        procesoId: 0
      };
    }
  }

  onCerrar(): void {
    this.cerrar.emit();
  }

  onCancelarProyecto(): void {
    this.cancelarProy.emit();
  }

  onIniciar(): void {
    if (this.validar()) {
      this.iniciar.emit({ ...this.proyecto });
    }
  }

  validar(): boolean {
    return !!(
      this.proyecto.nombreProyecto &&
      this.proyecto.cliente &&
      this.proyecto.costo &&
      this.proyecto.responsableId &&
      this.proyecto.fechaInicio &&
      this.proyecto.fechaFinalizacion &&
      this.proyecto.procesoId &&
      this.proyecto.descripcion
    );
  }
}
