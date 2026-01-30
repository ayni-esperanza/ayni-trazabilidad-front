import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Tarea {
  id?: number;
  nombre: string;
  proyectoId: string;
  responsableId: string;
  etapa: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  progreso?: number;
}

@Component({
  selector: 'app-tarea-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tarea-form-modal.component.html'
})
export class TareaFormModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() tarea: Tarea | null = null;
  @Input() modoEdicion = false;
  
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Tarea>();
  @Output() eliminar = new EventEmitter<number>();

  formData: Tarea = {
    nombre: '',
    proyectoId: '',
    responsableId: '',
    etapa: '',
    fechaInicio: '',
    fechaFin: '',
    estado: 'pendiente'
  };

  // Control de validación
  intentoGuardar = false;
  errores: { [key: string]: string } = {};
  Object = Object;  // Para usar en el template

  // Opciones para los dropdowns
  proyectos = [
    { id: '1', nombre: 'Proyecto Alpha' },
    { id: '2', nombre: 'Proyecto Beta' },
    { id: '3', nombre: 'Proyecto Gamma' }
  ];

  responsables = [
    { id: '1', nombre: 'Juan Pérez' },
    { id: '2', nombre: 'María García' },
    { id: '3', nombre: 'Carlos López' },
    { id: '4', nombre: 'Ana Ruiz' }
  ];

  etapas = [
    { id: 'planificacion', nombre: 'Planificación' },
    { id: 'diseno', nombre: 'Diseño' },
    { id: 'desarrollo', nombre: 'Desarrollo' },
    { id: 'testing', nombre: 'Testing' },
    { id: 'despliegue', nombre: 'Despliegue' }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      if (this.tarea) {
        this.formData = { ...this.tarea };
      } else {
        this.resetForm();
      }
    }
  }

  resetForm(): void {
    this.formData = {
      nombre: '',
      proyectoId: '',
      responsableId: '',
      etapa: '',
      fechaInicio: '',
      fechaFin: '',
      estado: 'pendiente'
    };
    this.intentoGuardar = false;
    this.errores = {};
  }

  onCerrar(): void {
    this.cerrar.emit();
    this.resetForm();
  }

  onGuardar(): void {
    this.intentoGuardar = true;
    if (this.validarFormulario()) {
      if (this.modoEdicion && this.tarea?.id) {
        this.guardar.emit({ ...this.formData, id: this.tarea.id });
      } else {
        this.guardar.emit(this.formData);
      }
      this.onCerrar();
    }
  }

  onEliminar(): void {
    if (this.tarea?.id && confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
      this.eliminar.emit(this.tarea.id);
      this.onCerrar();
    }
  }

  validarFormulario(): boolean {
    this.errores = {};

    if (!this.formData.nombre.trim()) {
      this.errores['nombre'] = 'El nombre de la tarea es requerido';
    }
    if (!this.formData.proyectoId) {
      this.errores['proyectoId'] = 'Debe seleccionar un proyecto';
    }
    if (!this.formData.etapa) {
      this.errores['etapa'] = 'Debe seleccionar una etapa';
    }
    if (!this.formData.fechaInicio) {
      this.errores['fechaInicio'] = 'La fecha de inicio es requerida';
    }
    if (!this.formData.fechaFin) {
      this.errores['fechaFin'] = 'La fecha de finalización es requerida';
    }
    if (this.formData.fechaInicio && this.formData.fechaFin && 
        new Date(this.formData.fechaFin) < new Date(this.formData.fechaInicio)) {
      this.errores['fechaFin'] = 'La fecha de finalización debe ser posterior a la de inicio';
    }
    if (this.modoEdicion && !this.formData.responsableId) {
      this.errores['responsableId'] = 'Debe seleccionar un responsable';
    }

    return Object.keys(this.errores).length === 0;
  }

  tieneError(campo: string): boolean {
    return this.intentoGuardar && !!this.errores[campo];
  }

  get tituloModal(): string {
    return this.modoEdicion ? 'Editar Tarea' : 'Nueva Tarea';
  }

  get textoBoton(): string {
    return this.modoEdicion ? 'Guardar Tarea' : 'Agregar Tarea';
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.visible) {
      this.onCerrar();
    }
  }
}
