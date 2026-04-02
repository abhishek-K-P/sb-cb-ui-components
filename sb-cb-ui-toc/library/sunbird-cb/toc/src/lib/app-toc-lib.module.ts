import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core'
import { CommonModule, DatePipe } from '@angular/common'
import { RouterModule } from '@angular/router'
import { ReactiveFormsModule, FormsModule } from '@angular/forms'
// NOTE: Routing is optional - import AppTocRoutingModule in your application if you need the pre-configured routes
// import { AppTocRoutingModule } from './app-toc-routing.module'
import { NgCircleProgressModule } from 'ng-circle-progress'
import { TranslateModule } from '@ngx-translate/core'
import { InfiniteScrollModule } from 'ngx-infinite-scroll'

// custom modules
import {
  PipeDurationTransformModule,
  PipeSafeSanitizerModule,
  PipeLimitToModule,
  PipePartialContentModule,
  HorizontalScrollerModule,
  DefaultThumbnailModule,
  PipeNameTransformModule,
  PipeCountTransformModule,
  PipeFilterV3Module,
  PipeRelativeTimeModule,
  PipePublicURLModule,
  MultilingualTranslationsService,
} from '@sunbird-cb/utils-v2'


// Collection modules included locally (copied from collection package)
// import { AppTocCertificationModule } from './routes/app-toc-certification/app-toc-certification.module' // TODO: Copy certification components from original app-toc if needed
import { SkeletonLoaderModule } from './_collection/_common/skeleton-loader/skeleton-loader.module'

import { ShareTocModule } from './share-toc/share-toc.module'
import { TocKpiValuesModule } from './_collection/_common/toc-kpi-values/toc-kpi-values.module'
import { MicroSurveyModule } from '@sunbird-cb/micro-surveys'
import { CertificateDialogModule } from './_collection/_common/certificate-dialog/certificate-dialog.module'
import { ConfirmDialogModule } from './_collection/_common/confirm-dialog/confirm-dialog.module'
// All collection modules imported from local copies
import { KarmaPointsModule } from './_collection/_common/content-toc/karma-points/karma-points.module'
import { TipsForLearnerModule } from './_collection/_common/tips-for-learner/tips-for-learner.module'
import { ConnectionNameModule } from './_collection/_common/connection-name/connection-name.module'
import { ContentTocModule } from './_collection/_common/content-toc/content-toc.module'
import { BtnPageBackModule } from './_collection/btn-page-back/btn-page-back.module'
import { UserImageModule } from './_collection/_common/user-image/user-image.module'
import { DisplayContentTypeModule } from './_collection/_common/display-content-type/display-content-type.module'
// BtnPlaylistModule - TODO: Copy from sunbird-cb-portal if needed
// import { BtnPlaylistModule } from './_collection/btn-playlist/btn-playlist.module'
import { DisplayContentTypeIconModule } from './_collection/_common/display-content-type-icon/display-content-type-icon.module'
import { ContentProgressModule } from './_collection/_common/content-progress/content-progress.module'
import { UserContentRatingModule } from './_collection/_common/user-content-rating/user-content-rating.module'
import { PipeContentRouteModule } from './_collection/_common/pipe-content-route/pipe-content-route.module'
import { PipeContentRoutePipe } from './_collection/_common/pipe-content-route/pipe-content-route.pipe'
import { MarkAsCompleteModule } from './_collection/_common/mark-as-complete/mark-as-complete.module'
import { PlayerBriefModule } from './_collection/_common/player-brief/player-brief.module'
import { UserAutocompleteModule } from './_collection/_common/user-autocomplete/user-autocomplete.module'
import { AvatarPhotoModule } from './_collection/_common/avatar-photo/avatar-photo.module'
import { ContentRatingV2DialogModule } from './_collection/_common/content-rating-v2-dialog/content-rating-v2-dialog.module'
import { RatingSummaryModule } from './_collection/_common/rating-summary/rating-summary.module'
import { CardRatingCommentModule } from './_collection/card-rating-comment/card-rating-comment.module'
import { AttendanceHelperModule } from './_collection/_common/attendance-helper/attendance-helper.module'
import { AttendanceCardModule } from './_collection/_common/attendance-card/attendance-card.module'
// Route Components - TODO: These route components exist in the routes folder and need to be copied from sunbird-cb-portal if full functionality is needed
// import { AppTocAnalyticsComponent } from './routes/app-toc-analytics/app-toc-analytics.component'
// import { AppTocContentsComponent } from './routes/app-toc-contents/app-toc-contents.component'
// import { AppTocHomeComponent } from './components/app-toc-home/app-toc-home.component'
import { AppTocHomeComponent as AppTocHomeRootComponent } from './routes/app-toc-home/app-toc-home.component'
import { AppTocOverviewComponent } from './components/app-toc-overview/app-toc-overview.component'
import { AppTocBannerComponent } from './components/app-toc-banner/app-toc-banner.component'
import { AppTocCohortsComponent } from './components/app-toc-cohorts/app-toc-cohorts.component'
import { AppTocContentCardComponent } from './components/app-toc-content-card/app-toc-content-card.component'
import { AppTocDiscussionComponent } from './components/app-toc-discussion/app-toc-discussion.component'
import { AppTocDialogIntroVideoComponent } from './components/app-toc-dialog-intro-video/app-toc-dialog-intro-video.component'
// Route components that don't exist yet - comment out for now
// import { AppTocOverviewComponent as AppTocOverviewRootComponent } from './routes/app-toc-overview/app-toc-overview.component'
// import { AppTocCohortsComponent as AppTocCohortsRootComponent } from './routes/app-toc-cohorts/app-toc-cohorts.component'
import { AppTocAnalyticsTilesComponent } from './components/app-toc-analytics-tiles/app-toc-analytics-tiles.component'
import { KnowledgeArtifactDetailsComponent } from './components/knowledge-artifact-details/knowledge-artifact-details.component'
// import { AppTocSinglePageComponent as AppTocSinglePageRootComponent } from './routes/app-toc-single-page/app-toc-single-page.component'
import { AppTocSinglePageComponent } from './components/app-toc-single-page/app-toc-single-page.component'
import { CreateBatchDialogComponent } from './components/create-batch-dialog/create-batch-dialog.component'
// NOTE: AllDiscussionWidgetComponent and TagWidgetComponent need to be provided by the consuming application
// These components are from the discuss widget which is application-specific
// import { AllDiscussionWidgetComponent } from '../discuss/widget/all-discussion-widget/category-widget/all-discussion-widget.component'
import { AppTocSessionsComponent } from './components/app-toc-sessions/app-toc-sessions.component'
import { AppTocSessionCardComponent } from './components/app-toc-session-card/app-toc-session-card.component'
import { EnrollQuestionnaireComponent } from './components/enroll-questionnaire/enroll-questionnaire.component'
// import { TagWidgetComponent } from '../discuss/widget/tag-widget/tag-widget.component'

// Services
import { AppTocService } from './services/app-toc.service'
import { ProfileResolverService } from './resolvers/profile-resolver.service'
// import { CertificationApiService } from './routes/app-toc-certification/apis/certification-api.service' // TODO: Copy certification files if needed
import { ActionService } from './services/action.service'

// EXTERNAL DEPENDENCIES: These services need to be provided by the consuming application
// TODO: Import from @sunbird-cb/author package when properly exported
// import { ApiService, AccessControlService } from '@sunbird-cb/author'
// import { EditorService } from '@sunbird-cb/author'
// TODO: This resolver should be provided by the consuming application
// import { AppPublicTocResolverService } from 'consuming-app'

// Resolver
// import { CertificationMetaResolver } from './routes/app-toc-certification/resolvers/certification-meta.resolver' // TODO: Copy certification files if needed
// import { ContentCertificationResolver } from './routes/app-toc-certification/resolvers/content-certification.resolver' // TODO: Copy certification files if needed

// Directives
import { AppTocHomeDirective } from './routes/app-toc-home/app-toc-home.directive'
import { AppTocCiosHomeComponent } from './components/app-toc-cios-home/app-toc-cios-home.component'
import { CommonMethodsService, ContentLanguageService, DialogComponentsModule, TOCMultiLingualDialogModule } from '@sunbird-cb/consumption'

// EXTERNAL DEPENDENCIES: These services need to be provided by the consuming application
// TODO: Import from user-profile package when available
// import { UserProfileService } from '@sunbird-cb/user-profile'
// import { OtpService } from '@sunbird-cb/user-profile'

import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete'
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button'
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card'
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox'
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips'
import { MatNativeDateModule } from '@angular/material/core'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog'
import { MatDividerModule } from '@angular/material/divider'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input'
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list'
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu'
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar'
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner'
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio'
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select'
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar'
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip'
import { EnrollProfileFormComponent } from './components/enroll-profile-form/enroll-profile-form.component';
import { SurveyFormQuestionComponent } from './components/survey-form-question/survey-form-question.component';
import { SurveyFormSectionComponent } from './components/survey-form-section/survey-form-section.component'

import { AppTocContentReadResolverService } from './resolvers/app-toc-content-read-resolver.service'
import { AppTocHomeV2Component } from './components/app-toc-home-v2/app-toc-home-v2.component';
import { EnrollLanguageDialogueComponent } from './components/enroll-language-dialogue/enroll-language-dialogue.component';
import { CompletionSurveyFormComponent } from './components/completion-survey-form/completion-survey-form.component';
import { PublicSurveyFormComponent } from './components/public-survey-form/public-survey-form.component'
import { ConsentDialogComponent } from './components/app-toc-cios-home/consent-dialog.component'
import { WidgetCommentModule } from '@sunbird-cb/discussion-v2'
import { NonReleventFeedbackDialogComponent } from './components/non-relevent-feedback-dialog/non-relevent-feedback-dialog.component'
import { SlidersDynamicModule } from './_collection/sliders-dynamic/sliders-dynamic.module'
import { UserProfileService } from '../public-api'
import { OtpService } from './services/otp.service'
import { NPSGridService } from './services/nps-grid.service'

@NgModule({
  declarations: [
    // Route components - commented out until copied from sunbird-cb-portal
    // AppTocAnalyticsComponent,
    // AppTocContentsComponent,
    AppTocHomeV2Component,
    // AppTocHomeComponent,
    AppTocOverviewComponent,
    AppTocBannerComponent,
    AppTocCohortsComponent,
    AppTocContentCardComponent,
    AppTocDiscussionComponent,
    AppTocDialogIntroVideoComponent,
    // AppTocOverviewRootComponent, // Route component
    AppTocHomeDirective,
    AppTocHomeRootComponent,
    // AppTocCohortsRootComponent, // Route component
    KnowledgeArtifactDetailsComponent,
    AppTocAnalyticsTilesComponent,
    AppTocSinglePageComponent,
    // AppTocSinglePageRootComponent, // Route component
    CreateBatchDialogComponent,
    // AllDiscussionWidgetComponent, // TODO: Provide from consuming application
    // TagWidgetComponent, // TODO: Provide from consuming application
    AppTocSessionsComponent,
    AppTocSessionCardComponent,
    EnrollQuestionnaireComponent,
    EnrollProfileFormComponent,
    AppTocCiosHomeComponent,
    ConsentDialogComponent,
    EnrollLanguageDialogueComponent,
    CompletionSurveyFormComponent,
    PublicSurveyFormComponent,
    NonReleventFeedbackDialogComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    // AppTocRoutingModule, // Optional - import separately in your application if needed
    MatToolbarModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatRadioModule,
    MatTabsModule,
    FormsModule,
    MatCardModule,
    MatListModule,
    MatDividerModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSelectModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatDatepickerModule,
    MatChipsModule,
    MatNativeDateModule,
    DisplayContentTypeModule,
    DisplayContentTypeIconModule,
    PipeDurationTransformModule,
    PipeSafeSanitizerModule,
    PipeLimitToModule,
    PipeNameTransformModule,
    PipeCountTransformModule,
    PipePartialContentModule,
    PipeFilterV3Module,
    PipeRelativeTimeModule,
    PipeContentRouteModule,
    PipePublicURLModule,
    ContentRatingV2DialogModule,
    RatingSummaryModule,
    CertificateDialogModule,
    ConfirmDialogModule,
    SkeletonLoaderModule,
    BtnPageBackModule,
    HorizontalScrollerModule,
    UserImageModule,
    DefaultThumbnailModule,
    ContentProgressModule,
    UserContentRatingModule,
    // AppTocCertificationModule, // TODO: Copy certification components from original app-toc if needed
    MarkAsCompleteModule,
    PlayerBriefModule,
    MatProgressSpinnerModule,
    UserAutocompleteModule,
    AvatarPhotoModule,
    ConnectionNameModule,
    CardRatingCommentModule,
    InfiniteScrollModule,
    AttendanceHelperModule,
    AttendanceCardModule,
    MicroSurveyModule,
    MatChipsModule,
    MatAutocompleteModule,
    ContentTocModule,
    NgCircleProgressModule.forRoot({}),
    TranslateModule,
    ShareTocModule,
    TocKpiValuesModule,
    KarmaPointsModule,
    TipsForLearnerModule,
    ReactiveFormsModule,
    WidgetCommentModule,
    SurveyFormQuestionComponent,
    SurveyFormSectionComponent,
    SlidersDynamicModule
  ],
  providers: [
    AppTocContentReadResolverService,
    // AppPublicTocResolverService, // TODO: Provide from consuming application
    AppTocService,
    PipeContentRoutePipe,
    // CertificationApiService, // TODO: Copy certification files if needed
    // CertificationMetaResolver, // TODO: Copy certification files if needed
    // ContentCertificationResolver, // TODO: Copy certification files if needed
    // EditorService, // TODO: Import from @sunbird-cb/author when available
    // ApiService, // TODO: Import from @sunbird-cb/author when available
    // AccessControlService, // TODO: Import from @sunbird-cb/author when available
    ProfileResolverService,
    ActionService,
    MultilingualTranslationsService,
    CommonMethodsService,
    UserProfileService, // TODO: Import from @sunbird-cb/user-profile when available
    NPSGridService,
    OtpService, // TODO: Import from @sunbird-cb/user-profile when available
    ContentLanguageService,
    TOCMultiLingualDialogModule,
    DatePipe,
    DialogComponentsModule
  ],
  exports: [
    AppTocDiscussionComponent,
    AppTocSinglePageComponent,
    AppTocBannerComponent,
    AppTocHomeRootComponent,
    AppTocHomeV2Component,
    // AppTocHomeComponent,
    ShareTocModule,
    AppTocCiosHomeComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class AppTocLibModule { }
