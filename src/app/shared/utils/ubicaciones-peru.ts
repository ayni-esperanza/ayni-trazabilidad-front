import ubigeoData from 'ubigeo-peru/src/ubigeo-inei.json';

interface UbigeoEntry {
  departamento: string;
  provincia: string;
  distrito: string;
  nombre: string;
}

const data = ubigeoData as UbigeoEntry[];

// Un solo nombre por código de departamento (primera aparición con prov='00' y dist='00')
const deptMap = new Map<string, string>();
for (const e of data) {
  if (e.provincia === '00' && e.distrito === '00' && !deptMap.has(e.departamento)) {
    deptMap.set(e.departamento, e.nombre);
  }
}

export interface GrupoDepartamento {
  departamento: string;
  provincias: string[]; // formato: "Departamento, Provincia"
}

export const ubicacionesAgrupadas: GrupoDepartamento[] = Array.from(deptMap.entries()).map(([code, dept]) => ({
  departamento: dept,
  provincias: data
    .filter(e => e.departamento === code && e.distrito === '00' && e.provincia !== '00')
    .map(p => `${dept}, ${p.nombre}`)
}));
