import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StastiqueDiagnosticComponent } from './stastique-diagnostic.component';

describe('StastiqueDiagnosticComponent', () => {
  let component: StastiqueDiagnosticComponent;
  let fixture: ComponentFixture<StastiqueDiagnosticComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StastiqueDiagnosticComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StastiqueDiagnosticComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
