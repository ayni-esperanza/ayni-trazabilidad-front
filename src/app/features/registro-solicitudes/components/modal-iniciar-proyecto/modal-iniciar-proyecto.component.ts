import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Solicitud, Proyecto, Responsable, ProcesoSimple } from '../../models/solicitud.model';
import { ModalDismissDirective } from '../../../../shared/directives/modal-dismiss.directive';

@Component({
  selector: 'app-modal-iniciar-proyecto',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDismissDirective],
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

  // Control de validación
  intentoGuardar = false;
  errores: { [key: string]: string } = {};
  Object = Object;  // Para usar en el template

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['solicitud'] && this.solicitud) {
      this.proyecto = {
        nombreProyecto: this.solicitud.nombreProyecto,
        cliente: this.solicitud.cliente,
        costo: this.solicitud.costo,
        responsableId: this.solicitud.responsableId,
        descripcion: this.solicitud.descripcion,
        fechaInicio: '',
        fechaFinalizacion: '',
        procesoId: 0
      };
      this.intentoGuardar = false;
      this.errores = {};
    }
  }

  onCerrar(): void {
    this.intentoGuardar = false;
    this.errores = {};
    this.cerrar.emit();
  }

  onCancelarProyecto(): void {
    this.cancelarProy.emit();
  }

  onIniciar(): void {
    this.intentoGuardar = true;
    if (this.validar()) {
      this.iniciar.emit({ ...this.proyecto });
    }
  }

  validar(): boolean {
    this.errores = {};
    
    if (!this.proyecto.nombreProyecto?.trim()) {
      this.errores['nombreProyecto'] = 'El nombre del proyecto es requerido';
    }
    if (!this.proyecto.cliente?.trim()) {
      this.errores['cliente'] = 'El cliente es requerido';
    }
    if (!this.proyecto.costo || this.proyecto.costo <= 0) {
      this.errores['costo'] = 'El costo debe ser mayor a 0';
    }
    if (!this.proyecto.responsableId || this.proyecto.responsableId === 0) {
      this.errores['responsableId'] = 'Debe seleccionar un responsable';
    }
    if (!this.proyecto.fechaInicio) {
      this.errores['fechaInicio'] = 'La fecha de inicio es requerida';
    }
    if (!this.proyecto.fechaFinalizacion) {
      this.errores['fechaFinalizacion'] = 'La fecha de finalización es requerida';
    }
    if (this.proyecto.fechaInicio && this.proyecto.fechaFinalizacion && 
        new Date(this.proyecto.fechaFinalizacion) < new Date(this.proyecto.fechaInicio)) {
      this.errores['fechaFinalizacion'] = 'La fecha de finalización debe ser posterior a la de inicio';
    }
    if (!this.proyecto.procesoId || this.proyecto.procesoId === 0) {
      this.errores['procesoId'] = 'Debe seleccionar un proceso';
    }
    if (!this.proyecto.descripcion?.trim()) {
      this.errores['descripcion'] = 'La descripción es requerida';
    }

    return Object.keys(this.errores).length === 0;
  }

  tieneError(campo: string): boolean {
    return this.intentoGuardar && !!this.errores[campo];
  }
}
