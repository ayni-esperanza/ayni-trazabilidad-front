# TrazabilidadFront

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.17.

## Development server

To start a local development server, run:

```bash
cp .env.example .env
pnpm install
pnpm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

`pnpm start` genera `public/env.js` desde `.env` para runtime local.

## Docker

### Build local image

```bash
docker build -t ayni-front:local .
```

### Run local container

```bash
docker run --rm -p 4000:4000 \
  -e API_URL=http://localhost:8080/api/v1 \
  -e ADMIN_USERNAME=admin \
  -e APP_BASE_PATH=/ \
  ayni-front:local
```

### Dokploy

- Usa el `Dockerfile` de este repo.
- Internal port del servicio: `4000`.
- Define en panel: `API_URL`, `ADMIN_USERNAME` y opcional `APP_BASE_PATH`.
- El servidor SSR expone `${APP_BASE_PATH}env.js` dinámico con esas variables.
- Si publicas en `linea.aynisac.com/trazabilidad`, usa `APP_BASE_PATH=/trazabilidad/`.
- En dominio/path de Dokploy usa `Path=/trazabilidad`, `Internal Path=/` y `Strip Path` desactivado.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
