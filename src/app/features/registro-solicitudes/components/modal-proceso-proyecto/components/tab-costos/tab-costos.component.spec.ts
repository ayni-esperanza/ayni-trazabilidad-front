import { TabCostosComponent } from './tab-costos.component';

describe('TabCostosComponent', () => {
  function createComponent(): TabCostosComponent {
    const component = new TabCostosComponent({} as any);
    component.materiales = [];
    component.manoObra = [];
    component.tablasCostosExtras = [];
    return component;
  }

  it('calculates material, labor, extra and grand totals as numbers', () => {
    const component = createComponent();
    component.materiales = [
      { id: 1, fecha: '', nroComprobante: '', producto: 'Cable', cantidad: 2, costoUnitario: 10, costoTotal: 20, encargado: '' },
      { id: 2, fecha: '', nroComprobante: '', producto: 'Tubo', cantidad: 1, costoUnitario: 15, costoTotal: '15.5' as unknown as number, encargado: '' },
    ];
    component.manoObra = [
      { id: 1, trabajador: 'Ana', oficio: 'Tecnico', diasTrabajando: 2, costoPorDia: 30, costoTotal: 60 as number },
    ];
    component.tablasCostosExtras = [
      {
        id: 1,
        nombre: 'Viaticos',
        expandida: true,
        items: [
          { id: 1, fecha: '', descripcion: 'Taxi', cantidad: 1, costoUnitario: 12.5, costoTotal: '12.5' as unknown as number, encargado: '' },
        ],
      },
    ];

    expect(component.totalMateriales).toBe(35.5);
    expect(component.totalManoObra).toBe(60);
    expect(component.totalOtrosCostos).toBe(12.5);
    expect(component.totalCostosGeneral).toBe(108);
  });

  it('recalculates row totals and emits changes', () => {
    const component = createComponent();
    spyOn(component.costosChange, 'emit');

    const material = {
      id: 1,
      fecha: '',
      nroComprobante: '',
      producto: 'Cable',
      cantidad: 3,
      costoUnitario: 14.5,
      costoTotal: 0,
      encargado: '',
    };

    component.calcularCostoTotalMaterial(material);

    expect(material.costoTotal).toBe(43.5);
    expect(component.costosChange.emit).toHaveBeenCalled();
  });

  it('groups extra costs by category for the summary view', () => {
    const component = createComponent();
    component.tablasCostosExtras = [
      {
        id: 1,
        nombre: 'Viaticos',
        expandida: true,
        items: [
          { id: 1, fecha: '', descripcion: 'Taxi', cantidad: 1, costoUnitario: 10, costoTotal: 10, encargado: '' },
          { id: 2, fecha: '', descripcion: 'Peaje', cantidad: 1, costoUnitario: 5, costoTotal: 5, encargado: '' },
        ],
      },
      {
        id: 2,
        nombre: 'Hospedaje',
        expandida: true,
        items: [
          { id: 1, fecha: '', descripcion: 'Hotel', cantidad: 1, costoUnitario: 80, costoTotal: 80, encargado: '' },
        ],
      },
    ];

    expect(component.otrosCostosPorCategoria).toEqual([
      { nombre: 'Hospedaje', total: 80 },
      { nombre: 'Viaticos', total: 15 },
    ]);
  });
});
