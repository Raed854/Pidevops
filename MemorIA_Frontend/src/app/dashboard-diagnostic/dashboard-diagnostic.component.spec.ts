import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardDiagnosticComponent } from './dashboard-diagnostic.component';

describe('DashboardDiagnosticComponent', () => {
  let component: DashboardDiagnosticComponent;
  let fixture: ComponentFixture<DashboardDiagnosticComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardDiagnosticComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardDiagnosticComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
