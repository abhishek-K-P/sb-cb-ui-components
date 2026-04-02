import { Component, OnInit, OnDestroy, AfterViewInit, Input, Output, EventEmitter, ChangeDetectorRef, NgZone, ViewChildren, QueryList } from '@angular/core'
import { MatLegacyTabGroup as MatTabGroup } from '@angular/material/legacy-tabs'
import { Router } from '@angular/router'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'
import { WidgetContentLibService } from '../../../_services/widget-content-lib.service'
import { MultilingualTranslationsService } from '../../../_services/multilingual-translations.service'
interface IPillRequest {
  microSearch?: any
  nanoSearch?: any
  trendingSearch?: any
  searchV6?: any
}
interface IPillData {
  label: string
  value: string
  computeDataOnClick: boolean
  computeDataOnClickKey: string
  requestRequired: boolean
  showTabDataCount: boolean
  maxWidgets: number
  selected: boolean
  hideTab: boolean
  nodataMsg: string
  request?: IPillRequest
  widgets?: any[]
  fetchStatus?: 'loading' | 'done' | 'error' | 'empty'
}

interface ITabData {
  label: string
  value: string
  hideTab?: boolean
  pillsData: IPillData[]
}

interface IViewMoreUrl {
  path: string
  viewMoreText: string
  queryParams?: any
  loaderConfig?: any
  stripConfig?: any
}

interface ISliderConfig {
  showNavs: boolean
  showDots: boolean
  maxWidgets: number
  showNavsSpacing: boolean
}

interface IStripConfig {
  cardSubType: string
  intranetMode?: boolean
  deletedMode?: boolean
  contentTags?: string[]
}

interface IStripData {
  active: boolean
  key: string
  title: string
  type: string
  disableTranslate: boolean
  stripTitleLink: {
    link: string
    icon: string
  }
  sliderConfig: ISliderConfig
  stripConfig: IStripConfig
  viewMoreUrl: IViewMoreUrl
  loader: boolean
  loaderConfig: {
    cardSubType: string
  }
  tabs: ITabData[]
}

interface IWidgetData {
  order: number
  stripType: string
  stripVisable: string
  strips: IStripData[]
}

@Component({
    selector: 'sb-uic-content-strip-with-tabs-pills-new',
    templateUrl: './content-strip-with-tabs-pills-new.component.html',
    styleUrls: ['./content-strip-with-tabs-pills-new.component.scss'],
    standalone: false
})
export class ContentStripWithTabsPillsNewComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() widgetData: IWidgetData | null = null
  @Output() tabChanged = new EventEmitter<any>()
  @Output() pillChanged = new EventEmitter<any>()
  @Output() contentLoaded = new EventEmitter<any>()

  activeTabIndices: { [stripKey: string]: number } = {}
  activePillIndices: { [key: string]: number } = {}

  private skeletonCache: { [key: string]: any[] } = {}
  @ViewChildren(MatTabGroup) tabGroups!: QueryList<MatTabGroup>

  private isUserInitiatedTabClick: boolean = false
  private loadingTabs: Set<string> = new Set()
  private paginationTimers: any[] = []

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private configSvc: ConfigurationsService,
    private contentSvc: WidgetContentLibService,
    private langtranslations: MultilingualTranslationsService,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.initializeComponent()
  }

  ngAfterViewInit(): void {
    // Force mat-tab-header to recalculate pagination on SPA navigation
    this.triggerTabPaginationUpdate()
    // Re-trigger whenever new mat-tab-groups are added to the DOM
    this.tabGroups.changes.subscribe(() => {
      this.triggerTabPaginationUpdate()
    })
  }

  ngOnDestroy(): void {
    this.skeletonCache = {}
    this.clearPaginationTimers()
  }

  /** Directly call MatTabGroup.updatePagination() so mat-tab-header recalculates pagination arrows */
  private triggerTabPaginationUpdate(): void {
    this.clearPaginationTimers()
    const delays = [0, 100, 300, 500, 1000, 2000]
    delays.forEach(delay => {
      const timer = setTimeout(() => {
        if (this.tabGroups) {
          this.tabGroups.forEach(tg => {
            tg.updatePagination()
            tg.realignInkBar()
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

  initializeComponent(): void {
    if (this.widgetData?.strips) {
      this.widgetData.strips.forEach((strip) => {
        this.activeTabIndices[strip.key] = 0
        strip.tabs.forEach((tab, tabIndex) => {
          const key = `${strip.key}-${tabIndex}`
          this.activePillIndices[key] = 0
          if (tab.pillsData?.length > 0) {
            tab.pillsData.forEach((pill, pillIndex) => {
              pill.selected = pillIndex === 0
            })
            if (tabIndex === 0) {
              this.isUserInitiatedTabClick = false
              this.loadPillContent(tab.pillsData[0], tab, strip, 0, tabIndex)
            }
          }
        })
      })
    }
  }

  getActiveTabIndex(strip: IStripData): number {
    const actualTabIndex = this.activeTabIndices[strip.key] || 0

    // Calculate the visible tab index (accounting for hidden tabs)
    let visibleIndex = 0
    for (let i = 0; i < actualTabIndex && i < strip.tabs.length; i++) {
      if (!this.isTabHidden(strip.tabs[i])) {
        visibleIndex++
      }
    }

    // If the current active tab is hidden, find the next visible tab
    if (actualTabIndex < strip.tabs.length && this.isTabHidden(strip.tabs[actualTabIndex])) {
      // Find next visible tab
      for (let i = actualTabIndex + 1; i < strip.tabs.length; i++) {
        if (!this.isTabHidden(strip.tabs[i])) {
          this.activeTabIndices[strip.key] = i
          return this.getActiveTabIndex(strip) // Recalculate
        }
      }
    }

    return visibleIndex
  }

  onTabChange(tabIndex: number, strip: IStripData, stripIndex: number, isUserClick: boolean = true): void {
    this.isUserInitiatedTabClick = isUserClick

    // Convert visible tab index to actual tab index
    const actualTabIndex = this.getActualTabIndex(strip, tabIndex)

    this.activeTabIndices[strip.key] = actualTabIndex
    const tab = strip.tabs[actualTabIndex]
    const key = `${strip.key}-${actualTabIndex}`
    if (tab?.pillsData?.length > 0) {
      // Always reset to first pill and mark it as selected
      tab.pillsData.forEach((pill, pillIndex) => {
        pill.selected = pillIndex === 0
      })
      this.activePillIndices[key] = 0

      const firstPill = tab.pillsData[0]
      // Force reload: clear existing data and set to loading
      firstPill.widgets = undefined
      firstPill.fetchStatus = 'loading'

      this.loadPillContent(firstPill, tab, strip, 0, actualTabIndex)
    }
    this.tabChanged.emit({ tabIndex: actualTabIndex, strip, stripIndex })
    this.cdr.detectChanges()
  }

  getActualTabIndex(strip: IStripData, visibleIndex: number): number {
    // Get the visible tabs
    const visibleTabs = this.getVisibleTabs(strip)

    if (visibleIndex < 0 || visibleIndex >= visibleTabs.length) {
      return 0 // Fallback to first tab
    }

    // Find the actual index of this visible tab in the original tabs array
    const targetTab = visibleTabs[visibleIndex]
    return strip.tabs.indexOf(targetTab)
  }

  getActualTabIndexFromTab(strip: IStripData, tab: ITabData): number {
    // Find the actual index of this tab in the original tabs array
    return strip.tabs.indexOf(tab)
  }

  isTabDisabled(tab: ITabData): boolean {
    return !tab.pillsData || tab.pillsData.length === 0
  }

  isTabHidden(tab: ITabData): boolean {
    // Only hide tabs with value "igotSpecializations"
    if (tab.value !== 'igotSpecializations') {
      return false // Don't hide other tabs
    }

    // Check if the first pill has been loaded and has no data
    const firstPill = tab.pillsData?.[0]
    if (!firstPill) {
      return false // Don't hide if not loaded yet
    }

    // Hide igotSpecializations tab only if the pill has been loaded and has no widgets
    if (firstPill.fetchStatus === 'empty' ||
      firstPill.fetchStatus === 'error' ||
      (firstPill.fetchStatus === 'done' && (!firstPill.widgets || firstPill.widgets.length === 0))) {
      return true
    }

    return false
  }

  getVisibleTabs(strip: IStripData): ITabData[] {
    if (!strip.tabs) return []
    const visibleTabs = strip.tabs.filter((tab) => !this.isTabHidden(tab))
    return visibleTabs
  }


  getTabContentCount(tab: ITabData): number {
    if (!tab.pillsData) return 0

    return tab.pillsData.reduce((total, pill) => {
      return total + (pill.widgets?.length || 0)
    }, 0)
  }

  isPillSelected(pill: IPillData, tab: ITabData, strip: IStripData, pillIndex: number, tabIndex: number): boolean {
    const key = `${strip.key}-${tabIndex}`
    const isSelected = this.activePillIndices[key] === pillIndex
    return isSelected
  }

  onPillClick(pill: IPillData, tab: ITabData, strip: IStripData, pillIndex: number, tabIndex: number, stripIndex: number): void {
    const key = `${strip.key}-${tabIndex}`
    tab.pillsData.forEach((p, index) => {
      p.selected = index === pillIndex
    })
    this.activePillIndices[key] = pillIndex
    this.loadPillContent(pill, tab, strip, pillIndex, tabIndex)
    this.pillChanged.emit({ pill, tab, strip, pillIndex, tabIndex, stripIndex })
    this.cdr.detectChanges()
  }

  isPillLoading(tab: ITabData, strip: IStripData, tabIndex: number): boolean {
    const key = `${strip.key}-${tabIndex}`
    const pillIndex = this.activePillIndices[key] || 0
    const pill = tab.pillsData?.[pillIndex]
    const isLoading = pill?.fetchStatus === 'loading'
    return isLoading
  }

  isPillEmpty(tab: ITabData, strip: IStripData, tabIndex: number): boolean {
    const key = `${strip.key}-${tabIndex}`
    const pillIndex = this.activePillIndices[key] || 0
    const pill = tab.pillsData?.[pillIndex]

    if (!pill) {
      return true
    }
    const isEmpty = pill.fetchStatus === 'empty' ||
      (pill.fetchStatus === 'done' && (!pill.widgets || pill.widgets.length === 0))
    return isEmpty
  }

  hasContentToShow(tab: ITabData, strip: IStripData, tabIndex: number): boolean {
    const key = `${strip.key}-${tabIndex}`
    const pillIndex = this.activePillIndices[key] || 0
    const pill = tab.pillsData?.[pillIndex]
    const hasContent = pill ? (pill.fetchStatus === 'done' && pill.widgets && pill.widgets.length > 0) : false
    return hasContent
  }

  shouldShowViewMore(tab: ITabData, strip: IStripData, tabIndex: number): boolean {
    if (!strip.viewMoreUrl) {
      return false
    }
    const key = `${strip.key}-${tabIndex}`
    const pillIndex = this.activePillIndices[key] || 0
    const pill = tab.pillsData?.[pillIndex]
    return pill ? (pill.widgets && pill.widgets.length >= 4) : false
  }

  getSelectedPillData(tab: ITabData, strip: IStripData, tabIndex: number): IPillData | null {
    const key = `${strip.key}-${tabIndex}`
    const pillIndex = this.activePillIndices[key] || 0
    return tab.pillsData?.[pillIndex] || null
  }

  getContentLength(tab: ITabData, strip: IStripData, tabIndex: number): number {
    const pill = this.getSelectedPillData(tab, strip, tabIndex)
    return pill?.widgets?.length || 0
  }

  getMaxWidgets(tab: ITabData, strip: IStripData, tabIndex: number): number {
    const pill = this.getSelectedPillData(tab, strip, tabIndex)
    return pill?.maxWidgets || strip.sliderConfig.maxWidgets || 12
  }

  getDisplayContent(tab: ITabData, strip: IStripData, tabIndex: number): any[] {
    const pill = this.getSelectedPillData(tab, strip, tabIndex)
    const maxWidgets = this.getMaxWidgets(tab, strip, tabIndex)
    if (pill?.fetchStatus === 'loading') {
      const cacheKey = `${strip.key}-${tabIndex}-skeleton`
      if (!this.skeletonCache[cacheKey]) {
        this.skeletonCache[cacheKey] = this.transformSkeletonToWidgets(strip).slice(0, maxWidgets)
      }
      return this.skeletonCache[cacheKey]
    }
    if (pill?.widgets) {
      return pill.widgets.slice(0, maxWidgets)
    }
    return []
  }

  getSkeletonWidgets(strip: IStripData, tabIndex: number): any[] {
    const cacheKey = `${strip.key}-${tabIndex}-skeleton-loading`

    if (!this.skeletonCache[cacheKey]) {
      const maxWidgets = strip.tabs[tabIndex]?.pillsData[0]?.maxWidgets || strip.sliderConfig.maxWidgets || 10
      this.skeletonCache[cacheKey] = this.transformSkeletonToWidgets(strip).slice(0, maxWidgets)
    }

    return this.skeletonCache[cacheKey]
  }


  trackWidget(index: number, widget: any): any {
    return widget?.id || widget?.identifier || index
  }

  handleViewMore(strip: IStripData): void {
    if (strip.viewMoreUrl?.path) {
      // Get the actual tab index (not visible index)
      const actualTabIndex = this.activeTabIndices[strip.key] || 0
      const activeTab = strip.tabs[actualTabIndex]
      const key = `${strip.key}-${actualTabIndex}`
      const activePillIndex = this.activePillIndices[key] || 0
      const activePill = activeTab?.pillsData?.[activePillIndex]
      const queryParams = {
        ...strip.viewMoreUrl.queryParams,
        key: strip.key,
        tabSelected: activeTab?.value || '',
        pillSelected: activePill?.value || ''
      }
      this.router.navigate([strip.viewMoreUrl.path], {
        queryParams: queryParams
      })
    }
  }

  translateLabels(label: string, type: any) {
    return this.langtranslations.translateLabel(label, type, '')
  }

  private loadPillContent(pill: IPillData, tab: ITabData, strip: IStripData, pillIndex: number, tabIndex: number): void {
    if (!pill.requestRequired) {
      pill.fetchStatus = 'done'
      return
    }

    const loadingKey = `${strip.key}-${tabIndex}-${pillIndex}`
    if (this.loadingTabs.has(loadingKey)) {
      return
    }
    const wasUserInitiated = this.isUserInitiatedTabClick

    this.loadingTabs.add(loadingKey)
    pill.fetchStatus = 'loading'
    this.cdr.detectChanges()

    if (pill.request?.microSearch) {
      this.callMicroSearchAPI(pill, strip, tab, tabIndex, loadingKey, wasUserInitiated)
    } else if (pill.request?.trendingSearch) {
      this.callTrendingSearchAPI(pill, strip, tab, tabIndex, loadingKey, wasUserInitiated)
    } else if (pill.request?.searchV6) {
      this.callSearchV6API(pill, strip, tab, tabIndex, loadingKey, wasUserInitiated)
    } else {
      pill.widgets = []
      pill.fetchStatus = 'empty'
      this.loadingTabs.delete(loadingKey)
      if (!wasUserInitiated) {
        this.tryLoadNextTab(strip, tab.value, wasUserInitiated)
      }
    }

    this.contentLoaded.emit({ pill, tab, strip, pillIndex, tabIndex })
    this.cdr.detectChanges()
  }

  private tryLoadNextTab(strip: IStripData, currentTabValue: string, wasUserInitiated: boolean = false): void {
    if (wasUserInitiated) {
      return
    }

    // Find current tab index by value
    const currentTabIndex = strip.tabs.findIndex(t => t.value === currentTabValue)
    if (currentTabIndex === -1) {
      return
    }

    // Look for next non-hidden tab with pills
    for (let i = currentTabIndex + 1; i < strip.tabs.length; i++) {
      const nextTab = strip.tabs[i]

      // Skip hidden tabs
      if (this.isTabHidden(nextTab)) {
        continue
      }

      // Check if tab has pills
      if (nextTab?.pillsData?.length > 0) {

        // Calculate the visible index for this actual index
        let visibleIndex = 0
        for (let j = 0; j < i; j++) {
          if (!this.isTabHidden(strip.tabs[j])) {
            visibleIndex++
          }
        }
        setTimeout(() => {
          this.isUserInitiatedTabClick = false
          this.onTabChange(visibleIndex, strip, 0, false)
        }, 100)
        return
      }
    }
  }

  private callMicroSearchAPI(pill: IPillData, strip: IStripData, tab: ITabData, tabIndex: number, loadingKey: string, wasUserInitiated: boolean): void {
    let request = pill.request
    if (request?.microSearch && request.microSearch.request && request.microSearch.request.url) {
      this.contentSvc.microContentSearch(request?.microSearch?.request.url).subscribe(
        (response) => {
          this.loadingTabs.delete(loadingKey)
          if (response && response.result && response.result.content) {
            let content: any[] = []
            if (response.result.content) {
              content = response.result.content
            } else {
              const firstArrayKey = Object.keys(response.result).find(key => Array.isArray(response.result[key]))
              if (firstArrayKey) {
                content = response.result[firstArrayKey]
              }
            }
            pill.widgets = this.transformContentsToWidgets(content, strip, pill)
            pill.fetchStatus = pill.widgets.length > 0 ? 'done' : 'empty'
            this.clearSkeletonCache(strip)
            this.cdr.markForCheck()
            this.cdr.detectChanges()
            setTimeout(() => this.cdr.detectChanges(), 0)

            if (pill.widgets.length === 0 && !wasUserInitiated) {
              setTimeout(() => {
                this.cdr.detectChanges()
                this.tryLoadNextTab(strip, tab.value, wasUserInitiated)
              }, 50)
            }
          } else {
            pill.widgets = []
            pill.fetchStatus = 'empty'
            this.clearSkeletonCache(strip)
            this.cdr.detectChanges()
            if (!wasUserInitiated) {
              setTimeout(() => {
                this.cdr.detectChanges()
                this.tryLoadNextTab(strip, tab.value, wasUserInitiated)
              }, 50)
            }
          }
        },
        (error) => {
          this.loadingTabs.delete(loadingKey)
          console.error('MicroSearch API error:', error)
          pill.widgets = []
          pill.fetchStatus = 'empty'
          this.clearSkeletonCache(strip)
          this.cdr.markForCheck()
          this.cdr.detectChanges()
          setTimeout(() => this.cdr.detectChanges(), 0)
          if (!wasUserInitiated) {
            setTimeout(() => {
              this.cdr.detectChanges()
              this.tryLoadNextTab(strip, tab.value, wasUserInitiated)
            }, 50)
          }
        }
      )
    }
  }

  private clearSkeletonCache(strip: IStripData): void {
    Object.keys(this.skeletonCache).forEach(key => {
      if (key.startsWith(strip.key)) {
        delete this.skeletonCache[key]
      }
    })
  }

  private callTrendingSearchAPI(pill: IPillData, strip: IStripData, tab: ITabData, tabIndex: number, loadingKey: string, wasUserInitiated: boolean): void {
    let request = pill.request
    if (request?.trendingSearch) {
      if (request.trendingSearch &&
        request.trendingSearch.request?.filters?.organisation &&
        request.trendingSearch.request.filters.organisation.indexOf('<orgID>') >= 0) {
        let userRootOrgId
        if (this.configSvc.userProfile) {
          userRootOrgId = this.configSvc.userProfile.rootOrgId
        }
        request.trendingSearch.request.filters.organisation = userRootOrgId
      }

      this.contentSvc.trendingContentSearch(request.trendingSearch).subscribe(
        (result) => {
          this.loadingTabs.delete(loadingKey)

          if (result && result.response) {
            let content: any[] = []
            if (Array.isArray(result.response)) {
              content = result.response
            } else if (result.response[pill.value]) {
              content = result.response[pill.value]
            } else if (result.response.content) {
              content = result.response.content
            } else {
              const firstArrayKey = Object.keys(result.response).find(key => Array.isArray(result.response[key]))
              if (firstArrayKey) {
                content = result.response[firstArrayKey]
              }
            }

            pill.widgets = this.transformContentsToWidgets(content, strip, pill)
            pill.fetchStatus = pill.widgets.length > 0 ? 'done' : 'empty'
            this.clearSkeletonCache(strip)
            this.cdr.markForCheck()
            this.cdr.detectChanges()
            setTimeout(() => this.cdr.detectChanges(), 0)
            if (pill.widgets.length === 0 && !wasUserInitiated) {
              // Force another change detection to update getVisibleTabs
              setTimeout(() => {
                this.cdr.detectChanges()
                this.tryLoadNextTab(strip, tab.value, wasUserInitiated)
              }, 0)
            }
          } else {
            pill.widgets = []
            pill.fetchStatus = 'empty'
            this.clearSkeletonCache(strip)
            this.cdr.markForCheck()
            this.cdr.detectChanges()
            setTimeout(() => this.cdr.detectChanges(), 0)
            if (!wasUserInitiated) {
              // Force another change detection to update getVisibleTabs
              setTimeout(() => {
                this.cdr.detectChanges()
                this.tryLoadNextTab(strip, tab.value, wasUserInitiated)
              }, 0)
            }
          }
        },
        (error) => {
          this.loadingTabs.delete(loadingKey)
          console.error('TrendingSearch API error:', error)
          pill.widgets = []
          pill.fetchStatus = 'empty'
          this.clearSkeletonCache(strip)
          this.cdr.markForCheck()
          this.cdr.detectChanges()
          setTimeout(() => this.cdr.detectChanges(), 0)
          if (!wasUserInitiated) {
            // Force another change detection to update getVisibleTabs
            setTimeout(() => {
              this.cdr.detectChanges()
              this.tryLoadNextTab(strip, tab.value, wasUserInitiated)
            }, 0)
          }
        }
      )
    }
  }

  private callSearchV6API(pill: IPillData, strip: IStripData, tab: ITabData, tabIndex: number, loadingKey: string, wasUserInitiated: boolean): void {
    let request = pill.request
    if (request?.searchV6) {
      this.contentSvc.searchV6(request.searchV6).subscribe(
        (resp) => {
          this.loadingTabs.delete(loadingKey)

          if (resp && resp.result && resp.result.content) {
            const content = resp.result.content
            pill.widgets = this.transformContentsToWidgets(content, strip, pill)
            pill.fetchStatus = pill.widgets.length > 0 ? 'done' : 'empty'
            this.clearSkeletonCache(strip)
            this.cdr.markForCheck()
            this.cdr.detectChanges()
            setTimeout(() => this.cdr.detectChanges(), 0)

            if (pill.widgets.length === 0 && !wasUserInitiated) {
              setTimeout(() => {
                this.cdr.detectChanges()
                this.tryLoadNextTab(strip, tab.value, wasUserInitiated)
              }, 0)
            }
          } else {
            pill.widgets = []
            pill.fetchStatus = 'empty'
            this.clearSkeletonCache(strip)
            this.cdr.markForCheck()
            this.cdr.detectChanges()
            setTimeout(() => this.cdr.detectChanges(), 0)
            if (!wasUserInitiated) {
              setTimeout(() => {
                this.cdr.detectChanges()
                this.tryLoadNextTab(strip, tab.value, wasUserInitiated)
              }, 0)
            }
          }
        },
        (error) => {
          this.loadingTabs.delete(loadingKey)
          console.error('SearchV6 API error:', error)
          pill.widgets = []
          pill.fetchStatus = 'empty'
          this.clearSkeletonCache(strip)
          this.cdr.markForCheck()
          this.cdr.detectChanges()
          setTimeout(() => this.cdr.detectChanges(), 0)
          if (!wasUserInitiated) {
            setTimeout(() => {
              this.cdr.detectChanges()
              this.tryLoadNextTab(strip, tab.value, wasUserInitiated)
            }, 0)
          }
        }
      )
    }
  }

  private transformContentsToWidgets(
    contents: any[],
    strip: IStripData,
    pill?: IPillData
  ): any[] {
    console.log('Transforming contents to widgets:', strip, pill)
    return (contents || [])
      .filter(content => content && Object.keys(content).length > 0)
      .map((content, idx) => {
        return {
          widgetType: 'cardLib',
          widgetSubType: 'cardContentLib',
          widgetHostClass: 'mb-2',
          widgetData: {
            content,
            ...(content?.batches?.[0] && { batch: content.batches[0] }),
            cardSubType: strip.stripConfig?.cardSubType || 'card-portrait-lib',
            cardCustomeClass: '',
            context: {
              pageSection: strip.key,
              position: idx,
              ...(pill && { pill: pill.value })
            },
            isiGOTSpecialization: strip.key === 'forYou' && pill?.request?.microSearch ? true : false,
            intranetMode: strip.stripConfig?.intranetMode || false,
            deletedMode: strip.stripConfig?.deletedMode || false,
            contentTags: strip.stripConfig?.contentTags || [],
          },
        }
      })
  }

  private transformSkeletonToWidgets(strip: IStripData): any[] {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(_content => ({
      widgetType: 'cardLib',
      widgetSubType: 'cardContentLib',
      widgetHostClass: 'mb-2',
      widgetData: {
        cardSubType: strip.loaderConfig?.cardSubType || 'card-standard-skeleton',
        cardCustomeClass: '',
      },
    }))
  }
}
