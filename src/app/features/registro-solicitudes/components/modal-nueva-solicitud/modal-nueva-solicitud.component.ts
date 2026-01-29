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

  onCerrar(): void {
    this.resetForm();
    this.cerrar.emit();
  }

  onGuardar(): void {
    if (this.validar()) {
      this.guardar.emit({ ...this.solicitud });
      this.resetForm();
    }
  }

  validar(): boolean {
    return !!(
      this.solicitud.nombreProyecto &&
      this.solicitud.cliente &&
      this.solicitud.costo &&
      this.solicitud.responsableId &&
      this.solicitud.descripcion
    );
  }

  private resetForm(): void {
    this.solicitud = {
      nombreProyecto: '',
      cliente: '',
      costo: 0,
      responsableId: 0,
      descripcion: ''
    };
  }
}
