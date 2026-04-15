import { AfterViewChecked, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { WidgetContentService } from '@sunbird-cb/toc'

import { NsWidgetResolver } from '@sunbird-cb/resolver'
import { ConfigurationsService, UtilityService, ValueService } from '@sunbird-cb/utils-v2'
import { Subscription } from 'rxjs'
// import { RootService } from '../../../../../src/app/component/root/root.service'
import { TStatus, ViewerDataService } from './viewer-data.service'
import { ViewerHeaderSideBarToggleService } from './viewer-header-side-bar-toggle.service'
import { PdfScormDataService } from './pdf-scorm-data-service'
import { TranslateService } from '@ngx-translate/core'
import { AppTocService } from './services/app-toc.service'
import { NsContent } from './models/constant'
import { PendingFunctionService } from './services/pending-function.service'
export enum ErrorType {
  accessForbidden = 'accessForbidden',
  notFound = 'notFound',
  internalServer = 'internalServer',
  serviceUnavailable = 'serviceUnavailable',
  somethingWrong = 'somethingWrong',
  mimeTypeMismatch = 'mimeTypeMismatch',
  previewUnAuthorised = 'previewUnAuthorised',
}

@Component({
  selector: 'viewer-container',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss'],
})

export class ViewerComponent implements OnInit, OnDestroy, AfterViewChecked {
  fullScreenContainer: HTMLElement | null = null
  content: any | null = null
  errorType = ErrorType
  show = true
  private isLtMedium$ = this.valueSvc.isLtMedium$
  sideNavBarOpened = false
  mode: 'over' | 'side' = 'side'
  forPreview = window.location.href.includes('/public/') || window.location.href.includes('&preview=true') ||
    window.location.href.includes('&status=Draft')
  isTypeOfCollection = true
  collectionId = this.activatedRoute.snapshot.queryParamMap.get('collectionId')
  batchId = this.activatedRoute.snapshot.queryParamMap.get('batchId')
  status: TStatus = 'none'
  error: any | null = null
  isNotEmbed = true
  completedCount: any = 0
  errorWidgetData: NsWidgetResolver.IRenderConfigWithTypedData<any> = {
    widgetType: 'errorResolver',
    widgetSubType: 'errorResolver',
    widgetData: {
      errorType: '',
    },
  }
  private screenSizeSubscription: Subscription | null = null
  private resourceChangeSubscription: Subscription | null = null
  leafNodesCount: any
  viewerHeaderSideBarToggleFlag = true
  isMobile = false
  contentMIMEType = ''
  handleBackFromPdfScormFullScreenFlag = false
  enrollmentList: any
  hierarchyData: any
  enrolledCourseData: any
  batchData: any
  tocStructure: any
  hasTocStructure = false
  viewerAboutContentData: any
  hierarchyMapData: any
  pathSet: any
  tocConfig: any = null
  isAssessmentScreen = false
  pageScrollSubscription: Subscription | null = null
  coursePrimaryCategory: any = ''
  compatibilityLevel = 0
  loadAllHierarchyData = false
  contentReadData: any = {}
  isPreAssessment = false
  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private valueSvc: ValueService,
    private dataSvc: ViewerDataService,
    // private rootSvc: RootService,
    private utilitySvc: UtilityService,
    private changeDetector: ChangeDetectorRef,
    private widgetServ: WidgetContentService,
    private configSvc: ConfigurationsService,
    public viewerHeaderSideBarToggleService: ViewerHeaderSideBarToggleService,
    public pdfScormDataService: PdfScormDataService,
    private translate: TranslateService,
    public tocSvc: AppTocService,
    public pendingFunctionService: PendingFunctionService
    // private renderer: Renderer2,
  ) {
    // this.rootSvc.showNavbarDisplay$.next(false)
    // this.abc.mobileTopHeaderVisibilityStatus.next(false)

    // if (window.innerWidth <= 1200) {
    //   this.isMobile = true
    // } else {
    //   this.isMobile = false
    // }

    if (window.location.href.includes('practice')) {
      this.isAssessmentScreen = true
    } else {
      this.isAssessmentScreen = false
    }
    // this.rootSvc.showNavbarDisplay$.next(false)
    // this.abc.mobileTopHeaderVisibilityStatus.next(false)
    if (localStorage.getItem('websiteLanguage')) {
      this.translate.setDefaultLang('en')
      let lang = JSON.stringify(localStorage.getItem('websiteLanguage'))
      lang = lang.replace(/\"/g, '')
      this.translate.use(lang)
    }
    if (this.activatedRoute.snapshot.queryParams && this.activatedRoute.snapshot.queryParams['preAssessment']) {
      this.isPreAssessment = true
    } else {
      this.isPreAssessment = false
    }
  }

  getContentData(e: any) {
    e.activatedRoute.data.subscribe((data: { content: { data: NsContent.IContent } }) => {
      if (data.content && data.content.data) {
        this.contentMIMEType = data.content.data.mimeType
      }
    })
    const collectionId = e.activatedRoute.snapshot.queryParams.collectionId
    if (collectionId) {
      this.widgetServ.fetchAuthoringContent(collectionId).subscribe((data1: any) => {
        if (data1) {
          if (this.activatedRoute.snapshot.queryParams.preAssessment) {
            this.tocSvc.createPreAssessmentHirarchyProgressHashmap(data1)
            this.contentMIMEType = data1['mimeType']
            this.hierarchyData = data1['preEnrolmentResources']
            this.content = data1
            this.resetAndFetchTocStructure()

          } else {
            this.content = data1
          }
        }
      })
    }

  }

  getAuthDataIdentifer() {
    if (this.isPreAssessment) {


    } else {
      const collectionId = this.activatedRoute.snapshot.queryParams.collectionId
      this.widgetServ.fetchAuthoringContent(collectionId).subscribe((data: any) => {
        if (data.result.content.cstoken) {
          this.configSvc.cstoken = data.result.content.cstoken
        }
        this.leafNodesCount = data.result.content.leafNodesCount
      })
    }
  }

  async ngOnInit() {
    this.getTocConfig()
    // for left side player scroll on right side resource click
    // this.pageScrollSubscription = this.tocSvc.updatePageScroll.subscribe((value: boolean) => {
    //   if (value) {
    //     setTimeout(() => {
    //       if (document.getElementsByClassName('viewer-player-container') &&
    //         document.getElementsByClassName('viewer-player-container')[0])  {
    //         document.getElementsByClassName('viewer-player-container')[0].scrollIntoView({
    //           behavior: 'smooth',
    //           block: 'start',
    //           inline: 'start',
    //        })
    //       }
    //     },         1000)
    //   }
    // })

    // const contentData = this.activatedRoute.snapshot.data.hierarchyData
    //   && this.activatedRoute.snapshot.data.hierarchyData.data || ''
    this.enrollmentList = this.activatedRoute.snapshot.data.enrollmentData
      && this.activatedRoute.snapshot.data.enrollmentData.data || ''
    this.contentReadData = this.activatedRoute.snapshot.data.contentRead
      && this.activatedRoute.snapshot.data.contentRead.data || ''

    this.contentReadData = await this.fetchContentRead()
    if (this.contentReadData && this.contentReadData.identifier) {
      await this.widgetServ.fetchContent(this.contentReadData.identifier).subscribe(async (res: any) => {
        this.hierarchyData = res.result.content
        await this.manipulateHierarchyData()
        this.resetAndFetchTocStructure()

        this.leafNodesCount = res.result.content.leafNodesCount
      })
    }
    // if (contentData && contentData.result && contentData.result.content) {
    //   this.coursePrimaryCategory = contentData.result.content.courseCategory
    //   if (contentData.result.content.children && contentData.result.content.children.length) {
    //     this.compatibilityLevel = contentData.result.content.children[0]['compatibilityLevel']
    //   }
    //   this.hierarchyData = contentData.result.content
    //   console.log('this.content', this.content)
    //   console.log('this.batchId', this.batchId)
    //   console.log('this.hierarchyData', this.hierarchyData)

    // }

    // if (this.collectionId && this.enrollmentList) {
    //   const enrolledCourseData = this.widgetLibServ.getEnrolledDataFromList(this.enrollmentList.courses, this.collectionId)
    //   this.enrolledCourseData = enrolledCourseData
    //   if (enrolledCourseData && enrolledCourseData.batch) {
    //     this.batchData = {
    //       content: [enrolledCourseData.batch],
    //       enrolled: true,
    //     }
    //     if (!this.forPreview) {
    //       this.tocSvc.mapSessionCompletionPercentage(this.batchData)
    //     }
    //   }

    // }

    this.pdfScormDataService.handleBackFromPdfScormFullScreen.subscribe((data: any) => {
      this.handleBackFromPdfScormFullScreenFlag = data
    })

    this.viewerHeaderSideBarToggleService.visibilityStatus.subscribe((data: any) => {
      const sideNavBarDrawerState: any = document.getElementById('side-nav-drawer-state')

      if (data) {
        if (this.isMobile) {
          this.sideNavBarOpened = false
          this.viewerHeaderSideBarToggleFlag = data
        } else {
          this.sideNavBarOpened = true
          this.viewerHeaderSideBarToggleFlag = data
        }
        if (sideNavBarDrawerState) {
          sideNavBarDrawerState.style.display = 'block'
        }
      } else {
        this.sideNavBarOpened = false
        this.viewerHeaderSideBarToggleFlag = data
        if (sideNavBarDrawerState) {
          sideNavBarDrawerState.style.display = 'none'
        }
      }

    })
    if (this.collectionId) {
      // this.getAuthDataIdentifer()
    }
    // this.getEnrollmentList()
    this.isNotEmbed = !(
      window.location.href.includes('/embed/') ||
      this.activatedRoute.snapshot.queryParams.embed === 'true'
    )
    this.isTypeOfCollection = this.activatedRoute.snapshot.queryParams.collectionType ? true : false
    this.screenSizeSubscription = this.isLtMedium$.subscribe(isSmall => {
      // this.sideNavBarOpened = !isSmall
      this.sideNavBarOpened = isSmall ? false : true
      this.mode = isSmall ? 'over' : 'side'
    })

    this.resourceChangeSubscription = this.dataSvc.changedSubject.subscribe(_ => {
      this.status = this.dataSvc.status
      this.error = this.dataSvc.error
      if (this.error && this.error.status) {
        switch (this.error.status) {
          case 403: {
            this.errorWidgetData.widgetData.errorType = ErrorType.accessForbidden
            break
          }
          case 404: {
            this.errorWidgetData.widgetData.errorType = ErrorType.notFound
            break
          }
          case 500: {
            this.errorWidgetData.widgetData.errorType = ErrorType.internalServer
            break
          }
          case 503: {
            this.errorWidgetData.widgetData.errorType = ErrorType.serviceUnavailable
            break
          }
          default: {
            this.errorWidgetData.widgetData.errorType = ErrorType.somethingWrong
            break
          }
        }
      }
      if (this.error && this.error.errorType === this.errorType.mimeTypeMismatch) {
        setTimeout(() => {
          this.router.navigate([this.error.probableUrl])
          // tslint:disable-next-line: align
        }, 3000)
      }
      if (this.error && this.error.errorType === this.errorType.previewUnAuthorised) {
      }
    })

    // if (this.collectionId) {
    //   if (!this.forPreview) {
    //     const enrollCourseData = this.enrolledCourseData
    //     if (enrollCourseData && (enrollCourseData.completionPercentage === 100 || enrollCourseData.status === 2)) {
    //       this.downloadCertificate(enrollCourseData)
    //     }
    //   }
    // }
  }

  ngAfterViewChecked() {
    const container = document.getElementById('fullScreenContainer')
    if (container) {
      this.fullScreenContainer = container
      this.changeDetector.detectChanges()
    } else {
      this.fullScreenContainer = null
      this.changeDetector.detectChanges()
    }
  }
  ngOnDestroy() {
    // this.rootSvc.showNavbarDisplay$.next(true)
    if (this.screenSizeSubscription) {
      this.screenSizeSubscription.unsubscribe()
    }
    if (this.resourceChangeSubscription) {
      this.resourceChangeSubscription.unsubscribe()
    }
    if (this.pageScrollSubscription) {
      this.pageScrollSubscription.unsubscribe()
    }
  }

  // downloadCertificate(courseData: any): void {
  //   if (courseData && courseData.issuedCertificates && courseData.issuedCertificates.length) {
  //     const certificateId = courseData.issuedCertificates[0].identifier
  //     this.widgetServ.downloadCert(certificateId).subscribe((response: any) => {
  //       if (this.content) {
  //         this.content['certificateObj'] = {
  //           certData: response.result.printUri,
  //           certId: certificateId,
  //         }
  //       }

  //       if (this.hierarchyData) {
  //         this.hierarchyData['certificateObj'] = {
  //           certData: response.result.printUri,
  //           certId: certificateId,
  //         }
  //       }
  //     })
  //   }

  // }

  getTocConfig() {
    const url = `${this.configSvc.sitePath}/feature/toc.json`
    this.widgetServ.fetchConfig(url).subscribe(data => {
      this.tocConfig = data
      this.widgetServ.updateTocConfig(data)
    })
  }

  toggleSideBar() {
    this.sideNavBarOpened = !this.sideNavBarOpened
  }

  // getEnrollmentList() {
  //   let userId
  //   if (this.configSvc.userProfile) {
  //     userId = this.configSvc.userProfile.userId || ''
  //   }
  //   this.userSvc.fetchUserBatchList(userId).subscribe(
  //     (result: any) => {
  //       const courses: NsContent.ICourse[] = result && result.courses
  //       this.widgetServ.currentBatchEnrollmentList = courses
  //     })
  // }

  minimizeBar() {
    if (this.utilitySvc.isMobile) {
      this.sideNavBarOpened = false
    }
  }

  get isPreview(): boolean {
    this.forPreview = window.location.href.includes('/public/') || window.location.href.includes('&preview=true') ||
      window.location.href.includes('&status=Draft')
    return this.forPreview
  }

  updatePathSet(event: any) {
    if (event && event.pathSet) {
      this.pathSet = event.pathSet
    }
  }

  async manipulateHierarchyData() {
    if (!this.forPreview) {
      this.tocSvc.mapCompletionPercentageProgram(this.hierarchyData, this.enrollmentList.courses)

    } else {
      this.loadAllHierarchyData = true
      this.tocSvc.contentLoader.next(true)
      await this.tocSvc.fetchCourseHeirarchy(this.hierarchyData)
      this.tocSvc.contentLoader.next(false)
      this.tocSvc.checkModuleWiseData(this.hierarchyData)
      this.tocSvc.createHirarchyProgressHashmap(this.hierarchyData)
      this.loadAllHierarchyData = false
    }
  }

  resetAndFetchTocStructure() {
    this.tocStructure = {
      assessment: 0,
      finalTest: 0,
      course: 0,
      handsOn: 0,
      interactiveVideo: 0,
      learningModule: 0,
      other: 0,
      pdf: 0,
      survey: 0,
      podcast: 0,
      practiceTest: 0,
      quiz: 0,
      video: 0,
      webModule: 0,
      webPage: 0,
      youtube: 0,
      interactivecontent: 0,
      offlineSession: 0,
    }
    if (this.hierarchyData) {
      this.hasTocStructure = false
      this.tocStructure.learningModule = this.hierarchyData.primaryCategory === NsContent.EPrimaryCategory.MODULE ? -1 : 0
      this.tocStructure.course = this.hierarchyData.primaryCategory === NsContent.EPrimaryCategory.COURSE ? -1 : 0
      this.tocStructure = this.tocSvc.getTocStructure(this.hierarchyData, this.tocStructure)

      for (const progType in this.tocStructure) {
        if (this.tocStructure[progType] > 0) {
          this.hasTocStructure = true
          break
        }
      }
    }
  }

  updateCount(event: any) {
    this.completedCount = event
  }

  navigateToBack() {
    this.viewerHeaderSideBarToggleService.visibilityStatus.next(true)
    window.history.back()
  }

  async fetchContentRead() {
    return new Promise((resolve, reject) => {
      this.pendingFunctionService.getContentData(this.collectionId).subscribe((data: any) => {
        if (data) {
          resolve(data)
        } else {
          reject({})
        }
      })
    })
  }

  getPreEnrollmentResoureStateRead() {
    let identifierArr: any = []
    this.hierarchyData.map((item: any) => {
      identifierArr.push(item.identifier)
    })
    if (identifierArr && identifierArr.length) {
      let req: any = {
        "request": {
          "contentIds": identifierArr,
          "fields": [
            // "lastAccessTime",
            // "completionPercentage"
          ]
        }
      }
      this.tocSvc.readPreEnrollmentResourcesState(req).subscribe((data: any) => {
        // console.log('read resources progress data', data)
        if (data && data.result && data.result.contentList) {
          for (let i = 0; i < data.result.contentList.length; i++) {
            if (Object.keys(this.tocSvc.hashmap) && Object.keys(this.tocSvc.hashmap).length && this.tocSvc.hashmap[data.result.contentList[i]['contentId']]) {
              this.tocSvc.hashmap[data.result.contentList[i]['contentId']]['completionPercentage'] = data.result.contentList[i]['completionPercentage']
              this.tocSvc.hashmap[data.result.contentList[i]['contentId']]['completionStatus'] = data.result.contentList[i]['status']
            }
          }
        }
      })
    }

  }

  moveToBack() {
    if (this.activatedRoute.snapshot.queryParams && this.activatedRoute.snapshot.queryParams['collectionId']) {
      let url = `app/home/explore-content/${this.activatedRoute.snapshot.queryParams['collectionId']}/preview`
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate([url])
      })
    }

    // history.back()

  }


}
