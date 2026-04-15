import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips'
import { MatIconModule } from '@angular/material/icon'
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs'
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip'

import {
  AnnouncementsModule,
  CardsModule,
  CommonMethodsService,
  CommonStripModule,
  CompetencyPassbookModule,
  CompetencyPassbookMdoModule,
  ContentStripWithTabsLibModule,
  DataPointsModule,
  SlidersLibModule,
  HttpLoaderFactory,
  TopLearnersModule,
  CbpPlanModule,
  HighlightsOfWeekModule,
  UserProgressModule,
  EventsModule,
  SpeakersModule,
  MdoLeaderboardModule,
  KeyHighlightsModule
} from './../../../../public-api'
// Import all section components
import { TopSectionComponent } from './components/top-section/top-section.component'
import { LookerSectionComponent } from './components/looker-section/looker-section.component'
import { TopLearnersComponent } from './components/top-learners/top-learners.component'
import { MainContentComponent } from './components/main-content/main-content.component'
import { SupportSectionComponent } from './components/support-section/support-section.component'
import { CompetencyComponent } from './components/competency/competency.component'
import { ContentStripComponent } from './components/content-strip/content-strip.component'
import { ColumnSectionDisplayComponent } from './components/column-section-display/column-section-display.component'
import { MobileSectionsComponent } from './components/mobile-sections/mobile-sections.component'

// Import any shared widgets/components
import { SbUiResolverModule } from '@sunbird-cb/resolver-v2'
import { EditorDialogComponent } from './components/editor-dialog/editor-dialog.component'
import { MatDialogModule } from '@angular/material/dialog' // Updated to non-legacy module
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field'
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input'
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button'
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle'
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select'
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator'
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card'
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox'
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio'
import { DragDropModule } from '@angular/cdk/drag-drop'
import { SlwConfigDialogComponent } from './components/slw-config-dialog/slw-config-dialog.component'
import { ActionItemsComponent } from './components/action-items/action-items.component'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatLegacyNativeDateModule as MatNativeDateModule } from '@angular/material/legacy-core' // or MatMomentDateModule if you use moment.js
import { SkeletonLoaderLibModule } from '../../skeleton-loader-lib/skeleton-loader-lib.module'
import { OrderByPipeModule } from '../../../_pipes/order-by/order-by.pipe.module'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { HttpClient, HttpClientModule } from '@angular/common/http'
import { SafeUrlPipeModule } from '../../../_pipes/safe-url/safe-url.module'
import { VideoConferenceModule } from '../../video-conference/video-conference.module'
import { StripSectionCreateComponent } from './components/strip-section-create/strip-section-create.component'
import { StripAddContentComponent } from './components/strip-add-content/strip-add-content.component'
import { AddTabDialogComponent } from './components/add-tab-dialog/add-tab-dialog.component'
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component'
import { EventsCalendarModule } from '../../events-calendar/events-calendar.module'
import { AiProgramComponent } from './components/ai-program/ai-program.component'
import { PipeDurationTransformModule } from '@sunbird-cb/utils-v2'

@NgModule({
  declarations: [
    TopSectionComponent,
    LookerSectionComponent,
    TopLearnersComponent,
    MainContentComponent,
    SupportSectionComponent,
    CompetencyComponent,
    ContentStripComponent,
    ColumnSectionDisplayComponent,
    MobileSectionsComponent,
    EditorDialogComponent,
    SlwConfigDialogComponent,
    ActionItemsComponent,
    StripSectionCreateComponent,
    StripAddContentComponent,
    AddTabDialogComponent,
    ConfirmDialogComponent,
    AiProgramComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    SkeletonLoaderLibModule,
    AnnouncementsModule,
    TopLearnersModule,
    CbpPlanModule,
    CardsModule,


    CommonStripModule,
    CompetencyPassbookModule,
    CompetencyPassbookMdoModule,
    ContentStripWithTabsLibModule,
    DataPointsModule,
    SlidersLibModule,
    HighlightsOfWeekModule,
    UserProgressModule,
    EventsModule,
    SpeakersModule,
    MdoLeaderboardModule,
    KeyHighlightsModule,
    MatTabsModule,
    OrderByPipeModule,
    SafeUrlPipeModule,
    VideoConferenceModule,
    SbUiResolverModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatPaginatorModule,
    MatCardModule,
    MatCheckboxModule,
    MatRadioModule,
    DragDropModule,
    HttpClientModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    EventsCalendarModule,

            PipeDurationTransformModule,
  ],
  exports: [
    TopSectionComponent,
    LookerSectionComponent,
    TopLearnersComponent,
    MainContentComponent,
    SupportSectionComponent,
    CompetencyComponent,
    ContentStripComponent,
    ColumnSectionDisplayComponent,
    MobileSectionsComponent,
    EditorDialogComponent,
    SlwConfigDialogComponent,
    ActionItemsComponent,
    StripAddContentComponent,
    AiProgramComponent
  ],
  providers: [
    CommonMethodsService
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MicrositesComponentsModule { }


