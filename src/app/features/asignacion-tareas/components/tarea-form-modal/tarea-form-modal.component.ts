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
  }

  onCerrar(): void {
    this.cerrar.emit();
    this.resetForm();
  }

  onGuardar(): void {
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
    return !!(
      this.formData.nombre.trim() &&
      this.formData.proyectoId &&
      this.formData.responsableId &&
      this.formData.etapa &&
      this.formData.fechaInicio &&
      this.formData.fechaFin
    );
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
