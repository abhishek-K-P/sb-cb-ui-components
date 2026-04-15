import { Component, OnInit, Input, OnDestroy, AfterViewInit, HostBinding, Inject, EventEmitter, Output, NgZone, ViewChildren, QueryList } from '@angular/core'
import { NsWidgetResolver, WidgetBaseComponent } from '@sunbird-cb/resolver-v2'
import { NsContentStripWithTabs } from './content-strip-with-tabs-lib.model'
// import { HttpClient } from '@angular/common/http'
import { WidgetContentLibService } from '../../_services/widget-content-lib.service'
import { NsContent } from '../../_models/widget-content.model'
import { MultilingualTranslationsService } from '../../_services/multilingual-translations.service'
import {
  TFetchStatus,
  LoggerService,
  EventService,
  ConfigurationsService,
  UtilityService,
  WsEvents,
  WidgetEnrollService,
} from '@sunbird-cb/utils-v2'
import { Subscription } from 'rxjs'
import { filter } from 'rxjs/operators'
import { WidgetUserServiceLib } from '../../_services/widget-user-lib.service'
// import { environment } from 'src/environments/environment'
// tslint:disable-next-line
import * as _ from 'lodash'
import { MatLegacyTabChangeEvent as MatTabChangeEvent, MatLegacyTabGroup as MatTabGroup } from '@angular/material/legacy-tabs'
import { NsCardContent } from '../../_models/card-content-v2.model'
import { ITodayEvents } from '../../_models/event'
import { TranslateService } from '@ngx-translate/core'
import { Router } from '@angular/router'

const IDB_NAME = 'zoho-form'
const IDB_STORE = 'enrollment'
const IDB_HIERARCHY_STORE = 'hierarchy'

interface IStripUnitContentData {
  key: string
  canHideStrip: boolean
  mode?: string
  showStrip: boolean
  disableTranslate: boolean
  enabled?: boolean
  widgets?: NsWidgetResolver.IRenderConfigWithAnyData[]
  stripTitle: string
  stripSecondaryTitle?: string
  titleClass?: string
  stripTitleLink?: {
    link: {
      queryParams: string
    },
    icon: string,
    queryParams: string
  }
  sliderConfig?: {
    showNavs: boolean,
    showDots: boolean,
    maxWidgets?: number
    cerificateCardMargin?: boolean
  }
  stripConfig: any
  tabsType?: string
  tabs?: NsContentStripWithTabs.IContentStripTab[] | undefined
  stripName?: string
  stripLogo?: string
  description?: string
  stripInfo?: any
  noDataWidget?: NsWidgetResolver.IRenderConfigWithAnyData
  errorWidget?: NsWidgetResolver.IRenderConfigWithAnyData
  showOnNoData: boolean
  showOnLoader: boolean
  showOnError: boolean
  loaderWidgets?: any
  stripBackground?: string
  secondaryHeading?: any
  viewMoreUrl: any
  request?: any

}

@Component({
  selector: 'sb-uic-content-strip-with-tabs',
  templateUrl: './content-strip-with-tabs-lib.component.html',
  styleUrls: ['./content-strip-with-tabs-lib.component.scss'],
})
export class ContentStripWithTabsLibComponent extends WidgetBaseComponent
  implements
  OnInit,
  OnDestroy,
  AfterViewInit,
  NsWidgetResolver.IWidgetData<NsContentStripWithTabs.IContentStripMultiple> {
  @Input() widgetData!: NsContentStripWithTabs.IContentStripMultiple
  @Output() emptyResponse = new EventEmitter<any>()
  @Output() viewAllResponse = new EventEmitter<any>()
  @Output() telemtryResponse = new EventEmitter<any>()
  @Output() editStripContent = new EventEmitter<any>()
  @Output() toggleSectionVisibility = new EventEmitter<any>()
  @Output() removeStrip = new EventEmitter<any>()
  @Input() providerId: any = ''
  @Input() emitViewAll: boolean = false
  @Input() channnelName: any = ''
  @Input() isEdit: boolean = false
  @HostBinding('id')
  public id = `ws-strip-miltiple_${Math.random()}`;
  stripsResultDataMap: { [key: string]: IStripUnitContentData } = {};
  stripsKeyOrder: string[] = [];
  showAccordionData = true;
  showParentLoader = false;
  showParentError = false;
  showParentNoData = false;
  errorDataCount = 0;
  noDataCount = 0;
  successDataCount = 0;
  contentAvailable = true;
  baseUrl = this.configSvc.sitePath || '';
  veifiedKarmayogi = false;
  environment!: any
  changeEventSubscription: Subscription | null = null;
  defaultMaxWidgets = 12;
  todaysEvents: any = [];
  userEventsAll: any = undefined;
  currentTab: any
  moveToNextTab = false
  currentTabIndex = 0
  @ViewChildren(MatTabGroup) tabGroups!: QueryList<MatTabGroup>
  private paginationTimers: any[] = []

  constructor(
    // private contentStripSvc: ContentStripNewMultipleService,
    @Inject('environment') environment: any,
    private contentSvc: WidgetContentLibService,
    private loggerSvc: LoggerService,
    private eventSvc: EventService,
    private configSvc: ConfigurationsService,
    public utilitySvc: UtilityService,
    // private http: HttpClient,
    // private searchServSvc: SearchServService,
    public router: Router,
    private userSvc: WidgetUserServiceLib,
    private translate: TranslateService,
    private langtranslations: MultilingualTranslationsService,
    private enrollSvc: WidgetEnrollService,
    private ngZone: NgZone
  ) {
    super()
    if (localStorage.getItem('websiteLanguage')) {
      this.translate.setDefaultLang('en')
      let lang = JSON.stringify(localStorage.getItem('websiteLanguage'))
      lang = lang.replace(/\"/g, '')
      this.translate.use(lang)
    }
    this.environment = environment
  }

  ngOnInit() {
    // const url = window.location.href
    this.initData()
    this.contentSvc.telemetryData$.subscribe((data: any) => {
      if (
        this.widgetData.strips && this.widgetData.strips[0] &&
        this.widgetData.strips[0]?.key !== 'cbpPlan' &&
        this.widgetData.strips[0]?.key !== 'forYou' &&
        this.widgetData.strips[0]?.key !== 'continueLearning'
        && this.widgetData.strips[0]?.key === data.typeOfTelemetry
      ) {
        this.telemtryResponse.emit(data)
      }
    })
    this.contentSvc.telemetryEventData$.subscribe((data: any) => {
      if (_.get(this.widgetData, 'strips[0].key') === _.get(data, 'context.pageSection')) {
        this.telemtryResponse.emit(data)
      }
    })


  }

  ngAfterViewInit() {
    // Force mat-tab-header to recalculate pagination on SPA navigation
    this.triggerTabPaginationUpdate()
    // Also re-trigger whenever ViewChildren list changes (new tabs rendered)
    this.tabGroups.changes.subscribe(() => {
      this.triggerTabPaginationUpdate()
    })
  }

  ngOnDestroy() {
    if (this.changeEventSubscription) {
      this.changeEventSubscription.unsubscribe()
    }
    this.clearPaginationTimers()
  }

  /**
   * Directly call updatePagination() on each MatTabGroup to recalculate
   * whether pagination arrows should be shown. Uses staggered delays
   * to handle async rendering during SPA navigation.
   */
  private triggerTabPaginationUpdate(): void {
    this.clearPaginationTimers()
    const delays = [0, 100, 300, 500, 1000, 2000]
    delays.forEach(delay => {
      const timer = setTimeout(() => {
        if (this.tabGroups) {
          this.tabGroups.forEach(tg => {
            try { tg.updatePagination() } catch (_e) { /* noop */ }
            try { tg.realignInkBar() } catch (_e) { /* noop */ }
          })
        }
      }, delay)
      this.paginationTimers.push(timer)
    })
  }

  private clearPaginationTimers(): void {
    this.paginationTimers.forEach(t => clearTimeout(t))
    this.paginationTimers = []
  }

  showAccordion(key: string) {
    if (this.utilitySvc.isMobile && this.stripsResultDataMap[key].mode === 'accordion') {
      return this.showAccordionData
    }
    return true
  }

  setHiddenForStrip(key: string) {
    this.stripsResultDataMap[key].showStrip = false
    sessionStorage.setItem(`cstrip_${key}`, '1')
  }
  private getIfStripHidden(key: string): boolean {
    const storageItem = sessionStorage.getItem(`cstrip_${key}`)
    return Boolean(storageItem !== '1')
  }

  private initData() {
    this.stripsKeyOrder = this.widgetData?.strips?.map(strip => strip.key) || []
    if (this.widgetData?.loader && this.widgetData?.strips?.length) {
      this.showParentLoader = true
    }
    // Fetch the data
    for (const strip of this.widgetData.strips) {
      if (this.checkForEmptyWidget(strip)) {
        this.fetchStripFromRequestData(strip, false)
      } else {
        this.processStrip(strip, [], 'done', true, null)
      }
    }
    // Subscription for changes
    const keyAndEvent: { key: string; type: string; from: string }[] = this.widgetData.strips
      .map(strip => ({
        key: strip.key,
        type: (strip.refreshEvent && strip.refreshEvent.eventType) || '',
        from: (strip.refreshEvent && strip.refreshEvent.from.toString()) || '',
      }))
      .filter(({ key, type, from }) => key && type && from)
    const eventTypeSet = new Set(keyAndEvent.map(e => e.type))
    this.changeEventSubscription = this.eventSvc.events$
      .pipe(filter(event => eventTypeSet.has(event.eventType)))
      .subscribe(event => {
        keyAndEvent
          .filter(e => e.type === event.eventType && e.from === event.from)
          .map(e => e.key)
          .forEach(k => this.fetchStripFromKey(k, false))
      })
  }

  private fetchStripFromKey(key: string, calculateParentStatus = true) {
    const stripData = this.widgetData.strips.find(strip => strip.key === key)
    if (stripData) {
      this.fetchStripFromRequestData(stripData, calculateParentStatus)
    }
  }

  isStripShowing(data: any) {
    let count = 0
    if (data && data.key === this.environment.programStripKey && (!data.tabs || !data.tabs.length) &&
      data.stripTitle === this.environment.programStripName && data.widgets.length > 0) {
      data.widgets.forEach((key: any) => {
        if (key && key.widgetData.content.primaryCategory === this.environment.programStripPrimaryCategory) {
          count = count + 1
        }
      })
      if (count > 0) {
        data.showStrip = true
      } else {
        data.showStrip = false
      }
    }
    return data ? data.showStrip : false
  }

  get isMobile() {
    return this.utilitySvc.isMobile || false
  }

  getdata(data: IStripUnitContentData) {
    if (data.stripInfo) {
      return data.stripInfo.widget
    }
    return {}

  }
  checkCondition(wData: NsContentStripWithTabs.IContentStripMultiple, data: IStripUnitContentData) {
    if (wData.strips[0].stripConfig && wData.strips[0].stripConfig.hideShowAll) {
      return !wData.strips[0].stripConfig.hideShowAll
    }
    return wData.strips[0].viewMoreUrl && data.widgets && data.widgets.length >= 4
  }
  checkVisible(data: IStripUnitContentData) {
    return data.stripInfo && data.stripInfo.visibilityMode === 'visible'
  }

  getContineuLearningLenth(data: IStripUnitContentData) {
    return data.widgets ? data.widgets.length : 0
  }
  getLength(data: IStripUnitContentData, key: string = '') {
    if (!data.tabs || !data.tabs.length) {
      return data.widgets ? data.widgets.length : 0
    }
    if (key === 'samuhikCharchaContent' || (key === 'myEvents' && this.userEventsAll && this.userEventsAll.length)) {
      return true
    }
    // if tabs are there check if each tab has widgets and get the tab with max widgets
    const tabWithMaxWidgets = data.tabs.reduce(
      (prev, current) => {
        if (!prev.widgets && !current.widgets) {
          return current
        }
        if (prev.widgets && current.widgets) {
          return (prev.widgets.length > current.widgets.length) ? prev : current
        }
        if (current.widgets && !prev.widgets) {
          return current
        }
        if (!current.widgets && prev.widgets) {
          return prev
        }
        return current
        // return (prev.widgets && current.widgets && (prev.widgets.length > current.widgets.length) ) ? prev : current
        // tslint:disable-next-line: align
      }, data.tabs[0])
    // if tabs has atleast 1 widgets then strip will show or else not
    return this.isEdit ? true : tabWithMaxWidgets.widgets ? tabWithMaxWidgets.widgets.length : 0
  }

  private getFiltersFromArray(v6filters: any) {
    const filters: any = {}
    if (v6filters.constructor === Array) {
      v6filters.forEach(((f: any) => {
        Object.keys(f).forEach(key => {
          filters[key] = f[key]
        })
      }))
      return filters
    }
    return v6filters
  }

  private transformSearchV6FiltersV2(v6filters: any) {
    const filters: any = {}
    if (v6filters.constructor === Array) {
      v6filters.forEach(((f: any) => {
        Object.keys(f).forEach(key => {
          filters[key] = f[key]
        })
      }))
      return filters
    }
    return v6filters
  }

  checkForDateFilters(filters: any) {
    let userData: any
    if (this.configSvc.userProfile) {
      userData = this.configSvc.userProfile
    }

    if (filters && filters.hasOwnProperty('batches.endDate')) {
      // tslint:disable-next-line
      filters['batches.endDate']['>='] = eval(filters['batches.endDate']['>='])
    } else if (filters && filters.hasOwnProperty('batches.enrollmentEndDate')) {
      // tslint:disable-next-line
      filters['batches.enrollmentEndDate']['>='] = eval(filters['batches.enrollmentEndDate']['>='])
    } else if (filters.organisation &&
      filters.organisation.indexOf('<orgID>') >= 0
    ) {
      if (this.providerId) {
        filters.organisation = this.providerId
      } else {
        filters.organisation = userData && userData.rootOrgId

        if (filters && filters.hasOwnProperty('designation')) {
          filters.designation = userData.professionalDetails.length > 0 ?
            userData.professionalDetails[0].designation : ''
        }
      }

    } else if (filters.createdFor && filters.createdFor.indexOf('<orgID>') >= 0) {
      if (this.providerId) {
        filters.createdFor = this.providerId
      } else {
        filters.createdFor = userData && userData.rootOrgId
      }
    }
    if (filters.endDate && filters.endDate['<='].indexOf('<today>') >= 0) {
      filters.endDate['<='] = this.todayDate
    }
    if (filters.endDate && filters.endDate['<'].indexOf('<today>') >= 0) {
      filters.endDate['<'] = this.todayDate
    }
    if (filters.startDate && filters.startDate['>='].indexOf('<today>') >= 0) {
      filters.startDate['>='] = this.todayDate
    }
    if (filters.startDate && filters.startDate['>'].indexOf('<today>') >= 0) {
      filters.startDate['>'] = this.todayDate
    }
    return filters
  }

  get todayDate(): string {
    const currentDate = new Date()

    const year = currentDate.getFullYear()
    const month = ('0' + (currentDate.getMonth() + 1)).slice(-2) // Add leading zero if month is less than 10
    const day = ('0' + currentDate.getDate()).slice(-2) // Add leading zero if day is less than 10

    return `${year}-${month}-${day}`
  }

  private fetchStripFromRequestData(
    strip: NsContentStripWithTabs.IContentStripUnit,
    calculateParentStatus = true,
  ) {

    // setting initial values
    strip.loaderWidgets = this.transformSkeletonToWidgets(strip)

    // Check if strip has tabs list and filter out inactive tabs
    if (strip.tabs && Array.isArray(strip.tabs)) {
      strip.tabs = strip.tabs.filter(tab => {
        if (!('hideTab' in tab) || tab.hideTab !== true) {
          return true
        }
        return false
      })
    }

    if (strip.request.myEvents) {
      this.fetchMyEventsData(strip, calculateParentStatus)
    }
    if (_.get(strip, 'request.fetchData', '') === 'events') {
      this.processStrip(strip, [], 'fetching', false, null)
      this.fetchFromSearchV6Events(strip, calculateParentStatus)
    } else {
      this.processStrip(strip, [], 'fetching', false, null)
      this.fetchFromEnrollmentList(strip, calculateParentStatus)
      this.fetchFromSearchV6(strip, calculateParentStatus)
      this.fetchFromTrendingContent(strip, calculateParentStatus)
      this.fetchAllCbpPlans(strip, calculateParentStatus)
      this.fetchAllTopContent(strip, calculateParentStatus)
      this.fetchAllFeaturedContent(strip, calculateParentStatus)
      this.fetchAllBookMarkData(strip, calculateParentStatus)
      this.fetchAllPlaylistSearch(strip, calculateParentStatus)
      this.fetchPlaylistReadData(strip, calculateParentStatus)
      this.fetchCiosContentData(strip, calculateParentStatus)

    }

  }

  fetchFromEnrollmentList(strip: NsContentStripWithTabs.IContentStripUnit, calculateParentStatus = true) {
    if (strip.request && strip.request.enrollmentList && Object.keys(strip.request.enrollmentList).length) {
      let userId = ''
      let content: NsContent.IContent[]
      let contentNew: NsContent.IContent[]
      let tabResults: any[] = []
      const queryParams = _.get(strip.request.enrollmentList, 'queryParams')
      // if (queryParams && queryParams.batchDetails) {
      //   if (!queryParams.batchDetails.includes('&retiredCoursesEnabled=true')) {
      //     queryParams.batchDetails += '&retiredCoursesEnabled=true'
      //   }
      // }
      if (this.configSvc.userProfile) {
        userId = this.configSvc.userProfile.userId
      }
      // this.userSvc.resetTime('enrollmentService')
      // tslint:disable-next-line: deprecation
      this.userSvc.fetchUserBatchList(userId, queryParams).subscribe(
        (result: any) => {
          this.userSvc.fetchExtEnrollData().subscribe((res: any) => {
            if (res && res.result && res.result.courses && res.result.courses.length) {
              let enrolledCourses = result && result.courses
              let enrolledExtCourses = res.result && res.result.courses
              const courses = [...enrolledExtCourses, ...enrolledCourses]
              this.formatEnrollmentData(strip, courses, content, contentNew, tabResults, calculateParentStatus)
            } else {
              let enrolledCourses = result && result.courses
              const courses = [...enrolledCourses]
              this.formatEnrollmentData(strip, courses, content, contentNew, tabResults, calculateParentStatus)
            }
          }, (_err: any) => {
            let enrolledCourses = result && result.courses
            const courses = [...enrolledCourses]
            this.formatEnrollmentData(strip, courses, content, contentNew, tabResults, calculateParentStatus)
          })
        },
        (_err: any) => {
          this.processStrip(strip, [], 'error', calculateParentStatus, null)
        }

      )
    }
  }

  formatEnrollmentData(strip: any, courses: any, content: any, contentNew: any, tabResults: any, calculateParentStatus: any) {
    const showViewMore = Boolean(
      courses.length > 5 && strip.stripConfig && strip.stripConfig.postCardForSearch,
    )
    const viewMoreUrl = showViewMore
      ? {
        path: (strip.viewMoreUrl && strip.viewMoreUrl.path) || '',
        queryParams: {
          q: strip.viewMoreUrl && strip.viewMoreUrl.queryParams,
          f:
            strip.request && strip.request.searchV6 && strip.request.searchV6.filters
              ? JSON.stringify(
                // this.searchServSvc.transformSearchV6Filters(
                strip.request.searchV6.filters
                // ),
              )
              : {},
        },
      }
      : null
    if (courses && courses.length) {
      content = courses.map((c: any) => {
        const contentTemp: NsContent.IContent = c.content || {}
        contentTemp.completionPercentage = c.completionPercentage || c.progress || 0
        contentTemp.completionStatus = c.completionStatus || c.status || 0
        contentTemp.enrolledDate = c.enrolledDate || ''
        contentTemp.lastContentAccessTime = c.lastContentAccessTime || ''
        contentTemp.lastReadContentStatus = c.lastReadContentStatus || ''
        contentTemp.lastReadContentId = c.lastReadContentId || ''
        contentTemp.lrcProgressDetails = c.lrcProgressDetails || ''
        contentTemp.issuedCertificates = c.issuedCertificates || []
        contentTemp.batchId = c.batchId || ''
        return contentTemp
      })
    }
    // To filter content with completionPercentage > 0,
    // so that only those content will show in home page
    // continue learing strip
    // if (content && content.length) {
    //   contentNew = content.filter((c: any) => {
    //     /** commented as both are 0 after enrolll */
    //     if (c.completionPercentage && c.completionPercentage > 0) {
    //       return c
    //     }
    //   })
    // }

    // To sort in descending order of the enrolled date
    contentNew = (content || []).sort((a: any, b: any) => {
      const dateA: any = new Date(a.lastContentAccessTime || 0)
      const dateB: any = new Date(b.lastContentAccessTime || 0)
      return dateB - dateA
    })

    if (strip.tabs && strip.tabs.length) {
      tabResults = this.splitEnrollmentTabsData(contentNew, strip)
      this.processStrip(
        strip,
        this.transformContentsToWidgets(contentNew, strip),
        'done',
        calculateParentStatus,
        viewMoreUrl,
        tabResults
      )
    } else {
      this.processStrip(
        strip,
        this.transformContentsToWidgets(contentNew, strip),
        'done',
        calculateParentStatus,
        viewMoreUrl,
      )
    }
  }

  splitEnrollmentTabsData(contentNew: NsContent.IContent[], strip: NsContentStripWithTabs.IContentStripUnit) {
    const tabResults: any[] = []
    const splitData = this.getInprogressAndCompleted(
      contentNew,
      (e: any) => e.completionStatus === 1 || e.completionPercentage < 100,
      strip,
    )

    if (strip.tabs && strip.tabs.length) {
      for (let i = 0; i < strip.tabs.length; i += 1) {
        if (strip.tabs[i]) {
          tabResults.push(
            {
              ...strip.tabs[i],
              fetchTabStatus: 'done',
              ...(splitData.find(itmInner => {
                if (strip.tabs && strip.tabs[i] && itmInner.value === strip.tabs[i].value) {
                  return itmInner
                }
                return undefined
              })),
            }
          )
        }
      }
    }
    return tabResults
  }

  getInprogressAndCompleted(array: NsContent.IContent[],
    customFilter: any,
    strip: NsContentStripWithTabs.IContentStripUnit) {
    const inprogress: any[] = []
    const completed: any[] = []
    // array.forEach((e: any, idx: number, arr: any[]) => (customFilter(e, idx, arr) ? inprogress : completed).push(e))
    array.forEach((e, idx, arr) => {
      const status = e.status ? (e.status as string).toLowerCase() : ''
      const statusRetired = status === 'retired'
      if (customFilter(e, idx, arr)) {
        if (!statusRetired) {
          inprogress.push(e)
        }
      } else {
        completed.push(e)
      }
    })
    // Sort the completed array with 'Live' status first and 'Retired' status second
    completed.sort((a: any, b: any) => {
      const statusA = a.status ? a.status.toLowerCase() : ''
      const statusB = b.status ? b.status.toLowerCase() : ''
      if (statusA === 'live' && statusB !== 'live') {
        return -1
      }
      if (statusA !== 'live' && statusB === 'live') {
        return 1
      }
      if (statusA === 'retired' && statusB !== 'retired') {
        return 1
      }
      if (statusA !== 'retired' && statusB === 'retired') {
        return -1
      }
      return 0
    })
    return [
      { value: 'inprogress', widgets: this.transformContentsToWidgets(inprogress, strip) },
      { value: 'completed', widgets: this.transformContentsToWidgets(completed, strip) }]
  }

  async fetchFromSearchV6(strip: NsContentStripWithTabs.IContentStripUnit, calculateParentStatus = true) {
    if (strip.request && strip.request.searchV6 && Object.keys(strip.request.searchV6).length) {
      // if (!(strip.request.searchV6.locale && strip.request.searchV6.locale.length > 0)) {
      //   if (this.configSvc.activeLocale) {
      //     strip.request.searchV6.locale = [this.configSvc.activeLocale.locals[0]]
      //   } else {
      //     strip.request.searchV6.locale = ['en']
      //   }
      // }
      let originalFilters: any = []
      // tslint:disable:no-console
      if (strip.request &&
        strip.request.searchV6 &&
        strip.request.searchV6.request &&
        strip.request.searchV6.request.filters) {
        originalFilters = strip.request.searchV6.request.filters
        strip.request.searchV6.request.filters = this.checkForDateFilters(strip.request.searchV6.request.filters)
        strip.request.searchV6.request.filters = this.getFiltersFromArray(
          strip.request.searchV6.request.filters,
        )
      }
      if (strip.tabs && strip.tabs.length) {
        // TODO: Have to extract requestRequired to outer level of tabs config
        const firstTab = strip.tabs[0]
        if (firstTab.requestRequired) {
          if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
            const allTabs = this.stripsResultDataMap[strip.key].tabs
            const currentTabFromMap = (allTabs && allTabs.length && allTabs[0]) as NsContentStripWithTabs.IContentStripTab

            this.getTabDataByNewReqSearchV6(strip, 0, currentTabFromMap, calculateParentStatus)
          }
        }

      } else {
        try {
          const response = await this.searchV6Request(strip, strip.request, calculateParentStatus)
          if (response && response.results) {
            if (response.results.result.content) {
              if (strip.key === 'scheduledAssessment') {
                let requestData: any = {
                  "courseCategory": "Comprehensive Assessment Program"
                }
                const comprehensiveResponse = await this.postRequestMethod(strip, requestData, 'apis/proxies/v8/user/v2/assignedcourses', calculateParentStatus)
                let comprehensiveContent: any = []
                let comprehensiveResult: any = []
                let result: any = []
                if (comprehensiveResponse?.results?.result?.content && comprehensiveResponse?.results?.result?.content?.length) {
                  comprehensiveContent = comprehensiveResponse.results.result.content

                  const comprehensiveAssessmentIdentifiers = comprehensiveContent.map((a: any) => a?.identifier)
                  this.setCaIdentifiers(comprehensiveAssessmentIdentifiers)                  

                  let courseUnits =  []
                  comprehensiveResult = comprehensiveResponse.results.result.content.map((ele: any) => {
                      if(ele?.courseUnits && ele.courseUnits.length) {
                        courseUnits = [...courseUnits, ...ele.courseUnits]
                      }
                      return ele?.identifier 
                  })
                  localStorage.setItem('comprehensiveAssessmentCourseUnits', JSON.stringify(courseUnits))
                }
                if (response?.results?.result?.content && response?.results?.result?.content?.length) {
                  result = response.results.result.content.map((a: any) => a?.identifier)
                }
                let combinedArray = [...result, ...comprehensiveResult]
                let request = {
                  "request": {
                    "courseId": [...result, ...comprehensiveResult]
                  }
                }
                let enrollResponseData = []
                if (combinedArray && combinedArray.length) {
                  enrollResponseData = await this.enrollSvc.fetchEnrollContentData(request).toPromise().then(async (res: any) => {
                    const enrollData: any = {}
                    if (res && res.result && res.result.courses && res.result.courses.length) {
                      res.result.courses.forEach((data: any) => {
                        enrollData[data.collectionId] = data
                      })
                      return enrollData
                    } else {
                      return {}
                    }
                  }).catch((_err: any) => {
                    return {}
                  })
                }
                let contentData = [...response.results.result.content, ...comprehensiveContent]
                this.checkInvitOnlyAssessments(contentData, strip, calculateParentStatus, response.viewMoreUrl, enrollResponseData)
              } else {
                this.processStrip(
                  strip,
                  this.transformContentsToWidgets(response.results.result.content, strip),
                  'done',
                  calculateParentStatus,
                  response.viewMoreUrl,
                )
              }
            } else if (response.results.result.Event) {
              this.processStrip(
                strip,
                this.transformEventsV2ToWidgets(response.results.result.Event, strip),
                'done',
                calculateParentStatus,
                response.viewMoreUrl,
              )
            } else {
              this.processStrip(strip, [], 'error', calculateParentStatus, null)
            }

          } else {
            this.processStrip(strip, [], 'error', calculateParentStatus, null)
          }
        } catch (error) {
          // Handle errors
          // console.error('Error:', error);
        }
      }
    }
  }

  checkInvitOnlyAssessments(content: any, strip: any, calculateParentStatus: any, viewMoreUrl: any, enrollmentData: any) {
    if (Object.keys(enrollmentData)) {
      enrollmentData = Object.keys(enrollmentData).length ? enrollmentData : {}
      let filteredArray: any = []
      let now = new Date().getTime()
      content.forEach((data: any) => {
        if (enrollmentData[data.identifier]) {
          const batchData = enrollmentData[data.identifier]?.content?.batches.find((batch: any) => batch.batchId === enrollmentData[data.identifier]?.batchId) || {}
          batchData['endDate'] = data.endDate ? data.endDate : batchData.endDate
          if (enrollmentData[data.identifier].status !== 2 && batchData) {
            const enrollData = batchData
            const endDate = this.getEndDateTime(enrollData.endDate)
            // let endDate:any = '2024-07-7T00:00:00.000Z'
            let timeDuration = endDate - now
            if (timeDuration > 0) {
              data['batch'] = batchData
              data['isEnrolled'] = true
              data['completionPercentage'] = enrollmentData[data.identifier].completionPercentage
              filteredArray.push(data)
            }
          }

        } else if (data.courseCategory === NsContent.ECourseCategory.COMPREHENSIVE_ASSESSMENT_PROGRAM) {
          // Non-enrolled comprehensive assessment
          // Check if it has a valid end date that's in the future
          if (data.endDate) {
            const batchData = data.batches && data.batches.length ? data.batches[0] : {}
            const endDate = this.getEndDateTime(data.endDate)
            if (endDate >= now) {
              // Mark as not enrolled but valid for display
              data['isEnrolled'] = false
              data['batch'] = batchData
              data['batch']['endDate'] = data.endDate
              filteredArray.push(data)
            }
          }
        }
      })
      filteredArray = filteredArray.sort((a: any, b: any) => {
        const dateA: any = new Date(a.batch.startDate || 0)
        const dateB: any = new Date(b.batch.startDate || 0)
        return dateA - dateB
      })
      this.processStrip(
        strip,
        this.transformContentsToWidgets(filteredArray, strip),
        'done',
        calculateParentStatus,
        viewMoreUrl,
      )
    } else {
      this.processStrip(
        strip,
        [],
        'done',
        calculateParentStatus,
        viewMoreUrl,
      )
    }
  }
  getEndDateTime(endDate: any) {
    if (endDate) {
      const date = new Date(endDate)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      return endOfDay.getTime()
    }
    return new Date().getTime()
  }

  async searchV6Request(strip: NsContentStripWithTabs.IContentStripUnit,
    request: NsContentStripWithTabs.IContentStripUnit['request'],
    calculateParentStatus: boolean
  ): Promise<any> {
    const originalFilters: any = []
    return new Promise<any>((resolve, reject) => {
      if (request && request.searchV6) {
        request.searchV6.request.filters = this.checkForDateFilters(request.searchV6.request.filters)
        this.contentSvc.searchV6(request.searchV6).subscribe(results => {
          const showViewMore = Boolean(
            results.result.content && results.result.content.length > 5 && strip.stripConfig && strip.stripConfig.postCardForSearch,
          )
          const viewMoreUrl = showViewMore
            ? {
              path: strip.viewMoreUrl && strip.viewMoreUrl.path || '',
              queryParams: {
                tab: 'Learn',
                q: strip.viewMoreUrl && strip.viewMoreUrl.queryParams,
                f:
                  request &&
                    request.searchV6 &&
                    request.searchV6.request &&
                    request.searchV6.request.filters
                    ? JSON.stringify(
                      this.transformSearchV6FiltersV2(
                        originalFilters,
                      )
                    )
                    : {},
              },
            }
            : null
          // if (viewMoreUrl && viewMoreUrl.queryParams) {
          //   viewMoreUrl.queryParams = viewMoreUrl.queryParams
          // }
          resolve({ results, viewMoreUrl })
        }, (error: any) => {
          this.processStrip(strip, [], 'error', calculateParentStatus, null)
          reject(error)
        },
        )
      }
    })
  }

  async fetchFromTrendingContent(strip: NsContentStripWithTabs.IContentStripUnit, calculateParentStatus = true) {
    if (strip.request && strip.request.trendingSearch && Object.keys(strip.request.trendingSearch).length) {
      // if (!(strip.request.searchV6.locale && strip.request.searchV6.locale.length > 0)) {
      //   if (this.configSvc.activeLocale) {
      //     strip.request.searchV6.locale = [this.configSvc.activeLocale.locals[0]]
      //   } else {
      //     strip.request.searchV6.locale = ['en']
      //   }
      // }
      let originalFilters: any = []
      // tslint:disable:no-console
      if (strip.request &&
        strip.request.trendingSearch &&
        strip.request.trendingSearch.request &&
        strip.request.trendingSearch.request.filters) {
        originalFilters = strip.request.trendingSearch.request.filters
        strip.request.trendingSearch.request.filters = this.checkForDateFilters(strip.request.trendingSearch.request.filters)
        strip.request.trendingSearch.request.filters = this.getFiltersFromArray(
          strip.request.trendingSearch.request.filters,
        )
      }
      if (strip.tabs && strip.tabs.length) {
        // TODO: Have to extract requestRequired to outer level of tabs config
        const firstTab = strip.tabs[0]
        if (firstTab.requestRequired) {
          if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
            const allTabs = this.stripsResultDataMap[strip.key].tabs
            const currentTabFromMap = (allTabs && allTabs.length && allTabs[0]) as NsContentStripWithTabs.IContentStripTab

            this.getTabDataByNewReqTrending(strip, 0, currentTabFromMap, calculateParentStatus)
          }
        }

      } else {
        try {
          const response = await this.trendingSearchRequest(strip, strip.request, calculateParentStatus)
          if (response && response.results && response.results.response) {
            const content = response.results.response[strip.request.trendingSearch.responseKey] || []
            this.processStrip(
              strip,
              this.transformContentsToWidgets(content, strip),
              'done',
              calculateParentStatus,
              response.viewMoreUrl || '',
            )
            if (!content.length) {
              this.emptyResponse.emit(true)
            }
          } else {
            this.emptyResponse.emit(true)
            this.processStrip(strip, [], 'done', calculateParentStatus, null)
          }
        } catch (error) {
          // Handle errors
          this.emptyResponse.emit(true)
          this.processStrip(strip, [], 'error', calculateParentStatus, null)
        }
      }
    }
  }

  async trendingSearchRequest(strip: NsContentStripWithTabs.IContentStripUnit,
    request: NsContentStripWithTabs.IContentStripUnit['request'],
    calculateParentStatus: boolean
  ): Promise<any> {
    const originalFilters: any = []
    return new Promise<any>((resolve, reject) => {
      if (request && request.trendingSearch) {
        // check for the request if it has dynamic values]
        if (request.trendingSearch.request.filters.organisation &&
          request.trendingSearch.request.filters.organisation.indexOf('<orgID>') >= 0
        ) {
          let userRootOrgId
          if (this.configSvc.userProfile) {
            userRootOrgId = this.configSvc.userProfile.rootOrgId
          }
          request.trendingSearch.request.filters.organisation = userRootOrgId
        }
        this.contentSvc.trendingContentSearch(request.trendingSearch).subscribe(results => {
          const showViewMore = Boolean(
            results.result &&
            strip.request &&
            results.result[strip.request.trendingSearch.responseKey] &&
            results.result[strip.request.trendingSearch.responseKey].length > 5 &&
            strip.stripConfig && strip.stripConfig.postCardForSearch,
          )
          const viewMoreUrl = showViewMore
            ? {
              path: strip.viewMoreUrl && strip.viewMoreUrl.path || '',
              queryParams: {
                tab: 'Learn',
                q: strip.viewMoreUrl && strip.viewMoreUrl.queryParams,
                f:
                  request &&
                    request.trendingSearch &&
                    request.trendingSearch.request &&
                    request.trendingSearch.request.filters
                    ? JSON.stringify(
                      this.transformSearchV6FiltersV2(
                        originalFilters,
                      )
                    )
                    : {},
              },
            }
            : null
          let proccesedResult: any = []
          if (results && results.response && results.response.certifications) {
            results.response.certifications.map((result: any) => {
              if (result.source === this.channnelName) {
                proccesedResult.push(result)
              }
            })
          }
          results = { response: { certifications: proccesedResult } }
          resolve({ results, viewMoreUrl })
        }, (error: any) => {
          if (error.error && error.error.status === 400) {
            this.processStrip(strip, [], 'done', calculateParentStatus, null)
          }
          // this.processStrip(strip, [], 'done', calculateParentStatus, null)
          reject(error)
        },
        )
      }
    })
  }

  toggleInfo(data: IStripUnitContentData) {
    const stripInfo = this.stripsResultDataMap[data.key].stripInfo
    if (stripInfo) {
      if (stripInfo.mode !== 'below') {
        this.loggerSvc.warn(`strip info mode: ${stripInfo.mode} not implemented yet`)
        stripInfo.mode = 'below'
      }
      if (stripInfo.mode === 'below') {
        this.stripsResultDataMap[data.key].stripInfo = {
          ...stripInfo,
          visibilityMode: stripInfo.visibilityMode === 'hidden' ? 'visible' : 'hidden',
        }
      }
    }
  }

  private transformContentsToWidgets(
    contents: NsContent.IContent[],
    strip: NsContentStripWithTabs.IContentStripUnit,
  ) {
    return (contents || []).map((content, idx) => (
      content ? {
        widgetType: 'cardLib',
        widgetSubType: 'cardContentLib',
        widgetHostClass: 'mb-2',
        widgetData: {
          content,
          ...(content.batch && { batch: content.batch }),
          cardSubType: strip.stripConfig && strip.stripConfig.cardSubType,
          cardCustomeClass: strip.customeClass ? strip.customeClass : '',
          context: { pageSection: strip.key, position: idx },
          intranetMode: strip.stripConfig && strip.stripConfig.intranetMode,
          deletedMode: strip.stripConfig && strip.stripConfig.deletedMode,
          contentTags: strip.stripConfig && strip.stripConfig.contentTags,
        },
      } : {
        widgetType: 'card',
        widgetSubType: 'cardContent',
        widgetHostClass: 'mb-2',
        widgetData: {},
      }
    ))
  }

  private transformEventsToWidgets(
    contents: ITodayEvents[],
    strip: NsContentStripWithTabs.IContentStripUnit,
  ) {
    this.eventSvc.setEventListData(contents)
    return (this.eventSvc.todaysEvents || []).map((content: any, idx: any) => (content ? {
      widgetType: 'card',
      widgetSubType: 'eventHubCard',
      widgetHostClass: 'mb-2',
      widgetData: {
        content,
        cardSubType: strip.stripConfig && strip.stripConfig.cardSubType,
        cardCustomeClass: strip.customeClass ? strip.customeClass : '',
        context: { pageSection: strip.key, position: idx },
        intranetMode: strip.stripConfig && strip.stripConfig.intranetMode,
        deletedMode: strip.stripConfig && strip.stripConfig.deletedMode,
        contentTags: strip.stripConfig && strip.stripConfig.contentTags,
      },
    } : {
      widgetType: 'card',
      widgetSubType: 'eventHubCard',
      widgetHostClass: 'mb-2',
      widgetData: {},
    }
    ))
  }
  private transformSkeletonToWidgets(
    strip: any
  ) {
    return [1, 2, 3, 4, 5, 6, 7, 7, 8, 9, 10].map(_content => ({
      widgetType: 'cardLib',
      widgetSubType: 'cardContentLib',
      widgetHostClass: 'mb-2',
      widgetData: {
        cardSubType: strip.loaderConfig && strip.loaderConfig.cardSubType || 'card-standard-skeleton',
        cardCustomeClass: strip.customeClass ? strip.customeClass : '',
      },
    }))
  }

  private async processStrip(
    strip: NsContentStripWithTabs.IContentStripUnit,
    results: NsWidgetResolver.IRenderConfigWithAnyData[] = [],
    fetchStatus: TFetchStatus,
    calculateParentStatus = true,
    _viewMoreUrl: any,
    tabsResults?: NsContentStripWithTabs.IContentStripTab[] | undefined,
    // calculateParentStatus is used so that parents' status is not re-calculated if the API is called again coz of filters, etc.
  ) {
    const stripData = {
      viewMoreUrl: strip.viewMoreUrl,
      key: strip.key,
      canHideStrip: Boolean(strip.canHideStrip),
      showStrip: this.getIfStripHidden(strip.key),
      noDataWidget: strip.noDataWidget,
      errorWidget: strip.errorWidget,
      stripInfo: strip.stripInfo || {},
      stripTitle: strip.title,
      stripSecondaryTitle: strip?.secondaryTitle || '',
      titleClass: strip.titleClass || '',
      stripTitleLink: strip.stripTitleLink,
      disableTranslate: strip.disableTranslate,
      sliderConfig: strip.sliderConfig,
      tabs: tabsResults ? tabsResults : strip.tabs,
      tabsType: strip.tabsType ? strip.tabsType : '',
      stripName: strip.name,
      mode: strip.mode,
      stripConfig: strip.stripConfig,
      stripBackground: strip.stripBackground,
      secondaryHeading: strip.secondaryHeading,
      loaderWidgets: strip.loaderWidgets || [],
      widgets:
        fetchStatus === 'done'
          ? [
            ...(strip.preWidgets || []).map(w => ({
              ...w,
              widgetHostClass: `mb-2 ${w.widgetHostClass}`,
            })),
            ...results,
            ...(strip.postWidgets || []).map(w => ({
              ...w,
              widgetHostClass: `mb-2 ${w.widgetHostClass}`,
            })),
          ]
          : [],
      showOnNoData: Boolean(
        strip.noDataWidget &&
        !((strip.preWidgets || []).length + results.length + (strip.postWidgets || []).length) &&
        fetchStatus === 'done',
      ),
      showOnLoader: Boolean(strip.loader && fetchStatus === 'fetching'),
      showOnError: Boolean(strip.errorWidget && fetchStatus === 'error'),
    }
    // const stripData = this.stripsResultDataMap[strip.key]
    this.stripsResultDataMap = {
      ...this.stripsResultDataMap,
      [strip.key]: stripData,
    }
    if (!tabsResults) {
      if (
        calculateParentStatus &&
        (fetchStatus === 'done' || fetchStatus === 'error') &&
        stripData.widgets
      ) {
        this.checkParentStatus(fetchStatus, stripData.widgets.length)
      }
      if (calculateParentStatus && !(results && results.length > 0)) {
        this.contentAvailable = false
      } else if (results && results.length > 0) {
        this.contentAvailable = true
      }
    } else {
      this.contentAvailable = true
    }
    // After tabs data updates, recalculate mat-tab pagination
    if (fetchStatus === 'done' && stripData.tabs && stripData.tabs.length) {
      this.triggerTabPaginationUpdate()
    }
  }
  private checkParentStatus(fetchStatus: TFetchStatus, stripWidgetsCount: number): void {
    if (fetchStatus === 'done' && !stripWidgetsCount) {
      this.noDataCount += 1
    } else if (fetchStatus === 'done' && stripWidgetsCount) {
      this.successDataCount += 1
    } else if (fetchStatus === 'error') {
      this.errorDataCount += 1
    }
    const settledCount = this.noDataCount + this.successDataCount + this.errorDataCount
    const totalCount = this.widgetData.strips.length
    if (this.successDataCount > 0 && settledCount < totalCount) {
      return
    }
    this.showParentLoader = settledCount !== totalCount
    this.showParentNoData =
      this.noDataCount > 0 && this.noDataCount + this.errorDataCount === totalCount
    this.showParentError = this.errorDataCount === totalCount
  }
  checkForEmptyWidget(strip: NsContentStripWithTabs.IContentStripUnit): boolean {
    if (
      strip.request &&
      ((strip.request.api && Object.keys(strip.request.api).length) ||
        (strip.request.search && Object.keys(strip.request.search).length) ||
        (strip.request.searchRegionRecommendation &&
          Object.keys(strip.request.searchRegionRecommendation).length) ||
        (strip.request.searchV6 && Object.keys(strip.request.searchV6).length) ||
        (strip.request.enrollmentList && Object.keys(strip.request.enrollmentList).length) ||
        (strip.request.cbpList && Object.keys(strip.request.cbpList).length) ||
        (strip.request.trendingSearch && Object.keys(strip.request.trendingSearch).length) ||
        (strip.request.topContent && Object.keys(strip.request.topContent).length) ||
        (strip.request.featureContent && Object.keys(strip.request.featureContent).length) ||
        (strip.request.bookmarkRead && Object.keys(strip.request.bookmarkRead).length) ||
        (strip.request.playlistSearch && Object.keys(strip.request.playlistSearch).length) ||
        (strip.request.playlistRead && Object.keys(strip.request.playlistRead).length) ||
        (strip.request.ciosContent && Object.keys(strip.request.ciosContent).length) ||
        (strip.request.myEvents && Object.keys(strip.request.myEvents).length)
      )
    ) {
      return true
    }
    return strip?.tabs?.length ? true : false
  }

  public tabClicked(tabEvent: any, stripMap: IStripUnitContentData, stripKey: string) {
    this.currentTabIndex = tabEvent
    if (stripMap && stripMap.tabs && stripMap.tabs[tabEvent]) {
      stripMap.tabs[tabEvent].fetchTabStatus = 'inprogress'
      stripMap.tabs[tabEvent].tabLoading = true
      stripMap.showOnLoader = true
    }
    // const data: WsEvents.ITelemetryTabData = {
    //   label: `${stripMap.tabs[tabEvent].label}`,
    //   index: tabEvent,
    // };
    // this.eventSvc.raiseInteractTelemetry(
    //   {
    //     type: WsEvents.EnumInteractTypes.CLICK,
    //     subType: WsEvents.EnumInteractSubTypes.HOME_PAGE_STRIP_TABS,
    //     id: `${_.camelCase(data.label)}-tab`,
    //   },
    //   {},
    //   {
    //     module: WsEvents.EnumTelemetrymodules.HOME,
    //   }
    // );
    const currentTabFromMap: any = stripMap.tabs && stripMap.tabs[tabEvent]
    this.currentTab = JSON.parse(JSON.stringify(currentTabFromMap))
    const currentStrip = this.widgetData.strips.find(s => s.key === stripKey)
    if (this.stripsResultDataMap[stripKey] && currentTabFromMap) {
      this.stripsResultDataMap[stripKey].viewMoreUrl.queryParams = {
        ...this.stripsResultDataMap[stripKey].viewMoreUrl.queryParams,
        tabSelected: currentTabFromMap.label,
      }
    }
    if (currentStrip && currentTabFromMap && !currentTabFromMap.computeDataOnClick) {
      if (currentTabFromMap.requestRequired && currentTabFromMap.request) {
        // call API to get tab data and process
        // this.processStrip(currentStrip, [], 'fetching', true, null)
        if (currentTabFromMap.request.searchV6) {
          this.getTabDataByNewReqSearchV6(currentStrip, tabEvent, currentTabFromMap, true)
        } else if (currentTabFromMap.request.trendingSearch) {
          this.getTabDataByNewReqTrending(currentStrip, tabEvent, currentTabFromMap, true)
        } else if (currentTabFromMap.request.topContent) {
          this.getTabDataByNewReqTopContent(currentStrip, tabEvent, currentTabFromMap, true)
        } else if (currentTabFromMap.request.playlistRead) {
          this.getTabDataByNewReqPlaylistReadContent(currentStrip, tabEvent, currentTabFromMap, true)
        } else if (currentTabFromMap.request.ciosContent) {
          this.getTabDataByCiosSearch(currentStrip, tabEvent, currentTabFromMap, true)
        } else if (currentTabFromMap.request.myEvents) {
          this.getMyEventsByTabs(currentStrip, tabEvent, currentTabFromMap, false)
        }
        if (stripMap && stripMap.tabs && stripMap.tabs[tabEvent]) {
          stripMap.tabs[tabEvent].tabLoading = false
          stripMap.tabs[tabEvent].fetchTabStatus = 'done'
        }
      } else {
        this.getTabDataByfilter(currentStrip, currentTabFromMap, true)
        setTimeout(() => {
          if (stripMap && stripMap.tabs && stripMap.tabs[tabEvent]) {
            stripMap.tabs[tabEvent].tabLoading = false
            stripMap.tabs[tabEvent].fetchTabStatus = 'done'
            stripMap.showOnLoader = false
          }
        }, 200)
      }
    }
  }


  async getTabDataByNewReqSearchV6(
    strip: NsContentStripWithTabs.IContentStripUnit,
    tabIndex: number,
    currentTab: NsContentStripWithTabs.IContentStripTab,
    calculateParentStatus: boolean
  ) {
    try {
      const response = await this.searchV6Request(strip, currentTab.request, calculateParentStatus)
      let resContent: any = []
      if (response && response.results) {
        if (response.results.result.content) {
          resContent = response.results.result.content
        } else if (response.results.result.Event) {
          resContent = response.results.result.Event
        }
        const widgets = this.transformContentsToWidgets(resContent, strip)
        let tabResults: any[] = []
        if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          if (allTabs && allTabs.length && allTabs[tabIndex]) {
            allTabs[tabIndex] = {
              ...allTabs[tabIndex],
              widgets,
              fetchTabStatus: 'done',
            }
            tabResults = allTabs
          }
        }
        this.processStrip(
          strip,
          widgets,
          'done',
          calculateParentStatus,
          response.viewMoreUrl,
          tabResults // tabResults as widgets
        )
      } else {
        this.processStrip(strip, [], 'error', calculateParentStatus, null)
      }
    } catch (error) {
      // Handle errors
      // console.error('Error:', error);
    }
  }

  async getTabDataByNewReqTrending(
    strip: NsContentStripWithTabs.IContentStripUnit,
    tabIndex: number,
    currentTab: NsContentStripWithTabs.IContentStripTab,
    calculateParentStatus: boolean
  ) {
    try {
      const response = await this.trendingSearchRequest(strip, currentTab.request, calculateParentStatus)
      if (response && response.results && response.results.response) {
        const content = response.results.response[currentTab.value] || []
        const widgets = this.transformContentsToWidgets(content, strip)
        let tabResults: any[] = []
        if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          if (allTabs && allTabs.length && allTabs[tabIndex]) {
            allTabs[tabIndex] = {
              ...allTabs[tabIndex],
              widgets,
              fetchTabStatus: 'done',
            }
            tabResults = allTabs
          }
        }
        this.processStrip(
          strip,
          widgets,
          'done',
          calculateParentStatus,
          response.viewMoreUrl,
          tabResults // tabResults as widgets
        )
      } else {
        this.processStrip(strip, [], 'done', calculateParentStatus, null)
      }
    } catch (error) {
      // Handle errors
      this.processStrip(strip, [], 'error', calculateParentStatus, null)
    }
  }

  getTabDataByfilter(
    strip: NsContentStripWithTabs.IContentStripUnit,
    currentTab: NsContentStripWithTabs.IContentStripTab,
    calculateParentStatus: boolean
  ) {
    // TODO: Write logic for individual filter if passed in config
    // add switch case based on config key passed
  }

  async fetchAllCbpPlans(strip: any, calculateParentStatus = true) {

    if (strip.request && strip.request.cbpList && Object.keys(strip.request.cbpList).length) {

      let courses: NsContent.IContent[]
      let tabResults: any[] = []
      let userId = this.configSvc.userProfile.userId
      const response = await this.userSvc.fetchCbpPlanList(userId).toPromise()
      if (response) {
        courses = response
        if (strip.tabs && strip.tabs.length) {
          tabResults = this.splitCbpTabsData(courses, strip)
          await this.processStrip(
            strip,
            this.transformContentsToWidgets(courses, strip),
            'done',
            calculateParentStatus,
            '',
            tabResults
          )
        } else {
          this.processStrip(
            strip,
            this.transformContentsToWidgets(courses, strip),
            'done',
            calculateParentStatus,
            'viewMoreUrl',
          )
        }
      }

    }
  }
  splitCbpTabsData(contentNew: NsContent.IContent[], strip: NsContentStripWithTabs.IContentStripUnit) {
    const tabResults: any[] = []
    const splitData = this.getTabsList(
      contentNew,
      strip,
    )
    if (strip.tabs && strip.tabs.length) {
      for (let i = 0; i < strip.tabs.length; i += 1) {
        if (strip.tabs[i]) {
          tabResults.push(
            {
              ...strip.tabs[i],
              fetchTabStatus: 'done',
              ...(splitData.find(itmInner => {
                if (strip.tabs && strip.tabs[i] && itmInner.value === strip.tabs[i].value) {
                  return itmInner
                }
                return undefined
              })),
            }
          )
        }
      }
    }
    return tabResults
  }

  getTabsList(array: NsContent.IContent[],
    strip: NsContentStripWithTabs.IContentStripUnit) {
    let all: any[] = []
    let upcoming: any[] = []
    let overdue: any[] = []
    array.forEach((e: any) => {
      all.push(e)
      if (e.planDuration === NsCardContent.ACBPConst.OVERDUE) {
        overdue.push(e)
      } else if (e.planDuration === NsCardContent.ACBPConst.UPCOMING) {
        upcoming.push(e)
      }
    })
    const allCompleted = all.filter((allData: any) => allData.contentStatus === 2)
    let allInCompleted = all.filter((allData: any) => allData.contentStatus < 2)

    let allCompletedOverDue = allCompleted.filter((allData: any) => allData.planDuration === NsCardContent.ACBPConst.OVERDUE)
    const allCompletedAll = allCompleted.filter((allData: any) => allData.planDuration !== NsCardContent.ACBPConst.OVERDUE)

    allCompletedOverDue = allCompletedOverDue.sort((a: any, b: any): any => {
      if (a.planDuration === NsCardContent.ACBPConst.OVERDUE && b.planDuration === NsCardContent.ACBPConst.OVERDUE) {
        const firstDate: any = new Date(a.endDate)
        const secondDate: any = new Date(b.endDate)
        return firstDate > secondDate ? -1 : 1
      }
    })

    allInCompleted = allInCompleted.sort((a: any, b: any): any => {
      if (a.planDuration === NsCardContent.ACBPConst.OVERDUE && b.planDuration === NsCardContent.ACBPConst.OVERDUE) {
        const firstDate: any = new Date(a.endDate)
        const secondDate: any = new Date(b.endDate)
        return firstDate > secondDate ? -1 : 1
      }
    })

    all = [...allInCompleted, ...allCompletedAll, ...allCompletedOverDue]

    overdue = overdue.filter((data: any): any => {
      return data.contentStatus < 2
    })

    overdue = overdue.sort((a: any, b: any): any => {
      const firstDate: any = new Date(a.endDate)
      const secondDate: any = new Date(b.endDate)
      return firstDate > secondDate ? -1 : 1
    })

    upcoming = upcoming.filter((data: any): any => {
      return data.contentStatus < 2
    })
    // this.getSelectedIndex(1)
    return [
      { value: 'all', widgets: this.transformContentsToWidgets(all, strip) },
      { value: 'upcoming', widgets: this.transformContentsToWidgets(upcoming, strip) },
      { value: 'overdue', widgets: this.transformContentsToWidgets(overdue, strip) }]
  }

  getSelectedIndex(stripsResultDataMap: any, key: any): number {
    let returnValue = 0
    if (key === 'cbpPlan') {
      if (stripsResultDataMap.tabs.length) {
        const data = stripsResultDataMap.tabs.filter((ele: any) => ele.value === 'upcoming')
        returnValue = data[0].widgets && data[0].widgets.length > 0 ? 1 : 0
      }
    }
    return key === 'myEvents' ? this.currentTabIndex : returnValue
  }

  translateLabels(label: string, type: any) {
    return this.langtranslations.translateLabel(label, type, '')
  }

  identify(index: number, item: any) {
    if (index >= 0) { }
    return item
  }
  tracker(index: number, item: any) {
    if (index >= 0) { }
    return _.get(item, 'widgetData.content.identifier')
  }

  async fetchAllTopContent(strip: NsContentStripWithTabs.IContentStripUnit, calculateParentStatus = true) {
    if (strip.request && strip.request.topContent && Object.keys(strip.request.topContent).length) {
      let originalFilters: any = []
      if (strip.request &&
        strip.request.topContent &&
        strip.request.topContent.request &&
        strip.request.topContent.request.filters) {
        originalFilters = strip.request.topContent.request.filters
        strip.request.topContent.request.filters = this.postMethodFilters(strip.request.topContent.request.filters)
      }
      if (strip.tabs && strip.tabs.length) {
        // TODO: Have to extract requestRequired to outer level of tabs config
        const firstTab = strip.tabs[0]
        if (firstTab.requestRequired) {
          if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
            const allTabs = this.stripsResultDataMap[strip.key].tabs
            const currentTabFromMap = (allTabs && allTabs.length && allTabs[0]) as NsContentStripWithTabs.IContentStripTab

            this.getTabDataByNewReqTopContent(strip, 0, currentTabFromMap, calculateParentStatus)
          }
        }

      } else {
        try {
          const response = await this.postRequestMethod(strip, strip.request.topContent, strip.request.apiUrl, calculateParentStatus)
          if (response && response.results) {
            if (response.results.result.content && response.results.result.content.length) {
              this.processStrip(
                strip,
                this.transformContentsToWidgets(response.results.result.content, strip),
                'done',
                calculateParentStatus,
                response.viewMoreUrl,
              )
            } else {
              this.processStrip(strip, [], 'error', calculateParentStatus, null)
              this.emptyResponse.emit(true)
            }

          } else {
            this.processStrip(strip, [], 'error', calculateParentStatus, null)
            this.emptyResponse.emit(true)
          }
        } catch (error) {
          // Handle errors
          // console.error('Error:', error);
        }
      }
    }
  }

  async fetchAllFeaturedContent(strip: NsContentStripWithTabs.IContentStripUnit, calculateParentStatus = true) {
    if (strip.request && strip.request.featureContent && Object.keys(strip.request.featureContent).length) {
      let originalFilters: any = []
      if (strip.request &&
        strip.request.featureContent &&
        strip.request.featureContent.request &&
        strip.request.featureContent.request.filters) {
        originalFilters = strip.request.featureContent.request.filters
        strip.request.featureContent.request.filters = this.postMethodFilters(strip.request.featureContent.request.filters)
      }
      try {
        const response = await this.postRequestMethod(strip, strip.request.featureContent, strip.request.apiUrl, calculateParentStatus)
        if (response && response.results) {
          if (response.results.result.content && response.results.result.content.length) {
            this.processStrip(
              strip,
              this.transformContentsToWidgets(response.results.result.content, strip),
              'done',
              calculateParentStatus,
              response.viewMoreUrl,
            )
          } else {
            this.processStrip(strip, [], 'error', calculateParentStatus, null)
            this.emptyResponse.emit(true)
          }

        } else {
          this.processStrip(strip, [], 'error', calculateParentStatus, null)
          this.emptyResponse.emit(true)
        }
      } catch (error) {
        this.emptyResponse.emit(true)
        // Handle errors
        // console.error('Error:', error);
      }
    }
  }


  async getTabDataByNewReqTopContent(
    strip: NsContentStripWithTabs.IContentStripUnit,
    tabIndex: number,
    currentTab: NsContentStripWithTabs.IContentStripTab,
    calculateParentStatus: boolean
  ) {
    if (currentTab.request &&
      currentTab.request.topContent &&
      currentTab.request.topContent.request &&
      currentTab.request.topContent.request.filters) {
      currentTab.request.topContent.request.filters = this.postMethodFilters(currentTab.request.topContent.request.filters)
    }
    try {
      // const response = await this.searchV6Request(strip, currentTab.request, calculateParentStatus);
      const response = await this.postRequestMethod(strip, currentTab.request.topContent, currentTab.request.apiUrl, calculateParentStatus)
      if (response.results && response.results.result) {
        const widgets = this.transformContentsToWidgets(response.results.result.content, strip)
        let tabResults: any[] = []
        if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          if (allTabs && allTabs.length && allTabs[tabIndex]) {
            allTabs[tabIndex] = {
              ...allTabs[tabIndex],
              widgets,
              fetchTabStatus: 'done',
            }
            tabResults = allTabs
          }
        }
        this.processStrip(
          strip,
          widgets,
          'done',
          calculateParentStatus,
          response.viewMoreUrl,
          tabResults // tabResults as widgets
        )
      } else {
        this.processStrip(strip, [], 'error', calculateParentStatus, null)
      }
    } catch (error) {
      // Handle errors
      // console.error('Error:', error);
    }
  }

  raiseTelemetry(stripData: any) {
    this.telemtryResponse.emit(stripData)
  }

  async postRequestMethod(strip: NsContentStripWithTabs.IContentStripUnit,
    request: NsContentStripWithTabs.IContentStripUnit['request'],
    apiUrl: string,
    calculateParentStatus: boolean
  ): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      if (request && request) {
        this.contentSvc.postApiMethod(apiUrl, request).subscribe(results => {
          if (results.result && results.result.content) {
            const showViewMore = Boolean(
              results.result.content && results.result.content.length > 5 && strip.stripConfig && strip.stripConfig.postCardForSearch,
            )
            const viewMoreUrl = showViewMore
              ? {
                path: strip.viewMoreUrl && strip.viewMoreUrl.path || '',
                queryParams: {
                  tab: 'Learn',
                  q: strip.viewMoreUrl && strip.viewMoreUrl.queryParams,
                  f: {},
                },
              }
              : null
            resolve({ results, viewMoreUrl })
          } else if (results && results.data) {
            const showViewMore = Boolean(
              results.data && results.data.length > 5 && strip.stripConfig && strip.stripConfig.postCardForSearch,
            )
            const viewMoreUrl = showViewMore ? {
              path: strip.viewMoreUrl && strip.viewMoreUrl.path || '',
              queryParams: {
                tab: 'Learn',
                q: strip.viewMoreUrl && strip.viewMoreUrl.queryParams,
                f: {},
              },
            }
              : null
            resolve({ results, viewMoreUrl })
          } else if (results.result && results.result.data) {
            const showViewMore = Boolean(
              results.data && results.result.data && results.result.data.length > 5 && strip.stripConfig && strip.stripConfig.postCardForSearch,
            )
            const viewMoreUrl = showViewMore ? {
              path: strip.viewMoreUrl && strip.viewMoreUrl.path || '',
              queryParams: {
                tab: 'Learn',
                q: strip.viewMoreUrl && strip.viewMoreUrl.queryParams,
                f: {},
              },
            }
              : null
            resolve({ results, viewMoreUrl })
          } if (results.result && results.result.events) {
            const showViewMore = Boolean(
              results.result.events && results.result.events.length > 5 && strip.stripConfig && strip.stripConfig.postCardForSearch,
            )
            const viewMoreUrl = showViewMore
              ? {
                path: strip.viewMoreUrl && strip.viewMoreUrl.path || '',
                queryParams: {
                  tab: 'Learn',
                  q: strip.viewMoreUrl && strip.viewMoreUrl.queryParams,
                  f: {},
                },
              }
              : null
            resolve({ results, viewMoreUrl })
          }

        }, (error: any) => {
          this.processStrip(strip, [], 'error', calculateParentStatus, null)
          reject(error)
        },
        )
      }
    })
  }

  async getRequestMethod(strip: NsContentStripWithTabs.IContentStripUnit,
    request: NsContentStripWithTabs.IContentStripUnit['request'],
    apiUrl: string,
    calculateParentStatus: boolean
  ): Promise<any> {
    const originalFilters: any = []
    return new Promise<any>((resolve, reject) => {
      if (request && request) {
        this.contentSvc.getApiMethod(apiUrl).subscribe(results => {
          let showViewMore: any
          if (results.result.data) {
            showViewMore = Boolean(
              results.result.data && results.result.data.orgList.length > 5 && strip.stripConfig && strip.stripConfig.postCardForSearch,
            )
          } else if (results.result.content) {
            let featuredProvider = JSON.parse(results.result.content.featuredProviders || '[]')
            showViewMore = Boolean(
              featuredProvider && featuredProvider.length > 5 && strip.stripConfig && strip.stripConfig.postCardForSearch,
            )
          }
          const viewMoreUrl = showViewMore
            ? {
              path: strip.viewMoreUrl && strip.viewMoreUrl.path || '',
            }
            : null
          resolve({ results, viewMoreUrl })
        }, (error: any) => {
          this.processStrip(strip, [], 'error', calculateParentStatus, null)
          reject(error)
        },
        )
      }
    })
  }

  postMethodFilters(filters: any) {
    if (filters.organisation &&
      filters.organisation.indexOf('<orgID>') >= 0
    ) {
      filters.organisation = filters.organisation.replace('<orgID>', this.providerId)
    }
    if (_.get(filters, 'request.eventEndDate', '').indexOf('<today>') >= 0) {
      filters.request.eventEndDate = this.todayDate
    }
    if (_.get(filters, 'request.eventStartDate', '').indexOf('<today>') >= 0) {
      filters.request.eventStartDate = this.todayDate
    }
    return filters
  }
  getFullUrl(apiUrl: any, id: string) {
    let formedUrl: string = apiUrl
    if (apiUrl.indexOf('<bookmarkId>') >= 0) {
      formedUrl = apiUrl.replace('<bookmarkId>', this.environment.mdoChannelsBookmarkId)
    } else if (apiUrl.indexOf('<playlistKey>') >= 0 && apiUrl.indexOf('<orgID>') >= 0) {
      formedUrl = apiUrl.replace('<playlistKey>', this.providerId + id)
      formedUrl = formedUrl.replace('<orgID>', this.providerId)
    } else if (apiUrl.indexOf('<doId>') >= 0) {
      formedUrl = apiUrl.replace('<doId>', this.environment.providerDataKey)
    } else if (apiUrl.indexOf('<userId>') >= 0) {
      formedUrl = apiUrl.replace('<userId>', id)
    }
    return formedUrl
  }

  redirectViewAll(stripData: any, path: string, queryParamsData: any) {
    if (this.emitViewAll) {
      this.viewAllResponse.emit(stripData)
    } else {
      // Ensure tabSelected is set if not present and tabs exist
      if (
        queryParamsData &&
        !queryParamsData['tabSelected'] &&
        Array.isArray(_.get(stripData, 'tabs')) &&
        _.get(stripData, 'tabs.length', 0) > 0
      ) {
        queryParamsData['tabSelected'] = _.get(stripData, `tabs[${this.currentTabIndex}].label`, '')
      }
      this.router.navigate([path], { queryParams: queryParamsData })
    }
  }

  async fetchAllBookMarkData(strip: NsContentStripWithTabs.IContentStripUnit, calculateParentStatus = true) {
    if (strip.request && strip.request.bookmarkRead && Object.keys(strip.request.bookmarkRead).length) {
      let originalFilters: any = []
      if (strip.request &&
        strip.request.bookmarkRead &&
        strip.request.bookmarkRead.bookmarkId) {
        strip.request.apiUrl = this.getFullUrl(strip.request.apiUrl, strip.request.bookmarkRead.bookmarkId)
      }
      try {
        const response = await this.getRequestMethod(strip, strip.request.bookmarkRead, strip.request.apiUrl, calculateParentStatus)
        let content = response.results.result.data.orgList
        if (response) {
          this.processStrip(
            strip,
            this.transformAllContentsToWidgets(content, strip),
            'done',
            calculateParentStatus,
            response,
          )

        } else {
          this.processStrip(strip, [], 'error', calculateParentStatus, null)
          this.emptyResponse.emit(true)
        }
      } catch (error) {
        this.emptyResponse.emit(true)
        // Handle errors
        // console.error('Error:', error);
      }
    }
  }

  private transformAllContentsToWidgets(
    contents: any,
    strip: NsContentStripWithTabs.IContentStripUnit,
  ) {
    return (contents || []).map((content, idx) => (
      content ? {
        widgetType: 'cardLib',
        widgetSubType: 'cardContentLib',
        widgetHostClass: 'mb-2',
        widgetData: {
          content,
          ...(content.batch && { batch: content.batch }),
          cardSubType: strip.stripConfig && strip.stripConfig.cardSubType,
          ...(strip.stripConfig && strip.stripConfig.publicCard && { publicCard: strip.stripConfig.publicCard }),
          cardCustomeClass: strip.customeClass ? strip.customeClass : '',
          context: { pageSection: strip.key, position: idx },
          intranetMode: strip.stripConfig && strip.stripConfig.intranetMode,
          deletedMode: strip.stripConfig && strip.stripConfig.deletedMode,
          contentTags: strip.stripConfig && strip.stripConfig.contentTags,
        },
      } : {
        widgetType: 'card',
        widgetSubType: 'cardContent',
        widgetHostClass: 'mb-2',
        widgetData: {},
      }
    ))
  }

  private transformAllTabContentsToWidgets(
    contents: any,
    currentTab: NsContentStripWithTabs.IContentStripTab,
  ) {
    return (contents || []).map((content, idx) => (
      content ? {
        widgetType: 'cardLib',
        widgetSubType: 'cardContentLib',
        widgetHostClass: 'mb-2',
        widgetData: {
          content,
          ...(content.batch && { batch: content.batch }),
          cardSubType: currentTab.stripConfig && currentTab.stripConfig.cardSubType,
          cardCustomeClass: currentTab.customeClass ? currentTab.customeClass : '',
          context: { pageSection: currentTab.value, position: idx },
          intranetMode: currentTab.stripConfig && currentTab.stripConfig.intranetMode,
          deletedMode: currentTab.stripConfig && currentTab.stripConfig.deletedMode,
          contentTags: currentTab.stripConfig && currentTab.stripConfig.contentTags,
        },
      } : {
        widgetType: 'card',
        widgetSubType: 'cardContent',
        widgetHostClass: 'mb-2',
        widgetData: {},
      }
    ))
  }

  async fetchAllPlaylistSearch(strip: NsContentStripWithTabs.IContentStripUnit, calculateParentStatus = true) {
    if (strip.request && strip.request.playlistSearch && Object.keys(strip.request.playlistSearch).length) {
      let originalFilters: any = []
      if (strip.request &&
        strip.request.playlistSearch &&
        strip.request.playlistSearch.request &&
        strip.request.playlistSearch.request.filters) {
        originalFilters = strip.request.playlistSearch.request.filters
        strip.request.playlistSearch.request.filters = this.postMethodFilters(strip.request.playlistSearch.request.filters)
      }
      try {
        const response = await this.postRequestMethod(strip, strip.request.playlistSearch.request, strip.request.apiUrl, calculateParentStatus)
        if (response && response.results) {
          if (response.results.result.data && response.results.result.data.length) {
            let finalPlaylistData: any = []
            let programData: any = response.results.result.data
            programData.forEach((prgData: any) => {
              if (prgData.children && prgData.children.length) {
                finalPlaylistData.push(prgData)
              }
            })
            if (finalPlaylistData.length) {
              this.processStrip(
                strip,
                this.transformContentsToWidgets(finalPlaylistData, strip),
                'done',
                calculateParentStatus,
                response.viewMoreUrl,
              )
            } else {
              this.emptyResponse.emit(true)
            }
          } else {
            this.processStrip(strip, [], 'error', calculateParentStatus, null)
            this.emptyResponse.emit(true)
          }

        } else {
          this.processStrip(strip, [], 'error', calculateParentStatus, null)
          this.emptyResponse.emit(true)
        }
      } catch (error) {
        this.emptyResponse.emit(true)
        // Handle errors
        // console.error('Error:', error);
      }
    }
  }

  async fetchPlaylistReadData(strip: NsContentStripWithTabs.IContentStripUnit, calculateParentStatus = true) {
    if (strip?.tabs?.length) {
      // TODO: Have to extract requestRequired to outer level of tabs config
      const firstTab = strip.tabs[0]
      if (firstTab.requestRequired) {
        if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          const currentTabFromMap = (allTabs && allTabs.length && allTabs[0]) as NsContentStripWithTabs.IContentStripTab

          this.getTabDataByNewReqPlaylistReadContent(strip, 0, currentTabFromMap, calculateParentStatus)
        }
      }
    } else {
      if (strip.request && strip.request.playlistRead && Object.keys(strip.request.playlistRead).length) {
        let originalFilters: any = []
        if (strip.request &&
          strip.request.playlistRead &&
          strip.request.playlistRead.type) {
          strip.request.apiUrl = this.getFullUrl(strip.request.apiUrl, strip.request.playlistRead.type)
        }
        if (strip.tabs && strip.tabs.length) {
          // TODO: Have to extract requestRequired to outer level of tabs config
          const firstTab = strip.tabs[0]
          if (firstTab.requestRequired) {
            if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
              const allTabs = this.stripsResultDataMap[strip.key].tabs
              const currentTabFromMap = (allTabs && allTabs.length && allTabs[0]) as NsContentStripWithTabs.IContentStripTab

              this.getTabDataByNewReqPlaylistReadContent(strip, 0, currentTabFromMap, calculateParentStatus)
            }
          }

        } else {
          try {
            const response = await this.getRequestMethod(strip, strip.request.playlistRead, strip.request.apiUrl, calculateParentStatus)

            if (response && response.results.result.content) {
              let content = response.results.result.content
              if (strip.key === 'providers') {
                let featuredProviders: any = JSON.parse(content.featuredProviders || '[]')
                this.processStrip(
                  strip,
                  this.transformAllContentsToWidgets(featuredProviders, strip),
                  'done',
                  calculateParentStatus,
                  response,
                )
              } else {
                this.processStrip(
                  strip,
                  this.transformAllContentsToWidgets(content, strip),
                  'done',
                  calculateParentStatus,
                  response,
                )
              }
            } else {
              this.processStrip(strip, [], 'error', calculateParentStatus, null)
              this.emptyResponse.emit(true)
            }
          } catch (error) {
            this.emptyResponse.emit(true)
            // Handle errors
            // console.error('Error:', error);
          }
        }
      }
    }
  }
  async getTabDataByNewReqPlaylistReadContent(
    strip: NsContentStripWithTabs.IContentStripUnit,
    tabIndex: number,
    currentTab: NsContentStripWithTabs.IContentStripTab,
    calculateParentStatus: boolean
  ) {
    if (currentTab.request &&
      currentTab.request.playlistRead &&
      currentTab.request.playlistRead.type) {
      currentTab.request.apiUrl = this.getFullUrl(currentTab.request.apiUrl, currentTab.request.playlistRead.type)
    }
    try {
      const response = await this.getRequestMethod(strip, currentTab.request.playlistRead, currentTab.request.apiUrl, calculateParentStatus)

      if (response.results && response.results.result) {
        let content = response.results.result.content
        let widgets = []
        if (currentTab.value === 'providers') {
          let featuredProviders: any = JSON.parse(content.featuredProviders || '[]')
          widgets = this.transformAllTabContentsToWidgets(featuredProviders, currentTab)
          strip['viewMoreUrl']['path'] = "app/learn/browse-by/provider/all-providers"
        } else {
          if (currentTab && currentTab.contentShuffel) {
            content = content.sort(() => Math.random() - 0.5)
          }
          widgets = this.transformAllTabContentsToWidgets(content, currentTab)
        }
        let tabResults: any[] = []
        if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          if (allTabs && allTabs.length && allTabs[tabIndex]) {
            allTabs[tabIndex] = {
              ...allTabs[tabIndex],
              widgets,
              fetchTabStatus: 'done',
            }
            tabResults = allTabs
          }
        }
        this.processStrip(
          strip,
          widgets,
          'done',
          calculateParentStatus,
          strip.viewMoreUrl,
          tabResults // tabResults as widgets
        )
      } else {
        let tabResults: any[] = []
        if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          if (allTabs && allTabs.length && allTabs[tabIndex]) {
            allTabs[tabIndex] = {
              ...allTabs[tabIndex],
              fetchTabStatus: 'done',
              widgets: [],
            }
            tabResults = allTabs
          }
        }
        this.processStrip(strip, [], 'error', calculateParentStatus, null, tabResults)
      }
    } catch (error) {
      console.error('Error:', error)
      let tabResults: any[] = []
      if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs && this.stripsResultDataMap[strip.key].tabs.length) {
        const allTabs = this.stripsResultDataMap[strip.key].tabs
        if (allTabs && allTabs.length && allTabs[tabIndex]) {
          allTabs[tabIndex] = {
            ...allTabs[tabIndex],
            widgets: [],
            fetchTabStatus: 'done',
          }
          tabResults = allTabs
        }
        this.processStrip(strip, [], 'error', calculateParentStatus, null, tabResults)
      } else {
        this.processStrip(strip, [], 'error', calculateParentStatus, null, tabResults)
      }
    }
  }

  async fetchCiosContentData(strip: NsContentStripWithTabs.IContentStripUnit, calculateParentStatus = true) {
    if (strip && strip.request.ciosContent && Object.keys(strip.request.ciosContent).length) {
      if (strip.tabs && strip.tabs.length) {
        // TODO: Have to extract requestRequired to outer level of tabs config
        const firstTab = strip.tabs[0]
        if (firstTab.requestRequired && firstTab.value === 'extCourse') {
          if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
            const allTabs = this.stripsResultDataMap[strip.key].tabs
            const currentTabFromMap = (allTabs && allTabs.length && allTabs[0]) as NsContentStripWithTabs.IContentStripTab
            this.getTabDataByCiosSearch(strip, 0, currentTabFromMap, calculateParentStatus)
          }
        }
        if (firstTab.requestRequired && firstTab.value === 'providers') {
          if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
            const allTabs = this.stripsResultDataMap[strip.key].tabs
            const currentTabFromMap = (allTabs && allTabs.length && allTabs[0]) as NsContentStripWithTabs.IContentStripTab
            this.getTabDataByNewReqPlaylistReadContent(strip, 0, currentTabFromMap, calculateParentStatus)
          }
        }
      } else {
        try {
          const response = await this.postRequestMethod(strip, strip.request.ciosContent, strip.request.apiUrl, calculateParentStatus)
          if (response && response.results) {
            if (response.results.data && response.results.data.length) {
              let extContentData: any = response.results.data
              if (extContentData.length) {
                this.processStrip(
                  strip,
                  this.transformContentsToWidgets(extContentData, strip),
                  'done',
                  calculateParentStatus,
                  response.viewMoreUrl,
                )
              } else {
                this.emptyResponse.emit(true)
              }
            } else if(response && response.results && response.results.result && response.results.result.data && response.results.result.data.length) {
              let data = response.results.result.data.map((item: any) => {
              return {
                  ...item,
                  "name": item?.contentPartnerName || '',
                  "logoUrl": item?.link || '',
                  "description": item?.description || '',
                  "contentDisplayType":  strip?.request?.condition || 'extCourse',
                  "isExternalProvider": true
                }
              })
              this.processStrip(
                strip,
                this.transformContentsToWidgets(data, strip),
                'done',
                calculateParentStatus,
                response.viewMoreUrl,
              )
            } else {
              this.processStrip(strip, [], 'error', calculateParentStatus, null)
              this.emptyResponse.emit(true)
            }

          } else {
            this.processStrip(strip, [], 'error', calculateParentStatus, null)
            this.emptyResponse.emit(true)
          }
        } catch (error) {
          this.emptyResponse.emit(true)
          // Handle errors
          // console.error('Error:', error);
        }
      }
    }
  }

  async getTabDataByCiosSearch(
    strip: any,
    tabIndex: number,
    _currentTab: NsContentStripWithTabs.IContentStripTab,
    calculateParentStatus: boolean
  ) {
    try {
      const response = await this.contentSvc.postApiMethod(_currentTab.request.apiUrl, _currentTab.request.ciosContent).toPromise()
      if (response && response.data && response.data.length) {
        const widgets = this.transformContentsToWidgets(response.data, strip)
        let tabResults: any[] = []
        if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          if (allTabs && allTabs.length && allTabs[tabIndex]) {
            allTabs[tabIndex] = {
              ...allTabs[tabIndex],
              widgets,
              fetchTabStatus: 'done',
            }
            tabResults = allTabs
          }
        }
        strip['viewMoreUrl']['path'] = "app/seeAll"
        this.processStrip(
          strip,
          widgets,
          'done',
          calculateParentStatus,
          strip.viewMoreUrl,
          tabResults // tabResults as widgets
        )
      } else if (response && response.result && response.result.data && response.result.data.length) {

        strip.stripConfig.cardSubType = 'card-providers-lib'
        let data = response.result.data.map((item: any) => {
          return {
            ...item,
            "name": item?.contentPartnerName || '',
            "logoUrl": item?.link || '',
            "description": item?.description || '',
            "contentDisplayType": _currentTab?.request?.condition || 'extCourse',
            "isExternalProvider": true
          }
        })
        const widgets = this.transformContentsToWidgets(data, strip)
        let tabResults: any[] = []

        if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          if (allTabs && allTabs.length && allTabs[tabIndex]) {
            allTabs[tabIndex] = {
              ...allTabs[tabIndex],
              widgets,
              fetchTabStatus: 'done',
            }
            tabResults = allTabs
          }
        }
        strip['viewMoreUrl']['path'] = "app/seeAll"
        this.processStrip(
          strip,
          widgets,
          'done',
          calculateParentStatus,
          strip.viewMoreUrl,
          tabResults // tabResults as widgets
        )
      } else {
        let tabResults: any[] = []
        if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          if (allTabs && allTabs.length && allTabs[tabIndex]) {
            allTabs[tabIndex] = {
              ...allTabs[tabIndex],
              fetchTabStatus: 'done',
            }
            tabResults = allTabs
          }
        }
        this.processStrip(strip, [], 'error', calculateParentStatus, null, tabResults)
      }
    } catch (error) {
      console.error('Error:', error)
      let tabResults: any[] = []
      if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs && this.stripsResultDataMap[strip.key].tabs.length) {
        const allTabs = this.stripsResultDataMap[strip.key].tabs
        if (allTabs && allTabs.length && allTabs[tabIndex]) {
          allTabs[tabIndex] = {
            ...allTabs[tabIndex],
            fetchTabStatus: 'done',
          }
          tabResults = allTabs
        }
        this.processStrip(strip, [], 'error', calculateParentStatus, null, tabResults)
      } else {
        this.processStrip(strip, [], 'error', calculateParentStatus, null)
      }
    }
  }

  async fetchFromSearchV6Events(strip: NsContentStripWithTabs.IContentStripUnit, calculateParentStatus = true) {
    if (strip.request && strip.request.searchV6 && Object.keys(strip.request.searchV6).length) {
      if (_.get(strip, 'request.searchV6.request.filters')) {
        strip.request.searchV6.request.filters = this.checkForDateFilters(strip.request.searchV6.request.filters)
        strip.request.searchV6.request.filters = this.getFiltersFromArray(
          strip.request.searchV6.request.filters,
        )
      }
      if (strip.tabs && strip.tabs.length) {
        // TODO: Have to extract requestRequired to outer level of tabs config
        const firstTab = strip.tabs[0]
        if (firstTab.requestRequired) {
          if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
            const allTabs = this.stripsResultDataMap[strip.key].tabs
            const currentTabFromMap = (allTabs && allTabs.length && allTabs[0]) as NsContentStripWithTabs.IContentStripTab
            this.getEventsTabDataByNewReqSearchV6(strip, 0, currentTabFromMap, calculateParentStatus)
          }
        }

      } else {
        try {
          let response: any
          let identifiersResponse: any
          if (strip && strip.request && strip.request.hasIdentifiersApi) {
            const identifierStrip: any = JSON.parse(JSON.stringify(strip))
            identifierStrip.request.searchV6['api'] = {
              'path': identifierStrip.request.identifiersApiUrl
            }
            identifiersResponse = await this.searchV6Request(identifierStrip, identifierStrip.request, calculateParentStatus)
            if (_.get(identifiersResponse, 'results.result.events') && _.get(strip, 'request.searchV6.request.filters')) {
              strip.request.searchV6.request.filters['identifier'] = _.get(identifiersResponse, 'results.result.events', [])
              response = await this.searchV6Request(strip, strip.request, calculateParentStatus)
            } else {
              response = identifiersResponse
            }
          } else {
            response = await this.searchV6Request(strip, strip.request, calculateParentStatus)
          }
          if (response && response.results) {
            if (response.results.result.Event) {
              let proccessResult: any = []
              const ids = _.get(identifiersResponse, 'results.result.events') || []
              ids.forEach((id: any) => {
                const event = response.results.result.Event.find((event: any) => event.identifier === id)
                if (event) {
                  proccessResult.push(event)
                }
              })
              this.processStrip(
                strip,
                this.transformEventsV2ToWidgets(proccessResult, strip),
                'done',
                calculateParentStatus,
                response.viewMoreUrl,
              )
            } else {
              this.processStrip(strip, [], 'error', calculateParentStatus, null)
            }

          } else {
            this.processStrip(strip, [], 'error', calculateParentStatus, null)
          }
        } catch (error) {
          // Handle errors
          // console.error('Error:', error);
        }
      }
    }
  }

  private transformEventsV2ToWidgets(
    contents: ITodayEvents[],
    strip: NsContentStripWithTabs.IContentStripUnit,
  ) {
    return (contents || []).map((content: any, idx: any) => (content ? {
      widgetType: 'cardLib',
      widgetSubType: 'eventCardLib',
      widgetHostClass: 'mb-2',
      widgetData: {
        content,
        cardSubType: strip.stripConfig && strip.stripConfig.cardSubType,
        cardCustomeClass: strip.customeClass ? strip.customeClass : 'card-resource-container-small',
        context: { pageSection: strip.key, position: idx },
        intranetMode: strip.stripConfig && strip.stripConfig.intranetMode,
        deletedMode: strip.stripConfig && strip.stripConfig.deletedMode,
        contentTags: strip.stripConfig && strip.stripConfig.contentTags,
      },
    } : {
      widgetType: 'card',
      widgetSubType: 'eventHubCard',
      widgetHostClass: 'mb-2',
      widgetData: {},
    }
    ))
  }

  async getEventsTabDataByNewReqSearchV6(
    strip: NsContentStripWithTabs.IContentStripUnit,
    tabIndex: number,
    currentTab: NsContentStripWithTabs.IContentStripTab,
    calculateParentStatus: boolean
  ) {
    try {
      const response = await this.searchV6Request(strip, currentTab.request, calculateParentStatus)
      if (response && response.results) {
        const widgets = this.transformEventsV2ToWidgets(response.results.result.events, strip)
        let tabResults: any[] = []
        const allTabs = this.stripsResultDataMap[strip.key].tabs
        if (allTabs && allTabs.length && allTabs[tabIndex]) {
          allTabs[tabIndex] = {
            ...allTabs[tabIndex],
            widgets,
            fetchTabStatus: 'done',
          }
          tabResults = allTabs
        }
        this.processStrip(
          strip,
          widgets,
          'done',
          calculateParentStatus,
          response.viewMoreUrl,
          tabResults // tabResults as widgets
        )
      } else {
        this.processStrip(strip, [], 'error', calculateParentStatus, null)
      }
    } catch (error) {
      // Handle errors
      // console.error('Error:', error);
    }
  }


  fetchMyEventsData(strip, calculateParentStatus) {
    if (strip && strip.tabs && strip.tabs.length) {
      const firstTab = strip.tabs[0]
      if (firstTab.requestRequired) {
        const allTabs = strip.tabs
        const currentTabFromMap = (allTabs && allTabs.length && allTabs[0]) as NsContentStripWithTabs.IContentStripTab
        this.currentTab = currentTabFromMap
        this.moveToNextTab = true
        this.getMyEventsByTabs(strip, 0, currentTabFromMap, calculateParentStatus)
      }

    }
  }

  async getMyEventsByTabs(strip, tabIndex, currentTabData, calculateParentStatus) {
    let apiUrl = ''
    let postReqestData: any = {}
    if (currentTabData && currentTabData.request && currentTabData.request.apiUrl) {
      apiUrl = this.getFullUrl(currentTabData.request.apiUrl, this.getUserId)
    }
    if (currentTabData && currentTabData.request && currentTabData.request.myEvents) {
      postReqestData = this.postMethodFilters(currentTabData.request.myEvents)
    }
    try {
      let apiError = false
      if (this.userEventsAll === undefined) {
        const response = await this.postRequestMethod(strip, postReqestData, apiUrl, calculateParentStatus)
        this.userEventsAll = this.sortData(_.get(response, 'results.result.events', []))
        apiError = _.get(response, 'results.result.events') ? false : true
      }

      if (apiError === false) {
        if (this.userEventsAll.length || this.moveToNextTab) {
          const currentEvents = this.getCurrentEvents()
          const key: string = this.stripsKeyOrder[0]
          const stripMap: IStripUnitContentData = this.stripsResultDataMap[key]
          if (this.moveToNextTab && (!currentEvents || currentEvents.length === 0) && this.currentTabIndex + 1 < stripMap.tabs.length) {
            this.tabClicked(this.currentTabIndex + 1, stripMap, key)
          } else {
            this.moveToNextTab = false
            const widgets = this.transformEventsV2ToWidgets(currentEvents, strip)
            let tabResults: any[] = []
            if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
              const allTabs = this.stripsResultDataMap[strip.key].tabs
              if (allTabs && allTabs.length && allTabs[tabIndex]) {
                allTabs[tabIndex] = {
                  ...allTabs[tabIndex],
                  widgets,
                  fetchTabStatus: 'done',
                }
                tabResults = allTabs
              }
            }
            strip.loader = false
            this.processStrip(
              strip,
              widgets,
              'done',
              calculateParentStatus,
              null,
              tabResults // tabResults as widgets
            )
          }
        } else {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          if (allTabs && allTabs.length && allTabs[tabIndex]) {
            allTabs[tabIndex]['fetchTabStatus'] = 'done'
          }
          this.processStrip(strip, [], 'done', calculateParentStatus, null)
          this.emptyResponse.emit(true)
        }

      } else {
        this.processStrip(strip, [], 'error', calculateParentStatus, null)
        this.emptyResponse.emit(true)
      }
    } catch (error) {
      // Handle errors
      // console.error('Error:', error);
    }
  }

  getCurrentEvents() {
    const events = []
    if (this.userEventsAll && this.userEventsAll.length && this.currentTab && this.currentTab.label) {
      let userEvents = JSON.parse(JSON.stringify(this.userEventsAll))
      if (this.currentTab.label.toLowerCase() === 'past') {
        userEvents = userEvents.reverse()
      }
      userEvents.forEach((event: any) => {
        const eventDetails = event.event
        if (_.get(eventDetails, 'startDate')) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const eventDate = new Date(_.get(eventDetails, 'startDate'))
          eventDate.setHours(0, 0, 0, 0)
          switch (this.currentTab.label.toLowerCase()) {
            case 'today':
              if (today.getTime() === eventDate.getTime()) {
                events.push(event)
              }
              break
            case 'upcoming':
              if (today.getTime() < eventDate.getTime()) {
                events.push(event)
              }
              break
            case 'past':
              if (today.getTime() > eventDate.getTime()) {
                events.push(event)
              }
              break
          }
        }
      })
    }
    return events
  }

  sortData(data: any) {
    data = data.filter((event: any) => event.event && event.event.startDate)
    return data.sort((a: any, b: any) => {
      const dateA = new Date(`${a.event.startDate}T${a.event.startTime}`)
      const dateB = new Date(`${b.event.startDate}T${b.event.startTime}`)
      return dateA.getTime() - dateB.getTime()
    })
  }

  get getUserId() {
    let userId: string = ''
    if (this.configSvc.userProfile) {
      userId = this.configSvc.userProfile.userId
    }
    return userId
  }

  openEditContentDialog(stripKey: string) {
    // Find the strip data for this key
    const stripData = this.widgetData?.strips?.find(strip => strip.key === stripKey)

    if (!stripData) {
      console.error('Strip data not found for key:', stripKey)
      return
    }

    // Emit event to parent component to handle the edit
    this.editStripContent.emit({
      stripKey: stripKey,
      stripData: stripData
    })
  }

  openEditTabDialog(stripKey: string, tab: any) {
    // Find the strip data for this key
    const stripData = this.widgetData?.strips?.find(strip => strip.key === stripKey)

    if (!stripData) {
      console.error('Strip data not found for key:', stripKey)
      return
    }
    // Emit event to parent component to handle the tab edit
    this.editStripContent.emit({
      stripKey: stripKey,
      stripData: stripData,
      tab: tab,
      isTabEdit: true
    })
  }

  openAddNewTabDialog(stripKey: string) {
    // Find the strip data for this key
    const stripData = this.widgetData?.strips?.find(strip => strip.key === stripKey)

    if (!stripData) {
      console.error('Strip data not found for key:', stripKey)
      return
    }

    // Emit event to parent component to handle adding a new tab
    this.editStripContent.emit({
      stripKey: stripKey,
      stripData: stripData,
      isAddNewTab: true
    })
  }

  removeTabData(stripKey: string, tabData: any) {
    const stripData = this.widgetData?.strips?.find(strip => strip.key === stripKey)
    this.editStripContent.emit({
      stripKey: stripKey,
      stripData: stripData,
      isRemoveTab: true,
      tab: tabData
    })
  }

  onToggleVisibility(stripKey: string, event: any) {
    // Find the strip data for this key
    const stripData = this.widgetData?.strips?.find(strip => strip.key === stripKey)
    if (!stripData) {
      console.error('Strip data not found for key:', stripKey)
      return
    }

    // Emit event to parent component with the toggle state
    this.toggleSectionVisibility.emit({
      stripKey: stripKey,
      stripSections: this.widgetData,
      enabled: event.checked
    })
  }

  removeStripContent(stripKey: string) {
    // Emit event to parent component to handle the removal
    this.removeStrip.emit({
      stripKey: stripKey,
      stripData: this.widgetData
    })
  }

private openEnrollmentCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 2);

    req.onupgradeneeded = (e: any) => {
      const db: IDBDatabase = e.target.result;

      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }

      if (!db.objectStoreNames.contains(IDB_HIERARCHY_STORE)) {
        db.createObjectStore(IDB_HIERARCHY_STORE);
      }
    };

    req.onsuccess = (e: any) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

private setCaIdentifiers(data: any): void {
  this.openEnrollmentCache()
    .then(db => {
      db.transaction(IDB_STORE, 'readwrite')
        .objectStore(IDB_STORE)
        .put(
          { data, timestamp: Date.now() },
          'comprehensiveAssessmentIdentifiers'
        );
    })
    .catch(() => {
      /* silently ignore cache write failures */
    });
}

}
