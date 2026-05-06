import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoriquePositionComponent } from './historique-position.component';

describe('HistoriquePositionComponent', () => {
  let component: HistoriquePositionComponent;
  let fixture: ComponentFixture<HistoriquePositionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriquePositionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoriquePositionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
