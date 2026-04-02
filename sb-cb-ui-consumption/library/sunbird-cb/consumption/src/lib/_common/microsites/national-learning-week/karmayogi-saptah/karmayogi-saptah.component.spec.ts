import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { KarmayogiSaptahComponent } from './karmayogi-saptah.component';

describe('KarmayogiSaptahComponent', () => {
  let component: KarmayogiSaptahComponent;
  let fixture: ComponentFixture<KarmayogiSaptahComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ KarmayogiSaptahComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(KarmayogiSaptahComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
