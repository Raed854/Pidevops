import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisponibiliteAccompagnantComponent } from './disponibilite-accompagnant.component';

describe('DisponibiliteAccompagnantComponent', () => {
  let component: DisponibiliteAccompagnantComponent;
  let fixture: ComponentFixture<DisponibiliteAccompagnantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisponibiliteAccompagnantComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisponibiliteAccompagnantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
