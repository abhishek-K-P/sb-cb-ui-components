import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BadgeStatsComponent } from './badge-stats.component';

describe('BadgeStatsComponent', () => {
  let component: BadgeStatsComponent;
  let fixture: ComponentFixture<BadgeStatsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BadgeStatsComponent]
    });
    fixture = TestBed.createComponent(BadgeStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
