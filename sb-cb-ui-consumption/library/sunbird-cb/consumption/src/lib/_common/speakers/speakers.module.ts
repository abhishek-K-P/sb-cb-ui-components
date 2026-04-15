import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpeakersComponent } from './speakers.component';
import { ScrollableItemModule } from '../../_directives/scrollable-item/scrollable-item.module';
import { SlidersNgContentLibModule } from '../sliders-ng-content/sliders-ng-content.module';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { SpeakersV2Component } from './speakers-v2/speakers-v2.component';



@NgModule({
  declarations: [SpeakersComponent, SpeakersV2Component],
  imports: [
    CommonModule,
    ScrollableItemModule,
    SlidersNgContentLibModule,
    MatTooltipModule,
    MatIconModule,
  ],
  exports: [
    SpeakersComponent,
    SpeakersV2Component
  ]
})
export class SpeakersModule { }
