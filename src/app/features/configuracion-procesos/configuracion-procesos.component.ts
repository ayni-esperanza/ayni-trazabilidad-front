import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfiguracionProcesosService } from './services/configuracion-procesos.service';
import { ProcesoFormData, ProcesoFormModalComponent } from './components/proceso-form-modal/proceso-form-modal.component';
import { ConfirmDeleteModalComponent, ConfirmDeleteConfig } from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';

type ProcesoConfigurado = ProcesoFormData & { id: number };

@Component({
  selector: 'app-configuracion-procesos',
  standalone: true,
  imports: [CommonModule, ProcesoFormModalComponent, ConfirmDeleteModalComponent],
  templateUrl: './configuracion-procesos.component.html',
  styleUrls: ['./configuracion-procesos.component.css']
})
export class ConfiguracionProcesosComponent implements OnInit {

  procesos: ProcesoConfigurado[] = [
    { id: 1, proceso: 'Ejemplo1', area: 'Ejemplo1', flujo: ['Inicio', 'Inicio', 'Inicio', 'Inicio', 'Inicio'] },
    { id: 2, proceso: 'Ejemplo1', area: 'Ejemplo1', flujo: ['Inicio', 'Inicio', 'Inicio'] },
    { id: 3, proceso: 'Ejemplo1', area: 'Ejemplo1', flujo: ['Inicio', 'Inicio'] },
    { id: 4, proceso: 'Ejemplo1', area: 'Ejemplo1', flujo: ['Inicio', 'Inicio'] },
    { id: 5, proceso: 'Ejemplo1', area: 'Ejemplo1', flujo: ['Inicio', 'Inicio', 'Inicio', 'Inicio'] },
  ];

  // Selección de procesos
  procesosSeleccionados: Set<number> = new Set();
  mostrarConfirmacionEliminar = false;
  cargandoEliminacion = false;
  configEliminarModal: ConfirmDeleteConfig = {};

  mostrarModal = false;
  procesoSeleccionado: ProcesoConfigurado | null = null;
  
  constructor(
    private procesosService: ConfiguracionProcesosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Inicialización del componente
  }

  abrirModalNuevoProceso(): void {
    this.procesoSeleccionado = null;
    this.mostrarModal = true;
    this.cdr.detectChanges();
  }

  seleccionarProceso(p: ProcesoConfigurado): void {
    this.procesoSeleccionado = p;
    this.mostrarModal = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.procesoSeleccionado = null;
    this.cdr.detectChanges();
  }

  onGuardarProceso(data: ProcesoFormData): void {
    if (data.id) {
      this.procesos = this.procesos.map((p) => (p.id === data.id ? ({ ...p, ...data } as ProcesoConfigurado) : p));
    } else {
      const maxId = this.procesos.reduce((acc, p) => Math.max(acc, p.id), 0);
      const nuevo: ProcesoConfigurado = { id: maxId + 1, ...data };
      this.procesos = [nuevo, ...this.procesos];
    }

    this.cerrarModal();
  }

  onEliminarProceso(id: number): void {
    this.procesos = this.procesos.filter((p) => p.id !== id);
    this.cerrarModal();
  }

  // Métodos de selección
  toggleSeleccion(id: number): void {
    if (this.procesosSeleccionados.has(id)) {
      this.procesosSeleccionados.delete(id);
    } else {
      this.procesosSeleccionados.add(id);
    }
  }

  toggleSeleccionTodos(): void {
    if (this.todosSeleccionados) {
      this.procesosSeleccionados.clear();
    } else {
      this.procesos.forEach(proceso => {
        this.procesosSeleccionados.add(proceso.id);
      });
    }
  }

  estaSeleccionado(id: number): boolean {
    return this.procesosSeleccionados.has(id);
  }

  get todosSeleccionados(): boolean {
    return this.procesos.length > 0 && 
           this.procesos.every(proceso => this.procesosSeleccionados.has(proceso.id));
  }

  get algunosSeleccionados(): boolean {
    return this.procesos.some(proceso => this.procesosSeleccionados.has(proceso.id)) &&
           !this.todosSeleccionados;
  }

  iniciarEliminarSeleccionados(): void {
    if (this.procesosSeleccionados.size > 0) {
      this.configEliminarModal = {
        titulo: 'Eliminar procesos',
        cantidadElementos: this.procesosSeleccionados.size,
        tipoElemento: this.procesosSeleccionados.size === 1 ? 'proceso' : 'procesos',
        textoConfirmar: 'Eliminar'
      };
      this.mostrarConfirmacionEliminar = true;
    }
  }

  async confirmarEliminarSeleccionados(): Promise<void> {
    this.cargandoEliminacion = true;
    
    try {
      const idsAEliminar = Array.from(this.procesosSeleccionados);
      
      // TODO: Implementar llamada al backend
      // await this.procesosService.eliminarMasivo(idsAEliminar);
      
      // Simulación de llamada al backend (remover cuando se integre)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Eliminar localmente (esto se reemplazará con actualización desde backend)
      this.procesos = this.procesos.filter(p => !this.procesosSeleccionados.has(p.id));
      this.procesosSeleccionados.clear();
      this.mostrarConfirmacionEliminar = false;
      
      console.log('Procesos eliminados exitosamente:', idsAEliminar);
      // TODO: Mostrar notificación de éxito
      
    } catch (error) {
      console.error('Error al eliminar procesos:', error);
      // TODO: Mostrar notificación de error
    } finally {
      this.cargandoEliminacion = false;
    }
  }

  cancelarEliminarSeleccionados(): void {
    this.mostrarConfirmacionEliminar = false;
  }
}
