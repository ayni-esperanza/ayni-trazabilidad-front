import { Component, Input, Output, EventEmitter, AfterViewInit, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Proyecto, Responsable, FlujoNodo, EstadoTarea } from '../../../../models/solicitud.model';

@Component({
  selector: 'app-tab-proceso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-proceso.component.html'
})
export class TabProcesoComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() proyecto: Proyecto | null = null;
  @Input() responsables: Responsable[] = [];
  @Input() proyectoFinalizado = false;
  @Input() proyectoCancelado = false;
  @Input() flujoNodos: FlujoNodo[] = [];
  @Input() costosMateriales: Array<{ dependenciaActividadId?: number | null; costoTotal: number }> = [];
  @Input() costosManoObra: Array<{ dependenciaActividadId?: number | null; costoTotal: number }> = [];
  @Input() costosOtros: Array<{ dependenciaActividadId?: number | null; costoTotal: number }> = [];

  @Output() abrirNodoEvt = new EventEmitter<FlujoNodo>();
  @Output() crearActividadDesdeBpmnEvt = new EventEmitter<{ nombre: string; nodoOrigenId?: number }>();
  @Output() flujoActualizadoEvt = new EventEmitter<FlujoNodo[]>();

  vistaFlujo: 'timeline' | 'tabla' = 'tabla';
  readonly estadosActividad: EstadoTarea[] = ['Pendiente', 'En Proceso', 'Completado', 'Cancelado', 'Retrasado'];
  // Compatibilidad defensiva para plantillas previas en hot-reload.
  readonly alertasActividades: unknown[] = [];

  mostrarVistaPreviaAdjunto = false;
  adjuntoVistaPreviaNombre = '';
  fuenteVistaPreviaAdjunto = '';
  private fuenteVistaPreviaAdjuntoEsBlob = false;
  private adjuntoVistaPreviaEsPdf = false;

  @ViewChild('bpmnCanvas', { static: false }) bpmnCanvas?: ElementRef<HTMLDivElement>;

  private bpmnModeler: any;
  private isBrowser = false;
  private isImportandoXml = false;
  private sincronizacionPendiente: ReturnType<typeof setTimeout> | null = null;
  private ultimoSnapshotFlujo = '';
  private tareasExternasPendientes = new Set<string>();

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private readonly sanitizer: DomSanitizer
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser || !this.bpmnCanvas) return;
    const { default: BpmnJS } = await import('bpmn-js/lib/Modeler');
    this.bpmnModeler = new BpmnJS({
      container: this.bpmnCanvas.nativeElement
    });
    this.registrarEventosBpmn();
    await this.renderBpmn();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (!this.bpmnModeler) return;
    if (changes['flujoNodos']) {
      await this.renderBpmn();
    }
  }

  ngOnDestroy(): void {
    this.cerrarVistaPreviaAdjunto();

    if (this.sincronizacionPendiente) {
      clearTimeout(this.sincronizacionPendiente);
      this.sincronizacionPendiente = null;
    }
    if (this.bpmnModeler) {
      this.bpmnModeler.destroy();
      this.bpmnModeler = null;
    }
  }

  getResponsableNombre(responsableId: number): string {
    const resp = this.responsables.find(r => r.id === responsableId);
    return resp?.nombre || 'Sin asignar';
  }

  getSiguientesNombres(nodo: FlujoNodo): string {
    const siguientesIds = Array.isArray(nodo.siguientesIds) ? nodo.siguientesIds : [];
    if (!siguientesIds.length) return 'Sin conexiones';
    const nombres = siguientesIds
      .map(id => this.flujoNodos.find(n => n.id === id)?.nombre)
      .filter((nombre): nombre is string => !!nombre);
    return nombres.length ? nombres.join(', ') : 'Sin conexiones';
  }

  puedeAbrirNodo(nodo: FlujoNodo): boolean {
    return nodo.tipo === 'tarea' && !this.proyectoFinalizado && !this.proyectoCancelado;
  }

  abrirNodo(nodo: FlujoNodo): void {
    if (!this.puedeAbrirNodo(nodo)) return;
    this.abrirNodoEvt.emit(nodo);
  }

  cambiarVistaFlujo(vista: 'timeline' | 'tabla'): void {
    this.vistaFlujo = vista;
  }

  getEstadoActividad(nodo: FlujoNodo): EstadoTarea {
    return nodo.estadoActividad || 'Pendiente';
  }

  get totalActividadesFlujo(): number {
    const timeline = this.flujoTimeline;
    return Array.isArray(timeline) ? timeline.length : 0;
  }

  onCambiarEstadoActividad(nodo: FlujoNodo, event: Event): void {
    if (nodo.tipo !== 'tarea' || this.proyectoFinalizado || this.proyectoCancelado) return;

    const select = event.target as HTMLSelectElement;
    const nuevoEstado = select.value as EstadoTarea;
    if (!this.estadosActividad.includes(nuevoEstado)) return;

    const estadoActual = this.getEstadoActividad(nodo);
    if (estadoActual === nuevoEstado && nodo.fechaCambioEstado) return;

    const fechaCambioEstado = new Date().toISOString();
    const indiceObjetivo = this.obtenerIndiceNodoObjetivo(nodo);
    if (indiceObjetivo < 0) return;

    nodo.estadoActividad = nuevoEstado;
    nodo.fechaCambioEstado = fechaCambioEstado;

    const flujoActualizado = this.flujoNodos.map((item, index) =>
      index === indiceObjetivo
        ? { ...item, estadoActividad: nuevoEstado, fechaCambioEstado }
        : item
    );

    this.flujoActualizadoEvt.emit(flujoActualizado);
  }

  private obtenerIndiceNodoObjetivo(nodo: FlujoNodo): number {
    const porReferencia = this.flujoNodos.findIndex(item => item === nodo);
    if (porReferencia >= 0) return porReferencia;

    return this.flujoNodos.findIndex(item => item.id === nodo.id && item.tipo === nodo.tipo);
  }

  getClaseEstadoActividad(estado: EstadoTarea): string {
    const clases: Record<EstadoTarea, string> = {
      Pendiente: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
      'En Proceso': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      Completado: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      Cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      Retrasado: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    };
    return clases[estado];
  }

  getClaseAlerta(): string {
    return '';
  }

  getCostoDependenciaActividad(nodoId: number): number {
    return this.obtenerCostoPorDependencia(this.costosMateriales, nodoId)
      + this.obtenerCostoPorDependencia(this.costosManoObra, nodoId)
      + this.obtenerCostoPorDependencia(this.costosOtros, nodoId);
  }

  private obtenerCostoPorDependencia(
    items: Array<{ dependenciaActividadId?: number | null; costoTotal: number }>,
    nodoId: number
  ): number {
    return items.reduce((total, item) => {
      const dependenciaId = this.normalizarDependenciaId(item.dependenciaActividadId);
      if (dependenciaId !== nodoId) return total;
      return total + (Number(item.costoTotal) || 0);
    }, 0);
  }

  private normalizarDependenciaId(valor: number | string | null | undefined): number | null {
    if (valor === null || valor === undefined || valor === '') return null;
    const id = Number(valor);
    return Number.isFinite(id) ? id : null;
  }

  formatearDescripcionDetalle(descripcion?: string): string {
    if (!descripcion?.trim()) {
      return '<em>Sin descripcion</em>';
    }

    const decodificada = this.decodificarEntidades(descripcion).replace(/&nbsp;/g, ' ').trim();
    return decodificada || '<em>Sin descripcion</em>';
  }

  puedeAccionarAdjunto(adjunto: { archivo?: File; dataUrl?: string }): boolean {
    return !!adjunto.archivo || !!adjunto.dataUrl;
  }

  puedeVistaPreviaAdjunto(adjunto: { nombre?: string; tipo?: string; archivo?: File; dataUrl?: string }): boolean {
    if (!this.puedeAccionarAdjunto(adjunto)) return false;
    const tipo = (adjunto.tipo || adjunto.archivo?.type || '').toLowerCase();
    if (tipo.startsWith('image/') || tipo === 'application/pdf') return true;
    const nombre = (adjunto.nombre || adjunto.archivo?.name || '').toLowerCase();
    return nombre.endsWith('.pdf') || nombre.endsWith('.png') || nombre.endsWith('.jpg') || nombre.endsWith('.jpeg') || nombre.endsWith('.webp') || nombre.endsWith('.gif');
  }

  verAdjunto(adjunto: { nombre?: string; tipo?: string; archivo?: File; dataUrl?: string }): void {
    if (!this.puedeVistaPreviaAdjunto(adjunto)) return;

    const url = this.obtenerUrlAdjunto(adjunto);
    if (!url) return;

    this.cerrarVistaPreviaAdjunto();
    this.fuenteVistaPreviaAdjunto = url;
    this.fuenteVistaPreviaAdjuntoEsBlob = !!adjunto.archivo && !adjunto.dataUrl;
    this.adjuntoVistaPreviaEsPdf = this.esAdjuntoPdf(adjunto);
    this.adjuntoVistaPreviaNombre = adjunto.nombre || 'Documento adjunto';
    this.mostrarVistaPreviaAdjunto = true;
  }

  descargarAdjunto(adjunto: { nombre: string; archivo?: File; dataUrl?: string }): void {
    const url = this.obtenerUrlAdjunto(adjunto);
    if (!url) return;

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = adjunto.nombre || 'documento';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    if (adjunto.archivo && !adjunto.dataUrl) {
      URL.revokeObjectURL(url);
    }
  }

  private decodificarEntidades(valor: string): string {
    if (!this.isBrowser) {
      return valor;
    }

    const textarea = document.createElement('textarea');
    textarea.innerHTML = valor;
    return textarea.value;
  }

  private obtenerUrlAdjunto(adjunto: { archivo?: File; dataUrl?: string }): string | null {
    if (adjunto.dataUrl) return adjunto.dataUrl;
    if (adjunto.archivo) return URL.createObjectURL(adjunto.archivo);
    return null;
  }

  obtenerFuenteVistaPreviaAdjuntoPdf(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.fuenteVistaPreviaAdjunto);
  }

  obtenerFuenteVistaPreviaAdjuntoImagen(): string {
    return this.fuenteVistaPreviaAdjunto;
  }

  esPdfVistaPreviaAdjunto(): boolean {
    return this.adjuntoVistaPreviaEsPdf;
  }

  cerrarVistaPreviaAdjunto(): void {
    if (this.fuenteVistaPreviaAdjuntoEsBlob && this.fuenteVistaPreviaAdjunto) {
      URL.revokeObjectURL(this.fuenteVistaPreviaAdjunto);
    }
    this.mostrarVistaPreviaAdjunto = false;
    this.adjuntoVistaPreviaNombre = '';
    this.fuenteVistaPreviaAdjunto = '';
    this.fuenteVistaPreviaAdjuntoEsBlob = false;
    this.adjuntoVistaPreviaEsPdf = false;
  }

  private esAdjuntoPdf(adjunto: { nombre?: string; tipo?: string; archivo?: File; dataUrl?: string }): boolean {
    const tipo = (adjunto.tipo || adjunto.archivo?.type || '').toLowerCase();
    if (tipo === 'application/pdf') return true;
    const nombre = (adjunto.nombre || adjunto.archivo?.name || '').toLowerCase();
    if (nombre.endsWith('.pdf')) return true;
    return !!adjunto.dataUrl?.startsWith('data:application/pdf');
  }

  crearNuevaActividad(): void {
    this.crearActividadDesdeBpmnEvt.emit({ nombre: 'Nueva actividad' });
  }

  get flujoTimeline(): FlujoNodo[] {
    try {
      const nodosBase = Array.isArray(this.flujoNodos) ? this.flujoNodos : [];
      const nodos = nodosBase.filter((nodo): nodo is FlujoNodo => !!nodo && typeof nodo === 'object');

      if (nodos.length <= 1) return nodos.filter(n => n.tipo !== 'inicio');

      const porId = new Map(nodos.map(n => [n.id, n]));
      const inicio = nodos.find(n => n.tipo === 'inicio');
      const visitados = new Set<number>();
      const ordenados: FlujoNodo[] = [];

      const visitar = (nodo: FlujoNodo): void => {
        if (visitados.has(nodo.id)) return;
        visitados.add(nodo.id);
        ordenados.push(nodo);

        const siguientes = Array.isArray(nodo.siguientesIds) ? nodo.siguientesIds : [];
        for (const siguienteId of siguientes) {
          const siguiente = porId.get(siguienteId);
          if (siguiente) visitar(siguiente);
        }
      };

      if (inicio) visitar(inicio);
      for (const nodo of nodos) {
        if (!visitados.has(nodo.id)) visitar(nodo);
      }

      return ordenados.filter(n => n.tipo !== 'inicio');
    } catch {
      return [];
    }
  }

  private async renderBpmn(): Promise<void> {
    if (!this.bpmnModeler) return;
    const xml = this.buildBpmnXml();
    this.isImportandoXml = true;
    await this.bpmnModeler.importXML(xml);
    this.isImportandoXml = false;
    this.ultimoSnapshotFlujo = this.crearSnapshotFlujo(this.normalizarNodos());
    const canvas = this.bpmnModeler.get('canvas');
    canvas.zoom('fit-viewport');
  }

  private registrarEventosBpmn(): void {
    if (!this.bpmnModeler) return;

    const eventBus = this.bpmnModeler.get('eventBus');

    eventBus.on('shape.added', (event: any) => {
      if (this.isImportandoXml) return;

      const shape = event?.element;
      if (!shape || shape.type !== 'bpmn:Task') return;

      const taskId: string = shape.id || '';
      // Si es un task gestionado por nuestro flujo (Task_{id}) no disparamos alta nueva.
      if (/^Task_\d+$/.test(taskId)) return;
      // La conexión del append puede no existir aún en este hook.
      // Se procesa en commandStack.changed para recuperar la dependencia real.
      this.tareasExternasPendientes.add(taskId);
    });

    eventBus.on('commandStack.changed', () => {
      if (this.isImportandoXml) return;
      this.programarSincronizacionFlujo();
    });

    eventBus.on('element.click', (event: any) => {
      const element = event?.element;
      if (!element || element.type !== 'bpmn:Task') return;

      const taskId: string = element.id || '';
      const match = taskId.match(/^Task_(\d+)$/);
      if (!match) return;

      const nodoId = Number(match[1]);
      const nodo = this.flujoNodos.find(n => n.id === nodoId);
      if (nodo) {
        this.abrirNodoEvt.emit(nodo);
      }
    });
  }

  private programarSincronizacionFlujo(): void {
    if (this.sincronizacionPendiente) {
      clearTimeout(this.sincronizacionPendiente);
    }

    this.sincronizacionPendiente = setTimeout(() => {
      this.sincronizacionPendiente = null;
      this.procesarTareasExternasPendientes();
      this.sincronizarFlujoDesdeDiagrama();
    }, 80);
  }

  private procesarTareasExternasPendientes(): void {
    if (!this.bpmnModeler || this.tareasExternasPendientes.size === 0) return;

    const elementRegistry = this.bpmnModeler.get('elementRegistry');
    if (!elementRegistry) return;

    const pendientes = Array.from(this.tareasExternasPendientes);
    pendientes.forEach(taskId => {
      const shape = elementRegistry.get(taskId);
      if (!shape || shape.type !== 'bpmn:Task') {
        this.tareasExternasPendientes.delete(taskId);
        return;
      }

      const nombre = shape.businessObject?.name?.trim() || 'Nueva actividad';
      let nodoOrigenId: number | undefined;

      const incoming = shape.businessObject?.incoming;
      const sourceRefId: string | undefined = incoming?.[0]?.sourceRef?.id;

      if (sourceRefId) {
        const sourceTaskMatch = sourceRefId.match(/^Task_(\d+)$/);
        if (sourceTaskMatch) {
          nodoOrigenId = Number(sourceTaskMatch[1]);
        } else if (sourceRefId === 'StartEvent_1') {
          const nodoInicio = this.flujoNodos.find(n => n.tipo === 'inicio');
          nodoOrigenId = nodoInicio?.id;
        }
      }

      this.crearActividadDesdeBpmnEvt.emit({ nombre, nodoOrigenId });
      this.tareasExternasPendientes.delete(taskId);
    });
  }

  private sincronizarFlujoDesdeDiagrama(): void {
    if (!this.bpmnModeler || this.isImportandoXml) return;

    const elementRegistry = this.bpmnModeler.get('elementRegistry');
    if (!elementRegistry) return;

    const baseNodes = this.normalizarNodos();
    const inicio = baseNodes.find(n => n.tipo === 'inicio') ?? baseNodes[0];
    const nodosPorId = new Map<number, FlujoNodo>(baseNodes.map(n => [n.id, n]));
    const siguientesPorNodo = new Map<number, number[]>();

    baseNodes.forEach(nodo => {
      siguientesPorNodo.set(nodo.id, []);
    });

    const shapes: any[] = elementRegistry.filter((element: any) => {
      if (element?.labelTarget) return false;
      return element?.type === 'bpmn:Task' || element?.type === 'bpmn:StartEvent';
    });

    const posicionesPorNodo = new Map<number, { x: number; y: number }>();
    shapes.forEach(shape => {
      const nodoId = this.obtenerNodoIdDesdeElemento(shape?.id, inicio.id);
      if (nodoId === null || !nodosPorId.has(nodoId)) return;
      posicionesPorNodo.set(nodoId, { x: shape.x, y: shape.y });
    });

    const sequenceFlows: any[] = elementRegistry.filter((element: any) => {
      if (element?.labelTarget) return false;
      return element?.type === 'bpmn:SequenceFlow';
    });

    sequenceFlows.forEach(connection => {
      const sourceId = this.obtenerNodoIdDesdeElemento(connection?.source?.id, inicio.id);
      const targetId = this.obtenerNodoIdDesdeElemento(connection?.target?.id, inicio.id);

      if (sourceId === null || targetId === null) return;
      if (!siguientesPorNodo.has(sourceId) || !nodosPorId.has(targetId)) return;

      const actuales = siguientesPorNodo.get(sourceId) ?? [];
      if (!actuales.includes(targetId)) {
        siguientesPorNodo.set(sourceId, [...actuales, targetId]);
      }
    });

    const flujoActualizado = baseNodes.map(nodo => {
      const posicion = posicionesPorNodo.get(nodo.id);
      const siguientes = siguientesPorNodo.get(nodo.id) ?? [];

      return {
        ...nodo,
        posicionX: posicion ? posicion.x : nodo.posicionX,
        posicionY: posicion ? posicion.y : nodo.posicionY,
        siguientesIds: [...siguientes]
      };
    });

    const snapshot = this.crearSnapshotFlujo(flujoActualizado);
    if (snapshot === this.ultimoSnapshotFlujo) return;

    this.ultimoSnapshotFlujo = snapshot;
    this.flujoActualizadoEvt.emit(flujoActualizado);
  }

  private obtenerNodoIdDesdeElemento(elementId: string | undefined, idNodoInicio: number): number | null {
    if (!elementId) return null;
    if (elementId === 'StartEvent_1') return idNodoInicio;

    const taskMatch = elementId.match(/^Task_(\d+)$/);
    if (!taskMatch) return null;
    return Number(taskMatch[1]);
  }

  private crearSnapshotFlujo(nodes: FlujoNodo[]): string {
    const normalizados = [...nodes]
      .sort((a, b) => a.id - b.id)
      .map(nodo => ({
        id: nodo.id,
        posicionX: nodo.posicionX ?? null,
        posicionY: nodo.posicionY ?? null,
        siguientesIds: [...(nodo.siguientesIds || [])].sort((a, b) => a - b)
      }));

    return JSON.stringify(normalizados);
  }

  private buildBpmnXml(): string {
    const nodes = this.normalizarNodos();
    const startNode = nodes.find(n => n.tipo === 'inicio') ?? nodes[0];
    const taskNodes = nodes.filter(n => n.tipo !== 'inicio');

    const startId = 'StartEvent_1';
    const nodeId = (n: FlujoNodo): string => (n.tipo === 'inicio' ? startId : `Task_${n.id}`);

    const flows: Array<{ id: string; source: string; target: string }> = [];

    const startTargets = startNode.siguientesIds.length
      ? startNode.siguientesIds
      : (taskNodes.length ? [taskNodes[0].id] : []);

    startTargets.forEach(targetId => {
      flows.push({
        id: `Flow_${startNode.id}_${targetId}`,
        source: startId,
        target: `Task_${targetId}`
      });
    });

    nodes.forEach(nodo => {
      if (nodo.tipo === 'inicio') return;
      if (nodo.siguientesIds.length) {
        nodo.siguientesIds.forEach(targetId => {
          flows.push({
            id: `Flow_${nodo.id}_${targetId}`,
            source: nodeId(nodo),
            target: `Task_${targetId}`
          });
        });
      }
    });

    const shapes = this.buildShapes(nodes, startId);
    const edges = this.buildEdges(flows, shapes);

    const processElements = [
      `<bpmn:startEvent id="${startId}" name="Inicio" />`,
      ...taskNodes.map(n => `<bpmn:task id="${nodeId(n)}" name="${this.escapeXml(n.nombre)}" />`),
      ...flows.map(f => `<bpmn:sequenceFlow id="${f.id}" sourceRef="${f.source}" targetRef="${f.target}" />`)
    ].join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    ${processElements}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      ${shapes.map(s => `<bpmndi:BPMNShape id="${s.id}_di" bpmnElement="${s.id}"><dc:Bounds x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" /></bpmndi:BPMNShape>`).join('')}
      ${edges.map(e => `<bpmndi:BPMNEdge id="${e.id}_di" bpmnElement="${e.id}">${e.waypoints.map(p => `<di:waypoint x="${p.x}" y="${p.y}" />`).join('')}</bpmndi:BPMNEdge>`).join('')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
  }

  private normalizarNodos(): FlujoNodo[] {
    const nodos = Array.isArray(this.flujoNodos) ? this.flujoNodos : [];

    if (nodos.length === 0) {
      return [{ id: 1, nombre: 'Inicio', tipo: 'inicio', siguientesIds: [] }];
    }
    const tieneInicio = nodos.some(n => n.tipo === 'inicio');
    if (tieneInicio) {
      return nodos.map(nodo => ({
        ...nodo,
        siguientesIds: Array.isArray(nodo.siguientesIds) ? [...nodo.siguientesIds] : [],
        estadoActividad: nodo.tipo === 'tarea' ? (nodo.estadoActividad || 'Pendiente') : undefined
      }));
    }
    return [
      { id: 1, nombre: 'Inicio', tipo: 'inicio', siguientesIds: [] },
      ...nodos.map(nodo => ({
        ...nodo,
        siguientesIds: Array.isArray(nodo.siguientesIds) ? [...nodo.siguientesIds] : [],
        estadoActividad: nodo.tipo === 'tarea' ? (nodo.estadoActividad || 'Pendiente') : undefined
      }))
    ];
  }

  private buildShapes(nodes: FlujoNodo[], startId: string): Array<{ id: string; x: number; y: number; width: number; height: number }> {
    const shapes: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
    const start = nodes.find(n => n.tipo === 'inicio') ?? nodes[0];
    const tasks = nodes.filter(n => n.tipo !== 'inicio');

    const xInicio = typeof start.posicionX === 'number' ? start.posicionX : 105;
    const yInicio = typeof start.posicionY === 'number' ? start.posicionY : 118;
    shapes.push({ id: startId, x: xInicio, y: yInicio, width: 32, height: 32 });

    const nivelPorNodo = new Map<number, number>();
    const visitados = new Set<number>([start.id]);
    const cola: Array<{ id: number; nivel: number }> = (start.siguientesIds || []).map(id => ({ id, nivel: 1 }));

    while (cola.length > 0) {
      const actual = cola.shift()!;
      const previo = nivelPorNodo.get(actual.id);
      if (previo === undefined || actual.nivel < previo) {
        nivelPorNodo.set(actual.id, actual.nivel);
      }

      if (visitados.has(actual.id)) continue;
      visitados.add(actual.id);

      const nodo = tasks.find(n => n.id === actual.id);
      if (!nodo) continue;

      (nodo.siguientesIds || []).forEach(siguienteId => {
        cola.push({ id: siguienteId, nivel: actual.nivel + 1 });
      });
    }

    let nivelFallback = Math.max(1, ...Array.from(nivelPorNodo.values(), nivel => nivel + 1));
    tasks.forEach(nodo => {
      if (!nivelPorNodo.has(nodo.id)) {
        nivelPorNodo.set(nodo.id, nivelFallback);
        nivelFallback += 1;
      }
    });

    const gruposPorNivel = new Map<number, FlujoNodo[]>();
    tasks.forEach(nodo => {
      const nivel = nivelPorNodo.get(nodo.id) ?? 1;
      const grupo = gruposPorNivel.get(nivel) ?? [];
      grupo.push(nodo);
      gruposPorNivel.set(nivel, grupo);
    });

    const nivelesOrdenados = Array.from(gruposPorNivel.keys()).sort((a, b) => a - b);
    nivelesOrdenados.forEach(nivel => {
      const nodosNivel = (gruposPorNivel.get(nivel) ?? []).sort((a, b) => a.id - b.id);
      const centroY = yInicio - 16;

      nodosNivel.forEach((nodo, indice) => {
        const autoX = xInicio + 135 + (nivel - 1) * 220;
        const autoY = centroY + (indice - (nodosNivel.length - 1) / 2) * 125;

        const x = typeof nodo.posicionX === 'number' ? nodo.posicionX : autoX;
        const y = typeof nodo.posicionY === 'number' ? nodo.posicionY : autoY;
        shapes.push({ id: `Task_${nodo.id}`, x, y, width: 110, height: 66 });
      });
    });

    return shapes;
  }

  private buildEdges(flows: Array<{ id: string; source: string; target: string }>, shapes: Array<{ id: string; x: number; y: number; width: number; height: number }>): Array<{ id: string; waypoints: Array<{ x: number; y: number }> }>
  {
    const shapeById = (id: string): { id: string; x: number; y: number; width: number; height: number } | undefined =>
      shapes.find(s => s.id === id);

    const esTask = (id: string): boolean => /^Task_\d+$/.test(id);

    const puntoSalida = (id: string): { x: number; y: number } => {
      const shape = shapeById(id);
      if (!shape) return { x: 0, y: 0 };

      if (esTask(id)) {
        // Conectar desde la zona superior del task para no cruzar el texto central.
        return { x: shape.x + shape.width, y: shape.y + 18 };
      }

      return { x: shape.x + shape.width, y: shape.y + shape.height / 2 };
    };

    const puntoEntrada = (id: string): { x: number; y: number } => {
      const shape = shapeById(id);
      if (!shape) return { x: 0, y: 0 };

      if (esTask(id)) {
        return { x: shape.x, y: shape.y + 18 };
      }

      return { x: shape.x, y: shape.y + shape.height / 2 };
    };

    return flows.map(flow => {
      const source = puntoSalida(flow.source);
      const target = puntoEntrada(flow.target);

      const midX = source.x + (target.x - source.x) / 2;
      return {
        id: flow.id,
        waypoints: [
          source,
          { x: midX, y: source.y },
          { x: midX, y: target.y },
          target
        ]
      };
    });
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

}
