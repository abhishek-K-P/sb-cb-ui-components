import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpeakersV2Component } from './speakers-v2.component';

describe('SpeakersV2Component', () => {
  let component: SpeakersV2Component;
  let fixture: ComponentFixture<SpeakersV2Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SpeakersV2Component]
    });
    fixture = TestBed.createComponent(SpeakersV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
