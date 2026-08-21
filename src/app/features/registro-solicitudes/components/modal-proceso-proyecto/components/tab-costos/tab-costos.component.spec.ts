import { TabCostosComponent } from './tab-costos.component';

describe('TabCostosComponent', () => {
  function createComponent(): TabCostosComponent {
    const component = new TabCostosComponent({} as any, {} as any, {} as any);
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
          { id: 2, fecha: '', descripcion: 'Peaje', cantidad: 1, costoUnitario: 0, costoTotal: 0, costoUnitarioUsd: 5, costoTotalUsd: 5, moneda: 'USD', encargado: '' },
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
      { nombre: 'Hospedaje', pen: 80, usd: 0 },
      { nombre: 'Viaticos', pen: 10, usd: 5 },
    ]);
    expect(component.totalOtrosCostosPorMoneda).toEqual({ pen: 90, usd: 5 });
  });

  it('keeps PEN and USD separated in the grand summary', () => {
    const component = createComponent();
    component.materiales = [
      { id: 1, fecha: '', nroComprobante: '', producto: 'Cable', cantidad: 1, costoUnitario: 20, costoTotal: 20, moneda: 'PEN', encargado: '' },
      { id: 2, fecha: '', nroComprobante: '', producto: 'Equipo', cantidad: 1, costoUnitario: 0, costoTotal: 0, costoUnitarioUsd: 30, costoTotalUsd: 30, moneda: 'USD', encargado: '' },
    ];
    component.manoObra = [
      { id: 1, trabajador: 'Ana', oficio: 'Técnico', diasTrabajando: 1, costoPorDia: 0, costoTotal: 0, costoPorDiaUsd: 15, costoTotalUsd: 15, moneda: 'USD' },
    ];

    expect(component.totalCostosGeneralPorMoneda).toEqual({ pen: 20, usd: 45 });
  });

  it('imports unit costs in dollars for materials and calculates their total', () => {
    const component = createComponent();

    (component as any).importarMateriales([{
      Fecha: '20/08/2026',
      'Nº de comprobante': 'F001-10',
      Producto: 'Cable',
      Cantidad: 3,
      'Costo unitario': '',
      'Costo unitario en dólares': 12.5,
      Encargado: 'Ana',
    }]);

    expect(component.materiales[0]).toEqual(jasmine.objectContaining({
      costoUnitario: null,
      costoTotal: 0,
      costoUnitarioUsd: 12.5,
      costoTotalUsd: 37.5,
      moneda: 'USD',
    }));
  });

  it('imports daily costs in dollars for labor and calculates their total', () => {
    const component = createComponent();

    (component as any).importarManoObra([{
      Trabajador: 'Luis',
      'Días trabajando': 4,
      'Costo por día': '',
      'Costo por día USD': '25,50',
    }]);

    expect(component.manoObra[0]).toEqual(jasmine.objectContaining({
      costoPorDia: null,
      costoTotal: 0,
      costoPorDiaUsd: 25.5,
      costoTotalUsd: 102,
      moneda: 'USD',
    }));
  });

  it('imports unit costs in dollars for additional costs and calculates their total', () => {
    const component = createComponent();

    (component as any).importarOtrosCostos([{
      Fecha: '2026-08-20',
      Categoría: 'Viáticos',
      Descripción: 'Hospedaje',
      Cantidad: 2,
      'Costo unitario': 0,
      'Precio unitario en dólares': 40,
      Encargado: 'María',
    }]);

    expect(component.tablasCostosExtras[0].items[0]).toEqual(jasmine.objectContaining({
      costoUnitario: 0,
      costoTotal: 0,
      costoUnitarioUsd: 40,
      costoTotalUsd: 80,
      moneda: 'USD',
    }));
  });

  it('reports the Excel row and columns when a material has costs in both currencies', () => {
    const component = createComponent();

    const mensaje = (component as any).validarDatosExcel('materiales', [{
      Producto: 'Cable',
      Cantidad: 2,
      'Costo unitario': 10,
      'Costo unitario en dólares': 3,
    }]);

    expect(mensaje).toContain('fila 2');
    expect(mensaje).toContain('"Costo unitario"');
    expect(mensaje).toContain('"Costo unitario en dólares"');
  });

  it('reports every conflicting labor row before importing the file', () => {
    const component = createComponent();

    const mensaje = (component as any).validarDatosExcel('manoObra', [
      { Trabajador: 'Ana', 'Costo por día': 20, 'Costo por día en dólares': 5 },
      { Trabajador: 'Luis', 'Costo por día': '', 'Costo por día en dólares': 8 },
      { Trabajador: 'Rosa', 'Costo por día': 30, 'Costo por día USD': 9 },
    ]);

    expect(mensaje).toContain('Fila 2');
    expect(mensaje).toContain('Fila 4');
    expect(mensaje).toContain('"Costo por día"');
    expect(mensaje).toContain('"Costo por día en dólares"');
  });

  it('reports invalid dates with their Excel row, column and value', () => {
    const component = createComponent();

    const mensaje = (component as any).validarDatosExcel('otrosCostos', [{
      Fecha: '31/02/2026',
      Cantidad: 1,
      'Costo unitario': 20,
      'Costo unitario en dólares': '',
    }]);

    expect(mensaje).toContain('Fila 2, columna "Fecha"');
    expect(mensaje).toContain('"31/02/2026"');
    expect(mensaje).toContain('DD/MM/AAAA o AAAA-MM-DD');
  });

  it('reports non-numeric quantities and costs with their row, column and value', () => {
    const component = createComponent();

    const mensaje = (component as any).validarDatosExcel('materiales', [{
      Fecha: '20/08/2026',
      Cantidad: 'dos',
      'Costo unitario': 'S/ 10',
      'Costo unitario en dólares': 'USD 3',
    }]);

    expect(mensaje).toContain('Fila 2, columna "Cantidad": "dos"');
    expect(mensaje).toContain('columna "Costo unitario": "S/ 10"');
    expect(mensaje).toContain('columna "Costo unitario en dólares": "USD 3"');
  });
});
