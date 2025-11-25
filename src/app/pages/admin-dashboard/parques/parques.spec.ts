import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Parques } from './parques';

describe('Parques', () => {
  let component: Parques;
  let fixture: ComponentFixture<Parques>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Parques]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Parques);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
