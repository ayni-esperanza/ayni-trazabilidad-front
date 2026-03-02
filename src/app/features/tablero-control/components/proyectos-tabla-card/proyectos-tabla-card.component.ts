import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProyectoEnCurso, EstadoProyecto } from '../../models/tablero.model';

@Component({
  selector: 'app-proyectos-tabla-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proyectos-tabla-card.component.html',
  styleUrls: ['./proyectos-tabla-card.component.css']
})
export class ProyectosTablaCardComponent {
  @HostBinding('style.flex') get hostFlex(): string {
    return this.tablaVisible ? '1 1 0%' : '0 0 auto';
  }

  @Input() proyectosFiltrados: ProyectoEnCurso[] = [];
  @Input() metricaSeleccionada: 'finalizados' | 'activos' | 'gastos' = 'finalizados';
  @Input() mesSeleccionado: string | null = null;
  @Input() proyectoSeleccionado: ProyectoEnCurso | null = null;
  @Input() tablaVisible: boolean = true;
  
  @Output() toggleTabla = new EventEmitter<void>();
  @Output() limpiarFiltros = new EventEmitter<void>();
  @Output() selectProyecto = new EventEmitter<ProyectoEnCurso>();
  
  onToggleTabla(): void {
    this.toggleTabla.emit();
  }
  
  onLimpiarFiltros(): void {
    this.limpiarFiltros.emit();
  }
  
  onSelectProyecto(proyecto: ProyectoEnCurso): void {
    this.selectProyecto.emit(proyecto);
  }
  
  get tituloTabla(): string {
    switch (this.metricaSeleccionada) {
      case 'finalizados': return 'Proyectos Finalizados';
      case 'activos': return 'Proyectos Activos';
      case 'gastos': return 'Proyectos (Gastos)';
      default: return 'Proyectos';
    }
  }
  
  getEstadoClass(estado: EstadoProyecto): string {
    const classes: Record<string, string> = {
      'Completado': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      'En Proceso': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      'Cancelado': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      'Retrasado': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
      'Pendiente': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    };
    return classes[estado] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
  }
}
