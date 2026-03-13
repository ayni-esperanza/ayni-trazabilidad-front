import { Component, Input, Output, EventEmitter, AfterViewInit, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Proyecto, Responsable, FlujoNodo } from '../../../../models/solicitud.model';

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

  @Output() abrirActividadEvt = new EventEmitter<void>();

  @ViewChild('bpmnCanvas', { static: false }) bpmnCanvas?: ElementRef<HTMLDivElement>;

  private bpmnModeler: any;
  private isBrowser = false;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser || !this.bpmnCanvas) return;
    const { default: BpmnJS } = await import('bpmn-js/lib/Modeler');
    this.bpmnModeler = new BpmnJS({
      container: this.bpmnCanvas.nativeElement
    });
    await this.renderBpmn();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (!this.bpmnModeler) return;
    if (changes['flujoNodos']) {
      await this.renderBpmn();
    }
  }

  ngOnDestroy(): void {
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
    if (!nodo.siguientesIds.length) return 'Sin conexiones';
    const nombres = nodo.siguientesIds
      .map(id => this.flujoNodos.find(n => n.id === id)?.nombre)
      .filter((nombre): nombre is string => !!nombre);
    return nombres.length ? nombres.join(', ') : 'Sin conexiones';
  }

  private async renderBpmn(): Promise<void> {
    if (!this.bpmnModeler) return;
    const xml = this.buildBpmnXml();
    await this.bpmnModeler.importXML(xml);
    const canvas = this.bpmnModeler.get('canvas');
    canvas.zoom('fit-viewport');
  }

  private buildBpmnXml(): string {
    const nodes = this.normalizarNodos();
    const startNode = nodes.find(n => n.tipo === 'inicio') ?? nodes[0];
    const taskNodes = nodes.filter(n => n.tipo !== 'inicio');

    const startId = 'StartEvent_1';
    const endId = 'EndEvent_1';
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
      } else {
        flows.push({
          id: `Flow_${nodo.id}_end`,
          source: nodeId(nodo),
          target: endId
        });
      }
    });

    if (!taskNodes.length) {
      flows.push({ id: 'Flow_start_end', source: startId, target: endId });
    }

    const shapes = this.buildShapes(nodes, startId, endId);
    const edges = this.buildEdges(flows, shapes);

    const processElements = [
      `<bpmn:startEvent id="${startId}" name="Inicio" />`,
      ...taskNodes.map(n => `<bpmn:task id="${nodeId(n)}" name="${this.escapeXml(n.nombre)}" />`),
      `<bpmn:endEvent id="${endId}" name="Fin" />`,
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
    if (this.flujoNodos.length === 0) {
      return [{ id: 1, nombre: 'Inicio', tipo: 'inicio', siguientesIds: [] }];
    }
    const tieneInicio = this.flujoNodos.some(n => n.tipo === 'inicio');
    if (tieneInicio) return [...this.flujoNodos];
    return [{ id: 1, nombre: 'Inicio', tipo: 'inicio', siguientesIds: [] }, ...this.flujoNodos];
  }

  private buildShapes(nodes: FlujoNodo[], startId: string, endId: string): Array<{ id: string; x: number; y: number; width: number; height: number }> {
    const shapes: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
    const start = nodes.find(n => n.tipo === 'inicio') ?? nodes[0];
    const tasks = nodes.filter(n => n.tipo !== 'inicio');

    let x = 120;
    const y = 120;
    shapes.push({ id: startId, x, y, width: 36, height: 36 });
    x += 160;

    tasks.forEach(n => {
      shapes.push({ id: `Task_${n.id}`, x, y: y - 22, width: 120, height: 80 });
      x += 180;
    });

    shapes.push({ id: endId, x, y, width: 36, height: 36 });
    return shapes;
  }

  private buildEdges(flows: Array<{ id: string; source: string; target: string }>, shapes: Array<{ id: string; x: number; y: number; width: number; height: number }>): Array<{ id: string; waypoints: Array<{ x: number; y: number }> }>
  {
    const center = (id: string): { x: number; y: number } => {
      const shape = shapes.find(s => s.id === id);
      if (!shape) return { x: 0, y: 0 };
      return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
    };

    return flows.map(flow => {
      const source = center(flow.source);
      const target = center(flow.target);
      return {
        id: flow.id,
        waypoints: [source, target]
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
