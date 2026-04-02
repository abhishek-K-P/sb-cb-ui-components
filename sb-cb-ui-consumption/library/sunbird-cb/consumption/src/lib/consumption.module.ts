import { NgModule } from '@angular/core'
import { ConsumptionComponent } from './consumption.component'
import { ContentStripWithTabsLibModule } from './_common/content-strip-with-tabs-lib/content-strip-with-tabs-lib.module'
import { SlidersLibModule } from '../lib/_common/sliders/sliders.module'
import { DataPointsModule } from './_common/data-points/data-points.module'
import { CalenderModule } from './_common/calender/calender.module'
import { CommonStripModule } from './_common/common-strip/common-strip.module'
import { AnnouncementsModule } from './_common/announcements/announcements.module'
import { TopLearnersModule } from './_common/top-learners/top-learners.module'
import { CbpPlanModule } from './_common/cbp-plan/cbp-plan.module'
import { CompetencySummaryModule } from './_common/competency-summary/competency-summary.module'
import { AssessmentModule } from './_common/assessments/assessment.module'
import { PeerValidationLibModule } from './_common/peer-validation/peer-validation-lib.module';

@NgModule({
  declarations: [ConsumptionComponent],
  imports: [
    ContentStripWithTabsLibModule,
    SlidersLibModule
  ],
  exports: [ConsumptionComponent,
    ContentStripWithTabsLibModule,
    SlidersLibModule,
    DataPointsModule,
    CalenderModule,
    CommonStripModule,
    AnnouncementsModule,
    TopLearnersModule,
    CbpPlanModule,
    CompetencySummaryModule,
    AssessmentModule,
    PeerValidationLibModule
  ],
})
export class ConsumptionModule { }
