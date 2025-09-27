import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Florafauna } from './florafauna';

describe('Florafauna', () => {
  let component: Florafauna;
  let fixture: ComponentFixture<Florafauna>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Florafauna]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Florafauna);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
