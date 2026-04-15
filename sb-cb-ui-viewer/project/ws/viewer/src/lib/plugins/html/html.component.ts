import { Component, ElementRef, Inject, Input, OnChanges, OnInit, ViewChild, OnDestroy } from '@angular/core'
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
import { Router } from '@angular/router'
import { NsContent } from '@sunbird-cb/collection'
import { ConfigurationsService, EventService } from '@sunbird-cb/utils'
import { TFetchStatus } from '@sunbird-cb/utils'
import { MobileAppsService } from '../../services/mobile-apps.service'
import { SCORMAdapterService } from './SCORMAdapter/scormAdapter'
/* tslint:disable */
import _ from 'lodash'
// import { environment } from '../../../../../../../src/environments/environment'
/* tslint:enable */

@Component({
  selector: 'viewer-plugin-html',
  templateUrl: './html.component.html',
  styleUrls: ['./html.component.scss'],
})
export class HtmlComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('mobileOpenInNewTab', { read: ElementRef }) mobileOpenInNewTab !: ElementRef<HTMLAnchorElement>
  @Input() htmlContent: NsContent.IContent | any | null = null
  iframeUrl: SafeResourceUrl | null = null
  iframeName = `piframe_${Date.now()}`
  showIframeSupportWarning = false
  showIsLoadingMessage = false
  showUnBlockMessage = false
  pageFetchStatus: TFetchStatus | 'artifactUrlMissing' = 'fetching'
  isUserInIntranet = false
  intranetUrlPatterns: string[] | undefined = []
  isIntranetUrl = false
  progress = 100
  constructor(
    private domSanitizer: DomSanitizer,
    public mobAppSvc: MobileAppsService,
    private scormAdapterService: SCORMAdapterService,
    private router: Router,
    private configSvc: ConfigurationsService,
    private snackBar: MatSnackBar,
    private events: EventService,
    @Inject('environment') private environment: any,
  ) {
    (window as any).API = this.scormAdapterService
    // if (window.addEventListener) {
    window.addEventListener('message', this.receiveMessage.bind(this))
    // }
    // else {
    //   (<any>window).attachEvent('onmessage', this.receiveMessage.bind(this))
    // }
    // window.addEventListener('message', function (event) {
    //   /* tslint:disable-next-line */
    //   console.log('message', event)
    // })
    // window.addEventListener('onmessage', function (event) {
    //   /* tslint:disable-next-line */
    //   console.log('onmessage===>', event)
    // })
  }

  ngOnInit() {
    if (this.htmlContent && this.htmlContent.identifier) {
      this.scormAdapterService.contentId = this.htmlContent.identifier
      // this.scormAdapterService.loadData()
    }
  }
  ngOnDestroy() {
    window.removeEventListener('message', this.receiveMessage)
    // window.removeEventListener('onmessage', this.receiveMessage)
  }
  ngOnChanges() {
    this.isIntranetUrl = false
    this.progress = 100
    this.pageFetchStatus = 'fetching'
    this.showIframeSupportWarning = false
    this.intranetUrlPatterns = this.configSvc.instanceConfig
      ? this.configSvc.instanceConfig.intranetIframeUrls
      : []

    // //console.log(this.htmlContent)
    let iframeSupport: boolean | string | null =
      this.htmlContent && this.htmlContent.isIframeSupported
    if (this.htmlContent && this.htmlContent?.artifactUrl) {
      if (this.htmlContent.artifactUrl.startsWith('http://')) {
        this.htmlContent.isIframeSupported = 'No'
      }
      if (typeof iframeSupport !== 'boolean') {
        iframeSupport = (this.htmlContent.isIframeSupported || 'Yes').toLowerCase()
        if (iframeSupport === 'no') {
          this.showIframeSupportWarning = true
          setTimeout(
            () => {
              this.openInNewTab()
            },
            3000,
          )
          setInterval(
            () => {
              this.progress -= 1
            },
            30,
          )
        } else if (iframeSupport === 'maybe') {
          this.showIframeSupportWarning = true
        } else {
          this.showIframeSupportWarning = false
        }
      }
      if (this.intranetUrlPatterns && this.intranetUrlPatterns.length) {
        this.intranetUrlPatterns.forEach(iup => {
          if (this.htmlContent && this.htmlContent.artifactUrl) {
            if (this.htmlContent.artifactUrl.startsWith(iup)) {
              this.isIntranetUrl = true
            }
          }
        })
      }
      // if (this.htmlContent.isInIntranet || this.isIntranetUrl) {
      //   this.checkIfIntranet().subscribe(
      //     data => {
      //       //console.log(data)
      //       this.isUserInIntranet = data ? true : false
      //       //console.log(this.isUserInIntranet)
      //     },
      //     () => {
      //       this.isUserInIntranet = false
      //       //console.log(this.isUserInIntranet)
      //     },
      //   )
      // }
      this.showIsLoadingMessage = false
      if (this.htmlContent.isIframeSupported !== 'No') {
        setTimeout(
          () => {
            if (this.pageFetchStatus === 'fetching') {
              this.showIsLoadingMessage = false
            }
          },
          3000,
        )
      }
      if (this.htmlContent &&
        this.htmlContent.mimeType !== 'text/x-url' &&
        this.htmlContent.mimeType !== 'video/x-youtube') {
        // if (this.htmlContent.status === 'Live') {
        //   this.iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(
        //     // `https://igot.blob.core.windows.net/content/content/html/${this.htmlContent.identifier}-latest/index.html`
        // tslint:disable-next-line: max-line-length
        //     `${this.environment.azureHost}/${this.environment.azureBucket}/content/html/${this.htmlContent.identifier}-latest/index.html?timestamp='${new Date().getTime()}`
        //   )
        // } else {
        //   this.iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(
        //     // `https://igot.blob.core.windows.net/content/content/html/${this.htmlContent.identifier}-snapshot/index.html`
        // tslint:disable-next-line: max-line-length
        //     `${this.environment.azureHost}/${this.environment.azureBucket}/content/html/${this.htmlContent.identifier}-snapshot/index.html?timestamp='${new Date().getTime()}`
        //   )
        // }
        if (this.htmlContent && this.htmlContent.streamingUrl) {
          if (this.htmlContent.streamingUrl.includes(this.environment.azureHost)) {
            this.iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(this.htmlContent.streamingUrl)
          } else {
            if (this.htmlContent.streamingUrl && this.htmlContent.initFile) {
              this.iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(
                // tslint:disable-next-line:max-line-length
                `${this.generateUrl(this.htmlContent.streamingUrl)}/${this.htmlContent.initFile}?timestamp='${new Date().getTime()}`
              )
            } else {
              if (this.environment.production) {
                this.iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(
                  // tslint:disable-next-line: max-line-length
                  // `${this.environment.azureHost}/${this.environment.azureBucket}/content/html/${this.htmlContent.identifier}-snapshot/index.html?timestamp='${new Date().getTime()}`
                  // tslint:disable-next-line: max-line-length
                  `${this.environment.azureHost}/${this.environment.azureBucket}/content/html/${this.htmlContent.identifier}-snapshot/index.html?timestamp='${new Date().getTime()}`
                )
              } else {
                this.iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(
                  // tslint:disable-next-line: max-line-length
                  // `${this.environment.azureHost}/${this.environment.azureBucket}/content/html/${this.htmlContent.identifier}-snapshot/index.html?timestamp='${new Date().getTime()}`
                  // tslint:disable-next-line: max-line-length
                  `/abcd/${this.environment.azureBucket}/content/html/${this.htmlContent.identifier}-snapshot/index.html?timestamp='${new Date().getTime()}`
                )
              }
            }
          }
        } else {
          if (this.htmlContent.initFile) {
            this.iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(
              // tslint:disable-next-line: max-line-length
              `${this.environment.azureHost}/${this.environment.azureBucket}/content/html/${this.htmlContent.identifier}-snapshot/${this.htmlContent.initFile}?timestamp='${new Date().getTime()}`
            )
          } else {
            this.iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(
              // tslint:disable-next-line: max-line-length
              `${this.environment.azureHost}/${this.environment.azureBucket}/content/html/${this.htmlContent.identifier}-snapshot/index.html?timestamp='${new Date().getTime()}`
            )

          }
        }
      } else {
        setTimeout(
          () => {
            if (this.htmlContent && this.htmlContent.artifactUrl) {
              this.iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(this.htmlContent.artifactUrl)
            }
          },
          1000,
        )
        // this.iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(this.htmlContent.artifactUrl)
      }
      // testing purpose only
      // setTimeout(
      //   () => {
      //     const ifram = document.getElementsByClassName('html-iframe')[0]
      //     if (ifram && this.htmlContent) {
      //       _.set(ifram, 'src',
      //         `${this.htmlContent.artifactUrl}?timestamp='${new Date().getTime()}`)
      //     }
      //   },
      //   1000,
      // )
    } else if (this.htmlContent && this.htmlContent.artifactUrl === '') {
      this.iframeUrl = null
      this.pageFetchStatus = 'artifactUrlMissing'
    } else {
      this.iframeUrl = null
      this.pageFetchStatus = 'error'
    }
    console.log('this.iframeUrl', this.iframeUrl)
  }

  backToDetailsPage() {
    this.router.navigate([
      `/app/toc/${this.htmlContent ? this.htmlContent.identifier : ''}/overview`,
    ])
  }
  receiveMessage(msg: any) {
    // /* tslint:disable-next-line */
    // console.log("msg=>", msg)
    if (msg.data) {
      this.raiseTelemetry(msg.data)
    } else {
      this.raiseTelemetry({
        event: msg.message,
        id: msg.id,
      })
    }
  }
  openInNewTab() {
    if (this.htmlContent) {
      if (this.mobAppSvc && this.mobAppSvc.isMobile) {
        // window.open(this.htmlContent.artifactUrl)
        setTimeout(
          () => {
            this.mobileOpenInNewTab.nativeElement.click()
          },
          0,
        )
      } else {
        const width = window.outerWidth
        const height = window.outerHeight
        const isWindowOpen = window.open(
          this.htmlContent.artifactUrl,
          '_blank',
          `toolbar=yes,
             scrollbars=yes,
             resizable=yes,
             menubar=no,
             location=no,
             addressbar=no,
             top=${(15 * height) / 100},
             left=${(2 * width) / 100},
             width=${(65 * width) / 100},
             height=${(70 * height) / 100}`,
        )
        if (isWindowOpen === null) {
          const msg = 'The pop up window has been blocked by your browser, please unblock to continue.'
          this.snackBar.open(msg, 'X')
        }
      }
    }
  }
  dismiss() {
    this.showIframeSupportWarning = false
    this.isIntranetUrl = false
  }

  onIframeLoadOrError(evt: 'load' | 'error', iframe?: HTMLIFrameElement, event?: any) {
    if (evt === 'error') {
      this.pageFetchStatus = evt
    }
    if (evt === 'load' && iframe && iframe.contentWindow) {
      if (event && iframe.onload) {
        iframe.onload(event)
      }
      iframe.onload = (data => {
        if (data.target) {
          this.pageFetchStatus = 'done'
          this.showIsLoadingMessage = false
        }
      })
    }
  }

  raiseTelemetry(data: any) {
    if (this.htmlContent) {
      /* tslint:disable-next-line */
      console.log(this.htmlContent.identifier)
      this.events.raiseInteractTelemetry(data.event, 'scrom', {
        contentId: this.htmlContent.identifier,
        ...data,
      })
    }
  }

  getUrl(url: string) {
    if (url && url.length > 0) {
      const tempData = url.split('content')
      if (url.indexOf(`/collection`) > 0) {
        return `${this.environment.mdoPath}/${this.environment.contentBucket}${tempData[tempData.length - 1]}`
      }
      if (tempData.length > 1) {
        return `${this.environment.mdoPath}/${this.environment.contentBucket}/content${tempData[tempData.length - 1]}`
      }
    }
    return url
  }

  generateUrl(oldUrl: string) {
    const chunk = oldUrl.split('/')
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
}
