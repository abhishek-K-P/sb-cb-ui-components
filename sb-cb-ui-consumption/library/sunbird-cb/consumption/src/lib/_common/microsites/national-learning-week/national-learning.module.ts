import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonLoaderLibModule } from '../../skeleton-loader-lib/skeleton-loader-lib.module';
import { KarmayogiSaptahComponent } from './karmayogi-saptah/karmayogi-saptah.component';
import { CommonMethodsService } from '../../../_services/common-methods.service';
import { SlidersLibModule } from '../../sliders/sliders.module';
import { KeyHighlightsModule } from '../../key-highlights/key-highlights.module';
import { ContentStripWithTabsLibModule } from '../../content-strip-with-tabs-lib/content-strip-with-tabs-lib.module';
import { EventsModule } from '../../events/events.module';
import { MdoLeaderboardModule } from '../../mdo-leaderboard/mdo-leaderboard.module';
import { DataPointsModule } from '../../data-points/data-points.module';
import { HighlightsOfWeekModule } from '../../highlights-of-week/highlights-of-week.module';
import { SpeakersModule } from '../../speakers/speakers.module';
import { UserProgressModule } from '../../user-progress/user-progress.module';
import { ContentStripFacetFilterModule } from '../../strips/content-strip-facet-filter/content-strip-facet-filter.module';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { PipeSafeSanitizerModule } from '@sunbird-cb/utils-v2';
import { SadhanaSaptahComponent } from './sadhana-saptah/sadhana-saptah.component';
import { MicrositesComponentsModule } from '../micro-sites-components/microsites-components.module';



@NgModule({
  declarations: [KarmayogiSaptahComponent, SadhanaSaptahComponent],
  imports: [
    CommonModule,
    MatIconModule,
    MatChipsModule,
    SkeletonLoaderLibModule,
    SlidersLibModule,
    MatTabsModule,
    KeyHighlightsModule,
    ContentStripWithTabsLibModule,
    DataPointsModule,
    EventsModule,
    MdoLeaderboardModule,
    HighlightsOfWeekModule,
    SpeakersModule,
    UserProgressModule,
    ContentStripFacetFilterModule,
    PipeSafeSanitizerModule,
    MicrositesComponentsModule
    
  ],
  exports: [
    KarmayogiSaptahComponent,
    SadhanaSaptahComponent
  ],
  providers:[
    CommonMethodsService
  ],
  schemas:[CUSTOM_ELEMENTS_SCHEMA]
})
export class NationalLearningModule { }
