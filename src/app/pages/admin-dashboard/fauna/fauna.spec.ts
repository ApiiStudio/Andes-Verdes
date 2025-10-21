import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fauna } from './fauna';

describe('Fauna', () => {
  let component: Fauna;
  let fixture: ComponentFixture<Fauna>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fauna]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fauna);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
