import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsignacionTareasService } from './services/asignacion-tareas.service';
import { PaginacionComponent, PaginacionConfig, CambioPaginaEvent } from '../../shared/components/paginacion/paginacion.component';
import { TareaFormModalComponent, Tarea } from './components/tarea-form-modal/tarea-form-modal.component';
import { ConfirmDeleteModalComponent, ConfirmDeleteConfig } from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';

@Component({
  selector: 'app-asignacion-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent, TareaFormModalComponent, ConfirmDeleteModalComponent],
  templateUrl: './asignacion-tareas.component.html',
  styleUrls: ['./asignacion-tareas.component.css']
})
export class AsignacionTareasComponent implements OnInit {
  
  // Datos de tareas (mock data)
  tareas: Tarea[] = [
    {
      id: 1,
      nombre: 'Diseño de interfaz',
      proyectoId: '1',
      responsableId: '1',
      etapa: 'diseno',
      fechaInicio: '2026-01-10',
      fechaFin: '2026-01-20',
      estado: 'en-progreso',
      progreso: 60
    },
    {
      id: 2,
      nombre: 'Desarrollo backend',
      proyectoId: '1',
      responsableId: '2',
      etapa: 'desarrollo',
      fechaInicio: '2026-01-05',
      fechaFin: '2026-01-15',
      estado: 'completada',
      progreso: 100
    }
  ];

  tareasFiltradas: Tarea[] = [];
  
  // Estadísticas dinámicas
  estadisticas = {
    total: 0,
    pendientes: 0,
    enProgreso: 0,
    completadas: 0
  };
  
  // Selección de tareas
  tareasSeleccionadas: Set<number> = new Set();
  mostrarConfirmacionEliminar = false;
  cargandoEliminacion = false;
  configEliminarModal: ConfirmDeleteConfig = {};
  
  // Configuración de paginación
  paginacionConfig: PaginacionConfig = {
    paginaActual: 0,
    porPagina: 100,
    totalElementos: 0,
    totalPaginas: 0
  };

  // Modal
  modalVisible = false;
  tareaSeleccionada: Tarea | null = null;
  modoEdicion = false;

  // Filtros
  busqueda = '';
  estadoFiltro = '';

  constructor(private tareasService: AsignacionTareasService) {}

  ngOnInit(): void {
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    let resultado = [...this.tareas];

    // Filtro de búsqueda
    if (this.busqueda.trim()) {
      const termino = this.busqueda.toLowerCase();
      resultado = resultado.filter(t => 
        t.nombre.toLowerCase().includes(termino) ||
        this.getNombreProyecto(t.proyectoId).toLowerCase().includes(termino) ||
        this.getNombreResponsable(t.responsableId).toLowerCase().includes(termino)
      );
    }

    // Filtro de estado
    if (this.estadoFiltro) {
      resultado = resultado.filter(t => t.estado === this.estadoFiltro);
    }

    this.tareasFiltradas = resultado;
    this.actualizarPaginacion();
    this.calcularEstadisticas();
  }

  actualizarPaginacion(): void {
    this.paginacionConfig.totalElementos = this.tareasFiltradas.length;
    this.paginacionConfig.totalPaginas = Math.ceil(
      this.tareasFiltradas.length / this.paginacionConfig.porPagina
    );
  }

  calcularEstadisticas(): void {
    this.estadisticas = {
      total: this.tareasFiltradas.length,
      pendientes: this.tareasFiltradas.filter(t => t.estado === 'pendiente').length,
      enProgreso: this.tareasFiltradas.filter(t => t.estado === 'en-progreso').length,
      completadas: this.tareasFiltradas.filter(t => t.estado === 'completada').length
    };
  }

  tieneFiltrosActivos(): boolean {
    return !!(this.busqueda.trim() || this.estadoFiltro);
  }

  get tareasPaginadas(): Tarea[] {
    const inicio = this.paginacionConfig.paginaActual * this.paginacionConfig.porPagina;
    const fin = inicio + this.paginacionConfig.porPagina;
    return this.tareasFiltradas.slice(inicio, fin);
  }

  onCambioPagina(event: CambioPaginaEvent): void {
    this.paginacionConfig.paginaActual = event.pagina;
    this.paginacionConfig.porPagina = event.porPagina;
    this.actualizarPaginacion();
  }

  abrirModalNueva(): void {
    this.tareaSeleccionada = null;
    this.modoEdicion = false;
    this.modalVisible = true;
  }

  abrirModalEditar(tarea: Tarea): void {
    this.tareaSeleccionada = tarea;
    this.modoEdicion = true;
    this.modalVisible = true;
  }

  cerrarModal(): void {
    this.modalVisible = false;
    this.tareaSeleccionada = null;
  }

  guardarTarea(tarea: Tarea): void {
    if (tarea.id) {
      // Actualizar tarea existente
      const index = this.tareas.findIndex(t => t.id === tarea.id);
      if (index !== -1) {
        this.tareas[index] = tarea;
      }
    } else {
      // Crear nueva tarea
      const nuevaTarea = {
        ...tarea,
        id: Math.max(...this.tareas.map(t => t.id || 0)) + 1,
        progreso: 0
      };
      this.tareas.push(nuevaTarea);
    }
    this.aplicarFiltros();
  }

  eliminarTarea(id: number): void {
    this.tareas = this.tareas.filter(t => t.id !== id);
    this.aplicarFiltros();
  }

  // Métodos de selección
  toggleSeleccion(id: number): void {
    if (this.tareasSeleccionadas.has(id)) {
      this.tareasSeleccionadas.delete(id);
    } else {
      this.tareasSeleccionadas.add(id);
    }
  }

  toggleSeleccionTodos(): void {
    if (this.todosPaginadosSeleccionados) {
      // Deseleccionar todos los de la página actual
      this.tareasPaginadas.forEach(tarea => {
        if (tarea.id) this.tareasSeleccionadas.delete(tarea.id);
      });
    } else {
      // Seleccionar todos los de la página actual
      this.tareasPaginadas.forEach(tarea => {
        if (tarea.id) this.tareasSeleccionadas.add(tarea.id);
      });
    }
  }

  estaSeleccionado(id: number | undefined): boolean {
    return id !== undefined && this.tareasSeleccionadas.has(id);
  }

  get todosPaginadosSeleccionados(): boolean {
    return this.tareasPaginadas.length > 0 && 
           this.tareasPaginadas.every(tarea => this.estaSeleccionado(tarea.id));
  }

  get algunosPaginadosSeleccionados(): boolean {
    return this.tareasPaginadas.some(tarea => this.estaSeleccionado(tarea.id)) &&
           !this.todosPaginadosSeleccionados;
  }

  iniciarEliminarSeleccionados(): void {
    if (this.tareasSeleccionadas.size > 0) {
      this.configEliminarModal = {
        titulo: 'Eliminar actividades',
        cantidadElementos: this.tareasSeleccionadas.size,
        tipoElemento: this.tareasSeleccionadas.size === 1 ? 'actividad' : 'actividades',
        textoConfirmar: 'Eliminar'
      };
      this.mostrarConfirmacionEliminar = true;
    }
  }

  async confirmarEliminarSeleccionados(): Promise<void> {
    this.cargandoEliminacion = true;
    
    try {
      const idsAEliminar = Array.from(this.tareasSeleccionadas);
      
      // TODO: Implementar llamada al backend
      // await this.tareasService.eliminarMasivo(idsAEliminar);
      
      // Simulación de llamada al backend (remover cuando se integre)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Eliminar localmente (esto se reemplazará con actualización desde backend)
      this.tareas = this.tareas.filter(t => !this.tareasSeleccionadas.has(t.id || 0));
      this.tareasSeleccionadas.clear();
      this.mostrarConfirmacionEliminar = false;
      this.aplicarFiltros();
      
      console.log('Tareas eliminadas exitosamente:', idsAEliminar);
      // TODO: Mostrar notificación de éxito
      
    } catch (error) {
      console.error('Error al eliminar tareas:', error);
      // TODO: Mostrar notificación de error
    } finally {
      this.cargandoEliminacion = false;
    }
  }

  cancelarEliminarSeleccionados(): void {
    this.mostrarConfirmacionEliminar = false;
  }

  // Helpers
  getNombreProyecto(id: string): string {
    const proyectos: { [key: string]: string } = {
      '1': 'Proyecto Alpha',
      '2': 'Proyecto Beta',
      '3': 'Proyecto Gamma'
    };
    return proyectos[id] || 'Desconocido';
  }

  getNombreResponsable(id: string): string {
    const responsables: { [key: string]: string } = {
      '1': 'Juan Pérez',
      '2': 'María García',
      '3': 'Carlos López',
      '4': 'Ana Ruiz'
    };
    return responsables[id] || 'Desconocido';
  }

  getClaseEstado(estado: string): string {
    const clases: { [key: string]: string } = {
      'pendiente': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      'en-progreso': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      'completada': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      'retrasada': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    };
    return clases[estado] || '';
  }

  getTextoEstado(estado: string): string {
    const textos: { [key: string]: string } = {
      'pendiente': 'Pendiente',
      'en-progreso': 'En progreso',
      'completada': 'Completada',
      'retrasada': 'Retrasada'
    };
    return textos[estado] || estado;
  }
}
