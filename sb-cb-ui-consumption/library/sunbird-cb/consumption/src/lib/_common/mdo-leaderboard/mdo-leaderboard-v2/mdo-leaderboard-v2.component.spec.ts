import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MdoLeaderboardV2Component } from './mdo-leaderboard-v2.component';

describe('MdoLeaderboardV2Component', () => {
  let component: MdoLeaderboardV2Component;
  let fixture: ComponentFixture<MdoLeaderboardV2Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MdoLeaderboardV2Component]
    });
    fixture = TestBed.createComponent(MdoLeaderboardV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
