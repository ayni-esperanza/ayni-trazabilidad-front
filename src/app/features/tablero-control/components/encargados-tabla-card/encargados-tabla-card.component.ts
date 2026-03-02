import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TareaEncargado, GastoProyecto, ProyectoEnCurso } from '../../models/tablero.model';

@Component({
  selector: 'app-encargados-tabla-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './encargados-tabla-card.component.html',
  styleUrls: ['./encargados-tabla-card.component.css']
})
export class EncargadosTablaCardComponent {
  @HostBinding('style.flex') get hostFlex(): string {
    return this.tablaVisible ? '1 1 0%' : '0 0 auto';
  }

  @Input() metricaSeleccionada: 'finalizados' | 'activos' | 'gastos' = 'finalizados';
  @Input() tareasFiltradas: TareaEncargado[] = [];
  @Input() gastosFiltrados: GastoProyecto[] = [];
  @Input() proyectoSeleccionado: ProyectoEnCurso | null = null;
  @Input() categoriaSeleccionada: string | null = null;
  @Input() tablaVisible: boolean = true;
  @Input() modoVisualizacion: 'tabla' | 'timeline' = 'tabla';
  @Input() totalGastosFiltrados: number = 0;
  @Input() totalMateriales: number = 0;
  @Input() totalManoObra: number = 0;
  @Input() totalOtrosCostos: number = 0;
  
  @Output() toggleTabla = new EventEmitter<void>();
  @Output() cambiarModo = new EventEmitter<'tabla' | 'timeline'>();
  @Output() seleccionarCategoria = new EventEmitter<string>();
  
  onToggleTabla(): void {
    this.toggleTabla.emit();
  }
  
  onCambiarModo(modo: 'tabla' | 'timeline'): void {
    this.cambiarModo.emit(modo);
  }
  
  onSeleccionarCategoria(categoria: string): void {
    this.seleccionarCategoria.emit(categoria);
  }
  
  get tituloTabla(): string {
    return this.metricaSeleccionada === 'gastos' ? 'Gastos del Proyecto' : 'Tareas de los Encargados';
  }
  
  getEstadoTareaClass(estado: string): string {
    const classes: Record<string, string> = {
      'Completado': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      'En Proceso': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      'Pendiente': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      'Retrasado': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    };
    return classes[estado] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
  }
}
