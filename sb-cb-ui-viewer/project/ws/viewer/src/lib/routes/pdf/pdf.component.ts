
import { Component, Inject, OnInit, OnDestroy } from '@angular/core'
import { Subscription } from 'rxjs'
import { NsContent, NsDiscussionForum, WidgetContentService } from '@sunbird-cb/collection'
import { WsEvents, EventService } from '@sunbird-cb/utils'
import { NsWidgetResolver } from '@sunbird-cb/resolver'
import { ActivatedRoute } from '@angular/router'
import { ViewerUtilService } from '../../viewer-util.service'
import { AccessControlService } from '@sunbird-cb/toc'
@Component({
  selector: 'viewer-pdf',
  templateUrl: './pdf.component.html',
  styleUrls: ['./pdf.component.scss'],
})
export class PdfComponent implements OnInit, OnDestroy {
  private dataSubscription: Subscription | null = null
  private viewerDataSubscription: Subscription | null = null
  private telemetryIntervalSubscription: Subscription | null = null
  isFetchingDataComplete = false
  pdfData: NsContent.IContent | any | null = null
  oldData: NsContent.IContent | null = null
  alreadyRaised = false
  widgetResolverPdfData: any = {
    widgetType: 'player',
    widgetSubType: 'playerPDF',
    widgetData: {
      pdfUrl: '',
      identifier: '',
      disableTelemetry: false,
      hideControls: true,
    },
  }
  isPreviewMode = false
  forPreview = window.location.href.includes('/author/')
  discussionForumWidget: NsWidgetResolver.IRenderConfigWithTypedData<
    NsDiscussionForum.IDiscussionForumInput
  > | null = null
  constructor(
    private activatedRoute: ActivatedRoute,
    private contentSvc: WidgetContentService,
    private viewerSvc: ViewerUtilService,
    private eventSvc: EventService,
    private accessControlSvc: AccessControlService,
    @Inject('environment') private environment: any,
  ) { }

  ngOnInit() {
    if (
      this.activatedRoute.snapshot.queryParamMap.get('preview') &&
      !this.accessControlSvc.authoringConfig.newDesign
    ) {
      this.isPreviewMode = true
      this.viewerDataSubscription = this.viewerSvc
        .getContent(this.activatedRoute.snapshot.paramMap.get('resourceId') || '')
        .subscribe(data => {
          this.pdfData = data
    //           console.log('pdfData', this.pdfData)
          if (this.pdfData) {
            this.formDiscussionForumWidget(this.pdfData)
            if (this.discussionForumWidget) {
              this.discussionForumWidget.widgetData.isDisabled = true
            }
          }
          // this.widgetResolverPdfData.widgetData.pdfUrl = this.pdfData
          //   ? `/apis/authContent/${encodeURIComponent(this.pdfData.artifactUrl)}`
          //   : ''

          // this.widgetResolverPdfData.widgetData.pdfUrl = this.pdfData.artifactUrl
          this.widgetResolverPdfData.widgetData.pdfUrl = this.getUrl(this.generateUrl(this.pdfData.artifactUrl))
          this.widgetResolverPdfData.widgetData.disableTelemetry = true
          this.isFetchingDataComplete = true
        })
    } else {
      this.dataSubscription = this.activatedRoute.data.subscribe(
        async data => {
          this.pdfData = data.content.data
          if (this.alreadyRaised && this.oldData) {
            this.raiseEvent(WsEvents.EnumTelemetrySubType.Unloaded, this.oldData)
          }
          if (this.pdfData) {
            this.formDiscussionForumWidget(this.pdfData)
          }

          // if (this.pdfData && this.pdfData.artifactUrl.indexOf('content-store') >= 0) {
          //   await this.setS3Cookie(this.pdfData.identifier)
          // }
          this.widgetResolverPdfData.widgetData.resumePage = 1
          if (this.pdfData && this.pdfData.identifier) {
            if (this.activatedRoute.snapshot.queryParams.collectionId) {
              // await this.fetchContinueLearning(
              //   this.activatedRoute.snapshot.queryParams.collectionId,
              //   this.pdfData.identifier,
              // )
            }
          }
          // this.viewerSvc.getAuthoringUrl(this.pdfData.artifactUrl)
          // tslint:disable-next-line: max-line-length
          this.widgetResolverPdfData.widgetData.pdfUrl = this.pdfData ? this.forPreview ? this.getUrl(this.pdfData.artifactUrl) : this.getUrl(this.pdfData.artifactUrl) : '' // NOSONAR
          this.widgetResolverPdfData.widgetData.identifier = this.pdfData && this.pdfData.identifier // NOSONAR
          this.widgetResolverPdfData = JSON.parse(JSON.stringify(this.widgetResolverPdfData))
          if (this.pdfData) {
            this.oldData = this.pdfData
            this.alreadyRaised = true
            this.raiseEvent(WsEvents.EnumTelemetrySubType.Loaded, this.pdfData)
          }
          this.isFetchingDataComplete = true
        },
        () => { },
      )
    }
  }
  generateUrl(oldUrl: string) {
    const chunk = oldUrl ? oldUrl.split('/') : []
    const newChunk = this.environment.azureHost.split('/')
    const newLink = []
    for (let i = 0; i < chunk.length; i += 1) {
      if (i === 2) {
        newLink.push(newChunk[i])
      } else if (i === 3) {
        newLink.push(this.environment.azureBucket)
      } else {
        newLink.push(chunk[i])
      }
    }
    const newUrl = newLink.join('/')
    return newUrl
  }

  formDiscussionForumWidget(content: NsContent.IContent) {
    this.discussionForumWidget = {
      widgetData: {
        description: content.description,
        id: content.identifier,
        name: NsDiscussionForum.EDiscussionType.LEARNING,
        title: content.name,
        initialPostCount: 2,
        isDisabled: this.forPreview,
      },
      widgetSubType: 'discussionForum',
      widgetType: 'discussionForum',
    }
  }

  raiseEvent(state: WsEvents.EnumTelemetrySubType, data: NsContent.IContent) {
    if (this.forPreview) {
      return
    }

    const event = {
      eventType: WsEvents.WsEventType.Telemetry,
      eventLogLevel: WsEvents.WsEventLogLevel.Info,
      from: 'pdf',
      to: '',
      data: {
        state,
        type: WsEvents.WsTimeSpentType.Player,
        mode: WsEvents.WsTimeSpentMode.Play,
        content: data,
        identifier: data ? data.identifier : null,
        mimeType: NsContent.EMimeTypes.PDF,
        url: data ? data.artifactUrl : null,
      },
    }
    this.eventSvc.dispatchEvent(event)
  }

  async fetchContinueLearning(collectionId: string, pdfId: string): Promise<boolean> {
    return new Promise(resolve => {
      this.contentSvc.fetchContentHistory(collectionId).subscribe(
        data => {
          if (data) {
            if (data.identifier === pdfId && data.continueData && data.continueData.progress) {
              this.widgetResolverPdfData.widgetData.resumePage = Number(data.continueData.progress)
            }
          }
          resolve(true)
        },
        () => resolve(true),
      )
      resolve(true)
    })
  }

  // private async setS3Cookie(contentId: string) {
  //   await this.contentSvc
  //     .setS3Cookie(contentId)
  //     .toPromise()
  //     .catch(() => {
  //       // throw new DataResponseError('COOKIE_SET_FAILURE')
  //     })
  //   return
  // }

  ngOnDestroy() {
    if (this.pdfData) {
      this.raiseEvent(WsEvents.EnumTelemetrySubType.Unloaded, this.pdfData)
    }
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe()
    }
    if (this.viewerDataSubscription) {
      this.viewerDataSubscription.unsubscribe()
    }
    if (this.telemetryIntervalSubscription) {
      this.telemetryIntervalSubscription.unsubscribe()
    }
  }

  getUrl(url: string) {
    if (url && url.length > 0) {
      const tempData = url.split('content')
      if (url.indexOf(`/collection`) > 0) {
        return `${this.environment.mdoPath}${this.environment.contentBucket}${tempData[tempData.length - 1]}`
      }
      return `${this.environment.mdoPath}${this.environment.contentBucket}/content${tempData[tempData.length - 1]}`
    }
    return url
  }
}
