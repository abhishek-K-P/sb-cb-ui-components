import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { NsCardContent } from '../../../_models/card-content.model'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { TranslateService } from '@ngx-translate/core'
import { MultilingualTranslationsService } from '../../../_services/multilingual-translations.service'
import { WidgetContentLibService } from '../../../_services/widget-content-lib.service'
import { ConfigurationsService, EventService, WsEvents } from '@sunbird-cb/utils-v2'
import * as _ from "lodash"
import { CertificateService } from '../../../_services/certificate.service'
import { CertificateDialogComponent } from '../../dialog-components/certificate-dialog/certificate-dialog.component'

const ALLOWED_CATEGORY_FOR_DYNAMIC_GENERATION = [
  // "Course",
  // "Moderated Course",
  "Invite-Only Program",
  "Moderated Program",
  "Blended Program",
  "Curated Program",
  "Standalone Assessment",
  "Moderated Assessment",
  "Invite-Only Assessment",
  "Comprehensive Assessment Program",
  "Pre Enrolment Assessment"
  // "External Redirect",
]
@Component({
    selector: 'sb-uic-card-progress-portrait-lib',
    templateUrl: './card-progress-portrait-lib.component.html',
    styleUrls: ['./card-progress-portrait-lib.component.scss'],
    standalone: false
})
export class CardProgressPortraitLibComponent implements OnInit {

  @Input() widgetData!: NsCardContent.ICard
  @Input() isLiveOrMarkForDeletion: any
  @Input() showIntranetContent: any
  @Input() isIntranetAllowedSettings: any
  @Input() isCardLoading: boolean = false
  @Output() contentData = new EventEmitter<any>()
  @Output() redirectToNewVersion = new EventEmitter<any>()
  @Input() cbPlanMapData: any
  isCardFlipped: boolean = false
  acbpConstants = NsCardContent.ACBPConst
  defaultThumbnail: any
  sourceLogos: any
  defaultSLogo: any
  showFlip = false
  widgetType: any = 'df'
  widgetSubType: any = 'sdf'
  downloadCertificateLoading: boolean = false
  showRitered = false
  retiredLabel = 'cardcontentv2.retired'

  constructor(
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private events: EventService,
    private langtranslations: MultilingualTranslationsService,
    private configSvc: ConfigurationsService,
    private contSvc: WidgetContentLibService,
    private certificateService: CertificateService,
    private dialog: MatDialog,
    // private contentSvcUtils: WidgetContentService,

  ) {
    this.langtranslations.languageSelectedObservable.subscribe(() => {
      if (localStorage.getItem('websiteLanguage')) {
        this.translate.setDefaultLang('en')
        const lang = localStorage.getItem('websiteLanguage')!
        this.translate.use(lang)
      }
    })
  }

  ngOnInit() {
    const instanceConfig = this.configSvc.instanceConfig
    if (instanceConfig) {
      this.defaultThumbnail = instanceConfig.logos.defaultContent || ''
      this.sourceLogos = instanceConfig.sources
      this.defaultSLogo = instanceConfig.logos.defaultSourceLogo || ''
    } else {
      this.defaultThumbnail = '/assets/instances/eagle/app_logos/default.png'
      this.defaultSLogo = '/assets/instances/eagle/app_logos/KarmayogiBharat_Logo.svg'
    }

    if (
      _.get(this.widgetData, 'content.status') === 'Retired'
      || (
        _.get(this.widgetData, 'content.contentId', '').startsWith('ext_')
        && (_.get(this.widgetData, 'content.isActive') === false || _.get(this.widgetData, 'content.contentPartner.isActive') === false)
      )
    ) {
      this.showRitered = true
      if (_.get(this.widgetData, 'content.status') === 'Retired') {
        this.retiredLabel = 'cardcontentv2.retired'
      } else {
        this.retiredLabel = 'cardcontentv2.inactive'
      }
    }
  }

  showSnackbar(message = '', duration: number = 2000) {
    if (message) {
      this.snackBar.open(message, 'X', { duration })
    } else if (this.showIntranetContent) {
      this.snackBar.open('Content is only available in intranet', 'X', { duration: 2000 })
    } else if (!this.isLiveOrMarkForDeletion) {
      this.snackBar.open('Content may be expired or deleted', 'X', { duration: 2000 })
    }
  }
  getRedirectUrlData(contentData: any) {
    if (!this.showRitered) {
      // for telemetry
      if (this.widgetData && this.widgetData.context && this.widgetData.context.pageSection) {
        contentData['typeOfTelemetry'] = this.widgetData.context.pageSection
      }
      this.contSvc.changeTelemetryData(contentData)
      // for redirection
      this.contentData.emit(contentData)
    } else {
      if (_.get(this.widgetData, 'content.contentPartner.isActive') === false) {
        this.snackBar.open(this.translateLabels('externalCourseProviderRetiredMessage', 'cardcontentv2'), 'X', { duration: 10000 })
      } else if (_.get(this.widgetData, 'content.isActive') === false) {
        this.snackBar.open(this.translateLabels('externalCourseRetiredMessage', 'cardcontentv2'), 'X', { duration: 10000 })
      }
    }
  }

  translateLabels(label: string, type: any, subtype?: any) {
    return this.langtranslations.translateLabelWithoutspace(label, type, subtype)
  }
  raiseTelemetry() {
    this.events.raiseInteractTelemetry(
      {
        type: 'click',
        subType: `${this.widgetType}-${this.widgetSubType}`,
        id: `${_.camelCase(this.widgetData.content.primaryCategory)}-card`,
      },
      {
        id: this.widgetData.content.identifier,
        type: this.widgetData.content.primaryCategory,
        //context: this.widgetData.context,
        rollup: {},
        ver: `${this.widgetData.content.version}${''}`,
      },
      {
        pageIdExt: `${_.camelCase(this.widgetData.content.primaryCategory)}-card`,
        module: _.camelCase(this.widgetData.content.primaryCategory),
      })
  }

  // downloadCertificate(certificateData: any, event: any) {
  //   event.stopPropagation();
  //   this.events.raiseInteractTelemetry(
  //     {
  //       type: WsEvents.EnumInteractTypes.CLICK,
  //       id: "view-certificate",
  //       subType: WsEvents.EnumInteractSubTypes.CERTIFICATE,
  //     },
  //     {
  //       id:
  //         certificateData.issuedCertificates &&
  //         certificateData.issuedCertificates.length &&
  //         certificateData.issuedCertificates[0].identifier, // id of the certificate
  //       type: WsEvents.EnumInteractSubTypes.CERTIFICATE,
  //     }
  //   );
  //   if (certificateData?.issuedCertificates?.length > 0) {
  //     this.downloadCertificateLoading = true;
  //       const certificate: any = certificateData.issuedCertificates.sort(
  //        (a: any, b: any) =>
  //          new Date(a.lastIssuedOn).getTime() -
  //          new Date(b.lastIssuedOn).getTime()
  //      );
  //      let certData: any = certificate && certificate.length && certificate[0];
  //     const allowedPrimaryCategory = ALLOWED_CATEGORY_FOR_DYNAMIC_GENERATION?.map(
  //       (cat: string) => cat?.toLowerCase()
  //     );
  //     if (
  //       this.widgetData.content &&
  //       this.widgetData.content.primaryCategory &&
  //       allowedPrimaryCategory?.includes(this.widgetData.content?.primaryCategory?.toLowerCase()) ||
  //       allowedPrimaryCategory?.includes(this.widgetData.content?.courseCategory?.toLowerCase())
  //     ) {
  //       const payload = {
  //         request: {
  //           courseId: this.widgetData.content.identifier,
  //           batchId: this.widgetData.content.batchId || "",
  //           userId: this.configSvc.userProfile.userId,
  //         },
  //       };
  //       this.contentSvcUtils.downloadCertV2(payload).subscribe(
  //         (response) => {
  //           if (this.widgetData.content) {
  //             this.downloadCertificateLoading = false;
  //             this.dialog.open(CertificateDialogComponent, {
  //               width: "1200px",
  //               data: {
  //                 cet: response.result.printUri,
  //                 certId: this.widgetData.content && certData.identifier,
  //               },
  //             });
  //           }
  //           this.downloadCertificateLoading = false;
  //         },
  //         (error: any) => {
  //           this.downloadCertificateLoading = false;
  //         }
  //       );
  //     } else {

  //      this.certificateService
  //        .downloadCertificate_v2(certData.identifier)
  //        .subscribe((res: any) => {
  //          this.downloadCertificateLoading = false;
  //          const cet = res.result.printUri;
  //          this.dialog.open(CertificateDialogComponent, {
  //            width: "1300px",
  //            data: { cet, certId: certData.identifier },
  //          });
  //        });
  //      this.downloadCertificateLoading = false;
  //    }
  //   } else {
  //      this.downloadCertificateLoading = false;
  //   }
  // }

  downloadCertificate(certificateData: any, event: any) {
    event.stopPropagation()
    this.events.raiseInteractTelemetry(
      {
        type: WsEvents.EnumInteractTypes.CLICK,
        id: 'view-certificate',
        subType: WsEvents.EnumInteractSubTypes.CERTIFICATE,
      },
      {
        id: certificateData.issuedCertificates && certificateData.issuedCertificates.length && certificateData.issuedCertificates[0].identifier,   // id of the certificate
        type: WsEvents.EnumInteractSubTypes.CERTIFICATE,
      })
    if (certificateData.issuedCertificates.length > 0) {
      this.downloadCertificateLoading = true
      const certificate: any = certificateData.issuedCertificates.sort((a: any, b: any) =>
        new Date(a.lastIssuedOn).getTime() - new Date(b.lastIssuedOn).getTime())
      let certData: any = certificate && certificate.length && certificate[0]

      if (!certData.identifier) return

      this.certificateService.downloadCertificate_v2(certData.identifier).subscribe((res: any) => {
        this.downloadCertificateLoading = false
        const cet = res.result.printUri
        this.dialog.open(CertificateDialogComponent, {
          width: '1300px',
          data: { cet, certId: certData.identifier },
        })
      })
    } else {
      this.downloadCertificateLoading = false
    }
  }

  checkSurveyCompletion() {
    // check if completion survey is enabled and user has completed the course before 23rd DEC 2023 (release date of completion survey)
    if (this.configSvc.completionSurvey && this.configSvc.completionSurvey.enabled && this.widgetData?.content?.completedOn) {
      if (this.widgetData?.content?.completedOn > this.configSvc.completionSurvey.startDate && this.widgetData?.content?.surveyCompletionStatus === false) {
        return true
      } else {
        return false
      }
    }
  }

  navigateToNewVersion(contentData: any) {
    this.redirectToNewVersion.emit(contentData.contentVersionInfo.identifier)
  }

  canEnableCertificateButton() {
    if (this.widgetData?.content?.category === "Event") {
      return this.widgetData?.content?.endDateTimeInEpoch > Date.now()
    } else {
      return false
    }
  }
}
