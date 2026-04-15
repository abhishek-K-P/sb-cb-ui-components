import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompetencyListComponent } from './competency-list.component';

describe('CompetencyListComponent', () => {
  let component: CompetencyListComponent;
  let fixture: ComponentFixture<CompetencyListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CompetencyListComponent]
    });
    fixture = TestBed.createComponent(CompetencyListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
