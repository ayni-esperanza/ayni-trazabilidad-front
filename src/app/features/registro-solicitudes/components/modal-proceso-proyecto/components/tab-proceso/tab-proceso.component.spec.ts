import { TabProcesoComponent } from './tab-proceso.component';

describe('TabProcesoComponent', () => {
  function createComponent(): TabProcesoComponent {
    return new TabProcesoComponent(
      'browser',
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
  }

  it('sums all money linked to the same activity dependency', () => {
    const component = createComponent();
    component.costosMateriales = [
      { dependenciaActividadId: 10, costoTotal: 25 },
      { dependenciaActividadId: 11, costoTotal: 99 },
      { dependenciaActividadId: 10, costoTotal: '14.5' as unknown as number },
    ];
    component.costosManoObra = [
      { dependenciaActividadId: 10, costoTotal: 60 },
    ];
    component.costosOtros = [
      { dependenciaActividadId: 10, costoTotal: 5.5 },
      { dependenciaActividadId: null, costoTotal: 1000 },
    ];

    expect(component.getCostoDependenciaActividad(10)).toBe(105);
    expect(component.getCostoDependenciaActividad(11)).toBe(99);
  });

  it('ignores invalid dependency ids and missing totals', () => {
    const component = createComponent();
    component.costosMateriales = [
      { dependenciaActividadId: undefined, costoTotal: 50 },
      { dependenciaActividadId: 'abc' as unknown as number, costoTotal: 20 },
      { dependenciaActividadId: 7, costoTotal: 30 },
    ];
    component.costosManoObra = [];
    component.costosOtros = [
      { dependenciaActividadId: 7, costoTotal: Number.NaN },
    ];

    expect(component.getCostoDependenciaActividad(7)).toBe(30);
  });
});
