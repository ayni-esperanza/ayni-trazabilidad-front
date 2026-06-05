import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ResponsableSelectComponent } from '../../../../../../../../shared/components/responsable-select/responsable-select.component';
import { UbicacionSelectComponent } from '../../../../../../../../shared/components/ubicacion-select/ubicacion-select.component';
import { Proyecto, Responsable } from '../../../../../../models/solicitud.model';
import { ProyectoInfoFormData } from '../../tab-informacion.models';

@Component({
  selector: 'app-identificacion-card',
  standalone: true,
  imports: [CommonModule, FormsModule, UbicacionSelectComponent, ResponsableSelectComponent],
  templateUrl: './identificacion-card.component.html'
})
export class IdentificacionCardComponent {
  @Input() proyecto: Proyecto | null = null;
  @Input() proyectoInfoForm!: ProyectoInfoFormData;
  @Input() responsables: Responsable[] = [];
  @Input() modoSoloLectura = false;

  expandida = true;
  areaSeleccionadaParaAgregar = '';

  readonly areasDisponibles: string[] = [
    'Civil',
    'Electricidad',
    'Extrusión - Inyección',
    'Fibra',
    'Líneas de vida',
    'Mecánica',
    'Metalmecánica',
    'Perforación de pozos',
    'Sistemas',
    'Torres de enfriamiento',
  ];

  toggle(): void {
    this.expandida = !this.expandida;
  }

  getResponsableNombre(responsableId: number): string {
    const resp = this.responsables.find(r => r.id === responsableId);
    return resp?.nombre || 'Sin asignar';
  }

  formatDisplayDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  get areasPendientesParaAgregar(): string[] {
    const seleccionadas = new Set(this.proyectoInfoForm.areas || []);
    return this.areasDisponibles.filter(area => !seleccionadas.has(area));
  }

  agregarAreaSeleccionada(): void {
    const area = this.areaSeleccionadaParaAgregar;
    if (!area) return;

    if (!this.proyectoInfoForm.areas) {
      this.proyectoInfoForm.areas = [];
    }

    if (!this.proyectoInfoForm.areas.includes(area)) {
      this.proyectoInfoForm.areas = [...this.proyectoInfoForm.areas, area];
    }

    this.areaSeleccionadaParaAgregar = '';
  }

  quitarArea(area: string): void {
    this.proyectoInfoForm.areas = (this.proyectoInfoForm.areas || []).filter(a => a !== area);
  }
}
