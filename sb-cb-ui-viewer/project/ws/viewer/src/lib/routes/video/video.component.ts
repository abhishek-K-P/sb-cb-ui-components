import { Component, Inject, OnInit, OnDestroy } from '@angular/core'
import { Subscription } from 'rxjs'
import {
  NsContent,
  NsDiscussionForum,
  WidgetContentService,
} from '@sunbird-cb/collection'
import { NsWidgetResolver } from '@sunbird-cb/resolver'
import { ValueService } from '@sunbird-cb/utils'
import { ActivatedRoute } from '@angular/router'
import { ViewerUtilService } from '../../viewer-util.service'
import { Platform } from '@angular/cdk/platform'
import { AccessControlService } from '@sunbird-cb/toc'

@Component({
  selector: 'viewer-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss'],
})
export class VideoComponent implements OnInit, OnDestroy {
  private routeDataSubscription: Subscription | null = null
  private screenSizeSubscription: Subscription | null = null
  private viewerDataSubscription: Subscription | null = null
  forPreview = window.location.href.includes('/preview/')
  isScreenSizeSmall = false
  videoData: NsContent.IContent | any | null = null
  isFetchingDataComplete = false
  isNotEmbed = true
  widgetResolverVideoData: any
  discussionForumWidget: NsWidgetResolver.IRenderConfigWithTypedData<
    NsDiscussionForum.IDiscussionForumInput
  > | null = null
  constructor(
    private activatedRoute: ActivatedRoute,
    private valueSvc: ValueService,
    private viewerSvc: ViewerUtilService,
    private contentSvc: WidgetContentService,
    private platform: Platform,
    private accessControlSvc: AccessControlService,
    @Inject('environment') private environment: any,
  ) {
    this.activatedRoute.paramMap.subscribe(params => {
      this.forPreview = params.get('preview') === 'true'
    })
  }

  ngOnInit() {
    this.screenSizeSubscription = this.valueSvc.isXSmall$.subscribe(data => {
      this.isScreenSizeSmall = data
    })
    this.routeDataSubscription = this.activatedRoute.data.subscribe(async () => {
      this.isNotEmbed =
        this.activatedRoute.snapshot.queryParamMap.get('embed') === 'true' ? false : true
      if (
        this.activatedRoute.snapshot.queryParamMap.get('preview') &&
        !this.accessControlSvc.authoringConfig.newDesign
      ) {
        this.viewerDataSubscription = this.viewerSvc
          .getContent(this.activatedRoute.snapshot.paramMap.get('resourceId') || '')
          .subscribe(data => {
            this.videoData = data
            if (this.videoData) {
              this.formDiscussionForumWidget(this.videoData)
            }
            this.widgetResolverVideoData = this.initWidgetResolverVideoData(this.videoData)
            let url = ''
            // if (this.videoData.artifactUrl.indexOf('/content-store/') > -1) {
            //   url = `/apis/authContent/${new URL(this.videoData.artifactUrl).pathname}`
            // } else {
            //   url = `/apis/authContent/${encodeURIComponent(this.videoData.artifactUrl)}`
            // }
            url = this.generateUrl(this.videoData.artifactUrl)
            this.widgetResolverVideoData.widgetData.url = this.videoData ? url : ''
            this.widgetResolverVideoData.widgetData.disableTelemetry = true
            this.isFetchingDataComplete = true

            if (this.videoData.subTitles) {
              // need to update
              let subTitleUrl = ''
              if (this.videoData.subTitles.length > 0 && this.videoData.subTitles[0]) {
                if (this.videoData.subTitles[0].url.indexOf('/content-store/') > -1) {
                  subTitleUrl = `/apis/authContent/${new URL(this.videoData.subTitles[0].url).pathname}`
                } else {
                  subTitleUrl = `/apis/authContent/${encodeURIComponent(this.videoData.subTitles[0].url)}`
                }
              }

              this.widgetResolverVideoData.widgetData.subtitles = [{
                srclang: '',
                label: '',
                url: subTitleUrl,
              }]
            }
          })
      } else {
        this.routeDataSubscription = this.activatedRoute.data.subscribe(
          async data => {
            this.widgetResolverVideoData = null
            this.videoData = data.content.data
            if (this.videoData) {
              this.formDiscussionForumWidget(this.videoData)
            }
            this.widgetResolverVideoData = this.initWidgetResolverVideoData(this.videoData as any)
            const url = this.generateUrl(this.videoData ? this.videoData.artifactUrl : '')
            this.widgetResolverVideoData.widgetData.url = this.videoData
              ? this.forPreview
                ? url // this.viewerSvc.getAuthoringUrl(this.videoData.artifactUrl)
                : this.videoData.artifactUrl
              : ''
            this.widgetResolverVideoData.widgetData.resumePoint = this.getResumePoint(this.videoData)
            this.widgetResolverVideoData.widgetData.identifier = this.videoData
              ? this.videoData.identifier
              : ''
            this.widgetResolverVideoData.widgetData.mimeType = data.content.data.mimeType
            // if (this.videoData && this.videoData.identifier) {
            //   if (this.activatedRoute.snapshot.queryParams.collectionId) {
            //     await this.fetchContinueLearning(
            //       this.activatedRoute.snapshot.queryParams.collectionId,
            //       this.videoData.identifier,
            //     )
            //   } else {
            //     await this.fetchContinueLearning(this.videoData.identifier, this.videoData.identifier)
            //   }
            // }
            // if (data.content.data.subTitles && data.content.data.subTitles[0]) {

            //   let subTitlesUrl = ''
            //   if (data.content.data.subTitles[0].url.indexOf('/content-store/') > -1) {
            //     subTitlesUrl = `/apis/authContent/${new URL(data.content.data.subTitles[0].url).pathname}`
            //   } else {
            //     subTitlesUrl = `/apis/authContent/${encodeURIComponent(data.content.data.subTitles[0].url)}`
            //   }

            //   this.widgetResolverVideoData.widgetData.subtitles = [{
            //     srclang: '',
            //     label: '',
            //     url: subTitlesUrl,
            //   }]

            // }

            this.widgetResolverVideoData = JSON.parse(JSON.stringify(this.widgetResolverVideoData))
            // if (this.videoData && this.videoData.artifactUrl.indexOf('content-store') >= 0) {
            //   await this.setS3Cookie(this.videoData.identifier)
            // }
            this.isFetchingDataComplete = true
          },
          () => { },
        )
      }
    })
    this.isNotEmbed =
      this.activatedRoute.snapshot.queryParamMap.get('embed') === 'true' ? false : true
    if (
      this.activatedRoute.snapshot.queryParamMap.get('preview') &&
      !this.accessControlSvc.authoringConfig.newDesign
    ) {
      this.viewerDataSubscription = this.viewerSvc
        .getContent(this.activatedRoute.snapshot.paramMap.get('resourceId') || '')
        .subscribe(data => {
          this.videoData = data
          if (this.videoData) {
            this.formDiscussionForumWidget(this.videoData)
          }
          this.widgetResolverVideoData = this.initWidgetResolverVideoData(this.videoData)
    //           console.log('this.widgetResolverVideoData', this.widgetResolverVideoData)
          let url = ''
          // if (this.videoData.artifactUrl.indexOf('/content-store/') > -1) {
          //   url = `/apis/authContent/${new URL(this.videoData.artifactUrl).pathname}`
          // } else {
          //   url = `/apis/authContent/${encodeURIComponent(this.videoData.artifactUrl)}`
          // }
          url = this.generateUrl(this.videoData.artifactUrl)
          this.widgetResolverVideoData.widgetData.url = this.videoData ? url : ''
          this.widgetResolverVideoData.widgetData.disableTelemetry = true
          this.isFetchingDataComplete = true

          if (this.videoData.subTitles) {
            // need to update
            let subTitleUrl = ''
            if (this.videoData.subTitles.length > 0 && this.videoData.subTitles[0]) {
              if (this.videoData.subTitles[0].url.indexOf('/content-store/') > -1) {
                subTitleUrl = `/apis/authContent/${new URL(this.videoData.subTitles[0].url).pathname}`
              } else {
                subTitleUrl = `/apis/authContent/${encodeURIComponent(this.videoData.subTitles[0].url)}`
              }
            }

            this.widgetResolverVideoData.widgetData.subtitles = [{
              srclang: '',
              label: '',
              url: subTitleUrl,
            }]
          }
        })
    } else {
      this.routeDataSubscription = this.activatedRoute.data.subscribe(
        async data => {
          this.widgetResolverVideoData = null
          this.videoData = data.content.data
          if (this.videoData) {
            this.formDiscussionForumWidget(this.videoData)
          }
          this.widgetResolverVideoData = this.initWidgetResolverVideoData(this.videoData as any)
          const url = this.generateUrl(this.videoData ? this.videoData.artifactUrl : '')
          this.widgetResolverVideoData.widgetData.url = this.videoData
            ? this.forPreview
              ? url // this.viewerSvc.getAuthoringUrl(this.videoData.artifactUrl)
              : this.videoData.artifactUrl
            : ''
          this.widgetResolverVideoData.widgetData.resumePoint = this.getResumePoint(this.videoData)
          this.widgetResolverVideoData.widgetData.identifier = this.videoData
            ? this.videoData.identifier
            : ''
          this.widgetResolverVideoData.widgetData.mimeType = data.content.data.mimeType
          // if (this.videoData && this.videoData.identifier) {
          //   if (this.activatedRoute.snapshot.queryParams.collectionId) {
          //     await this.fetchContinueLearning(
          //       this.activatedRoute.snapshot.queryParams.collectionId,
          //       this.videoData.identifier,
          //     )
          //   } else {
          //     await this.fetchContinueLearning(this.videoData.identifier, this.videoData.identifier)
          //   }
          // }
          // if (data.content.data.subTitles && data.content.data.subTitles[0]) {

          //   let subTitlesUrl = ''
          //   if (data.content.data.subTitles[0].url.indexOf('/content-store/') > -1) {
          //     subTitlesUrl = `/apis/authContent/${new URL(data.content.data.subTitles[0].url).pathname}`
          //   } else {
          //     subTitlesUrl = `/apis/authContent/${encodeURIComponent(data.content.data.subTitles[0].url)}`
          //   }

          //   this.widgetResolverVideoData.widgetData.subtitles = [{
          //     srclang: '',
          //     label: '',
          //     url: subTitlesUrl,
          //   }]

          // }

          this.widgetResolverVideoData = JSON.parse(JSON.stringify(this.widgetResolverVideoData))
          // if (this.videoData && this.videoData.artifactUrl.indexOf('content-store') >= 0) {
          //   await this.setS3Cookie(this.videoData.identifier)
          // }
          this.isFetchingDataComplete = true
        },
        () => { },
      )
    }
  }
  generateUrl(oldUrl: string) {
    //     console.log('environment', this.environment)
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
    //     console.log('newUrl', newUrl)
    return newUrl
  }
  ngOnDestroy() {
    if (this.routeDataSubscription) {
      this.routeDataSubscription.unsubscribe()
    }
    if (this.screenSizeSubscription) {
      this.screenSizeSubscription.unsubscribe()
    }
    if (this.viewerDataSubscription) {
      this.viewerDataSubscription.unsubscribe()
    }
  }
  getResumePoint(content: NsContent.IContent | null) {
    if (content) {
      if (content.progress && content.progress.progressSupported && content.progress.progress) {
        return Math.floor(content.duration * content.progress.progress) || 0
      }
      return 0

    }
    return 0
  }

  initWidgetResolverVideoData(content: NsContent.IContent) {
    let isVideojs = false
    if (this.platform.IOS) {
      isVideojs = true
    } else if (!this.platform.WEBKIT && !this.platform.IOS && !this.platform.SAFARI) {
      isVideojs = true
    } else if (this.platform.ANDROID) {
      isVideojs = true
    } else {
      isVideojs = false
    }
    const response: any = {
      widgetType: 'player',
      widgetSubType: 'playerVideo',
      widgetData: {
        isVideojs,
        disableTelemetry: false,
        url: '',
        identifier: '',
        mimeType: content?.mimeType,
        resumePoint: 0,
        continueLearning: true,
        subtitles: [],
      },
      widgetHostClass: 'video-full',
    }
    return response
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
  async fetchContinueLearning(collectionId: string, videoId: string): Promise<boolean> {
    return new Promise(resolve => {
      this.contentSvc.fetchContentHistory(collectionId).subscribe(
        data => {
          if (data) {
            if (
              data.identifier === videoId &&
              data.continueData &&
              data.continueData.progress &&
              this.widgetResolverVideoData
            ) {
              this.widgetResolverVideoData.widgetData.resumePoint = Number(
                data.continueData.progress,
              )
            }
          }
          resolve(true)
        },
        () => resolve(true),
      )
    })
  }
  // private async setS3Cookie(contentId: string) {
  //   await this.contentSvc
  //     .setS3Cookie(contentId)
  //     .toPromise()
  //     .catch(() => { })
  //   return
  // }
}
