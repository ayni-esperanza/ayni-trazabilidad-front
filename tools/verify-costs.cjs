const fs = require('node:fs');
const ts = require('typescript');
require('@angular/compiler');

require.extensions['.ts'] = function registerTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      importHelpers: false,
    },
    fileName: filename,
  });

  module._compile(outputText, filename);
};

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado=${String(expected)} actual=${String(actual)}`);
  }
}

const { ModalProcesoProyectoComponent } = require('../src/app/features/registro-solicitudes/components/modal-proceso-proyecto/modal-proceso-proyecto.component.ts');
const { TabCostosComponent } = require('../src/app/features/registro-solicitudes/components/modal-proceso-proyecto/components/tab-costos/tab-costos.component.ts');
const { TabProcesoComponent } = require('../src/app/features/registro-solicitudes/components/modal-proceso-proyecto/components/tab-proceso/tab-proceso.component.ts');

function verifyTabCostos() {
  const component = new TabCostosComponent({});
  component.materiales = [
    { id: 1, fecha: '', nroComprobante: '', producto: 'Cable', cantidad: 2, costoUnitario: 10, costoTotal: 20, encargado: '' },
    { id: 2, fecha: '', nroComprobante: '', producto: 'Tubo', cantidad: 1, costoUnitario: 15.5, costoTotal: '15.5', encargado: '' },
  ];
  component.manoObra = [
    { id: 1, trabajador: 'Ana', oficio: 'Tecnico', diasTrabajando: 2, costoPorDia: 30, costoTotal: 60 },
  ];
  component.tablasCostosExtras = [
    {
      id: 1,
      nombre: 'Viaticos',
      expandida: true,
      items: [
        { id: 1, fecha: '', descripcion: 'Taxi', cantidad: 1, costoUnitario: 12.5, costoTotal: '12.5', encargado: '' },
      ],
    },
  ];

  assertEqual(component.totalMateriales, 35.5, 'TabCostos totalMateriales');
  assertEqual(component.totalManoObra, 60, 'TabCostos totalManoObra');
  assertEqual(component.totalOtrosCostos, 12.5, 'TabCostos totalOtrosCostos');
  assertEqual(component.totalCostosGeneral, 108, 'TabCostos totalCostosGeneral');
}

function verifyModalResumen() {
  const component = new ModalProcesoProyectoComponent({}, {}, {}, {}, {});
  component.materiales = [
    { id: 1, fecha: '', nroComprobante: '', producto: 'Cable', cantidad: 1, costoUnitario: 20, costoTotal: 20, encargado: '' },
    { id: 2, fecha: '', nroComprobante: '', producto: 'Tubo', cantidad: 1, costoUnitario: 15, costoTotal: '15', encargado: '' },
  ];
  component.manoObra = [
    { id: 1, trabajador: 'Luis', oficio: 'Tecnico', diasTrabajando: 2, costoPorDia: 40, costoTotal: 80 },
  ];
  component.tablasCostosExtras = [
    {
      id: 1,
      nombre: 'Viaticos',
      expandida: true,
      items: [
        { id: 1, fecha: '', descripcion: 'Taxi', cantidad: 1, costoUnitario: 10, costoTotal: 10, encargado: '' },
        { id: 2, fecha: '', descripcion: 'Peaje', cantidad: 1, costoUnitario: 2.5, costoTotal: '2.5', encargado: '' },
      ],
    },
  ];

  assertEqual(component.totalMateriales, 35, 'Modal totalMateriales');
  assertEqual(component.totalManoObra, 80, 'Modal totalManoObra');
  assertEqual(component.totalOtrosCostos, 12.5, 'Modal totalOtrosCostos');
  assertEqual(component.totalCostosGeneral, 127.5, 'Modal totalCostosGeneral');
  assertEqual(component.otrosCostosItems.length, 2, 'Modal otrosCostosItems');
}

function verifyProcesoDependencias() {
  const component = new TabProcesoComponent('browser', {}, {}, {}, {}, {});
  component.costosMateriales = [
    { dependenciaActividadId: 10, costoTotal: 25 },
    { dependenciaActividadId: 11, costoTotal: 99 },
    { dependenciaActividadId: 10, costoTotal: '14.5' },
  ];
  component.costosManoObra = [
    { dependenciaActividadId: 10, costoTotal: 60 },
  ];
  component.costosOtros = [
    { dependenciaActividadId: 10, costoTotal: 5.5 },
    { dependenciaActividadId: null, costoTotal: 1000 },
  ];

  assertEqual(component.getCostoDependenciaActividad(10), 105, 'TabProceso costo actividad 10');
  assertEqual(component.getCostoDependenciaActividad(11), 99, 'TabProceso costo actividad 11');
}

verifyTabCostos();
verifyModalResumen();
verifyProcesoDependencias();

console.log('OK verify-costs');
