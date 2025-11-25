import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelControl } from './panel-control';

describe('PanelControl', () => {
  let component: PanelControl;
  let fixture: ComponentFixture<PanelControl>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelControl]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelControl);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
