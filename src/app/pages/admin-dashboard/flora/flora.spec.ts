import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Flora } from './flora';

describe('Flora', () => {
  let component: Flora;
  let fixture: ComponentFixture<Flora>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Flora]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Flora);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
