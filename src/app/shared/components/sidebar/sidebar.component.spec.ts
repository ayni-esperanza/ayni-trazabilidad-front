import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { SidebarComponent } from './sidebar.component';
import { AlertasActividadesService } from '../../../core/services/alertas-actividades.service';
import { AuthService } from '../../../core/services/auth.service';

describe('SidebarComponent', () => {
  const alertasServiceMock = {
    refrescarAlertas: jasmine.createSpy('refrescarAlertas'),
    obtenerAlertas: jasmine.createSpy('obtenerAlertas').and.returnValue([]),
  };

  const authServiceMock = {
    isAdminUser: jasmine.createSpy('isAdminUser').and.returnValue(true),
    getUserFullName: jasmine.createSpy('getUserFullName').and.returnValue('Admin User'),
    getAccessToken: jasmine.createSpy('getAccessToken').and.returnValue(null),
    getRefreshToken: jasmine.createSpy('getRefreshToken').and.returnValue(null),
  };
  let routerEvents$: Subject<NavigationEnd>;
  let routerMock: {
    events: Subject<NavigationEnd>;
    navigate: jasmine.Spy;
    url: string;
  };

  beforeEach(async () => {
    routerEvents$ = new Subject<NavigationEnd>();
    routerMock = {
      events: routerEvents$,
      navigate: jasmine.createSpy('navigate'),
      url: '/registro-solicitudes',
    };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: AlertasActividadesService, useValue: alertasServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    alertasServiceMock.refrescarAlertas.calls.reset();
    alertasServiceMock.obtenerAlertas.calls.reset();
    authServiceMock.getAccessToken.and.returnValue(null);
    authServiceMock.getRefreshToken.and.returnValue(null);
  });

  it('does not request alerts when there is no auth context', () => {
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();

    expect(alertasServiceMock.refrescarAlertas).not.toHaveBeenCalled();
    expect(fixture.componentInstance.alertasPendientes()).toBe(0);
  });

  it('keeps requesting alerts when an access token exists', () => {
    alertasServiceMock.refrescarAlertas.and.returnValue(of([
      {
        proyectoId: 1,
        nodoId: 1,
        nombreActividad: 'Actividad de prueba',
        estado: 'Pendiente',
        nivel: 'alta',
        horasSinCambio: 72,
        mensaje: 'Urgente: 3d sin cambio de estado',
      },
    ]));
    authServiceMock.getAccessToken.and.returnValue('token-activo');

    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();

    expect(alertasServiceMock.refrescarAlertas).toHaveBeenCalled();
    expect(fixture.componentInstance.alertasPendientes()).toBe(1);
  });
});
