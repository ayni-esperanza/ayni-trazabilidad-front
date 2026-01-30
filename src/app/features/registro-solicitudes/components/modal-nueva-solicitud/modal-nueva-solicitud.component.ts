import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Solicitud, Responsable } from '../../models/solicitud.model';

@Component({
  selector: 'app-modal-nueva-solicitud',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-nueva-solicitud.component.html'
})
export class ModalNuevaSolicitudComponent {
  @Input() visible = false;
  @Input() responsables: Responsable[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Partial<Solicitud>>();

  solicitud: Partial<Solicitud> = {
    nombreProyecto: '',
    cliente: '',
    costo: 0,
    responsableId: 0,
    descripcion: ''
  };

  // Control de validación
  intentoGuardar = false;
  errores: { [key: string]: string } = {};
  Object = Object;  // Para usar en el template

  onCerrar(): void {
    this.resetForm();
    this.cerrar.emit();
  }

  onGuardar(): void {
    this.intentoGuardar = true;
    if (this.validar()) {
      this.guardar.emit({ ...this.solicitud });
      this.resetForm();
    }
  }

  validar(): boolean {
    this.errores = {};
    
    if (!this.solicitud.nombreProyecto?.trim()) {
      this.errores['nombreProyecto'] = 'El nombre del proyecto es requerido';
    }
    if (!this.solicitud.cliente?.trim()) {
      this.errores['cliente'] = 'El cliente es requerido';
    }
    if (!this.solicitud.costo || this.solicitud.costo <= 0) {
      this.errores['costo'] = 'El costo debe ser mayor a 0';
    }
    if (!this.solicitud.responsableId || this.solicitud.responsableId === 0) {
      this.errores['responsableId'] = 'Debe seleccionar un responsable';
    }
    if (!this.solicitud.descripcion?.trim()) {
      this.errores['descripcion'] = 'La descripción es requerida';
    }

    return Object.keys(this.errores).length === 0;
  }

  tieneError(campo: string): boolean {
    return this.intentoGuardar && !!this.errores[campo];
  }

  private resetForm(): void {
    this.solicitud = {
      nombreProyecto: '',
      cliente: '',
      costo: 0,
      responsableId: 0,
      descripcion: ''
    };
    this.intentoGuardar = false;
    this.errores = {};
  }
}
