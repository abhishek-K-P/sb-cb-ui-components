import { Component, OnInit, Input, OnDestroy, AfterViewInit, HostBinding, Inject, EventEmitter, Output, NgZone, ViewChildren, QueryList } from '@angular/core'
import { NsWidgetResolver, WidgetBaseComponent } from '@sunbird-cb/resolver-v2'
import { NsContentStripWithTabsAndPills } from './content-strip-with-tabs-pills.model'
// import { HttpClient } from '@angular/common/http'
import { WidgetContentLibService } from '../../../_services/widget-content-lib.service'
import { NsContent } from '../../../_models/widget-content.model'
import { MultilingualTranslationsService } from '../../../_services/multilingual-translations.service'
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
import { WidgetUserServiceLib } from '../../../_services/widget-user-lib.service'
// import { environment } from 'src/environments/environment'
// tslint:disable-next-line
import * as _ from 'lodash'
import { NsCardContent } from '../../../_models/card-content-v2.model'
import { ITodayEvents } from '../../../_models/event'
import { TranslateService } from '@ngx-translate/core'
import { Router } from '@angular/router'
import { MatDialog } from '@angular/material/dialog'
import { MatLegacyTabGroup as MatTabGroup } from '@angular/material/legacy-tabs'
import { AddCompetencyPopupComponent } from '../../dialog-components/add-competency-popup/add-competency-popup.component'
import { MatSnackBar } from '@angular/material/snack-bar'
import { SnackbarComponent } from '../../dialog-components/snackbar/snackbar.component'
import { fadeAnimation } from '../../_animations/fade-animation'
import { SakshamAI } from '../../../consumption.config'
import { NsContentStripWithTabs } from '../../content-strip-with-tabs-lib/content-strip-with-tabs-lib.model'
import { CommonMethodsService } from '../../../_services/common-methods.service'

interface IStripUnitContentData {
  key: string
  canHideStrip: boolean
  mode?: string
  showStrip: boolean
  disableTranslate: boolean
  widgets?: NsWidgetResolver.IRenderConfigWithAnyData[]
  stripTitle: string
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
  tabs?: NsContentStripWithTabsAndPills.IContentStripTab[] | undefined
  stripName?: string
  stripLogo?: string
  description?: string
  stripInfo?: NsContentStripWithTabsAndPills.IStripInfo
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
const SNACKBAR_DURATION = 3000

@Component({
  selector: 'sb-uic-content-strip-with-tabs-pills',
  templateUrl: './content-strip-with-tabs-pills.component.html',
  styleUrls: ['./content-strip-with-tabs-pills.component.scss'],
  animations: [fadeAnimation]
})
export class ContentStripWithTabsPillsComponent extends WidgetBaseComponent
  implements
  OnInit,
  OnDestroy,
  AfterViewInit,
  NsWidgetResolver.IWidgetData<NsContentStripWithTabsAndPills.IContentStripMultiple> {
  @Input() widgetData!: NsContentStripWithTabsAndPills.IContentStripMultiple
  @Output() emptyResponse = new EventEmitter<any>()
  @Output() viewAllResponse = new EventEmitter<any>()
  @Output() telemtryResponse = new EventEmitter<any>()
  @Input() providerId: any = ''
  @Input() emitViewAll: boolean = false
  @Input() channnelName: any = ''
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
  maxWidgetsSakshamAI = 100;
  enrollInterval: any
  todaysEvents: any = [];
  activeTabIndex: number = 0
  activePillIndex: number = 0
  recommendationPopup = false
  sakshamFeedbackPopup = false
  sakshamAddCompetency = false
  sakshamLoader = false
  recommendedCoursesId: string
  releventNotReleventSubscription: Subscription | null = null;
  telementrySubscription: Subscription | null = null;
  feedbackCourseId = ''
  currentStripG: any
  tabEventG: any
  firstTimeLoaded = false
  localRecommended: any
  sakshamAIEnum = SakshamAI
  CaCourseUnitIds: any = `[]`
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
    private matDialog: MatDialog,
    public snackBar: MatSnackBar,
    private commonSvc: CommonMethodsService,
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
    this.localRecommended = this.contentSvc.getRecommendedIds(this.configSvc.userProfile.userId)
    this.initData()
    this.subscribeToTelementry()
  }

  subscribeToTelementry() {

    if (!this.telementrySubscription && !this.contentSvc.isTelementrySubscribed) {
      this.telementrySubscription = this.contentSvc.telemetryData$.subscribe((data: any) => {
        if (!data) return
        this.contentSvc.setTelementrySubscription(true)
        if (this.widgetData && this.widgetData.strips[0] &&
          ((this.widgetData.strips[0]?.key === 'cbpPlan')
            || this.widgetData.strips[0]?.key === 'forYou'
            || this.widgetData.strips[0]?.key === 'continueLearning')
          && this.widgetData.strips[0].key === data.typeOfTelemetry) {
          const tab = this.widgetData.strips[0].tabs[this.activeTabIndex]
          // const pill = tab.pillsData[this.activePillIndex]
          const pill = this.widgetData.strips[0]?.tabs[this.activeTabIndex]?.pillsData.find((pill: any) => pill?.selected)
          if (tab && pill) {
            data.selectedTab = this.parametrizedText(tab.label)
            data.selectedPill = pill.label.split(" ").join("").toLocaleLowerCase()
            this.telemtryResponse.emit(data)
          }
        } else if (
          this.widgetData.strips && this.widgetData.strips[0] &&
          this.widgetData.strips[0]?.key !== 'cbpPlan' &&
          this.widgetData.strips[0]?.key !== 'forYou' &&
          this.widgetData.strips[0]?.key !== 'continueLearning'
        ) {
          this.telemtryResponse.emit(data)
        }
      })
    }
  }

  parametrizedText(str: string) {
    return str.toLocaleLowerCase().replace(" ", "-")
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

    if (this.releventNotReleventSubscription) {
      this.releventNotReleventSubscription.unsubscribe()
    }

    if (this.telementrySubscription) {
      this.telementrySubscription.unsubscribe()
      this.contentSvc.setTelementrySubscription(false)
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

  public initData() {
    this.stripsKeyOrder = this.widgetData && this.widgetData.strips && this.widgetData.strips.map(strip => strip.key) || []
    if (this.widgetData.loader && this.widgetData.strips.length) {
      this.showParentLoader = true
    }
    // Fetch the data
    for (const strip of this.widgetData.strips) {
      if (this.checkForEmptyWidget(strip)) {
        this.fetchStripFromRequestData(strip, true)
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
    return data.showStrip
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
  checkCondition(
    wData: NsContentStripWithTabsAndPills.IContentStripMultiple,
    data: IStripUnitContentData
  ) {
    if (
      wData.strips && wData.strips[0] &&
      wData.strips[0].stripConfig &&
      wData.strips[0].stripConfig.hideShowAll
    ) {
      return !wData.strips[0].stripConfig.hideShowAll
    }
    if (data.key && data.key === "cbpPlan") {
      const selectedPill = data.tabs[this.activeTabIndex]?.pillsData.find(
        (pill: any) => pill.selected
      )
      if (selectedPill) {
        return selectedPill.widgets && selectedPill?.widgets.length > 4
      }
    } else if (data.key && data.key === "continueLearning") {
      return (
        wData.strips[0].viewMoreUrl && data.widgets && data.widgets.length >= 1
      )
    } else {
      return (
        wData.strips[0].viewMoreUrl && data.widgets && data.widgets.length >= 4
      )
    }
  }
  checkVisible(data: IStripUnitContentData) {
    return data.stripInfo && data.stripInfo.visibilityMode === 'visible'
  }

  getContineuLearningLenth(data: IStripUnitContentData) {
    return data.widgets ? data.widgets.length : 0
  }
  getLength(data: IStripUnitContentData) {
    if (!data.tabs || !data.tabs.length) {
      return data.widgets ? data.widgets.length : 0
    } {
      // if tabs are there check if each tab has widgets and get the tab with max widgets
      // let tabWithMaxWidgets: any = {}
      // data.tabs.forEach((tab: any)=>{
      //   if(tab.pillsData && tab.pillsData.length){
      //     tabWithMaxWidgets = tab.pillsData.reduce(
      //       (prev: any, current: any) => {
      //         if (!prev.widgets && !current.widgets) {
      //           return current;
      //         }
      //         if (prev.widgets && current.widgets) {
      //           return (prev.widgets.length > current.widgets.length) ? prev : current;
      //         }
      //         if (current.widgets && !prev.widgets) {
      //           return current;
      //         }
      //         if (!current.widgets && prev.widgets) {
      //           return prev;
      //         }
      //         return current;
      //         // return (prev.widgets && current.widgets && (prev.widgets.length > current.widgets.length) ) ? prev : current
      //         // tslint:disable-next-line: align
      //       }, data.tabs[0]);

      //   }
      // })
      // if tabs has atleast 1 widgets then strip will show or else not
      return true
    }
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

    }
    return filters
  }

  private async fetchStripFromRequestData(
    strip: NsContentStripWithTabsAndPills.IContentStripUnit,
    calculateParentStatus = true,
  ) {
    // setting initial values
    strip.loaderWidgets = this.transformSkeletonToWidgets(strip)
    this.processStrip(strip, [], 'fetching', false, null)
    this.fetchFromSearchV6(strip, calculateParentStatus)
    this.fetchForYouData(strip, calculateParentStatus)
    await this.fetchAllCbpPlans(strip, calculateParentStatus)
    this.fetchUserEnrolledData(strip, 0, 0, calculateParentStatus)
    await this.fetchDesignationBasedCourses(strip, 2, true)

    this.fetchPlaylistReadData(strip, calculateParentStatus)
    if (strip.tabs[0]?.value === SakshamAI.SakshamAI) {
      this.generateCourseRecommendation(strip, 0, true, this.localRecommended)
    }
    this.canShowSakshamAiTab(strip)
    // this.fetchFromEnrollmentList(strip, calculateParentStatus);

    // this.enrollInterval = setInterval(() => {
    //   this.fetchAllCbpPlans(strip, calculateParentStatus)
    // },                                1000)
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
    strip: NsContentStripWithTabsAndPills.IContentStripUnit,
    tabCardSubType?: string,
  ) {
    return (contents || []).map((content, idx) => (
      content ? {
        widgetType: 'cardLib',
        widgetSubType: 'cardContentLib',
        widgetHostClass: 'mb-2',
        widgetData: {
          content,
          ...(content.batch && { batch: content.batch }),
          cardSubType: tabCardSubType || (strip.stripConfig && strip.stripConfig.cardSubType),
          cardCustomeClass: strip.customeClass ? strip.customeClass : '',
          context: { pageSection: strip.key, position: idx },

          intranetMode: strip.stripConfig && strip.stripConfig.intranetMode,
          deletedMode: strip.stripConfig && strip.stripConfig.deletedMode,
          contentTags: strip.stripConfig && strip.stripConfig.contentTags,
          sakshamAIGenerated: this.getRecommendedId(strip)

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
    strip: NsContentStripWithTabsAndPills.IContentStripUnit,
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
    strip: NsContentStripWithTabsAndPills.IContentStripUnit,
    results: NsWidgetResolver.IRenderConfigWithAnyData[] = [],
    fetchStatus: TFetchStatus,
    calculateParentStatus = true,
    _viewMoreUrl: any,
    tabsResults?: NsContentStripWithTabsAndPills.IContentStripTab[] | undefined,
    // calculateParentStatus is used so that parents' status is not re-calculated if the API is called again coz of filters, etc.
  ) {
    const stripData = {
      viewMoreUrl: strip.viewMoreUrl,
      key: strip.key,
      canHideStrip: Boolean(strip.canHideStrip),
      showStrip: this.getIfStripHidden(strip.key),
      noDataWidget: strip.noDataWidget,
      errorWidget: strip.errorWidget,
      stripInfo: strip.info,
      stripTitle: strip.title,
      stripTitleLink: strip.stripTitleLink,
      disableTranslate: strip.disableTranslate,
      sliderConfig: strip.sliderConfig,
      tabs: tabsResults ? tabsResults : strip.tabs,
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
  checkForEmptyWidget(strip: NsContentStripWithTabsAndPills.IContentStripUnit): boolean {
    if (
      strip.request &&
      ((strip.request.api && Object.keys(strip.request.api).length) ||
        (strip.request.search && Object.keys(strip.request.search).length) ||
        (strip.request.searchRegionRecommendation &&
          Object.keys(strip.request.searchRegionRecommendation).length) ||
        (strip.request.cbpList && Object.keys(strip.request.cbpList).length) ||
        (strip && strip.tabs.length)
      )
    ) {
      return true
    }
    return false
  }

  getRecommendedId(strip: any): string {
    if (!strip?.tabs || !Array.isArray(strip.tabs)) {
      return ''
    }

    if (strip.tabs[0]?.hideTab === true) {
      return this.recommendedCoursesId
    }

    else if (
      (strip.tabs[0]?.value === SakshamAI.SakshamAI && this.activeTabIndex === 0) ||
      (strip.tabs[1]?.value === SakshamAI.SakshamAI && this.activeTabIndex === 1)
    ) {
      return this.recommendedCoursesId
    }

    return ''
  }

  getTabDataByfilter(
    strip: NsContentStripWithTabsAndPills.IContentStripUnit,
    currentTab: NsContentStripWithTabsAndPills.IContentStripTab,
    calculateParentStatus: boolean
  ) {
    // TODO: Write logic for individual filter if passed in config
    // add switch case based on config key passed
  }

  getSelectedIndex(stripsResultDataMap: any, key: any): number {
    let returnValue = 0
    return returnValue
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

  raiseTelemetry(stripData: any) {
    this.telemtryResponse.emit(stripData)
  }

  redirectViewAll(stripData: any, path: string, queryParamsData: any, tabIndex?: number) {
    // Check if we have a specific pill-level view more URL
    const selectedPill = this.getSelectedPill(stripData, tabIndex)

    if (selectedPill?.viewMoreUrl) {
      this.navigateToSelectedPillUrl(selectedPill, path)
      return
    }

    // Handle emission or navigation based on configuration
    if (this.emitViewAll) {
      this.viewAllResponse.emit(stripData)
      return
    }

    // Navigate to the appropriate route
    this.navigateToRoute(path, queryParamsData)
  }

  private getSelectedPill(stripData: any, tabIndex?: number): any {
    if (tabIndex === undefined || tabIndex < 0 || !stripData?.tabs?.[tabIndex]) {
      return null
    }

    const selectedPillIndex = this.getSelectedPillIndex(stripData.tabs[tabIndex], tabIndex)
    if (selectedPillIndex < 0) {
      return null
    }

    return stripData.tabs[tabIndex].pillsData?.[selectedPillIndex]
  }

  private navigateToSelectedPillUrl(selectedPill: any, defaultPath: string): void {
    const path = selectedPill.viewMoreUrl.path || defaultPath
    const filters = selectedPill.viewMoreUrl.f || {}
    const queryParams = {
      f: JSON.stringify(filters),
      ...selectedPill.viewMoreUrl.queryParams
    }

    this.router.navigate([path], { queryParams })
  }

  private navigateToRoute(path: string, queryParamsData: any): void {
    if (queryParamsData?.tabSelected === 'designation') {
      delete queryParamsData.key
      this.router.navigate(['/page/recommended-learnings'], { queryParams: queryParamsData })
    } else {
      this.router.navigate([path], { queryParams: queryParamsData })
    }
  }

  // new code writting from here====new====

  fetchForYouData(strip: NsContentStripWithTabsAndPills.IContentStripUnit, calculateParentStatus = true) {
    if (strip && strip.type === 'forYou') {
      if (strip.tabs && strip.tabs.length) {
        const firstTab = strip.tabs[0]
        const pillData = firstTab.pillsData[0]
        if (pillData.requestRequired) {
          if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
            const allPills = this.stripsResultDataMap[strip.key].tabs[0].pillsData
            const currentPillsFromMap = (allPills && allPills.length && allPills[0]) as NsContentStripWithTabsAndPills.IContentStripTab
            if (pillData?.request?.searchV6) {
              this.getTabDataByNewReqSearchV6(strip, 0, 0, currentPillsFromMap, true)
            } else {
              this.getTabDataByNewReqTrending(strip, 0, 0, currentPillsFromMap, calculateParentStatus)
            }
            if (this.stripsResultDataMap[strip.key] && currentPillsFromMap) {
              this.stripsResultDataMap[strip.key].viewMoreUrl.queryParams = {
                ...this.stripsResultDataMap[strip.key].viewMoreUrl.queryParams,
                key: strip.key,
                tabSelected: firstTab.value,
                pillSelected: pillData.value,
              }
            }
          }
        }

      }
    }
  }

  async fetchFromSearchV6(strip: NsContentStripWithTabsAndPills.IContentStripUnit, calculateParentStatus = true) {
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
            const currentTabFromMap = (allTabs && allTabs.length && allTabs[0]) as NsContentStripWithTabsAndPills.IContentStripTab

            this.getTabDataByNewReqSearchV6(strip, 0, 0, currentTabFromMap, calculateParentStatus)
          }
        }

      } else {
        try {
          const response = await this.searchV6Request(strip, strip.request, calculateParentStatus)
          if (response && response.results) {
            if (response.results.result.content) {

              this.processStrip(
                strip,
                this.transformContentsToWidgets(response.results.result.content, strip),
                'done',
                calculateParentStatus,
                response.viewMoreUrl,
              )


            } else if (response.results.result.Event) {
              this.processStrip(
                strip,
                this.transformEventsToWidgets(response.results.result.Event, strip),
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

  async getTabDataByNewReqTrending(
    strip: NsContentStripWithTabsAndPills.IContentStripUnit,
    tabIndex: number,
    pillIndex: number,
    currentTab: NsContentStripWithTabsAndPills.IContentStripTab,
    calculateParentStatus: boolean
  ) {
    try {
      const response = await this.trendingSearchRequest(strip, currentTab.request, calculateParentStatus)
      let tabResults: any[] = []
      if (response && response.results && response.results.response) {
        const content = response.results.response[currentTab.value] || []
        const widgets = this.transformContentsToWidgets(content, strip)

        if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          const allPills = this.stripsResultDataMap[strip.key].tabs[tabIndex]?.pillsData
          this.resetSelectedPill(allPills)
          if (allTabs && allTabs.length && allTabs[tabIndex]) {
            if (allPills && allPills.length && allPills[pillIndex]) {
              allPills[pillIndex] = {
                ...allPills[pillIndex],
                widgets,
                // fetchTabStatus: 'done',
                selected: true
              }
            }
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
          null,
          tabResults // tabResults as widgets
        )
        this.statusChangetoDone(strip, tabIndex, pillIndex)
      } else {
        if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          const allPills = this.stripsResultDataMap[strip.key].tabs[tabIndex]?.pillsData
          this.resetSelectedPill(allPills)
          if (allTabs && allTabs.length && allTabs[tabIndex]) {
            if (allPills && allPills.length && allPills[pillIndex]) {
              allPills[pillIndex] = {
                ...allPills[pillIndex],
                widgets: [],
                fetchTabStatus: 'done',
                selected: true
              }
            }
            allTabs[tabIndex] = {
              ...allTabs[tabIndex],
              widgets: [],
              fetchTabStatus: 'done',
            }
            tabResults = allTabs
          }
        }
        this.processStrip(strip, [], 'done', calculateParentStatus, null)
      }
    } catch (error) {
      // Handle errors
      this.processStrip(strip, [], 'error', calculateParentStatus, null)
    }
  }

  async getTabDataByNewReqSearchV6(
    strip: NsContentStripWithTabsAndPills.IContentStripUnit,
    tabIndex: number,
    pillIndex: number,
    currentTab: NsContentStripWithTabsAndPills.IContentStripTab,
    calculateParentStatus: boolean
  ) {
    try {
      const response = await this.searchV6Request(strip, currentTab.request, calculateParentStatus)
      const tabCardSubType = _.get(strip, `tabs[${tabIndex}].pillsData[${pillIndex}].cardSubType`, null)
      if (response && response.results) {
        // if dot array needed to be handled and need to reset card subtype
        // if(tabCardSubType) {
        //   // this.stripsResultDataMap[strip.key].stripConfig.cardSubType = tabCardSubType
        // }


        const widgets = this.transformContentsToWidgets(response.results.result.content, strip, tabCardSubType)
        let tabResults: any[] = []
        if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          const allPills = this.stripsResultDataMap[strip.key].tabs[tabIndex]?.pillsData
          this.resetSelectedPill(allPills)
          if (allTabs && allTabs.length && allTabs[tabIndex]) {
            if (allPills && allPills.length && allPills[pillIndex]) {
              allPills[pillIndex] = {
                ...allPills[pillIndex],
                widgets,
                // fetchTabStatus: 'done',
                // selected: true
              }
            }
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
        this.statusChangetoDone(strip, tabIndex, pillIndex)
      } else {
        this.processStrip(strip, [], 'error', calculateParentStatus, null)
      }
    } catch (error) {
      // Handle errors
      // console.error('Error:', error);
    }
  }

  async trendingSearchRequest(strip: NsContentStripWithTabsAndPills.IContentStripUnit,
    request: NsContentStripWithTabsAndPills.IContentStripUnit['request'],
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
            results = { response: { certifications: proccesedResult } }
          }
          resolve({ results, viewMoreUrl })
        }, (error: any) => {
          if (error.error && error.error.status === 400) {
            this.processStrip(strip, [], 'done', calculateParentStatus, null)
          }
          // this.processStrip(strip, [], 'done', calculateParentStatus, null)
          reject(error)
        },)
      }
    })
  }

  public tabClicked(tabEvent: any, pillIndex: any, stripMap: IStripUnitContentData, stripKey: string) {
    let tabEventIndex = tabEvent
    this.activeTabIndex = tabEventIndex


    if (stripMap && stripMap.tabs && stripMap.tabs[tabEventIndex]) {
      stripMap.tabs[tabEventIndex].pillsData[pillIndex].fetchTabStatus = 'inprogress'
      stripMap.tabs[tabEventIndex].pillsData[pillIndex].tabLoading = true
      stripMap.showOnLoader = true
      this.resetSelectedPill(stripMap.tabs[tabEventIndex].pillsData)
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

    const currentTabFromMap: any = stripMap.tabs && stripMap.tabs[tabEventIndex]
    const currentPillFromMap: any = stripMap.tabs && stripMap.tabs[tabEventIndex]?.pillsData[pillIndex]
    const currentStrip = this.widgetData.strips.find(s => s.key === stripKey)
    this.currentStripG = currentStrip
    this.tabEventG = tabEvent
    if (this.stripsResultDataMap[stripKey] && currentTabFromMap) {
      this.stripsResultDataMap[stripKey].viewMoreUrl.queryParams = {
        ...this.stripsResultDataMap[stripKey].viewMoreUrl.queryParams,
        tabSelected: currentTabFromMap.value,
        pillSelected: currentPillFromMap.value,
      }
    }
    if (currentStrip && currentTabFromMap && !currentTabFromMap.computeDataOnClick && currentPillFromMap) {
      if (currentPillFromMap.requestRequired && currentPillFromMap.request) {
        // call API to get tab data and process
        // this.processStrip(currentStrip, [], 'fetching', true, null)
        if (currentPillFromMap.request.searchV6) {
          this.getTabDataByNewReqSearchV6(currentStrip, tabEventIndex, 0, currentPillFromMap, true)
        } else if (currentPillFromMap.request.trendingSearch) {
          this.getTabDataByNewReqTrending(currentStrip, tabEventIndex, 0, currentPillFromMap, true)
        } else if (currentPillFromMap.request.type === 'eventEnrollment') {
          this.fetchEventEnrollmentList(currentStrip, tabEventIndex, pillIndex, true)
        } else if (currentPillFromMap.request.type === 'enrollment') {
          this.fetchFromInternalEnrollmentList(currentStrip, tabEventIndex, pillIndex, true)
        } else if (currentPillFromMap.request.playlistRead) {
          this.getTabDataByNewReqPlaylistReadContent(currentStrip, tabEventIndex, pillIndex, currentPillFromMap, true)
        }
        // if (stripMap && stripMap.tabs && stripMap.tabs[tabEvent.index]) {
        //   stripMap.tabs[tabEvent.index].tabLoading = false;
        // }

        stripMap.tabs[tabEventIndex].pillsData[pillIndex].tabLoading = false
      } else if (currentTabFromMap.requestRequired && currentTabFromMap.request) {
        if (currentStrip.tabs[tabEventIndex].request && currentStrip.tabs[tabEventIndex].request.designationsList) {
          this.fetchDesignationBasedCourses(currentStrip, tabEventIndex, true)
        } else if (currentStrip.tabs[tabEventIndex].request && currentStrip.tabs[tabEventIndex].request.cbpList) {
          this.fetchAllCbpPlans(currentStrip, true)
        } else if (currentStrip.tabs[tabEventIndex].request && currentStrip.tabs[tabEventIndex].request.courseRecommendation) {
          this.localRecommended = this.contentSvc.getRecommendedIds(this.configSvc.userProfile.userId)
          this.generateCourseRecommendation(currentStrip, tabEventIndex, true, this.localRecommended)
        }
        stripMap.tabs[tabEventIndex].pillsData[pillIndex].tabLoading = false
      }
    }
  }

  async fetchDesignationBasedCourses(
    strip: NsContentStripWithTabsAndPills.IContentStripUnit,
    tabIndex: number,
    calculateParentStatus: boolean
  ) {
    if (strip.tabs[tabIndex]?.request && strip.tabs[tabIndex].request.designationsList) {
      try {
        let response = await this.userSvc.fetchDesignationsData().toPromise()
        if (response) {
          let request = {
            "request": {
              "courseId": response
            }
          }
          let enollData = await this.enrollSvc.fetchEnrollContentData(request).toPromise().then(async (res: any) => {
            if (res && res.result && res.result.courses && res.result.courses.length) {
              return res.result.courses
            } else {
              return []
            }
          }).catch((_err: any) => {
            return []
          })
          const sRequest: any = {
            "searchV6": {
              "request": {
                "filters": {
                  "identifier": response
                },
                "offset": 0,
                "query": "",
                "sort_by": {
                  "lastUpdatedOn": "desc"
                },
              }
            }
          }
          this.contentSvc.searchV6(sRequest.searchV6).subscribe(results => {
            if (results && results.result && results.result.content) {
              let courses = results.result.content
              let tabResults: any
              if (strip.tabs && strip.tabs.length) {
                tabResults = this.splitDesignationsTabData(courses, strip, enollData, response, 'designation')
                let countOfWidget = true
                if (strip && strip?.tabs && strip?.tabs?.length) {
                  strip.tabs.forEach((tab: any) => {
                    if (tab.value === 'designation' && tab.pillsData && tab.pillsData.length) {
                      tab.pillsData.forEach((pill: any) => {
                        if (pill && pill.widgets && pill.widgets.length) {
                          if (countOfWidget) {
                            pill.selected = true
                            pill.fetchTabStatus = 'done'
                            pill.tabLoading = false
                            countOfWidget = false
                          } else {
                            pill.selected = false
                          }
                        }
                      })
                    }
                  })
                }
                // strip.tabs[tabIndex].pillsData[0].selected = true
                // strip.tabs[tabIndex].pillsData[0].fetchTabStatus = 'done'
                strip.showOnLoader = false
                // strip.tabs[tabIndex].pillsData[0].tabLoading = false
                this.processStrip(
                  strip,
                  this.transformContentsToWidgets(courses, strip),
                  'done',
                  calculateParentStatus,
                  '',
                  tabResults
                )
              } else {
                strip.tabs[tabIndex].pillsData[0].selected = true
                strip.tabs[tabIndex].pillsData[0].fetchTabStatus = 'done'
                strip.showOnLoader = false
                strip.tabs[tabIndex].pillsData[0].tabLoading = false
                this.processStrip(
                  strip,
                  this.transformContentsToWidgets(courses, strip),
                  'done',
                  calculateParentStatus,
                  'viewMoreUrl', strip.tabs
                )
              }
            }
            else {
              strip.tabs[tabIndex].hideTab = true
            }
          })
        } else {
          this.resetPills(strip.tabs[tabIndex].pillsData)
          strip.tabs[tabIndex].pillsData[0].selected = true
          strip.tabs[tabIndex].pillsData[0].widgets = []
          strip.tabs[tabIndex].pillsData[0].fetchTabStatus = 'done'
          strip.showOnLoader = false
          strip.tabs[tabIndex].pillsData[0].tabLoading = false
          strip.tabs[tabIndex].hideTab = true
          let tabs = strip.tabs
          if (strip.tabs[0] && strip.tabs[0].hideTab) {
            tabs = []
          }
          // this.processStrip(
          //   strip,
          //   this.transformContentsToWidgets([], strip),
          //   'done',
          //   calculateParentStatus,
          //   '',
          //   tabs
          // );
        }
      } catch (error) {
        this.resetPills(strip.tabs[tabIndex].pillsData)
        strip.tabs[tabIndex].pillsData[0].selected = true
        strip.tabs[tabIndex].pillsData[0].widgets = []
        strip.tabs[tabIndex].pillsData[0].fetchTabStatus = 'done'
        strip.showOnLoader = false
        strip.tabs[tabIndex].pillsData[0].tabLoading = false
        strip.tabs[tabIndex].hideTab = true
        let tabs = strip.tabs
        if (strip.tabs[0] && strip.tabs[0].hideTab) {
          tabs = []
        }
        this.processStrip(
          strip,
          this.transformContentsToWidgets([], strip),
          'done',
          calculateParentStatus,
          '',
          tabs
        )
      }

    }
  }

  resetPills(data: any) {
    data.forEach((pill: any) => {
      pill.fetchTabStatus = 'done'
      delete pill.tabLoading
      pill.widgets = []
    })
  }

  splitDesignationsTabData(contentNew: NsContent.IContent[], strip: NsContentStripWithTabsAndPills.IContentStripUnit,
    enollData: any, coursesArray: any, type: string) {
    let tabResults: any[] = []
    const splitData = this.getTabsDesignationsList(
      contentNew,
      strip, enollData, coursesArray
    )
    if (strip.tabs && strip.tabs.length) {
      for (let i = 0; i < strip.tabs.length; i += 1) {
        if (strip.tabs[i].value === type) {
          let checkWidgetAndActivePill = true
          if (strip.tabs[i].pillsData && strip.tabs[i].pillsData.length) {
            for (let j = 0; j < strip.tabs[i].pillsData.length; j += 1) {
              if (strip.tabs[i].pillsData[j]) {
                tabResults.push(
                  {
                    ...strip.tabs[i].pillsData[j],
                    fetchTabStatus: 'done',
                    tabLoading: false,
                    ...(splitData.find(itmInner => {
                      if (strip.tabs[i].pillsData && strip.tabs[i].pillsData[j] && itmInner.value === strip.tabs[i].pillsData[j].value) {
                        return itmInner
                      }
                      return undefined
                    })),
                  }
                )
              }
            }
            strip.tabs[i].pillsData = tabResults
          }
        }
      }
    }
    return strip.tabs
  }

  getTabsDesignationsList(array: NsContent.IContent[],
    strip: NsContentStripWithTabsAndPills.IContentStripUnit, enollData: any, coursesArray: any) {
    let avaialable: any[] = []
    let inprogress: any[] = []
    let allCompleted: any[] = []
    let cbpData: any
    this.userSvc.getCBPData('cbpData').subscribe((result => {
      cbpData = result
    }))
    coursesArray.forEach((courseId: any) => {
      let course = array.find((item: any) => item.identifier === courseId)
      if (course) {
        if (cbpData && cbpData.length) {
          const cbpelem = cbpData.find((_course: any) => _course.identifier === course.identifier)
          if (cbpelem) {
            return
          }
        }
        if (enollData && enollData.length) {
          const elem = enollData.find((eCourse: any) => eCourse.contentId === course.identifier)
          if (elem) {
            if (elem.status === 2) {
              allCompleted.push(course)
            } else {
              inprogress.push(course)
            }
          } else {
            avaialable.push(course)
          }
        } else {
          avaialable.push(course)
        }
      }
    })
    return [
      { value: 'ravailable', widgets: this.transformContentsToWidgets(avaialable, strip) },
      { value: 'rinprogress', widgets: this.transformContentsToWidgets(inprogress, strip) },
      { value: 'rcompleted', widgets: this.transformContentsToWidgets(allCompleted, strip) },
    ]
  }

  pillClicked(event: any, stripMap: IStripUnitContentData, stripKey: any, pillIndex: any, tabIndex: any) {
    this.resetSelectedPill(stripMap.tabs[tabIndex].pillsData)
    this.activePillIndex = pillIndex
    if (stripMap && stripMap.tabs && stripMap.tabs[tabIndex]) {
      stripMap.tabs[tabIndex].pillsData[pillIndex].selected = true
      stripMap.tabs[tabIndex].pillsData[pillIndex].fetchTabStatus = 'inprogress'
      stripMap.tabs[tabIndex].pillsData[pillIndex].tabLoading = true
      stripMap.showOnLoader = true
    }
    const currentTabFromMap: any = stripMap.tabs && stripMap.tabs[tabIndex]
    const currentPillFromMap: any = stripMap.tabs && stripMap.tabs[tabIndex].pillsData[pillIndex]
    const currentStrip = this.widgetData.strips.find(s => s.key === stripKey)
    if (this.stripsResultDataMap[stripKey] && currentTabFromMap) {
      this.stripsResultDataMap[stripKey].viewMoreUrl.queryParams = {
        ...this.stripsResultDataMap[stripKey].viewMoreUrl.queryParams,
        tabSelected: currentTabFromMap.value,
        pillSelected: currentPillFromMap.value,
      }
    }
    if (currentStrip && currentTabFromMap && !currentTabFromMap.computeDataOnClick && currentPillFromMap) {
      if (currentPillFromMap.requestRequired && currentPillFromMap.request) {
        // call API to get tab data and process
        // this.processStrip(currentStrip, [], 'fetching', true, null)
        if (currentPillFromMap.request.searchV6) {
          this.getTabDataByNewReqSearchV6(currentStrip, tabIndex, pillIndex, currentPillFromMap, true)
        } else if (currentPillFromMap.request.trendingSearch) {
          this.getTabDataByNewReqTrending(currentStrip, tabIndex, pillIndex, currentPillFromMap, true)
        } else if (currentPillFromMap.request.type === 'enrollment') {
          this.fetchFromInternalEnrollmentList(currentStrip, tabIndex, pillIndex, true)
        } else if (currentPillFromMap.request.type === 'eventEnrollment') {
          this.fetchEventEnrollmentList(currentStrip, tabIndex, pillIndex, true)

        } else if (currentPillFromMap.request.playlistRead) {
          this.getTabDataByNewReqPlaylistReadContent(currentStrip, tabIndex, pillIndex, currentPillFromMap, true)
        }
        // if (stripMap && stripMap.tabs && stripMap.tabs[tabEvent.index]) {
        //   stripMap.tabs[tabEvent.index].tabLoading = false;
        // }
        // setTimeout(() => {
        //   stripMap.tabs[tabIndex].pillsData[pillIndex].tabLoading = false;
        //   stripMap.showOnLoader = false;
        // }, 200);
      } else {
        this.getTabDataByfilter(currentStrip, currentTabFromMap, true)
        // if (stripMap && stripMap.tabs && stripMap.tabs[tabIndex]) {
        //   stripMap.tabs[tabIndex].pillsData[pillIndex].fetchTabStatus = 'inprogress';
        //   stripMap.tabs[tabIndex].pillsData[pillIndex].tabLoading = false;
        //   stripMap.showOnLoader = true;
        // }
        setTimeout(() => {
          if (stripMap && stripMap.tabs && stripMap.tabs[tabIndex]) {
            stripMap.tabs[tabIndex].pillsData[pillIndex].fetchTabStatus = 'done'
            stripMap.tabs[tabIndex].pillsData[pillIndex].tabLoading = false
            stripMap.showOnLoader = false
            this.resetSelectedPill(stripMap.tabs[tabIndex].pillsData)
            stripMap.tabs[tabIndex].pillsData[pillIndex]['selected'] = true
          }
        }, 200)
      }
    }
  }

  async searchV6Request(strip: NsContentStripWithTabsAndPills.IContentStripUnit,
    request: NsContentStripWithTabsAndPills.IContentStripUnit['request'],
    calculateParentStatus: boolean
  ): Promise<any> {
    const originalFilters: any = []
    return new Promise<any>((resolve, reject) => {
      if (request && request.searchV6) {
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


  getSelectedPillIndex(tabdata: any, tabIndex: any) {
    if (tabdata.pillsData && tabdata.pillsData.length) {
      let index = tabdata.pillsData.findIndex((pill: any) => {
        return pill.selected
      })
      return index
    }
    return 0
  }

  canShowHeading(strip: any): boolean {
    if (!strip?.tabs || !Array.isArray(strip.tabs)) {
      return true
    }
    const isAllHidden = strip.tabs.every(tab => tab.hasOwnProperty('hideTab') && tab.hideTab === true)
    return !isAllHidden
  }


  // cbp plans
  async fetchAllCbpPlans(strip: any, calculateParentStatus = true) {
    if (strip.request && strip.request.cbpList && Object.keys(strip.request.cbpList).length) {
      let courses: NsContent.IContent[] = []
      let tabResults: any[] = []
      let userId = this.configSvc.userProfile.userId
      const tabCardSubType = _.get(strip, `tabs[${this.tabEventG}].cardSubType`, null)
      try {
        const response = await this.userSvc.fetchCbpPlanList(userId).toPromise()

        if (Array.isArray(response) && response?.length > 0) {
          courses = response

          if (strip?.tabs && strip?.tabs?.length) {
            tabResults = this.splitCbpTabsData(courses, strip)
            let countOfWidget = true
            if (strip?.tabs && strip?.tabs?.length) {
              strip.tabs.forEach((tab: any) => {
                if (tab?.pillsData && tab?.pillsData?.length) {
                  tab.pillsData.forEach((pill: any) => {
                    if (pill && pill.widgets && pill.widgets.length) {
                      if (countOfWidget) {
                        pill.selected = true
                        countOfWidget = false
                      }
                    }
                  })
                }
              })
            }
            await this.processStrip(
              strip,
              this.transformContentsToWidgets(courses, strip, tabCardSubType),
              'done',
              calculateParentStatus,
              '',
              tabResults
            )
          } else {
            this.processStrip(
              strip,
              this.transformContentsToWidgets(courses, strip, tabCardSubType),
              'done',
              calculateParentStatus,
              'viewMoreUrl',
            )
          }
        } else {
          const firstPill = strip?.tabs?.[0]?.pillsData?.[0]
          if (firstPill) {
            firstPill.selected = true
            firstPill.widgets = []
            firstPill.fetchTabStatus = 'done'
            firstPill.tabLoading = false
          }
          strip.showOnLoader = false
          if (strip?.tabs?.[0]) {
            strip.tabs[0].hideTab = true
          }
          // get index of first tab which does not have hideTab / hideTab is false
          const firstVisibleTabIndex = Array.isArray(strip?.tabs)
            ? strip.tabs.findIndex((tab: any) => !tab.hideTab)
            : -1
          if (firstVisibleTabIndex !== -1) {
            this.tabClicked(firstVisibleTabIndex, 0, strip, strip.key)
          }
          this.processStrip(
            strip,
            this.transformContentsToWidgets([], strip, tabCardSubType),
            'done',
            calculateParentStatus,
            '',
            strip.tabs || []
          )
        }
      } catch (_err) {
        strip.showOnLoader = false
        this.processStrip(strip, [], 'done', calculateParentStatus, '', strip.tabs)
      } finally {
        clearInterval(this.enrollInterval)
      }
    }
  }

  async canShowSakshamAiTab(strip: any) {
    try {
      if (strip?.key !== 'cbpPlan') return

      let userProfile = this.configSvc && this.configSvc.userProfile
      if (userProfile.rootOrgId) {
        let response = await this.userSvc.getOrgReadData(userProfile.rootOrgId).toPromise()
        if (response?.sakshamAIenabled) {
          strip.tabs[1].hideTab = false
          this.generateCourseRecommendation(strip, 1, true, this.localRecommended)

        } else {
          strip.tabs[1].hideTab = true
        }
      }
    } catch (error) {
      if (strip?.key !== 'cbpPlan') return
      strip.tabs[1].hideTab = true
    }
  }

  splitCbpTabsData(contentNew: NsContent.IContent[], strip: NsContentStripWithTabsAndPills.IContentStripUnit) {
    let tabResults: any[] = []
    const splitData = this.getTabsList(
      contentNew,
      strip,
    )
    if (strip.tabs && strip.tabs.length) {
      for (let i = 0; i < strip.tabs.length; i += 1) {
        if (strip.tabs[i].value === "myIgotPlans") {
          let checkWidgetAndActivePill = true
          if (strip.tabs[i].pillsData && strip.tabs[i].pillsData.length) {
            for (let j = 0; j < strip.tabs[i].pillsData.length; j += 1) {
              // if(j === 0 ){
              // if(strip.tabs[i].pillsData[j].widgets && strip.tabs[i].pillsData[j].widgets.length ) {
              //   strip.tabs[i].pillsData[j].selected = true
              //   checkWidgetAndActivePill = false
              // }
              // strip.tabs[i].pillsData[j].selected = true
              // }
              if (strip.tabs[i].pillsData[j]) {
                tabResults.push(
                  {
                    ...strip.tabs[i].pillsData[j],
                    fetchTabStatus: 'done',
                    ...(splitData.find(itmInner => {
                      if (strip.tabs[i].pillsData && strip.tabs[i].pillsData[j] && itmInner.value === strip.tabs[i].pillsData[j].value) {
                        return itmInner
                      }
                      return undefined
                    })),
                  }
                )
              }
            }
            strip.tabs[i].pillsData = tabResults
          }
        }
      }
    }

    return strip.tabs
  }

  getTabsList(array: NsContent.IContent[],
    strip: NsContentStripWithTabsAndPills.IContentStripUnit) {
    this.CaCourseUnitIds = this.commonSvc.getCourseUnitIds()

    let all: any[] = []
    let upcoming: any[] = []
    let overdue: any[] = []
    let apar: any[] = []
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

    // apar = array.filter((e: any) => e.isApar === true)
    const targetId = 'do_1144773146063912961797'

    apar = array
      .filter((e: any) => e.isApar)
      .sort((a: any, b: any) => {
        const getPriority = (item: any) => {
          if (item?.identifier === targetId) return 3;
          if (this.CaCourseUnitIds?.length && this.CaCourseUnitIds?.includes(item?.identifier)) return 2;
          return 1;
        };

        return getPriority(b) - getPriority(a);
      });

    return [
      { value: 'all', widgets: this.transformContentsToWidgets(all, strip) },
      { value: 'upcoming', widgets: this.transformContentsToWidgets(upcoming, strip) },
      { value: 'completed', widgets: this.transformContentsToWidgets(allCompleted, strip) },
      { value: 'overdue', widgets: this.transformContentsToWidgets(overdue, strip) },
      { value: 'apar', widgets: this.transformContentsToWidgets(apar, strip) }]
  }
  resetSelectedPill(pillData: any) {
    if (pillData && pillData.length) {
      pillData.forEach((pill: any) => {
        pill['selected'] = false
      })
    }
  }


  // MY learning Strip methods starts here
  fetchUserEnrolledData(strip: NsContentStripWithTabsAndPills.IContentStripUnit, tabIndex: number, pillIndex: number, calculateParentStatus = true) {
    if (strip.request && strip.request.enrollmentList && Object.keys(strip.request.enrollmentList).length) {
      if (strip && strip.tabs && strip.tabs.length) {
        if (!strip.tabs[tabIndex].requestRequired) {
          if (strip.tabs[tabIndex].pillsData && strip.tabs[tabIndex].pillsData.length) {
            this.fetchFromInternalEnrollmentList(strip, tabIndex, pillIndex, calculateParentStatus)
          }
        }
        if (strip && strip.tabs && strip.tabs.length) {
          let currentTabFromMap: any = strip.tabs[tabIndex]
          let currentPillFromMap: any = strip.tabs[tabIndex].pillsData[0]
          strip.viewMoreUrl.queryParams = {
            ...strip.viewMoreUrl.queryParams,
            tabSelected: currentTabFromMap.value,
            pillSelected: currentPillFromMap.value,
          }
        }
      }
    }
  }


  fetchFromInternalEnrollmentList(strip: NsContentStripWithTabsAndPills.IContentStripUnit, tabIndex: number, pillIndex: number, calculateParentStatus = true) {
    if (strip.tabs && strip.tabs[tabIndex] && strip.tabs[tabIndex].pillsData && strip.tabs[tabIndex].pillsData[pillIndex]) {
      let currentPillFromMap: any = strip.tabs[tabIndex].pillsData[pillIndex]
      let userId = ''
      if (this.configSvc.userProfile) {
        userId = this.configSvc.userProfile.userId
      }
      this.enrollSvc.fetchInternalEnrollmentData(userId, currentPillFromMap.request.payload).subscribe((res: any) => {
        let courses: any = []
        if (res && res.result && res.result.courses && res.result.courses.length) {
          courses = [...courses, ...res.result.courses]
        }
        this.enrollSvc.fetchExternalEnrollmentData(currentPillFromMap.request.payload).subscribe((res: any) => {

          if (res && res.result && res.result.courses && res.result.courses.length) {
            courses = [...courses, ...res.result.courses]
          }
          this.formatNewEnrollmentData(strip, tabIndex, pillIndex, courses, calculateParentStatus)
        }, (_err: any) => {
          if (courses && courses.length) {
            this.formatNewEnrollmentData(strip, tabIndex, pillIndex, courses, calculateParentStatus)
          } else {
            this.processStrip(
              strip,
              [],
              'done',
              calculateParentStatus,
              {},
              strip.tabs
            )
            this.statusChangetoDone(strip, tabIndex, pillIndex)
          }
        })
      }, (_err: any) => {
        let courses: any = []
        this.enrollSvc.fetchExternalEnrollmentData(currentPillFromMap.request.payload).subscribe((res: any) => {

          if (res && res.result && res.result.courses && res.result.courses.length) {
            courses = [...courses, ...res.result.courses]
          }
          this.formatNewEnrollmentData(strip, tabIndex, pillIndex, courses, calculateParentStatus)
        }, (_err: any) => {
          this.processStrip(
            strip,
            [],
            'done',
            calculateParentStatus,
            {},
            strip.tabs
          )

          this.statusChangetoDone(strip, tabIndex, pillIndex)
        })
      })
    }
  }

  fetchEventEnrollmentList(strip: NsContentStripWithTabsAndPills.IContentStripUnit, tabIndex: number, pillIndex: number, calculateParentStatus = true) {
    if (strip.tabs && strip.tabs[tabIndex] && strip.tabs[tabIndex].pillsData && strip.tabs[tabIndex].pillsData[pillIndex]) {
      let currentPillFromMap: any = strip.tabs[tabIndex].pillsData[pillIndex]
      let userId = ''
      if (this.configSvc.userProfile) {
        userId = this.configSvc.userProfile.userId
      }
      this.enrollSvc.fetchEventsEnrollmentData(userId, currentPillFromMap.request.payload).subscribe((res: any) => {

        let events: any = []
        if (res && res.result && res.result.events && res.result.events.length) {
          events = [...events, ...res.result.events]
        }
        this.formatNewEnrollmentData(strip, tabIndex, pillIndex, events, calculateParentStatus)
      }, (_err: any) => {
        this.processStrip(
          strip,
          [],
          'done',
          calculateParentStatus,
          {},
          strip.tabs
        )
        this.statusChangetoDone(strip, tabIndex, pillIndex)
      })
    }
  }

  formatNewEnrollmentData(strip: any, tabIndex: number, pillIndex: number, courses: any, calculateParentStatus: any = true) {
    let content: NsContent.IContent[]
    if (courses && courses.length) {
      content = courses.map((c: any) => {
        const contentTemp: NsContent.IContent = c.content || c.event || {}
        contentTemp.completionPercentage = c.completionPercentage || c.progress || 0
        contentTemp.completionStatus = c.completionStatus || c.status || 0
        contentTemp.enrolledDate = c.enrolledDate || ''
        contentTemp.lastContentAccessTime = c.lastContentAccessTime || ''
        contentTemp.lastReadContentStatus = c.lastReadContentStatus || ''
        contentTemp.lastReadContentId = c.lastReadContentId || ''
        contentTemp.lrcProgressDetails = c.lrcProgressDetails || ''
        contentTemp.issuedCertificates = c.issuedCertificates || c.issued_certificates || []
        contentTemp.batchId = c.batchId || ''
        contentTemp.content = c.content || c.event || {}
        contentTemp.content.primaryCategory = c.content && c.content.primaryCategory || c.event && c.event.resourceType || ''
        contentTemp.cType = c.event ? 'event' : ''
        return contentTemp
      })
    }

    let sortedContent: any = (content || []).sort((a: any, b: any) => {
      const dateA: any = new Date(a.lastContentAccessTime || 0)
      const dateB: any = new Date(b.lastContentAccessTime || 0)
      return dateB - dateA
    })
    if (strip && strip.tabs && strip.tabs.length) {
      if (strip.tabs[tabIndex].pillsData && strip.tabs[tabIndex].pillsData.length) {
        let currentPillFromMap: any = strip.tabs[tabIndex].pillsData[pillIndex]
        currentPillFromMap['fetchTabStatus'] = 'done'
        this.resetSelectedPill(strip.tabs[tabIndex].pillsData)
        strip.tabs[tabIndex].pillsData[pillIndex]['selected'] = true
        let widgets = this.transformContentsToWidgets(sortedContent, strip)
        strip.tabs[tabIndex].pillsData[pillIndex]['widgets'] = widgets
        this.processStrip(
          strip,
          widgets,
          'done',
          calculateParentStatus,
          {},
          strip.tabs
        )
        this.statusChangetoDone(strip, tabIndex, pillIndex)
      }
    }
  }

  addCompetency() {
    const modelRef = this.matDialog.open(AddCompetencyPopupComponent, {
      width: '70%'
    })

    modelRef.afterClosed().subscribe(result => {
      if (result) {
        this.sakshamLoader = true
        this.sakshamAddCompetency = false
        modelRef.close()
      }
    })
  }

  async generateCourseRecommendation(
    strip: NsContentStripWithTabsAndPills.IContentStripUnit,
    tabIndex: number,
    calculateParentStatus: boolean,
    courseRecommendationId: string
  ) {
    if (strip.tabs[tabIndex]?.request?.courseRecommendation) {
      this.sakshamLoader = true
      let payload = {
        "user_id": this.configSvc.userProfile.userId,
        "department": this.configSvc.userProfile.departmentName,
        "designation": this.configSvc.userProfile.professionalDetails[0]?.designation,
        "device_type": "web"
      }
      let response: any
      let coursesIds: any

      if (courseRecommendationId) {
        response = await this.userSvc.getRecommendedCoursesSakshamAI(courseRecommendationId).toPromise().catch(async (_err: any) => {
          response = await this.userSvc.generateCoursesSakshamAI(strip.tabs[tabIndex].request.courseRecommendation.path, payload)
            .toPromise()
        })
      } else {
        response = await this.userSvc.generateCoursesSakshamAI(
          strip.tabs[tabIndex].request.courseRecommendation.path, payload)
          .toPromise()
      }

      if (response?.recommended_courses && response?.recommended_courses?.length) {
        this.sakshamLoader = false
        this.recommendedCoursesId = response?.id || ''
        this.contentSvc.setRecommendedIds(this.recommendedCoursesId, this.configSvc.userProfile.userId)

        if (response.feedbacks.length) {
          this.contentSvc.setFeedbackData(response.feedbacks)
        }

        this.subscribeToReleventEmmitter()
        coursesIds = response.recommended_courses.map(course => course.course_id)
        if (coursesIds.length) {
          let request = {
            "request": {
              "courseId": coursesIds
            }
          }
          let enollData = await this.enrollSvc.fetchEnrollContentData(request).toPromise().then(async (res: any) => {
            if (res && res.result && res.result.courses && res.result.courses.length) {
              return res.result.courses
            } else {
              return []
            }
          }).catch((_err: any) => {
            return []
          })

          const sRequestV1: any = {
            "request": {
              "filters": {
                "primaryCategory": [
                  "Course"
                ],
                "identifier": coursesIds
              },
              "sortBy": {
                "lastUpdatedOn": "Desc"
              }
            }
          }
          const sRequest: any = {
            "request": {
              "filters": {
                "courseCategory": [
                  "Course"
                ],
                "identifier": coursesIds
              },
              "offset": 0,
              "sort_by": {
                "lastUpdatedOn": "desc"
              },
            }
          }
          // this.contentSvc.searchContentSearch_PROD(sRequestV1).subscribe(results => {
          this.contentSvc.searchV6(sRequest).subscribe(results => {
            if (results.result.count > 0) {
              if (results && results?.result && results?.result?.content) {
                // let courses = results.result.content
                let courses = this.contentSvc.filterCoursesWithNoRating(response, results.result.content)
                let tabResults: any
                if (strip?.tabs && strip?.tabs?.length) {
                  tabResults = this.splitDesignationsTabData(courses, strip, enollData, coursesIds, SakshamAI.SakshamAI)
                  let countOfWidget = true
                  if (strip && strip?.tabs && strip?.tabs?.length) {
                    strip.tabs.forEach((tab: any) => {
                      if (tab?.value === SakshamAI.SakshamAI && tab?.pillsData && tab?.pillsData.length) {
                        tab.pillsData.forEach((pill: any) => {
                          if (pill && pill.widgets && pill.widgets.length) {
                            if (countOfWidget) {
                              pill.selected = true
                              countOfWidget = false
                            }
                          }
                        })
                      }
                    })
                  }
                  strip.tabs[tabIndex].pillsData[0].selected = true
                  strip.tabs[tabIndex].pillsData[0].fetchTabStatus = 'done'
                  strip.showOnLoader = false
                  strip.tabs[tabIndex].pillsData[0].tabLoading = false
                  this.processStrip(
                    strip,
                    this.transformContentsToWidgets(courses, strip),
                    'done',
                    calculateParentStatus,
                    '',
                    tabResults
                  )
                  if (!this.firstTimeLoaded) {
                    this.recommendationPopup = true
                    this.firstTimeLoaded = true
                  }
                } else {
                  strip.tabs[tabIndex].pillsData[0].selected = true
                  strip.tabs[tabIndex].pillsData[0].fetchTabStatus = 'done'
                  strip.showOnLoader = false
                  strip.tabs[tabIndex].pillsData[0].tabLoading = false
                  this.processStrip(
                    strip,
                    this.transformContentsToWidgets(courses, strip),
                    'done',
                    calculateParentStatus,
                    'viewMoreUrl', strip.tabs
                  )
                }
              }
            }
            else {
              strip.tabs[tabIndex].hideTab = true
            }
          })
        } else {
          this.resetPills(strip.tabs[tabIndex].pillsData)
          strip.tabs[tabIndex].pillsData[0].selected = true
          strip.tabs[tabIndex].pillsData[0].widgets = []
          strip.tabs[tabIndex].pillsData[0].fetchTabStatus = 'done'
          strip.showOnLoader = false
          strip.tabs[tabIndex].pillsData[0].tabLoading = false
          strip.tabs[tabIndex].hideTab = true
          let tabs = strip.tabs
          if (strip.tabs[0] && strip.tabs[0].hideTab) {
            tabs = []
          }
          this.processStrip(
            strip,
            this.transformContentsToWidgets([], strip),
            'done',
            calculateParentStatus,
            '',
            tabs
          )
        }
      }
      else {
        strip.tabs[tabIndex].hideTab = true
      }
    }
  }

  async saveFeedback(comment: string, rating = 0) {
    const payload = {
      "recommendation_id": this.recommendedCoursesId,
      "course_id": this.feedbackCourseId,
      "rating": rating,
      "comments": comment,
      "user_id": this.configSvc.userProfile.userId
    }
    const response = await this.contentSvc.saveFeedbackSakshamAI(payload).toPromise().catch(() => { })
    if (response && response?.message) {
      this.snackBar.openFromComponent(SnackbarComponent, {
        data: {
          message: 'Thank you for your feedback.', type: 'success',
        }, duration: SNACKBAR_DURATION, panelClass: 'course-success-snackbar',
      })
      if (rating === 0) {
        this.generateCourseRecommendation(this.currentStripG, this.tabEventG, true, this.localRecommended)
      }
    } else if (!response) {
      this.snackBar.openFromComponent(SnackbarComponent, {
        data: {
          message: 'Something is wrong. Please try again later', type: 'error',
        }, duration: SNACKBAR_DURATION, panelClass: 'course-error-snackbar',
      })
    }
    this.sakshamFeedbackPopup = false
  }

  subscribeToReleventEmmitter() {
    if (!this.releventNotReleventSubscription) {
      this.releventNotReleventSubscription = this.contentSvc.releventNotRelevent$.subscribe(data => {
        if (data && data.widgetData && data.widgetData?.content?.identifier !== this.feedbackCourseId) {
          this.feedbackCourseId = data.widgetData?.content?.identifier
          if (data.isRelevent) {
            this.saveFeedback('', 1)
          } else if (!data.isRelevent) {
            this.sakshamFeedbackPopup = true
          }
        }
      })
    }
  }

  cancelFeedbackPopup() {
    this.sakshamFeedbackPopup = false
    this.feedbackCourseId = ''
  }

  statusChangetoDone(strip: any, tabIndex: number, pillIndex: number) {
    const allPills = this.stripsResultDataMap[strip.key].tabs[tabIndex]?.pillsData
    if (allPills && allPills.length && allPills[pillIndex]) {
      allPills[pillIndex] = {
        ...allPills[pillIndex],
        fetchTabStatus: 'done',
        tabLoading: false,
        selected: true
      }
      this.stripsResultDataMap[strip.key].showOnLoader = false
    }
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

  async fetchPlaylistReadData(strip: any, calculateParentStatus = true) {
    if (strip?.tabs?.length) {
      // TODO: Have to extract requestRequired to outer level of tabs config
      const firstTab = strip.tabs[0]
      if (firstTab.requestRequired && firstTab.request && firstTab.request.playlistRead && Object.keys(firstTab.request.playlistRead).length) {

        if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
          const allTabs = this.stripsResultDataMap[strip.key].tabs
          const currentTabFromMap = (allTabs && allTabs.length && allTabs[0]) as NsContentStripWithTabs.IContentStripTab
          this.getTabDataByNewReqPlaylistReadContent(strip, 0, 0, currentTabFromMap, calculateParentStatus)
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
          if (firstTab.requestRequired && firstTab.request && firstTab.request.playlistRead && Object.keys(firstTab.request.playlistRead).length) {
            if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
              const allTabs = this.stripsResultDataMap[strip.key].tabs
              const currentTabFromMap = (allTabs && allTabs.length && allTabs[0]) as NsContentStripWithTabs.IContentStripTab

              this.getTabDataByNewReqPlaylistReadContent(strip, 0, 0, currentTabFromMap, calculateParentStatus)
            }
          }

        }
      }
    }
  }


  async getRequestMethod(strip: any,
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
  async getTabDataByNewReqPlaylistReadContent(
    strip: any,
    tabIndex: number,
    pillIndex: number,
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
      const widgets = this.transformContentsToWidgets(response.results.result.content, strip, '')
      let tabResults: any[] = []
      if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs) {
        const allTabs = this.stripsResultDataMap[strip.key].tabs
        const allPills = this.stripsResultDataMap[strip.key].tabs[tabIndex]?.pillsData
        this.resetSelectedPill(allPills)
        if (allTabs && allTabs.length && allTabs[tabIndex]) {
          if (allPills && allPills.length && allPills[pillIndex]) {
            allPills[pillIndex] = {
              ...allPills[pillIndex],
              widgets,
              // fetchTabStatus: 'done',
              selected: true
            }
          }
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
        null,
        tabResults // tabResults as widgets
      )
      this.statusChangetoDone(strip, tabIndex, pillIndex)
    } catch (error) {
      console.error('Error:', error)
      let tabResults: any[] = []
      if (this.stripsResultDataMap[strip.key] && this.stripsResultDataMap[strip.key].tabs && this.stripsResultDataMap[strip.key].tabs.length) {
        const allTabs = this.stripsResultDataMap[strip.key].tabs
        const allPills = this.stripsResultDataMap[strip.key].tabs[tabIndex]?.pillsData
        if (allTabs && allTabs.length && allTabs[tabIndex]) {
          if (allPills && allPills.length && allPills[pillIndex]) {
            allPills[pillIndex] = {
              ...allPills[pillIndex],
              widgets: [],
              fetchTabStatus: 'done',
              selected: true
            }
          }
          allTabs[tabIndex] = {
            ...allTabs[tabIndex],
            widgets: [],
            fetchTabStatus: 'done',
          }
          tabResults = allTabs
        }
        this.processStrip(strip, [], 'done', calculateParentStatus, null, tabResults)
      } else {
        this.processStrip(strip, [], 'done', calculateParentStatus, null, tabResults)
      }
    }

  }

}
