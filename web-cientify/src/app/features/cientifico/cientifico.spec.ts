import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cientifico } from './cientifico';

describe('Cientifico', () => {
  let component: Cientifico;
  let fixture: ComponentFixture<Cientifico>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cientifico]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Cientifico);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
