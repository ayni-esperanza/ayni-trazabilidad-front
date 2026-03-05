import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfiguracionProcesosService } from './services/configuracion-procesos.service';
import { ProcesoFormData, ProcesoFormModalComponent } from './components/proceso-form-modal/proceso-form-modal.component';
import { ConfirmDeleteModalComponent, ConfirmDeleteConfig } from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { PaginacionComponent, PaginacionConfig, CambioPaginaEvent } from '../../shared/components/paginacion/paginacion.component';

type ProcesoConfigurado = ProcesoFormData & { id: number };

@Component({
  selector: 'app-configuracion-procesos',
  standalone: true,
  imports: [CommonModule, ProcesoFormModalComponent, ConfirmDeleteModalComponent, PaginacionComponent],
  templateUrl: './configuracion-procesos.component.html',
  styleUrls: ['./configuracion-procesos.component.css']
})
export class ConfiguracionProcesosComponent implements OnInit {

  // Datos de procesos
  procesos: ProcesoConfigurado[] = [];

  // Paginación
  paginacionConfig: PaginacionConfig = {
    paginaActual: 0,
    porPagina: 100,
    totalElementos: 0,
    totalPaginas: 0
  };

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
    this.cargarProcesos();
  }

  cargarProcesos(): void {
    this.procesosService.obtenerProcesos({
      page: this.paginacionConfig.paginaActual,
      size: this.paginacionConfig.porPagina
    }).subscribe({
      next: (response) => {
        this.procesos = response.content as ProcesoConfigurado[];
        this.paginacionConfig.totalElementos = response.totalElements;
        this.paginacionConfig.totalPaginas = response.totalPages;
      },
      error: (error) => {
        console.error('Error al cargar procesos:', error);
      }
    });
  }

  get procesosPaginados(): ProcesoConfigurado[] {
    return this.procesos;
  }

  recalcularPaginacion(): void {
    this.cargarProcesos();
  }

  onCambioPagina(evento: CambioPaginaEvent): void {
    this.paginacionConfig.paginaActual = evento.pagina;
    this.paginacionConfig.porPagina = evento.porPagina;
    this.recalcularPaginacion();
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
      this.procesosService.actualizarProceso(data.id, data).subscribe({
        next: () => {
          this.cargarProcesos();
          this.cerrarModal();
        },
        error: (error) => console.error('Error al actualizar:', error)
      });
    } else {
      this.procesosService.crearProceso(data).subscribe({
        next: () => {
          this.cargarProcesos();
          this.cerrarModal();
        },
        error: (error) => console.error('Error al crear:', error)
      });
    }
  }

  onEliminarProceso(id: number): void {
    this.procesosService.eliminarProceso(id).subscribe({
      next: () => {
        this.cargarProcesos();
        this.cerrarModal();
      },
      error: (error) => console.error('Error al eliminar:', error)
    });
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
    if (this.todosPaginadosSeleccionados) {
      this.procesosPaginados.forEach(proceso => {
        this.procesosSeleccionados.delete(proceso.id);
      });
    } else {
      this.procesosPaginados.forEach(proceso => {
        this.procesosSeleccionados.add(proceso.id);
      });
    }
  }

  get todosPaginadosSeleccionados(): boolean {
    return this.procesosPaginados.length > 0 && 
           this.procesosPaginados.every(proceso => this.procesosSeleccionados.has(proceso.id));
  }

  get algunosPaginadosSeleccionados(): boolean {
    return this.procesosPaginados.some(proceso => this.procesosSeleccionados.has(proceso.id)) &&
           !this.todosPaginadosSeleccionados;
  }

  estaSeleccionado(id: number): boolean {
    return this.procesosSeleccionados.has(id);
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
      this.recalcularPaginacion();
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
