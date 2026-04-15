import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SadhanaSaptahComponent } from './sadhana-saptah.component';

describe('SadhanaSaptahComponent', () => {
  let component: SadhanaSaptahComponent;
  let fixture: ComponentFixture<SadhanaSaptahComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SadhanaSaptahComponent]
    });
    fixture = TestBed.createComponent(SadhanaSaptahComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
