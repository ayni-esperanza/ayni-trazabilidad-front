const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'src', 'app', 'features', 'registro-solicitudes', 'components', 'modal-proceso-proyecto', 'modal-proceso-proyecto.component.html');
let content = fs.readFileSync(htmlPath, 'utf8');

const bodyMarker = '<!-- Body -->';
const footerMarker = '    <!-- Footer -->';

const i1 = content.indexOf(bodyMarker);
const i2 = content.indexOf(footerMarker);

if (i1 === -1 || i2 === -1) {
  console.error('Markers not found! i1=' + i1 + ', i2=' + i2);
  process.exit(1);
}

const before = content.substring(0, i1);
const after = content.substring(i2);

const newBody = `<!-- Body -->
    <div class="p-4 overflow-y-auto flex-1">

      <!-- ========== TAB PROCESO ========== -->
      <app-tab-proceso *ngIf="tabActiva === 'proceso'"
        [proyecto]="proyecto"
        [etapas]="etapas"
        [etapaSeleccionada]="etapaSeleccionada"
        [etapaForm]="etapaForm"
        [responsables]="responsables"
        [modoSoloLectura]="modoSoloLectura"
        [proyectoFinalizado]="proyectoFinalizado"
        [proyectoCancelado]="proyectoCancelado"
        [todasEtapasCompletadas]="todasEtapasCompletadas"
        [intentoFinalizarEtapa]="intentoFinalizarEtapa"
        [erroresEtapa]="erroresEtapa"
        (seleccionarEtapaEvt)="seleccionarEtapa($event)"
        (abrirActividadEvt)="abrirModalActividad()">
      </app-tab-proceso>

      <!-- ========== TAB INFORMACIÓN ========== -->
      <app-tab-informacion *ngIf="tabActiva === 'informacion'"
        [proyecto]="proyecto"
        [proyectoInfoForm]="proyectoInfoForm"
        [responsables]="responsables"
        [procesos]="procesos"
        [etapas]="etapas"
        [modoSoloLectura]="modoSoloLectura"
        [proyectoFinalizado]="proyectoFinalizado"
        [proyectoCancelado]="proyectoCancelado">
      </app-tab-informacion>

      <!-- ========== TAB COSTOS ========== -->
      <app-tab-costos *ngIf="tabActiva === 'costos'"
        [materiales]="materiales"
        [manoObra]="manoObra"
        [tablasCostosExtras]="tablasCostosExtras"
        [modoSoloLectura]="modoSoloLectura">
      </app-tab-costos>

    </div>

    `;

const newContent = before + newBody + after;
fs.writeFileSync(htmlPath, newContent, 'utf8');
const lines = newContent.split('\n').length;
console.log('SUCCESS - Lines written:', lines);
