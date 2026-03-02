import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { HttpService } from '../../../core/services/http.service';
import { 
  ProyectoEnCurso, 
  TareaEncargado, 
  Gastos, 
  DatoGrafico, 
  ResumenTablero,
  GastoProyecto 
} from '../models/tablero.model';

@Injectable({
  providedIn: 'root'
})
export class TableroControlService {
  
  private readonly API_URL = '/tablero-control';

  constructor(private http: HttpService) { }

  // ==================== MÉTODOS PARA BACKEND ====================
  
  /**
   * Obtiene el resumen completo del tablero de control
   * @returns Observable con todos los datos del tablero
   */
  obtenerResumenTablero(): Observable<ResumenTablero> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<ResumenTablero>(`${this.API_URL}/resumen`);
    
    // Datos de ejemplo para desarrollo
    return of(this.getDatosMock()).pipe(delay(300));
  }

  /**
   * Obtiene el total de proyectos finalizados
   */
  obtenerProyectosFinalizados(): Observable<number> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<number>(`${this.API_URL}/proyectos-finalizados`);
    
    return of(20).pipe(delay(100));
  }

  /**
   * Obtiene el total de proyectos activos
   */
  obtenerProyectosActivos(): Observable<number> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<number>(`${this.API_URL}/proyectos-activos`);
    
    return of(15).pipe(delay(100));
  }

  /**
   * Obtiene los gastos (hoy, ayer, mes)
   */
  obtenerGastos(): Observable<Gastos> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<Gastos>(`${this.API_URL}/gastos`);
    
    return of({
      mes: 312000,
      hoy: 3200,
      ayer: 4100
    }).pipe(delay(100));
  }

  /**
   * Obtiene los datos para el gráfico de proyectos finalizados por mes
   */
  obtenerDatosGraficoFinalizados(): Observable<DatoGrafico[]> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<DatoGrafico[]>(`${this.API_URL}/grafico/finalizados`);
    
    return of([
      { name: 'Ene', value: 3 },
      { name: 'Feb', value: 2 },
      { name: 'Mar', value: 4 },
      { name: 'Abr', value: 3 },
      { name: 'May', value: 5 },
      { name: 'Jun', value: 2 },
      { name: 'Jul', value: 3 },
      { name: 'Ago', value: 1 },
      { name: 'Sep', value: 8 },
      { name: 'Oct', value: 2 },
      { name: 'Nov', value: 1 },
      { name: 'Dic', value: 0 }
    ]).pipe(delay(100));
  }

  /**
   * Obtiene los datos para el gráfico de proyectos activos por mes
   */
  obtenerDatosGraficoActivos(): Observable<DatoGrafico[]> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<DatoGrafico[]>(`${this.API_URL}/grafico/activos`);
    
    return of([
      { name: 'Ene', value: 5 },
      { name: 'Feb', value: 7 },
      { name: 'Mar', value: 6 },
      { name: 'Abr', value: 8 },
      { name: 'May', value: 10 },
      { name: 'Jun', value: 9 },
      { name: 'Jul', value: 11 },
      { name: 'Ago', value: 12 },
      { name: 'Sep', value: 14 },
      { name: 'Oct', value: 13 },
      { name: 'Nov', value: 15 },
      { name: 'Dic', value: 15 }
    ]).pipe(delay(100));
  }

  /**
   * Obtiene los datos para el gráfico de gastos por mes
   */
  obtenerDatosGraficoGastos(): Observable<DatoGrafico[]> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<DatoGrafico[]>(`${this.API_URL}/grafico/gastos`);
    
    return of([
      { name: 'Ene', value: 250 },
      { name: 'Feb', value: 280 },
      { name: 'Mar', value: 320 },
      { name: 'Abr', value: 290 },
      { name: 'May', value: 350 },
      { name: 'Jun', value: 310 },
      { name: 'Jul', value: 340 },
      { name: 'Ago', value: 300 },
      { name: 'Sep', value: 380 },
      { name: 'Oct', value: 330 },
      { name: 'Nov', value: 312 },
      { name: 'Dic', value: 0 }
    ]).pipe(delay(100));
  }

  /**
   * Obtiene la lista de proyectos en curso
   */
  obtenerProyectosEnCurso(): Observable<ProyectoEnCurso[]> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<ProyectoEnCurso[]>(`${this.API_URL}/proyectos-en-curso`);
    
    return of([
      { id: 1, proyecto: 'Línea Producción Textil', empresa: 'HidroPerú Ingeniería S.A.', responsable: 'Juan Pérez', etapa: 'Ingeniería', fechas: '15/01 - 30/03', estado: 'En Proceso' as const, mes: 'Ene', fechaCreacion: new Date('2026-01-15'), gastoTotal: 45000 },
      { id: 2, proyecto: 'Sistema Ventilación Industrial', empresa: 'Industrias del Sur S.R.L.', responsable: 'María García', etapa: 'Instalación', fechas: '20/01 - 15/04', estado: 'En Proceso' as const, mes: 'Ene', fechaCreacion: new Date('2026-01-20'), gastoTotal: 32000 },
      { id: 3, proyecto: 'Diseño Puente Vehicular', empresa: 'Textilera del Pacífico S.A.C.', responsable: 'Carlos López', etapa: 'Cálculo Estructural', fechas: '01/02 - 28/02', estado: 'Completado' as const, mes: 'Feb', fechaCreacion: new Date('2026-02-01'), gastoTotal: 28000 },
      { id: 4, proyecto: 'Mantenimiento Maquinaria', empresa: 'Industrias del Sur S.R.L.', responsable: 'Ana Martínez', etapa: 'Diagnóstico', fechas: '05/02 - 20/03', estado: 'En Proceso' as const, mes: 'Feb', fechaCreacion: new Date('2026-02-05'), gastoTotal: 15500 },
      { id: 5, proyecto: 'Sistema Automatización', empresa: 'Industrias del Sur S.R.L.', responsable: 'Pedro Sánchez', etapa: 'Diseño', fechas: '10/02 - 30/04', estado: 'Pendiente' as const, mes: 'Feb', fechaCreacion: new Date('2026-02-10'), gastoTotal: 22000 }
    ]).pipe(delay(100));
  }

  /**
   * Obtiene la lista de tareas de los encargados
   */
  obtenerTareasEncargados(): Observable<TareaEncargado[]> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<TareaEncargado[]>(`${this.API_URL}/tareas-encargados`);
    
    return of([
      { id: 1, responsable: 'Juan Pérez', tarea: 'Diseño de layout de planta', proyecto: 'Línea Producción Textil', proyectoId: 1, etapa: 'Ingeniería', fechas: '15/01 - 25/01', estado: 'En Proceso' as const },
      { id: 2, responsable: 'Juan Pérez', tarea: 'Selección de equipos', proyecto: 'Línea Producción Textil', proyectoId: 1, etapa: 'Ingeniería', fechas: '26/01 - 30/01', estado: 'Completado' as const },
      { id: 3, responsable: 'María García', tarea: 'Instalación de ductos', proyecto: 'Sistema Ventilación Industrial', proyectoId: 2, etapa: 'Instalación', fechas: '20/01 - 28/01', estado: 'Completado' as const },
      { id: 4, responsable: 'María García', tarea: 'Montaje de extractores', proyecto: 'Sistema Ventilación Industrial', proyectoId: 2, etapa: 'Instalación', fechas: '29/01 - 10/02', estado: 'Retrasado' as const },
      { id: 5, responsable: 'Carlos López', tarea: 'Cálculo de cargas', proyecto: 'Diseño Puente Vehicular', proyectoId: 3, etapa: 'Cálculo Estructural', fechas: '01/02 - 15/02', estado: 'Completado' as const }
    ]).pipe(delay(100));
  }

  /**
   * Obtiene los gastos detallados por proyecto
   */
  obtenerGastosProyectos(): Observable<GastoProyecto[]> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.get<GastoProyecto[]>(`${this.API_URL}/gastos-proyectos`);
    
    return of(this.getDatosMock().gastosProyectos).pipe(delay(100));
  }

  // ==================== DATOS MOCK PARA DESARROLLO ====================
  
  private getDatosMock(): ResumenTablero {
    // ─────────────────────────────────────────────────────────────────────────
    // PROYECTOS: el campo `mes` indica el mes en que fue CREADO/REGISTRADO.
    // Finalizados (estado='Completado'): Ene=2, Feb=3, Mar=4, Abr=2, May=3, Jun=2, Jul=2, Ago=2, Sep=3, Oct=2, Nov=1 → total=26
    // Activos (En Proceso | Pendiente): Ene=3, Feb=4, Mar=3, Abr=2, May=3, Jun=2, Jul=2, Ago=2, Sep=2, Oct=2, Nov=2, Dic=2 → total=29
    // El gráfico de barras/línea/pie usa exactamente esos conteos por mes.
    // ─────────────────────────────────────────────────────────────────────────

    const proyectosEnCurso: ProyectoEnCurso[] = [
      // ── ENERO (Finalizados=2, Activos=3) ──────────────────────────────────
      { id: 1,  proyecto: 'Planta Tratamiento Agua Residual', empresa: 'HidroPerú Ingeniería S.A.', responsable: 'Luis Torres',     etapa: 'Entrega Final',          fechas: '03/01 - 28/01', estado: 'Completado',  mes: 'Ene', fechaCreacion: new Date('2026-01-03'),  gastoTotal: 52000 },
      { id: 2,  proyecto: 'Sistema Transportador de Carga', empresa: 'Industrias del Sur S.R.L.', responsable: 'Rosa Díaz',       etapa: 'Pruebas y Validación',   fechas: '10/01 - 31/01', estado: 'Completado',  mes: 'Ene', fechaCreacion: new Date('2026-01-10'),  gastoTotal: 38000 },
      { id: 3,  proyecto: 'Línea Producción Textil A', empresa: 'Textilera del Pacífico S.A.C.', responsable: 'Juan Pérez',      etapa: 'Ingeniería',             fechas: '15/01 - 30/03', estado: 'En Proceso',  mes: 'Ene', fechaCreacion: new Date('2026-01-15'),  gastoTotal: 45000 },
      { id: 4,  proyecto: 'Sistema Ventilación Industrial', empresa: 'Industrias del Sur S.R.L.', responsable: 'María García',    etapa: 'Instalación',            fechas: '20/01 - 15/04', estado: 'En Proceso',  mes: 'Ene', fechaCreacion: new Date('2026-01-20'),  gastoTotal: 32000 },
      { id: 5,  proyecto: 'Automatización Almacén Central', empresa: 'Industrias del Sur S.R.L.', responsable: 'Pedro Sánchez',   etapa: 'Diseño',                 fechas: '22/01 - 20/03', estado: 'Pendiente',   mes: 'Ene', fechaCreacion: new Date('2026-01-22'),  gastoTotal: 21000 },

      // ── FEBRERO (Finalizados=3, Activos=4) ────────────────────────────────
      { id: 6,  proyecto: 'Diseño Puente Vehicular Ruta 5', empresa: 'Constructora Ayni S.A.C.', responsable: 'Carlos López',    etapa: 'Entrega Final',          fechas: '01/02 - 28/02', estado: 'Completado',  mes: 'Feb', fechaCreacion: new Date('2026-02-01'),  gastoTotal: 28000 },
      { id: 7,  proyecto: 'Rehabilitación Red Eléctrica Sur', empresa: 'EnergySol Perú S.A.', responsable: 'Elena Vargas',    etapa: 'Inspección Final',       fechas: '03/02 - 25/02', estado: 'Completado',  mes: 'Feb', fechaCreacion: new Date('2026-02-03'),  gastoTotal: 19500 },
      { id: 8,  proyecto: 'Cimentaciones Edificio Corporativo B', empresa: 'Corporación Inmobiliaria Lima', responsable: 'Hugo Ríos',       etapa: 'Cierre Técnico',         fechas: '05/02 - 27/02', estado: 'Completado',  mes: 'Feb', fechaCreacion: new Date('2026-02-05'),  gastoTotal: 67000 },
      { id: 9,  proyecto: 'Mantenimiento Maquinaria Pesada', empresa: 'Minera Andina Perú S.A.', responsable: 'Ana Martínez',    etapa: 'Diagnóstico',            fechas: '05/02 - 20/03', estado: 'En Proceso',  mes: 'Feb', fechaCreacion: new Date('2026-02-05'),  gastoTotal: 15500 },
      { id: 10, proyecto: 'Sistema Automatización Línea 2', empresa: 'Industrias del Sur S.R.L.', responsable: 'Pedro Sánchez',   etapa: 'Programación PLC',       fechas: '10/02 - 30/04', estado: 'En Proceso',  mes: 'Feb', fechaCreacion: new Date('2026-02-10'),  gastoTotal: 22000 },
      { id: 11, proyecto: 'Instalación Paneles Solares Planta A', empresa: 'EnergySol Perú S.A.', responsable: 'Sofía Mendoza',   etapa: 'Montaje',                fechas: '12/02 - 15/04', estado: 'En Proceso',  mes: 'Feb', fechaCreacion: new Date('2026-02-12'),  gastoTotal: 41000 },
      { id: 12, proyecto: 'Ampliación Red Hídrica Zona Norte', empresa: 'HidroPerú Ingeniería S.A.', responsable: 'Jorge Castillo',  etapa: 'Excavación',             fechas: '15/02 - 30/05', estado: 'Pendiente',   mes: 'Feb', fechaCreacion: new Date('2026-02-15'),  gastoTotal: 33000 },

      // ── MARZO (Finalizados=4, Activos=3) ──────────────────────────────────
      { id: 13, proyecto: 'Modernización Subestación Eléctrica', empresa: 'EnergySol Perú S.A.', responsable: 'Elena Vargas',    etapa: 'Comisionamiento',        fechas: '02/03 - 28/03', estado: 'Completado',  mes: 'Mar', fechaCreacion: new Date('2026-03-02'),  gastoTotal: 55000 },
      { id: 14, proyecto: 'Pavimentación Acceso Industrial km 12', empresa: 'Constructora Ayni S.A.C.', responsable: 'Hugo Ríos',       etapa: 'Carpeta Asfáltica',      fechas: '04/03 - 29/03', estado: 'Completado',  mes: 'Mar', fechaCreacion: new Date('2026-03-04'),  gastoTotal: 48000 },
      { id: 15, proyecto: 'Instalación Compresores Alta Presión', empresa: 'Minera Andina Perú S.A.', responsable: 'Luis Torres',     etapa: 'Pruebas Hidráulicas',    fechas: '05/03 - 31/03', estado: 'Completado',  mes: 'Mar', fechaCreacion: new Date('2026-03-05'),  gastoTotal: 37000 },
      { id: 16, proyecto: 'Remodelación Almacén Logístico Norte', empresa: 'AgroExport Norte S.A.C.', responsable: 'Rosa Díaz',       etapa: 'Pintura y Acabados',     fechas: '08/03 - 30/03', estado: 'Completado',  mes: 'Mar', fechaCreacion: new Date('2026-03-08'),  gastoTotal: 24000 },
      { id: 17, proyecto: 'Red Contra Incendios Edificio C', empresa: 'Corporación Inmobiliaria Lima', responsable: 'Sofía Mendoza',   etapa: 'Instalación Tuberías',   fechas: '10/03 - 15/05', estado: 'En Proceso',  mes: 'Mar', fechaCreacion: new Date('2026-03-10'),  gastoTotal: 29000 },
      { id: 18, proyecto: 'Sistema SCADA Planta Minera', empresa: 'Minera Andina Perú S.A.', responsable: 'Juan Pérez',      etapa: 'Configuración HMI',      fechas: '12/03 - 30/06', estado: 'En Proceso',  mes: 'Mar', fechaCreacion: new Date('2026-03-12'),  gastoTotal: 63000 },
      { id: 19, proyecto: 'Diseño Estructural Galpón Industrial', empresa: 'Constructora Ayni S.A.C.', responsable: 'Carlos López',    etapa: 'Modelado SAP2000',       fechas: '15/03 - 20/05', estado: 'Pendiente',   mes: 'Mar', fechaCreacion: new Date('2026-03-15'),  gastoTotal: 18000 },

      // ── ABRIL (Finalizados=2, Activos=2) ──────────────────────────────────
      { id: 20, proyecto: 'Rehabilitación Puente Peatonal Norte', empresa: 'Constructora Ayni S.A.C.', responsable: 'Hugo Ríos',       etapa: 'Entrega Final',          fechas: '01/04 - 28/04', estado: 'Completado',  mes: 'Abr', fechaCreacion: new Date('2026-04-01'),  gastoTotal: 31000 },
      { id: 21, proyecto: 'Línea Producción Textil B', empresa: 'Textilera del Pacífico S.A.C.', responsable: 'María García',    etapa: 'Pruebas de Arranque',    fechas: '03/04 - 30/04', estado: 'Completado',  mes: 'Abr', fechaCreacion: new Date('2026-04-03'),  gastoTotal: 26000 },
      { id: 22, proyecto: 'Expansión Planta Farmacéutica', empresa: 'AgroExport Norte S.A.C.', responsable: 'Ana Martínez',    etapa: 'Validación GMP',         fechas: '05/04 - 30/06', estado: 'En Proceso',  mes: 'Abr', fechaCreacion: new Date('2026-04-05'),  gastoTotal: 88000 },
      { id: 23, proyecto: 'Sistema Gestión Energética Fábrica', empresa: 'EnergySol Perú S.A.', responsable: 'Pedro Sánchez',   etapa: 'Implementación',         fechas: '10/04 - 30/07', estado: 'Pendiente',   mes: 'Abr', fechaCreacion: new Date('2026-04-10'),  gastoTotal: 47000 },

      // ── MAYO (Finalizados=3, Activos=3) ───────────────────────────────────
      { id: 24, proyecto: 'Instalación Calderas Industriales', empresa: 'Industrias del Sur S.R.L.', responsable: 'Luis Torres',     etapa: 'Puesta en Marcha',       fechas: '02/05 - 30/05', estado: 'Completado',  mes: 'May', fechaCreacion: new Date('2026-05-02'),  gastoTotal: 42000 },
      { id: 25, proyecto: 'Mejora Red Fibra Óptica Planta', empresa: 'EnergySol Perú S.A.', responsable: 'Elena Vargas',    etapa: 'Certificación',          fechas: '04/05 - 29/05', estado: 'Completado',  mes: 'May', fechaCreacion: new Date('2026-05-04'),  gastoTotal: 15000 },
      { id: 26, proyecto: 'Muro de Contención Zona Alta', empresa: 'Constructora Ayni S.A.C.', responsable: 'Jorge Castillo',  etapa: 'Vaciado Final',          fechas: '06/05 - 31/05', estado: 'Completado',  mes: 'May', fechaCreacion: new Date('2026-05-06'),  gastoTotal: 39000 },
      { id: 27, proyecto: 'HVAC Edificio Administrativo', empresa: 'Corporación Inmobiliaria Lima', responsable: 'Rosa Díaz',       etapa: 'Balanceo de Caudales',   fechas: '08/05 - 30/07', estado: 'En Proceso',  mes: 'May', fechaCreacion: new Date('2026-05-08'),  gastoTotal: 34000 },
      { id: 28, proyecto: 'Planta Potabilizadora Módulo 3', empresa: 'HidroPerú Ingeniería S.A.', responsable: 'Sofía Mendoza',   etapa: 'Montaje Filtros',        fechas: '10/05 - 30/08', estado: 'En Proceso',  mes: 'May', fechaCreacion: new Date('2026-05-10'),  gastoTotal: 72000 },
      { id: 29, proyecto: 'Diseño Subestación Distribución 34.5kV', empresa: 'EnergySol Perú S.A.', responsable: 'Juan Pérez',      etapa: 'Ingeniería Básica',      fechas: '12/05 - 30/09', estado: 'Pendiente',   mes: 'May', fechaCreacion: new Date('2026-05-12'),  gastoTotal: 25000 },

      // ── JUNIO (Finalizados=2, Activos=2) ──────────────────────────────────
      { id: 30, proyecto: 'Reparación Estructura Metálica Nave 4', empresa: 'Constructora Ayni S.A.C.', responsable: 'Carlos López',    etapa: 'Soldadura Final',        fechas: '01/06 - 27/06', estado: 'Completado',  mes: 'Jun', fechaCreacion: new Date('2026-06-01'),  gastoTotal: 27000 },
      { id: 31, proyecto: 'Actualización PLC Línea Bottling', empresa: 'AgroExport Norte S.A.C.', responsable: 'Ana Martínez',    etapa: 'Validación FAT',         fechas: '03/06 - 30/06', estado: 'Completado',  mes: 'Jun', fechaCreacion: new Date('2026-06-03'),  gastoTotal: 19000 },
      { id: 32, proyecto: 'Pavimentación Patio Maniobras Logística', empresa: 'Constructora Ayni S.A.C.', responsable: 'Hugo Ríos',       etapa: 'Subbase Granular',       fechas: '05/06 - 30/08', estado: 'En Proceso',  mes: 'Jun', fechaCreacion: new Date('2026-06-05'),  gastoTotal: 53000 },
      { id: 33, proyecto: 'Sistema Bombeo Contraincendios Zona B', empresa: 'HidroPerú Ingeniería S.A.', responsable: 'Luis Torres',     etapa: 'Prueba Hidrostática',    fechas: '10/06 - 30/09', estado: 'Pendiente',   mes: 'Jun', fechaCreacion: new Date('2026-06-10'),  gastoTotal: 31000 },

      // ── JULIO (Finalizados=2, Activos=2) ──────────────────────────────────
      { id: 34, proyecto: 'Aislamiento Térmico Tuberías Vapor', empresa: 'Industrias del Sur S.R.L.', responsable: 'Elena Vargas',    etapa: 'Entrega Final',          fechas: '01/07 - 30/07', estado: 'Completado',  mes: 'Jul', fechaCreacion: new Date('2026-07-01'),  gastoTotal: 22000 },
      { id: 35, proyecto: 'Instalación Grúa Puente 20T', empresa: 'Minera Andina Perú S.A.', responsable: 'Jorge Castillo',  etapa: 'Pruebas de Carga',       fechas: '05/07 - 31/07', estado: 'Completado',  mes: 'Jul', fechaCreacion: new Date('2026-07-05'),  gastoTotal: 46000 },
      { id: 36, proyecto: 'Ampliación Laboratorio Calidad', empresa: 'AgroExport Norte S.A.C.', responsable: 'Sofía Mendoza',   etapa: 'Acabados Interiores',    fechas: '08/07 - 30/09', estado: 'En Proceso',  mes: 'Jul', fechaCreacion: new Date('2026-07-08'),  gastoTotal: 38000 },
      { id: 37, proyecto: 'Reubicación Línea Producción Láctea', empresa: 'AgroExport Norte S.A.C.', responsable: 'María García',    etapa: 'Ingeniería de Detalle',  fechas: '10/07 - 30/10', estado: 'Pendiente',   mes: 'Jul', fechaCreacion: new Date('2026-07-10'),  gastoTotal: 29000 },

      // ── AGOSTO (Finalizados=2, Activos=2) ─────────────────────────────────
      { id: 38, proyecto: 'Sistema Monitoreo Ambiental Planta', empresa: 'Minera Andina Perú S.A.', responsable: 'Pedro Sánchez',   etapa: 'Comisionamiento',        fechas: '03/08 - 29/08', estado: 'Completado',  mes: 'Ago', fechaCreacion: new Date('2026-08-03'),  gastoTotal: 17000 },
      { id: 39, proyecto: 'Reforzamiento Pilares Puente Industrial', empresa: 'Constructora Ayni S.A.C.', responsable: 'Carlos López',    etapa: 'Entrega Final',          fechas: '05/08 - 31/08', estado: 'Completado',  mes: 'Ago', fechaCreacion: new Date('2026-08-05'),  gastoTotal: 44000 },
      { id: 40, proyecto: 'Diseño Red Distribución Gas Natural', empresa: 'EnergySol Perú S.A.', responsable: 'Juan Pérez',      etapa: 'Ingeniería Básica',      fechas: '08/08 - 30/11', estado: 'En Proceso',  mes: 'Ago', fechaCreacion: new Date('2026-08-08'),  gastoTotal: 35000 },
      { id: 41, proyecto: 'Automatización Envasado Bebidas', empresa: 'AgroExport Norte S.A.C.', responsable: 'Ana Martínez',    etapa: 'Programación Robots',    fechas: '12/08 - 30/11', estado: 'Pendiente',   mes: 'Ago', fechaCreacion: new Date('2026-08-12'),  gastoTotal: 58000 },

      // ── SEPTIEMBRE (Finalizados=3, Activos=2) ────────────────────────────
      { id: 42, proyecto: 'Impermeabilización Techo Almacén Sur', empresa: 'Corporación Inmobiliaria Lima', responsable: 'Rosa Díaz',       etapa: 'Entrega Final',          fechas: '01/09 - 26/09', estado: 'Completado',  mes: 'Sep', fechaCreacion: new Date('2026-09-01'),  gastoTotal: 12000 },
      { id: 43, proyecto: 'Instalación Compresor Atlas Copco 100HP', empresa: 'Industrias del Sur S.R.L.', responsable: 'Luis Torres',     etapa: 'Prueba de Operación',    fechas: '03/09 - 29/09', estado: 'Completado',  mes: 'Sep', fechaCreacion: new Date('2026-09-03'),  gastoTotal: 38000 },
      { id: 44, proyecto: 'Estudio Impacto Ambiental Sector 3', empresa: 'Minera Andina Perú S.A.', responsable: 'Elena Vargas',    etapa: 'Informe Final',          fechas: '05/09 - 30/09', estado: 'Completado',  mes: 'Sep', fechaCreacion: new Date('2026-09-05'),  gastoTotal: 21000 },
      { id: 45, proyecto: 'Ampliación Planta de Empaques', empresa: 'Industrias del Sur S.R.L.', responsable: 'Hugo Ríos',       etapa: 'Estructura Metálica',    fechas: '08/09 - 30/11', estado: 'En Proceso',  mes: 'Sep', fechaCreacion: new Date('2026-09-08'),  gastoTotal: 74000 },
      { id: 46, proyecto: 'Sistema Control Acceso Planta Principal', empresa: 'Corporación Inmobiliaria Lima', responsable: 'Jorge Castillo',  etapa: 'Cableado Estructurado',  fechas: '10/09 - 30/11', estado: 'Pendiente',   mes: 'Sep', fechaCreacion: new Date('2026-09-10'),  gastoTotal: 14000 },

      // ── OCTUBRE (Finalizados=2, Activos=2) ───────────────────────────────
      { id: 47, proyecto: 'Pintura Epóxica Piso Nave Producción', empresa: 'Industrias del Sur S.R.L.', responsable: 'Sofía Mendoza',   etapa: 'Entrega Final',          fechas: '01/10 - 25/10', estado: 'Completado',  mes: 'Oct', fechaCreacion: new Date('2026-10-01'),  gastoTotal: 9500  },
      { id: 48, proyecto: 'Desmontaje Línea Obsoleta Zona C', empresa: 'Industrias del Sur S.R.L.', responsable: 'Pedro Sánchez',   etapa: 'Limpieza y Cierre',      fechas: '03/10 - 28/10', estado: 'Completado',  mes: 'Oct', fechaCreacion: new Date('2026-10-03'),  gastoTotal: 11000 },
      { id: 49, proyecto: 'Diseño Nave Logística Ampliación', empresa: 'Constructora Ayni S.A.C.', responsable: 'María García',    etapa: 'Anteproyecto',           fechas: '06/10 - 30/01', estado: 'En Proceso',  mes: 'Oct', fechaCreacion: new Date('2026-10-06'),  gastoTotal: 43000 },
      { id: 50, proyecto: 'Instalación Bomba Centrífuga 350m³/h', empresa: 'HidroPerú Ingeniería S.A.', responsable: 'Juan Pérez',      etapa: 'Montaje Mecánico',       fechas: '08/10 - 28/02', estado: 'Pendiente',   mes: 'Oct', fechaCreacion: new Date('2026-10-08'),  gastoTotal: 26000 },

      // ── NOVIEMBRE (Finalizados=1, Activos=2) ─────────────────────────────
      { id: 51, proyecto: 'Actualización Firewall Industrial OT', empresa: 'Minera Andina Perú S.A.', responsable: 'Carlos López',    etapa: 'Entrega Final',          fechas: '03/11 - 28/11', estado: 'Completado',  mes: 'Nov', fechaCreacion: new Date('2026-11-03'),  gastoTotal: 16000 },
      { id: 52, proyecto: 'Sistema Riego Tecnificado Area Verde', empresa: 'AgroExport Norte S.A.C.', responsable: 'Rosa Díaz',       etapa: 'Tendido de Tuberías',    fechas: '05/11 - 28/02', estado: 'En Proceso',  mes: 'Nov', fechaCreacion: new Date('2026-11-05'),  gastoTotal: 8500  },
      { id: 53, proyecto: 'Diseño Muelle Descarga Materia Prima', empresa: 'Constructora Ayni S.A.C.', responsable: 'Luis Torres',     etapa: 'Ingeniería Básica',      fechas: '10/11 - 30/03', estado: 'Pendiente',   mes: 'Nov', fechaCreacion: new Date('2026-11-10'),  gastoTotal: 31000 },

      // ── DICIEMBRE (Finalizados=0, Activos=2) ─────────────────────────────
      { id: 54, proyecto: 'Iluminación LED Planta de Proceso', empresa: 'EnergySol Perú S.A.', responsable: 'Elena Vargas',    etapa: 'Montaje Luminarias',     fechas: '01/12 - 28/02', estado: 'En Proceso',  mes: 'Dic', fechaCreacion: new Date('2026-12-01'),  gastoTotal: 19000 },
      { id: 55, proyecto: 'Evaluación Estructural Torre Enfriamiento', empresa: 'Industrias del Sur S.R.L.', responsable: 'Hugo Ríos',       etapa: 'Inspección Visual',      fechas: '05/12 - 15/03', estado: 'Pendiente',   mes: 'Dic', fechaCreacion: new Date('2026-12-05'),  gastoTotal: 12000 },
    ];

    // ── Tareas asociadas a proyectos representativos ──────────────────────────
    const tareasEncargados: TareaEncargado[] = [
      // ══ PROYECTOS COMPLETADOS ══════════════════════════════════════════════
      // Proyecto 1 - Planta Tratamiento Agua Residual (completado Ene)
      { id: 1,  responsable: 'Luis Torres',    tarea: 'Instalación bombas centrífugas',     proyecto: 'Planta Tratamiento Agua Residual',      proyectoId: 1,  etapa: 'Entrega Final',       fechas: '03/01 - 15/01', estado: 'Completado' },
      { id: 2,  responsable: 'Luis Torres',    tarea: 'Pruebas hidráulicas finales',        proyecto: 'Planta Tratamiento Agua Residual',      proyectoId: 1,  etapa: 'Entrega Final',       fechas: '16/01 - 28/01', estado: 'Completado' },
      // Proyecto 2 - Sistema Transportador (completado Ene)
      { id: 3,  responsable: 'Rosa Díaz',      tarea: 'Montaje de fajas transportadoras',   proyecto: 'Sistema Transportador de Carga',         proyectoId: 2,  etapa: 'Pruebas Validación',  fechas: '10/01 - 20/01', estado: 'Completado' },
      { id: 4,  responsable: 'Rosa Díaz',      tarea: 'Validación de sistemas de control',  proyecto: 'Sistema Transportador de Carga',         proyectoId: 2,  etapa: 'Pruebas Validación',  fechas: '21/01 - 31/01', estado: 'Completado' },
      // Proyecto 6 - Diseño Puente Vehicular (completado Feb)
      { id: 5,  responsable: 'Carlos López',   tarea: 'Cálculo de cargas permanentes',      proyecto: 'Diseño Puente Vehicular Ruta 5',         proyectoId: 6,  etapa: 'Cálculo Estructural', fechas: '01/02 - 15/02', estado: 'Completado' },
      { id: 6,  responsable: 'Carlos López',   tarea: 'Diseño de vigas y losas',            proyecto: 'Diseño Puente Vehicular Ruta 5',         proyectoId: 6,  etapa: 'Cálculo Estructural', fechas: '16/02 - 28/02', estado: 'Completado' },
      // Proyecto 7 - Rehabilitación Red Eléctrica (completado Feb)
      { id: 7,  responsable: 'Elena Vargas',   tarea: 'Cambio de conductores troncales',    proyecto: 'Rehabilitación Red Eléctrica Sur',       proyectoId: 7,  etapa: 'Inspección Final',    fechas: '03/02 - 15/02', estado: 'Completado' },
      { id: 8,  responsable: 'Elena Vargas',   tarea: 'Inspección termográfica final',      proyecto: 'Rehabilitación Red Eléctrica Sur',       proyectoId: 7,  etapa: 'Inspección Final',    fechas: '16/02 - 25/02', estado: 'Completado' },
      // Proyecto 8 - Cimentaciones Edificio (completado Feb)
      { id: 9,  responsable: 'Hugo Ríos',      tarea: 'Vaciado de zapatas finales',         proyecto: 'Cimentaciones Edificio Corporativo B',   proyectoId: 8,  etapa: 'Cierre Técnico',      fechas: '05/02 - 18/02', estado: 'Completado' },
      { id: 10, responsable: 'Hugo Ríos',      tarea: 'Pruebas de resistencia concreto',    proyecto: 'Cimentaciones Edificio Corporativo B',   proyectoId: 8,  etapa: 'Cierre Técnico',      fechas: '19/02 - 27/02', estado: 'Completado' },
      // Proyecto 13 - Modernización Subestación (completado Mar)
      { id: 11, responsable: 'Elena Vargas',   tarea: 'Instalación transformador 10MVA',    proyecto: 'Modernización Subestación Eléctrica',    proyectoId: 13, etapa: 'Comisionamiento',     fechas: '02/03 - 15/03', estado: 'Completado' },
      { id: 12, responsable: 'Elena Vargas',   tarea: 'Comisionamiento y energización',     proyecto: 'Modernización Subestación Eléctrica',    proyectoId: 13, etapa: 'Comisionamiento',     fechas: '16/03 - 28/03', estado: 'Completado' },
      // Proyecto 14 - Pavimentación Acceso (completado Mar)
      { id: 13, responsable: 'Hugo Ríos',      tarea: 'Colocación carpeta asfáltica',       proyecto: 'Pavimentación Acceso Industrial km 12',  proyectoId: 14, etapa: 'Carpeta Asfáltica',   fechas: '04/03 - 20/03', estado: 'Completado' },
      { id: 14, responsable: 'Hugo Ríos',      tarea: 'Señalización horizontal',            proyecto: 'Pavimentación Acceso Industrial km 12',  proyectoId: 14, etapa: 'Carpeta Asfáltica',   fechas: '21/03 - 29/03', estado: 'Completado' },
      // Proyecto 15 - Compresores (completado Mar)
      { id: 15, responsable: 'Luis Torres',    tarea: 'Montaje de compresores',             proyecto: 'Instalación Compresores Alta Presión',   proyectoId: 15, etapa: 'Pruebas Hidráulicas', fechas: '05/03 - 20/03', estado: 'Completado' },
      { id: 16, responsable: 'Luis Torres',    tarea: 'Pruebas de presión 300bar',          proyecto: 'Instalación Compresores Alta Presión',   proyectoId: 15, etapa: 'Pruebas Hidráulicas', fechas: '21/03 - 31/03', estado: 'Completado' },
      
      // ══ PROYECTOS ACTIVOS ═══════════════════════════════════════════════════
      // Proyecto 3 - Línea Producción Textil A (activo Ene)
      { id: 17, responsable: 'Juan Pérez',     tarea: 'Diseño de layout de planta',         proyecto: 'Línea Producción Textil A',             proyectoId: 3,  etapa: 'Ingeniería',          fechas: '15/01 - 25/01', estado: 'En Proceso' },
      { id: 18, responsable: 'Juan Pérez',     tarea: 'Selección de maquinaria textil',     proyecto: 'Línea Producción Textil A',             proyectoId: 3,  etapa: 'Ingeniería',          fechas: '26/01 - 05/02', estado: 'Pendiente'  },
      // Proyecto 4 - Sistema Ventilación Industrial (activo Ene)
      { id: 19, responsable: 'María García',   tarea: 'Instalación de ductos galvanizados', proyecto: 'Sistema Ventilación Industrial',         proyectoId: 4,  etapa: 'Instalación',         fechas: '20/01 - 28/01', estado: 'Completado' },
      { id: 20, responsable: 'María García',   tarea: 'Montaje de extractores industriales',proyecto: 'Sistema Ventilación Industrial',         proyectoId: 4,  etapa: 'Instalación',         fechas: '29/01 - 10/02', estado: 'Retrasado'  },
      // Proyecto 5 - Automatización Almacén Central (activo Ene)
      { id: 21, responsable: 'Pedro Sánchez',  tarea: 'Planos de automatización almacén',   proyecto: 'Automatización Almacén Central',         proyectoId: 5,  etapa: 'Diseño',              fechas: '22/01 - 05/02', estado: 'Pendiente'  },
      // Proyecto 9 - Mantenimiento Maquinaria Pesada (activo Feb)
      { id: 22, responsable: 'Ana Martínez',   tarea: 'Inspección de equipos rotativos',    proyecto: 'Mantenimiento Maquinaria Pesada',        proyectoId: 9,  etapa: 'Diagnóstico',         fechas: '05/02 - 12/02', estado: 'En Proceso' },
      { id: 23, responsable: 'Ana Martínez',   tarea: 'Informe de condición de equipos',    proyecto: 'Mantenimiento Maquinaria Pesada',        proyectoId: 9,  etapa: 'Diagnóstico',         fechas: '13/02 - 20/02', estado: 'Pendiente'  },
      // Proyecto 10 - Sistema Automatización Línea 2 (activo Feb)
      { id: 24, responsable: 'Pedro Sánchez',  tarea: 'Programación PLC Siemens S7-1500',   proyecto: 'Sistema Automatización Línea 2',         proyectoId: 10, etapa: 'Programación PLC',    fechas: '10/02 - 28/02', estado: 'En Proceso' },
      { id: 25, responsable: 'Pedro Sánchez',  tarea: 'Configuración pantalla HMI',         proyecto: 'Sistema Automatización Línea 2',         proyectoId: 10, etapa: 'Programación PLC',    fechas: '01/03 - 15/03', estado: 'Pendiente'  },
      // Proyecto 11 - Instalación Paneles Solares (activo Feb)
      { id: 26, responsable: 'Sofía Mendoza',  tarea: 'Montaje estructura soporte paneles', proyecto: 'Instalación Paneles Solares Planta A',   proyectoId: 11, etapa: 'Montaje',             fechas: '12/02 - 28/02', estado: 'Completado' },
      { id: 27, responsable: 'Sofía Mendoza',  tarea: 'Cableado DC y conexión inversores',  proyecto: 'Instalación Paneles Solares Planta A',   proyectoId: 11, etapa: 'Montaje',             fechas: '01/03 - 20/03', estado: 'En Proceso' },
      // Proyecto 18 - Sistema SCADA (activo Mar)
      { id: 28, responsable: 'Juan Pérez',     tarea: 'Configuración servidores OPC-UA',    proyecto: 'Sistema SCADA Planta Minera',            proyectoId: 18, etapa: 'Configuración HMI',   fechas: '12/03 - 31/03', estado: 'En Proceso' },
      { id: 29, responsable: 'Juan Pérez',     tarea: 'Pruebas de comunicación Modbus',     proyecto: 'Sistema SCADA Planta Minera',            proyectoId: 18, etapa: 'Configuración HMI',   fechas: '01/04 - 15/04', estado: 'Pendiente'  },
      // Proyecto 22 - Expansión Planta Farmacéutica (activo Abr)
      { id: 30, responsable: 'Ana Martínez',   tarea: 'Validación salas limpias ISO 7',     proyecto: 'Expansión Planta Farmacéutica',          proyectoId: 22, etapa: 'Validación GMP',      fechas: '05/04 - 25/04', estado: 'En Proceso' },
      { id: 31, responsable: 'Ana Martínez',   tarea: 'Calificación de equipos OQ/PQ',      proyecto: 'Expansión Planta Farmacéutica',          proyectoId: 22, etapa: 'Validación GMP',      fechas: '26/04 - 30/05', estado: 'Pendiente'  },
      // Proyecto 28 - Planta Potabilizadora (activo May)
      { id: 32, responsable: 'Sofía Mendoza',  tarea: 'Instalación filtros de arena',       proyecto: 'Planta Potabilizadora Módulo 3',         proyectoId: 28, etapa: 'Montaje Filtros',      fechas: '10/05 - 31/05', estado: 'En Proceso' },
      { id: 33, responsable: 'Sofía Mendoza',  tarea: 'Prueba de filtros de carbono',        proyecto: 'Planta Potabilizadora Módulo 3',         proyectoId: 28, etapa: 'Montaje Filtros',      fechas: '01/06 - 20/06', estado: 'Pendiente'  },
      // Proyecto 40 - Red Gas Natural (activo Ago)
      { id: 34, responsable: 'Juan Pérez',     tarea: 'Memoria descriptiva ingeniería',      proyecto: 'Diseño Red Distribución Gas Natural',    proyectoId: 40, etapa: 'Ingeniería Básica',   fechas: '08/08 - 31/08', estado: 'En Proceso' },
      { id: 35, responsable: 'Juan Pérez',     tarea: 'Planos isométricos de tuberías',      proyecto: 'Diseño Red Distribución Gas Natural',    proyectoId: 40, etapa: 'Ingeniería Básica',   fechas: '01/09 - 30/09', estado: 'Pendiente'  },
      // Proyecto 45 - Ampliación Planta Empaques (activo Sep)
      { id: 36, responsable: 'Hugo Ríos',      tarea: 'Fabricación vigas IPE 400',           proyecto: 'Ampliación Planta de Empaques',          proyectoId: 45, etapa: 'Estructura Metálica', fechas: '08/09 - 30/09', estado: 'En Proceso' },
      { id: 37, responsable: 'Hugo Ríos',      tarea: 'Erección y montaje de columnas',      proyecto: 'Ampliación Planta de Empaques',          proyectoId: 45, etapa: 'Estructura Metálica', fechas: '01/10 - 31/10', estado: 'Pendiente'  },
      // Proyecto 52 - Sistema Riego (activo Nov)
      { id: 38, responsable: 'Rosa Díaz',      tarea: 'Tendido tubería PVC 2" principal',    proyecto: 'Sistema Riego Tecnificado Area Verde',   proyectoId: 52, etapa: 'Tendido Tuberías',    fechas: '05/11 - 30/11', estado: 'En Proceso' },
      { id: 39, responsable: 'Rosa Díaz',      tarea: 'Instalación aspersores y goteros',    proyecto: 'Sistema Riego Tecnificado Area Verde',   proyectoId: 52, etapa: 'Tendido Tuberías',    fechas: '01/12 - 31/12', estado: 'Pendiente'  },
    ];

    // ── Gastos detallados por proyectos ──────────────────────────────────────
    const gastosProyectos: GastoProyecto[] = [
      // Proyecto 3 - Línea Producción Textil A
      { id: 1,  proyectoId: 3,  proyecto: 'Línea Producción Textil A',           categoria: 'Materiales',   descripcion: 'Rodillos y poleas industriales',         monto: 16000, fecha: '2026-01-18', responsable: 'Juan Pérez'     },
      { id: 2,  proyectoId: 3,  proyecto: 'Línea Producción Textil A',           categoria: 'Mano de Obra', descripcion: 'Ingeniería de diseño mecánico',           monto: 19000, fecha: '2026-01-25', responsable: 'Juan Pérez'     },
      { id: 3,  proyectoId: 3,  proyecto: 'Línea Producción Textil A',           categoria: 'Otros Costos', descripcion: 'Licencia AutoCAD Mechanical 2026',        monto: 6500,  fecha: '2026-01-28', responsable: 'Juan Pérez'     },
      { id: 4,  proyectoId: 3,  proyecto: 'Línea Producción Textil A',           categoria: 'Materiales',   descripcion: 'Cinta transportadora 40m',                monto: 3500,  fecha: '2026-02-02', responsable: 'Juan Pérez'     },
      // Proyecto 4 - Sistema Ventilación Industrial
      { id: 5,  proyectoId: 4,  proyecto: 'Sistema Ventilación Industrial',       categoria: 'Materiales',   descripcion: 'Ductos galvanizados calibre 24',          monto: 8000,  fecha: '2026-01-22', responsable: 'María García'   },
      { id: 6,  proyectoId: 4,  proyecto: 'Sistema Ventilación Industrial',       categoria: 'Materiales',   descripcion: 'Extractores industriales Soler 750rpm',   monto: 14000, fecha: '2026-01-30', responsable: 'María García'   },
      { id: 7,  proyectoId: 4,  proyecto: 'Sistema Ventilación Industrial',       categoria: 'Mano de Obra', descripcion: 'Instalación y montaje especializado',     monto: 6500,  fecha: '2026-02-05', responsable: 'María García'   },
      { id: 8,  proyectoId: 4,  proyecto: 'Sistema Ventilación Industrial',       categoria: 'Otros Costos', descripcion: 'Certificación SENCICO instalaciones',     monto: 3500,  fecha: '2026-02-12', responsable: 'María García'   },
      // Proyecto 6 - Diseño Puente Vehicular
      { id: 9,  proyectoId: 6,  proyecto: 'Diseño Puente Vehicular Ruta 5',       categoria: 'Mano de Obra', descripcion: 'Ingeniería estructural SAP2000',          monto: 12000, fecha: '2026-02-03', responsable: 'Carlos López'   },
      { id: 10, proyectoId: 6,  proyecto: 'Diseño Puente Vehicular Ruta 5',       categoria: 'Otros Costos', descripcion: 'Licencia SAP2000 Advanced',               monto: 8500,  fecha: '2026-02-10', responsable: 'Carlos López'   },
      { id: 11, proyectoId: 6,  proyecto: 'Diseño Puente Vehicular Ruta 5',       categoria: 'Mano de Obra', descripcion: 'Estudio de suelos y mecánica',            monto: 7500,  fecha: '2026-02-18', responsable: 'Carlos López'   },
      // Proyecto 9 - Mantenimiento Maquinaria Pesada
      { id: 12, proyectoId: 9,  proyecto: 'Mantenimiento Maquinaria Pesada',       categoria: 'Mano de Obra', descripcion: 'Personal técnico especializado',          monto: 8000,  fecha: '2026-02-08', responsable: 'Ana Martínez'   },
      { id: 13, proyectoId: 9,  proyecto: 'Mantenimiento Maquinaria Pesada',       categoria: 'Materiales',   descripcion: 'Rodamientos SKF y sellos mecanicos',      monto: 7500,  fecha: '2026-02-14', responsable: 'Ana Martínez'   },
      // Proyecto 10 - Sistema Automatización Línea 2
      { id: 14, proyectoId: 10, proyecto: 'Sistema Automatización Línea 2',        categoria: 'Materiales',   descripcion: 'PLC Siemens S7-1500 + módulos I/O',       monto: 16000, fecha: '2026-02-12', responsable: 'Pedro Sánchez'  },
      { id: 15, proyectoId: 10, proyecto: 'Sistema Automatización Línea 2',        categoria: 'Mano de Obra', descripcion: 'Programación y puesta en marcha',         monto: 6000,  fecha: '2026-02-20', responsable: 'Pedro Sánchez'  },
      // Proyecto 11 - Instalación Paneles Solares
      { id: 16, proyectoId: 11, proyecto: 'Instalación Paneles Solares Planta A',  categoria: 'Materiales',   descripcion: 'Paneles solares 550W bifaciales x80',     monto: 28000, fecha: '2026-02-14', responsable: 'Sofía Mendoza'  },
      { id: 17, proyectoId: 11, proyecto: 'Instalación Paneles Solares Planta A',  categoria: 'Materiales',   descripcion: 'Inversores SMA Sunny Tripower 25kW',      monto: 9500,  fecha: '2026-02-20', responsable: 'Sofía Mendoza'  },
      { id: 18, proyectoId: 11, proyecto: 'Instalación Paneles Solares Planta A',  categoria: 'Mano de Obra', descripcion: 'Instalación y cableado eléctrico',        monto: 3500,  fecha: '2026-03-05', responsable: 'Sofía Mendoza'  },
      // Proyecto 22 - Expansión Planta Farmacéutica
      { id: 19, proyectoId: 22, proyecto: 'Expansión Planta Farmacéutica',         categoria: 'Mano de Obra', descripcion: 'Consultoría GMP y validación salas',      monto: 35000, fecha: '2026-04-08', responsable: 'Ana Martínez'   },
      { id: 20, proyectoId: 22, proyecto: 'Expansión Planta Farmacéutica',         categoria: 'Materiales',   descripcion: 'Materiales sala limpia ISO 7',             monto: 42000, fecha: '2026-04-15', responsable: 'Ana Martínez'   },
      { id: 21, proyectoId: 22, proyecto: 'Expansión Planta Farmacéutica',         categoria: 'Otros Costos', descripcion: 'Certificación DIGEMID',                   monto: 11000, fecha: '2026-05-02', responsable: 'Ana Martínez'   },
      // Proyecto 45 - Ampliación Planta Empaques
      { id: 22, proyectoId: 45, proyecto: 'Ampliación Planta de Empaques',         categoria: 'Materiales',   descripcion: 'Vigas IPE 400 acero A36 - 12 tn',         monto: 38000, fecha: '2026-09-10', responsable: 'Hugo Ríos'      },
      { id: 23, proyectoId: 45, proyecto: 'Ampliación Planta de Empaques',         categoria: 'Mano de Obra', descripcion: 'Soldadores y operadores de grúa',          monto: 22000, fecha: '2026-09-20', responsable: 'Hugo Ríos'      },
      { id: 24, proyectoId: 45, proyecto: 'Ampliación Planta de Empaques',         categoria: 'Otros Costos', descripcion: 'Alquiler grúa telescópica 50T',            monto: 14000, fecha: '2026-09-28', responsable: 'Hugo Ríos'      },
    ];

    // ── Conteos derivados de proyectosEnCurso (para consistencia) ───────────
    const finalizados = proyectosEnCurso.filter(p => p.estado === 'Completado').length;  // 26
    const activos     = proyectosEnCurso.filter(p => p.estado !== 'Completado').length;   // 29

    return {
      proyectosFinalizados: finalizados,
      proyectosActivos:     activos,
      gastos: {
        mes:  312000,
        hoy:   4800,
        ayer:  6200
      },
      // Gráfico Finalizados: cantidad de proyectos con estado=Completado por mes
      datosProyectosFinalizados: [
        { name: 'Ene', value: 2 },
        { name: 'Feb', value: 3 },
        { name: 'Mar', value: 4 },
        { name: 'Abr', value: 2 },
        { name: 'May', value: 3 },
        { name: 'Jun', value: 2 },
        { name: 'Jul', value: 2 },
        { name: 'Ago', value: 2 },
        { name: 'Sep', value: 3 },
        { name: 'Oct', value: 2 },
        { name: 'Nov', value: 1 },
        { name: 'Dic', value: 0 },
      ],
      // Gráfico Activos: cantidad de proyectos con estado En Proceso|Pendiente por mes
      datosProyectosActivos: [
        { name: 'Ene', value: 3 },
        { name: 'Feb', value: 4 },
        { name: 'Mar', value: 3 },
        { name: 'Abr', value: 2 },
        { name: 'May', value: 3 },
        { name: 'Jun', value: 2 },
        { name: 'Jul', value: 2 },
        { name: 'Ago', value: 2 },
        { name: 'Sep', value: 2 },
        { name: 'Oct', value: 2 },
        { name: 'Nov', value: 2 },
        { name: 'Dic', value: 2 },
      ],
      // Gráfico Gastos: suma de gastoTotal de TODOS los proyectos del mes (en soles)
      datosGastos: [
        { name: 'Ene', value: 188000 },
        { name: 'Feb', value: 314000 },
        { name: 'Mar', value: 274000 },
        { name: 'Abr', value: 180000 },
        { name: 'May', value: 186000 },
        { name: 'Jun', value: 130000 },
        { name: 'Jul', value: 135000 },
        { name: 'Ago', value: 154000 },
        { name: 'Sep', value: 159000 },
        { name: 'Oct', value:  89500 },
        { name: 'Nov', value:  55500 },
        { name: 'Dic', value:  31000 },
      ],
      proyectosEnCurso,
      tareasEncargados,
      gastosProyectos,
    };
  }
}
