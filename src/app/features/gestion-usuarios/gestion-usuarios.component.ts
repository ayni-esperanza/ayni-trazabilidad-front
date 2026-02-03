import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Subject,
  takeUntil,
  finalize,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';
import { GestionUsuariosService } from './services/gestion-usuarios.service';
import {
  Usuario,
  Rol,
  EstadisticasUsuarios,
  UsuarioRequest,
  UsuarioResponse,
} from './models/usuario.model';
import {
  UsuarioFormModalComponent,
  UsuarioFormData,
} from './components/usuario-form-modal/usuario-form-modal.component';
import { ModalCredencialesComponent } from './components/modal-credenciales/modal-credenciales.component';
import {
  PaginacionComponent,
  PaginacionConfig,
  CambioPaginaEvent,
} from '../../shared/components/paginacion/paginacion.component';

interface Filtros {
  busqueda: string;
  rol: string;
}

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UsuarioFormModalComponent,
    ModalCredencialesComponent,
    PaginacionComponent,
  ],
  templateUrl: './gestion-usuarios.component.html',
  styleUrls: ['./gestion-usuarios.component.css'],
})
export class GestionUsuariosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private busqueda$ = new Subject<string>();

  // Estados de carga
  cargando = false;
  cargandoEstadisticas = false;
  guardando = false;
  error: string | null = null;

  // Datos
  usuarios: Usuario[] = [];
  roles: Rol[] = [];

  // Estadísticas
  estadisticas: EstadisticasUsuarios = {
    totalUsuarios: 0,
    administradores: 0,
    ingenieros: 0,
    usuariosActivos: 0,
  };

  // Filtros
  filtros: Filtros = {
    busqueda: '',
    rol: '',
  };

  // Paginación
  paginacion: PaginacionConfig = {
    paginaActual: 0,
    porPagina: 100,
    totalElementos: 0,
    totalPaginas: 0,
  };

  // Modal
  mostrarModal = false;
  usuarioSeleccionado: Usuario | null = null;

  // Modal de credenciales
  mostrarModalCredenciales = false;
  usuarioCreado: UsuarioResponse | null = null;
  passwordGenerado: string = '';

  constructor(private usuariosService: GestionUsuariosService) {}

  ngOnInit(): void {
    this.configurarBusquedaDebounce();
    this.cargarDatosIniciales();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== CONFIGURACIÓN ====================

  private configurarBusquedaDebounce(): void {
    this.busqueda$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.paginacion.paginaActual = 0;
        this.cargarUsuarios();
      });
  }

  // ==================== CARGA DE DATOS ====================

  private cargarDatosIniciales(): void {
    this.cargarRoles();
    this.cargarUsuarios();
    this.cargarEstadisticas();
  }

  private cargarRoles(): void {
    this.usuariosService
      .obtenerRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles) => {
          this.roles = roles;
        },
        error: (err) => {
          console.error('Error al cargar roles:', err);
        },
      });
  }

  cargarUsuarios(): void {
    this.cargando = true;
    this.error = null;

    const params: any = {
      page: this.paginacion.paginaActual,
      size: this.paginacion.porPagina,
    };

    // Solo agregar parámetros si tienen valor
    if (this.filtros.busqueda) {
      params.search = this.filtros.busqueda;
    }

    if (this.filtros.rol) {
      params.rolId = parseInt(this.filtros.rol);
    }

    this.usuariosService
      .obtenerUsuarios(params)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.cargando = false)),
      )
      .subscribe({
        next: (response) => {
          this.usuarios = response.content;
          this.paginacion.totalElementos = response.totalElements;
          this.paginacion.totalPaginas = response.totalPages;
        },
        error: (err) => {
          this.error =
            'Error al cargar usuarios. Por favor, intente nuevamente.';
          console.error('Error al cargar usuarios:', err);
        },
      });
  }

  cargarEstadisticas(): void {
    this.cargandoEstadisticas = true;

    this.usuariosService
      .obtenerEstadisticas()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.cargandoEstadisticas = false)),
      )
      .subscribe({
        next: (stats) => {
          this.estadisticas = stats;
        },
        error: (err) => {
          console.error('Error al cargar estadísticas:', err);
        },
      });
  }

  // ==================== FILTROS ====================

  onBusquedaChange(): void {
    this.busqueda$.next(this.filtros.busqueda);
  }

  onRolChange(): void {
    this.paginacion.paginaActual = 0;
    this.cargarUsuarios();
  }

  limpiarFiltros(): void {
    this.filtros = { busqueda: '', rol: '' };
    this.paginacion.paginaActual = 0;
    this.cargarUsuarios();
  }

  // ==================== PAGINACIÓN ====================

  onCambioPagina(evento: CambioPaginaEvent): void {
    this.paginacion.paginaActual = evento.pagina;
    this.paginacion.porPagina = evento.porPagina;
    this.cargarUsuarios();
  }

  // ==================== UTILIDADES ====================

  getRolClasses(rolNombre: string): string {
    const nombre = rolNombre.toUpperCase();
    switch (nombre) {
      case 'ASISTENTE':
        return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
      case 'GERENTE':
        return 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300';
      case 'AYUDANTE':
        return 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200';
      case 'INGENIERO':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300';
      case 'ADMINISTRADOR':
        return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200';
    }
  }

  // ==================== MODAL CREAR/EDITAR ====================

  abrirModalNuevoUsuario(): void {
    this.usuarioSeleccionado = null;
    this.mostrarModal = true;
  }

  seleccionarUsuario(usuario: Usuario): void {
    this.usuarioSeleccionado = usuario;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.usuarioSeleccionado = null;
  }

  onGuardarUsuario(formData: UsuarioFormData): void {
    this.guardando = true;

    const request: UsuarioRequest = {
      nombre: formData.nombre,
      apellido: formData.apellido,
      username: formData.username,
      email: formData.email,
      telefono: formData.telefono,
      cargo: formData.cargo,
      area: formData.area,
      rolId: formData.rolId!,
      activo: formData.activo,
      foto: formData.foto,
      password: undefined, // No enviar password, se generará automáticamente
    };

    if (formData.id) {
      // Actualizar usuario existente
      this.usuariosService
        .actualizarUsuario(formData.id, request)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.guardando = false)),
        )
        .subscribe({
          next: () => {
            this.cerrarModal();
            this.cargarUsuarios();
            this.cargarEstadisticas();
          },
          error: (err) => {
            console.error('Error al guardar usuario:', err);
            alert(
              'Error al guardar el usuario. Por favor, intente nuevamente.',
            );
          },
        });
    } else {
      // Crear nuevo usuario
      this.usuariosService
        .crearUsuario(request)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.guardando = false)),
        )
        .subscribe({
          next: (response) => {
            this.cerrarModal();
            this.usuarioCreado = response.usuario;
            this.passwordGenerado = response.passwordGenerado;
            this.mostrarModalCredenciales = true;
            this.cargarUsuarios();
            this.cargarEstadisticas();
          },
          error: (err) => {
            console.error('Error al guardar usuario:', err);
            alert(
              'Error al guardar el usuario. Por favor, intente nuevamente.',
            );
          },
        });
    }
  }

  onEliminarUsuario(id: number): void {
    this.usuariosService
      .eliminarUsuario(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarUsuarios();
          this.cargarEstadisticas();
        },
        error: (err) => {
          console.error('Error al eliminar usuario:', err);
          alert('Error al eliminar el usuario. Por favor, intente nuevamente.');
        },
      });
  }

  cerrarModalCredenciales(): void {
    this.mostrarModalCredenciales = false;
    this.usuarioCreado = null;
    this.passwordGenerado = '';
  }
}
