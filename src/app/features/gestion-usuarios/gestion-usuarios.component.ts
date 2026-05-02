import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Subject,
  forkJoin,
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
import {
  ConfirmDeleteModalComponent,
  ConfirmDeleteConfig,
} from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { VideoTutorialComponent } from '../../shared/components/video-tutorial/video-tutorial.component';

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
    ConfirmDeleteModalComponent,
    VideoTutorialComponent,
  ],
  templateUrl: './gestion-usuarios.component.html',
  styleUrls: ['./gestion-usuarios.component.css'],
})
export class GestionUsuariosComponent implements OnInit, OnDestroy {
  private readonly rolesPermitidos = new Set(['ADMINISTRADOR', 'INGENIERO', 'CONTADOR']);
  private destroy$ = new Subject<void>();
  private busqueda$ = new Subject<string>();
  rolDropdownAbierto = false;

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

  // Estadísticas filtradas (calculadas en el cliente)
  estadisticasFiltradas: EstadisticasUsuarios = {
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
  mensajeErrorGuardadoUsuario: string | null = null;
  erroresGuardadoUsuarioPorCampo: Record<string, string> = {};

  // Modal de credenciales
  mostrarModalCredenciales = false;
  usuarioCreado: UsuarioResponse | null = null;
  passwordGenerado: string = '';

  // Modal de confirmación de eliminación
  mostrarModalEliminar = false;
  eliminando = false;
  usuarioAEliminar: Usuario | null = null;
  usuariosSeleccionados = new Set<number>();
  deleteConfig: ConfirmDeleteConfig = {};
  mostrarModalErrorEliminar = false;
  deleteErrorConfig: ConfirmDeleteConfig = {};

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
          this.roles = (roles || []).filter((rol) => this.rolesPermitidos.has((rol?.nombre || '').toUpperCase()));
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
          const idsVisibles = new Set(this.usuarios.map((u) => u.id));
          this.usuariosSeleccionados.forEach((id) => {
            if (!idsVisibles.has(id)) {
              this.usuariosSeleccionados.delete(id);
            }
          });
          this.paginacion.totalElementos = response.totalElements;
          this.paginacion.totalPaginas = response.totalPages;
          this.calcularEstadisticasFiltradas();
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
          this.estadisticasFiltradas = { ...stats };
        },
        error: (err) => {
          console.error('Error al cargar estadísticas:', err);
        },
      });
  }

  calcularEstadisticasFiltradas(): void {
    if (!this.tieneFiltrosActivos()) {
      this.estadisticasFiltradas = { ...this.estadisticas };
      return;
    }

    // Calcular estadísticas basadas en los usuarios filtrados actuales
    this.estadisticasFiltradas = {
      totalUsuarios: this.usuarios.length,
      administradores: this.usuarios.filter(u => 
        u.roles.some(r => r.nombre.toUpperCase() === 'ADMINISTRADOR')
      ).length,
      ingenieros: this.usuarios.filter(u => 
        u.roles.some(r => r.nombre.toUpperCase() === 'INGENIERO')
      ).length,
      usuariosActivos: this.usuarios.filter(u => u.activo).length,
    };
  }

  tieneFiltrosActivos(): boolean {
    return !!(this.filtros.busqueda.trim() || this.filtros.rol);
  }

  // ==================== FILTROS ====================

  onBusquedaChange(): void {
    this.busqueda$.next(this.filtros.busqueda);
  }

  onRolChange(): void {
    this.cerrarRolDropdown();
    this.paginacion.paginaActual = 0;
    this.cargarUsuarios();
  }

  abrirRolDropdown(): void {
    this.rolDropdownAbierto = true;
  }

  cerrarRolDropdown(): void {
    this.rolDropdownAbierto = false;
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
      case 'INGENIERO':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300';
      case 'CONTADOR':
        return 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300';
      case 'ADMINISTRADOR':
        return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200';
    }
  }

  // ==================== MODAL CREAR/EDITAR ====================

  abrirModalNuevoUsuario(): void {
    this.usuarioSeleccionado = null;
    this.mensajeErrorGuardadoUsuario = null;
    this.erroresGuardadoUsuarioPorCampo = {};
    this.mostrarModal = true;
  }

  seleccionarUsuario(usuario: Usuario): void {
    this.usuarioSeleccionado = usuario;
    this.mensajeErrorGuardadoUsuario = null;
    this.erroresGuardadoUsuarioPorCampo = {};
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.usuarioSeleccionado = null;
    this.mensajeErrorGuardadoUsuario = null;
    this.erroresGuardadoUsuarioPorCampo = {};
  }

  onGuardarUsuario(formData: UsuarioFormData): void {
    this.guardando = true;
    this.mensajeErrorGuardadoUsuario = null;
    this.erroresGuardadoUsuarioPorCampo = {};

    const request: UsuarioRequest = {
      nombre: formData.nombre,
      apellido: formData.apellido,
      username: formData.username,
      email: formData.email,
      telefono: formData.telefono,
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
            this.erroresGuardadoUsuarioPorCampo = this.obtenerErroresGuardadoPorCampo(err);
            this.mensajeErrorGuardadoUsuario = Object.keys(this.erroresGuardadoUsuarioPorCampo).length > 0
              ? 'Revisa los campos marcados para poder guardar los cambios.'
              : this.obtenerMensajeErrorGuardado(err);
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
            this.erroresGuardadoUsuarioPorCampo = this.obtenerErroresGuardadoPorCampo(err);
            this.mensajeErrorGuardadoUsuario = Object.keys(this.erroresGuardadoUsuarioPorCampo).length > 0
              ? 'Revisa los campos marcados para poder crear el usuario.'
              : this.obtenerMensajeErrorGuardado(err);
          },
        });
    }
  }

  private obtenerErroresGuardadoPorCampo(err: any): Record<string, string> {
    const resultado: Record<string, string> = {};
    const payload = err?.error;

    const normalizarCampo = (campoRaw: string): string => {
      const campo = String(campoRaw || '').trim().toLowerCase();
      if (campo === 'rol' || campo === 'rolid' || campo === 'rol_id') return 'rolId';
      if (campo === 'usuario' || campo === 'user' || campo === 'nombreusuario') return 'username';
      return campoRaw;
    };

    const asignar = (campoRaw: string, mensajeRaw: string): void => {
      const campo = normalizarCampo(campoRaw);
      const mensaje = String(mensajeRaw || '').trim();
      if (!campo || !mensaje) return;
      resultado[campo] = mensaje;
    };

    if (Array.isArray(payload?.errors)) {
      for (const item of payload.errors) {
        asignar(item?.field || item?.campo || '', item?.defaultMessage || item?.message || item?.mensaje || 'Dato inválido');
      }
    }

    const erroresObjeto = payload?.errors && typeof payload.errors === 'object' && !Array.isArray(payload.errors)
      ? payload.errors
      : payload?.fieldErrors && typeof payload.fieldErrors === 'object'
        ? payload.fieldErrors
        : null;

    if (erroresObjeto) {
      for (const [campo, mensaje] of Object.entries(erroresObjeto)) {
        asignar(campo, Array.isArray(mensaje) ? String(mensaje[0] || '') : String(mensaje || ''));
      }
    }

    const backendMessage = String(
      payload?.message ||
      payload?.mensaje ||
      err?.message ||
      ''
    ).toLowerCase();

    if (!Object.keys(resultado).length && backendMessage) {
      if (backendMessage.includes('email') || backendMessage.includes('correo')) {
        resultado['email'] = 'El correo electrónico ya está en uso o no es válido.';
      }
      if (backendMessage.includes('username') || backendMessage.includes('usuario')) {
        resultado['username'] = 'El nombre de usuario ya está en uso o no es válido.';
      }
      if (backendMessage.includes('area') || backendMessage.includes('área')) {
        resultado['area'] = 'El área seleccionada no es válida.';
      }
      if (backendMessage.includes('rol')) {
        resultado['rolId'] = 'Debe seleccionar un rol válido.';
      }
    }

    return resultado;
  }

  private obtenerMensajeErrorGuardado(err: any): string {
    const backendMessage = String(
      err?.error?.message ||
      err?.error?.mensaje ||
      err?.message ||
      ''
    ).trim();

    if (backendMessage) {
      return `No se pudo guardar el usuario: ${backendMessage}`;
    }

    return 'No se pudo guardar el usuario. Verifica los datos e inténtalo nuevamente.';
  }

  private obtenerMensajeErrorEliminacion(err: any, ids: number[]): string {
    const backendMessage = String(
      err?.error?.message ||
      err?.error?.mensaje ||
      err?.message ||
      ''
    ).trim();

    const nombres = this.usuarios
      .filter((usuario) => ids.includes(usuario.id))
      .map((usuario) => `${usuario.nombre} ${usuario.apellido}`.trim())
      .filter((nombre) => nombre.length > 0);

    const listaNombres = nombres.length ? nombres.join(', ') : 'el/los usuario(s) seleccionado(s)';
    const backendLower = backendMessage.toLowerCase();
    const sugerenciaBackend = this.obtenerSugerenciaEliminacion(backendMessage);
    if (
      backendLower.includes('asign')
      || backendLower.includes('proyecto')
      || backendLower.includes('solicitud')
      || backendLower.includes('responsable')
    ) {
      const base = `No se pudo eliminar a ${listaNombres} porque esta asignado a un proyecto.`;
      return sugerenciaBackend ? `${base} ${sugerenciaBackend}` : base;
    }

    if (backendMessage) {
      return `No se pudo eliminar a ${listaNombres}: ${backendMessage}`;
    }

    return `No se pudo eliminar a ${listaNombres}. Por favor, intente nuevamente.`;
  }

  private obtenerSugerenciaEliminacion(mensaje: string): string | null {
    if (!mensaje) return null;

    const sinId = mensaje.replace(/\b(id|ID)\s*\d+\b/g, '').trim();
    const sinPrefijo = sinId.replace(/^No se puede eliminar[^.]*\.?/i, '').trim();
    const sugerencia = sinPrefijo.replace(/^porque\s+/i, '').trim();

    if (!sugerencia) return null;
    return sugerencia.endsWith('.') ? sugerencia : `${sugerencia}.`;
  }

  onEliminarUsuario(id: number): void {
    const usuario = this.usuarios.find((u) => u.id === id);
    if (usuario) {
      this.usuarioAEliminar = usuario;
      this.deleteConfig = {
        itemNombre: usuario.nombre || usuario.email,
      };
      this.mostrarModalEliminar = true;
    }
  }

  toggleSeleccionUsuario(id: number, event: Event): void {
    event.stopPropagation();
    if (this.usuariosSeleccionados.has(id)) {
      this.usuariosSeleccionados.delete(id);
    } else {
      this.usuariosSeleccionados.add(id);
    }
  }

  toggleSeleccionTodosUsuarios(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.usuarios.forEach((usuario) => this.usuariosSeleccionados.add(usuario.id));
    } else {
      this.usuariosSeleccionados.clear();
    }
  }

  get todosUsuariosSeleccionados(): boolean {
    return this.usuarios.length > 0 && this.usuarios.every((usuario) => this.usuariosSeleccionados.has(usuario.id));
  }

  get hayUsuariosSeleccionados(): boolean {
    return this.usuariosSeleccionados.size > 0;
  }

  iniciarEliminarSeleccionados(): void {
    if (!this.hayUsuariosSeleccionados) return;

    this.usuarioAEliminar = null;
    this.deleteConfig = {
      titulo: 'Eliminar usuarios',
      cantidadElementos: this.usuariosSeleccionados.size,
      tipoElemento: this.usuariosSeleccionados.size === 1 ? 'usuario' : 'usuarios',
      textoConfirmar: 'Eliminar'
    };
    this.mostrarModalEliminar = true;
  }

  confirmarEliminacion(): void {
    const ids = this.usuarioAEliminar
      ? [this.usuarioAEliminar.id]
      : Array.from(this.usuariosSeleccionados);

    if (!ids.length) return;

    this.eliminando = true;
    forkJoin(ids.map((id) => this.usuariosService.eliminarUsuario(id)))
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.eliminando = false))
      )
      .subscribe({
        next: () => {
          this.usuariosSeleccionados.clear();
          this.cancelarEliminacion();
          this.cerrarModal();
          this.cargarUsuarios();
          this.cargarEstadisticas();
        },
        error: (err) => {
          console.error('Error al eliminar usuario(s):', err);
          this.cancelarEliminacion();
          this.deleteErrorConfig = {
            titulo: 'No se pudo eliminar',
            mensaje: this.obtenerMensajeErrorEliminacion(err, ids),
            textoCancelar: 'Cerrar',
            soloCerrar: true,
            ocultarAdvertencia: true
          };
          this.mostrarModalErrorEliminar = true;
        },
      });
  }

  cancelarEliminacion(): void {
    this.mostrarModalEliminar = false;
    this.usuarioAEliminar = null;
  }

  cerrarModalCredenciales(): void {
    this.mostrarModalCredenciales = false;
    this.usuarioCreado = null;
    this.passwordGenerado = '';
  }

  cerrarModalErrorEliminacion(): void {
    this.mostrarModalErrorEliminar = false;
    this.deleteErrorConfig = {};
  }
}
