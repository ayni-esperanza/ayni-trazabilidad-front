# Estructura de Carpetas - Sistema de Trazabilidad AYNI

## 📂 Arquitectura del Proyecto

El proyecto está organizado siguiendo las mejores prácticas de Angular con arquitectura modular SPA (Single Page Application).

### Estructura Principal

```
src/app/
├── core/                      # Funcionalidades core de la aplicación
│   ├── guards/               # Guards de autenticación y autorización
│   ├── interceptors/         # Interceptores HTTP
│   └── services/            # Servicios globales (auth, http)
│
├── features/                 # Módulos de funcionalidades (7 secciones)
│   ├── tablero-control/
│   ├── registro-solicitudes/
│   ├── asignacion-tareas/
│   ├── informes-evidencias/
│   ├── estadisticas-indicadores/
│   ├── gestion-usuarios/
│   └── configuracion-procesos/
│
└── shared/                   # Componentes y utilidades compartidas
    ├── components/
    └── pipes/
```

## 🎯 Las 7 Secciones Principales

### 1️⃣ Tablero de Control
**Ruta:** `/tablero-control`
**Descripción:** Panel principal con métricas, gráficos y tablas de proyectos activos y en curso.

**Estructura:**
```
tablero-control/
├── tablero-control.component.ts
├── tablero-control.component.html
├── tablero-control.component.css
├── services/
│   └── tablero-control.service.ts
└── models/
    └── tablero.model.ts
```

**Funcionalidades:**
- Visualización de proyectos finalizados
- Métricas de gastos
- Proyectos activos
- Tabla de proyectos en curso
- Tabla de tareas de encargados

---

### 2️⃣ Registro de Solicitudes
**Ruta:** `/registro-solicitudes`
**Descripción:** Gestión completa de solicitudes del sistema.

**Estructura:**
```
registro-solicitudes/
├── registro-solicitudes.component.ts
├── registro-solicitudes.component.html
├── registro-solicitudes.component.css
├── services/
│   └── registro-solicitudes.service.ts
└── models/
    └── solicitud.model.ts
```

**Funcionalidades:**
- Crear nuevas solicitudes
- Listar solicitudes registradas
- Filtrar y buscar solicitudes
- Actualizar estado de solicitudes

---

### 3️⃣ Asignación de Tareas
**Ruta:** `/asignacion-tareas`
**Descripción:** Gestión y asignación de tareas a usuarios.

**Estructura:**
```
asignacion-tareas/
├── asignacion-tareas.component.ts
├── asignacion-tareas.component.html
├── asignacion-tareas.component.css
├── services/
│   └── asignacion-tareas.service.ts
└── models/
    └── tarea.model.ts
```

**Funcionalidades:**
- Asignar tareas a usuarios
- Vista de tareas por proyecto
- Vista de tareas por usuario
- Calendario de tareas
- Reasignar tareas

---

### 4️⃣ Informes y Evidencias
**Ruta:** `/informes-evidencias`
**Descripción:** Generación de informes y gestión de evidencias documentales.

**Estructura:**
```
informes-evidencias/
├── informes-evidencias.component.ts
├── informes-evidencias.component.html
├── informes-evidencias.component.css
├── services/
│   └── informes-evidencias.service.ts
└── models/
    └── informe.model.ts
```

**Funcionalidades:**
- Generar informes personalizados
- Descargar informes (PDF, Excel, Word)
- Repositorio de evidencias
- Subir y descargar documentos
- Visor de documentos

---

### 5️⃣ Estadísticas e Indicadores
**Ruta:** `/estadisticas-indicadores`
**Descripción:** Visualización de KPIs, estadísticas y tendencias.

**Estructura:**
```
estadisticas-indicadores/
├── estadisticas-indicadores.component.ts
├── estadisticas-indicadores.component.html
├── estadisticas-indicadores.component.css
├── services/
│   └── estadisticas-indicadores.service.ts
└── models/
    └── estadistica.model.ts
```

**Funcionalidades:**
- KPIs principales
- Gráficos de tendencias
- Indicadores por proyecto
- Indicadores de rendimiento
- Gráficos comparativos

---

### 6️⃣ Gestión de Usuarios
**Ruta:** `/gestion-usuarios`
**Descripción:** Administración de usuarios, roles y permisos.

**Estructura:**
```
gestion-usuarios/
├── gestion-usuarios.component.ts
├── gestion-usuarios.component.html
├── gestion-usuarios.component.css
├── services/
│   └── gestion-usuarios.service.ts
└── models/
    └── usuario.model.ts
```

**Funcionalidades:**
- CRUD de usuarios
- Gestión de roles
- Asignación de permisos
- Activar/desactivar usuarios
- Historial de actividad

---

### 7️⃣ Configuración de Procesos
**Ruta:** `/configuracion-procesos`
**Descripción:** Configuración de flujos de trabajo y procesos.

**Estructura:**
```
configuracion-procesos/
├── configuracion-procesos.component.ts
├── configuracion-procesos.component.html
├── configuracion-procesos.component.css
├── services/
│   └── configuracion-procesos.service.ts
└── models/
    └── proceso.model.ts
```

**Funcionalidades:**
- Gestión de procesos
- Flujos de trabajo
- Plantillas de proyectos
- Gestión de etapas y estados
- Configuración de notificaciones
- Configuración general

---

## 🔧 Componentes Core

### Services Globales

#### HttpService
Servicio centralizado para todas las llamadas HTTP al backend.
```typescript
// Ubicación: src/app/core/services/http.service.ts
```

#### AuthService
Gestión de autenticación y autorización.
```typescript
// Ubicación: src/app/core/services/auth.service.ts
```

### Interceptors

#### authInterceptor
Añade el token JWT a todas las peticiones HTTP.
```typescript
// Ubicación: src/app/core/interceptors/auth.interceptor.ts
```

#### errorInterceptor
Manejo centralizado de errores HTTP.
```typescript
// Ubicación: src/app/core/interceptors/error.interceptor.ts
```

### Guards

#### authGuard
Protege rutas que requieren autenticación.
```typescript
// Ubicación: src/app/core/guards/auth.guard.ts
```

---

## 📦 Componentes Compartidos

### TablaGenericaComponent
Componente reutilizable para mostrar tablas de datos.
```typescript
// Ubicación: src/app/shared/components/tabla-generica/tabla-generica.component.ts
```

### Pipes

#### EstadoBadgePipe
Transforma estados en clases CSS para badges.
```typescript
// Ubicación: src/app/shared/pipes/estado-badge.pipe.ts
```

---

## 🌐 Configuración de Entornos

### environment.ts
```typescript
// Ubicación: src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'
};
```

### environment.prod.ts
```typescript
// Ubicación: src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://tu-api-produccion.com/api'
};
```

---

## 🚀 Próximos Pasos para Desarrollo

### 1. Implementar Componentes Hijo
Cada sección principal necesita componentes específicos:
- Formularios
- Tablas específicas
- Gráficos
- Filtros

### 2. Conectar con Backend
- Actualizar la URL del API en `environment.ts`
- Implementar los métodos en los servicios
- Manejar respuestas y errores

### 3. Implementar Autenticación
- Crear página de login
- Implementar lógica de autenticación
- Proteger rutas con guards

### 4. Diseño UI/UX
- Añadir framework CSS (Material, Bootstrap, PrimeNG, etc.)
- Implementar diseño responsive
- Crear componentes de navegación

### 5. Testing
- Tests unitarios para servicios
- Tests de componentes
- Tests end-to-end

---

## 📋 Convenciones del Proyecto

### Nomenclatura
- **Componentes:** kebab-case (ej: `tablero-control.component.ts`)
- **Servicios:** kebab-case con sufijo `.service.ts`
- **Modelos:** kebab-case con sufijo `.model.ts`
- **Interfaces:** PascalCase (ej: `Usuario`, `Proyecto`)

### Estructura de Archivos
Cada módulo sigue la estructura:
```
nombre-modulo/
├── nombre-modulo.component.ts     # Lógica del componente
├── nombre-modulo.component.html   # Template
├── nombre-modulo.component.css    # Estilos
├── services/                      # Servicios específicos
│   └── *.service.ts
└── models/                        # Modelos/Interfaces
    └── *.model.ts
```

---

## 🔗 Integración con Backend

Todos los servicios están preparados para conectarse con el backend Spring Boot ubicado en:
```
ayni-trazabilidad-api/
```

### Endpoints Esperados (por implementar en backend)

```
/api/tablero-control/*
/api/solicitudes/*
/api/tareas/*
/api/informes/*
/api/estadisticas/*
/api/usuarios/*
/api/procesos/*
```

---

## 📝 Notas Adicionales

- Todos los componentes son **standalone** (Angular 17+)
- Preparado para **lazy loading** si se requiere optimización
- Arquitectura escalable y mantenible
- Separación clara de responsabilidades
- Listo para implementar state management (NgRx, Signals, etc.)
