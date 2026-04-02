import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatChipsModule } from '@angular/material/chips'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTooltipModule } from '@angular/material/tooltip'

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
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatSelectModule } from '@angular/material/select'
import { MatPaginatorModule } from '@angular/material/paginator'
import { MatCardModule } from '@angular/material/card'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatRadioModule } from '@angular/material/radio'
import { DragDropModule } from '@angular/cdk/drag-drop'
import { SlwConfigDialogComponent } from './components/slw-config-dialog/slw-config-dialog.component'
import { ActionItemsComponent } from './components/action-items/action-items.component'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatNativeDateModule } from '@angular/material/core' // or MatMomentDateModule if you use moment.js
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


