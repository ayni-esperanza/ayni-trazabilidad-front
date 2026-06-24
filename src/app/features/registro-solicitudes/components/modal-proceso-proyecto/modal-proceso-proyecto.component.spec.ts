import { ModalProcesoProyectoComponent } from './modal-proceso-proyecto.component';

describe('ModalProcesoProyectoComponent', () => {
  function createComponent(): ModalProcesoProyectoComponent {
    return new ModalProcesoProyectoComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
  }

  it('aggregates money totals consistently for the summary tabs', () => {
    const component = createComponent();
    component.materiales = [
      { id: 1, fecha: '', nroComprobante: '', producto: 'Cable', cantidad: 1, costoUnitario: 20, costoTotal: 20, encargado: '' },
      { id: 2, fecha: '', nroComprobante: '', producto: 'Tubo', cantidad: 1, costoUnitario: 15, costoTotal: '15' as unknown as number, encargado: '' },
    ];
    component.manoObra = [
      { id: 1, trabajador: 'Luis', oficio: 'Tecnico', diasTrabajando: 2, costoPorDia: 40, costoTotal: 80, dependenciaActividadId: 3 },
    ];
    component.tablasCostosExtras = [
      {
        id: 1,
        nombre: 'Viaticos',
        expandida: true,
        items: [
          { id: 1, fecha: '', descripcion: 'Taxi', cantidad: 1, costoUnitario: 10, costoTotal: 10, encargado: '' },
          { id: 2, fecha: '', descripcion: 'Peaje', cantidad: 1, costoUnitario: 2.5, costoTotal: '2.5' as unknown as number, encargado: '' },
        ],
      },
    ];

    expect(component.totalMateriales).toBe(35);
    expect(component.totalManoObra).toBe(80);
    expect(component.totalOtrosCostos).toBe(12.5);
    expect(component.totalCostosGeneral).toBe(127.5);
    expect(component.otrosCostosItems.length).toBe(2);
  });
});
