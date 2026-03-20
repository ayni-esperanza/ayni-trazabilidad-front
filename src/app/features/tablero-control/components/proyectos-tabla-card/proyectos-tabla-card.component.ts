import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProyectoEnCurso, EstadoProyecto } from '../../models/tablero.model';

@Component({
  selector: 'app-proyectos-tabla-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proyectos-tabla-card.component.html',
  styleUrls: ['./proyectos-tabla-card.component.css']
})
export class ProyectosTablaCardComponent {
  @HostBinding('style.flex') get hostFlex(): string {
    return this.tablaVisible ? '1 1 0%' : '0 0 auto';
  }

  @Input() proyectosFiltrados: ProyectoEnCurso[] = [];
  @Input() empresas: string[] = [];
  @Input() empresaSeleccionada: string | null = null;
  @Input() metricaSeleccionada: 'finalizados' | 'activos' | 'gastos' = 'finalizados';
  @Input() mesSeleccionado: string | null = null;
  @Input() proyectoSeleccionado: ProyectoEnCurso | null = null;
  @Input() tablaVisible: boolean = true;

  // Filtros adicionales para la vista de finalizados
  @Input() lugares: string[] = [];
  @Input() areas: string[] = [];
  @Input() estadosDisponibles: string[] = [];
  @Input() lugarSeleccionado: string | null = null;
  @Input() areaSeleccionada: string | null = null;
  @Input() estadoProyecto: string | null = null;
  @Input() fechaDesde: string | null = null;
  @Input() fechaHasta: string | null = null;
  
  @Output() toggleTabla = new EventEmitter<void>();
  @Output() limpiarFiltros = new EventEmitter<void>();
  @Output() selectProyecto = new EventEmitter<ProyectoEnCurso>();
  @Output() empresaSeleccionadaChange = new EventEmitter<string | null>();
  @Output() lugarSeleccionadoChange = new EventEmitter<string | null>();
  @Output() areaSeleccionadaChange = new EventEmitter<string | null>();
  @Output() estadoProyectoChange = new EventEmitter<string | null>();
  @Output() fechaDesdeChange = new EventEmitter<string | null>();
  @Output() fechaHastaChange = new EventEmitter<string | null>();
  
  onToggleTabla(): void {
    this.toggleTabla.emit();
  }
  
  onLimpiarFiltros(): void {
    this.limpiarFiltros.emit();
  }
  
  onEmpresaChange(empresa: string | null): void {
    this.empresaSeleccionadaChange.emit(empresa);
  }

  onLugarChange(lugar: string | null): void {
    this.lugarSeleccionadoChange.emit(lugar);
  }

  onAreaChange(area: string | null): void {
    this.areaSeleccionadaChange.emit(area);
  }

  onEstadoProyectoChange(estado: string | null): void {
    this.estadoProyectoChange.emit(estado);
  }

  onFechaDesdeChange(fecha: string): void {
    this.fechaDesdeChange.emit(fecha || null);
  }

  onFechaHastaChange(fecha: string): void {
    this.fechaHastaChange.emit(fecha || null);
  }
  
  onSelectProyecto(proyecto: ProyectoEnCurso): void {
    this.selectProyecto.emit(proyecto);
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.mesSeleccionado || this.proyectoSeleccionado || this.empresaSeleccionada ||
              this.lugarSeleccionado || this.areaSeleccionada || this.estadoProyecto || this.fechaDesde || this.fechaHasta);
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
