import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Usuario, Rol } from '../../models/usuario.model';
import { ModalDismissDirective } from '../../../../shared/directives/modal-dismiss.directive';

export interface UsuarioFormData {
  id?: number;
  nombre: string;
  apellido: string;
  username: string;
  email: string;
  telefono: string;
  cargo: string;
  area: string;
  rolId: number | null;
  activo: boolean;
  foto: string | null;
}

@Component({
  selector: 'app-usuario-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDismissDirective],
  templateUrl: './usuario-form-modal.component.html',
  styleUrls: ['./usuario-form-modal.component.css']
})
export class UsuarioFormModalComponent implements OnChanges {
  
  @Input() visible = false;
  @Input() usuario: Usuario | null = null;
  @Input() roles: Rol[] = [];
  
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<UsuarioFormData>();
  @Output() eliminar = new EventEmitter<number>();
  
  formData: UsuarioFormData = this.getFormVacio();
  
  get esEdicion(): boolean {
    return this.usuario !== null && this.usuario.id !== undefined;
  }
  
  get titulo(): string {
    return this.esEdicion ? 'Editar Usuario' : 'Nuevo Usuario';
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['usuario'] || changes['visible']) {
      if (this.visible) {
        if (this.usuario) {
          this.formData = {
            id: this.usuario.id,
            nombre: this.usuario.nombre,
            apellido: this.usuario.apellido,
            username: this.usuario.username,
            email: this.usuario.email,
            telefono: this.usuario.telefono || '',
            cargo: this.usuario.cargo,
            area: this.usuario.area,
            rolId: this.usuario.roles.length > 0 ? this.usuario.roles[0].id : null,
            activo: this.usuario.activo,
            foto: this.usuario.foto || null
          };
        } else {
          this.formData = this.getFormVacio();
        }
      }
    }
  }
  
  getFormVacio(): UsuarioFormData {
    return {
      nombre: '',
      apellido: '',
      username: '',
      email: '',
      telefono: '',
      cargo: '',
      area: '',
      rolId: null,
      activo: true,
      foto: null
    };
  }
  
  onCerrar(): void {
    this.cerrar.emit();
  }
  
  onGuardar(): void {
    if (this.validarFormulario()) {
      this.guardar.emit(this.formData);
    }
  }
  
  validarFormulario(): boolean {
    return !!(
      this.formData.nombre.trim() &&
      this.formData.apellido.trim() &&
      this.formData.username.trim() &&
      this.formData.email.trim() &&
      this.formData.rolId
    );
  }
  
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen no debe superar los 2MB');
        return;
      }
      
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        alert('Solo se permiten archivos de imagen');
        return;
      }
      
      // Convertir a base64
      const reader = new FileReader();
      reader.onload = () => {
        this.formData.foto = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
  
  quitarFoto(): void {
    this.formData.foto = null;
  }
  
  onEliminar(): void {
    if (this.formData.id && confirm('¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      this.eliminar.emit(this.formData.id);
    }
  }
}
