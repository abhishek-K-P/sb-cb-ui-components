import { Component, ElementRef, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output, ViewChild, Injector } from '@angular/core'
import { InsiteDataService } from '../../../_services/insite-data.service'

@Component({
  selector: 'sb-uic-mdo-leaderboard-v2',
  templateUrl: './mdo-leaderboard-v2.component.html',
  styleUrls: ['./mdo-leaderboard-v2.component.scss']
})
export class MdoLeaderboardV2Component implements OnInit, OnChanges {

  currentPill: any = 'XL'
  result: any = []
  filteredData: any
  searchTerm: string = ''
  expand: boolean = true
  disableLeft: boolean = true
  disableRight: boolean = false
  @Input() orgId: any = ''

  @Input() object: any
  @Input() slwConfig: any = {}
  @Input() isEdit: boolean = false
  @Input() isEditable: boolean = false
  @Output() tabClicked = new EventEmitter<any>()
  @Output() editClicked = new EventEmitter<any>()
  @ViewChild('scrollableContent', { static: false }) scrollableContent: ElementRef

  /** Top-level tab support (Center / State) */
  hasTabs = false
  activeTopTab: any = null
  activeTopTabIndex = 0

  private eventCallback: Function | undefined

  constructor(
    private insiteDataService: InsiteDataService,
    private injector: Injector
  ) {
    try {
      const isEditInput = this.injector.get('isEdit', false)
      const isEditableInput = this.injector.get('isEditable', false)
      const eventCallbackInput = this.injector.get('eventCallback', null)

      if (typeof isEditInput === 'boolean') {
        this.isEdit = isEditInput
      }
      if (typeof isEditableInput === 'boolean') {
        this.isEditable = isEditableInput
      }
      if (eventCallbackInput && typeof eventCallbackInput === 'function') {
        this.eventCallback = eventCallbackInput
      }
    } catch (e) {
      console.error('Error getting values from injector', e)
    }
  }

  ngOnInit() {
    this.initFromObject()
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.object && !changes.object.firstChange) {
      this.initFromObject()
    }
  }

  private initFromObject() {
    if (!this.object) {
      return
    }

    this.hasTabs = !!(this.object?.tabs && this.object.tabs.length > 0)

    if (this.hasTabs) {
      // Resolve initial top tab from object.currentTabIndex (e.g. 0 = Center, 1 = State)
      const idx = this.object.currentTabIndex
      this.activeTopTabIndex = (typeof idx === 'number' && idx >= 0 && idx < this.object.tabs.length) ? idx : 0
      this.activeTopTab = this.object.tabs[this.activeTopTabIndex]

      // Resolve initial pill from object.currentPill (e.g. "S", "M", "L")
      this.currentPill = this.object.currentPill || this.activeTopTab.options?.[0]?.value || this.currentPill
    } else {
      this.currentPill = this.object.currentPill || this.currentPill
    }

    if (this.slwConfig && this.slwConfig.enabled) {
      this.getSlwData()
    } else {
      this.getData()
    }
  }

  getSlwData() {
    const request = { request: { mdoId: this.orgId } }
    this.insiteDataService.fetchSlwLeaderboard(request).subscribe((res: any) => {
      if (res && res.result) {
        this.result = res.result
        this.filteredData = this.getFilteredData(this.result.mdoLeaderBoard || [])
      }
    }, _error => {})
  }

  getData() {
    this.insiteDataService.fetchLeaderboardV2().subscribe((res: any) => {
      if (res && res.result) {
        this.result = res.result
        this.filteredData = this.getFilteredData(this.result.mdoLeaderBoard || [])
      }
    }, _error => {})
  }

  getFilteredData(response: any) {
    if (response && response.length > 0) {
      let filtered = response.filter((user: any) => user.size === this.currentPill)

      // When tabs are present, filter by is_state: State tab → true, Center tab → false
      if (this.hasTabs && this.activeTopTab?.title) {
        const isStateTab = this.activeTopTab.title.toLowerCase() === 'state'
        filtered = filtered.filter((user: any) => !!user.is_state === isStateTab)
      }

      return filtered.map(user => ({ ...user, children: [], selected: false })).slice(0, 5)
    }
    return []
  }

  /** Switch top-level tab (Center / State) */
  selectTopTab(index: number) {
    if (!this.hasTabs || index === this.activeTopTabIndex) {
      return
    }
    this.activeTopTabIndex = index
    this.activeTopTab = this.object.tabs[index]
    this.currentPill = this.activeTopTab.options?.[0]?.value || this.currentPill
    this.searchTerm = ''
    this.filteredData = this.getFilteredData(this.result.mdoLeaderBoard || [])
    this.tabClicked.emit({ topTab: this.activeTopTab.title, sizePill: this.currentPill })
  }

  /** Returns the options for the currently active tab (or object.options for legacy) */
  get activeOptions(): any[] {
    if (this.hasTabs && this.activeTopTab?.options?.length) {
      return this.activeTopTab.options
    }
    return this.object?.options || []
  }

  getPillData(name: any) {
    this.currentPill = name
    this.searchTerm = ''
    this.filteredData = this.getFilteredData(this.result.mdoLeaderBoard || [])
    let nameStr: any = ''
    const opts = this.activeOptions
    if (opts && opts.length > 0) {
      const found = opts.find((option: any) => option.value === name)
      nameStr = found ? found.label : name
    } else {
      switch (name) {
        case 'XL': nameStr = 'greater-than-50K'; break
        case 'L': nameStr = '10K-50K'; break
        case 'M': nameStr = '1K-10K'; break
        case 'S': nameStr = '500-1K'; break
        default: nameStr = 'less-than-500'; break
      }
    }
    this.tabClicked.emit(nameStr)
  }

  getRank(rank: number) {
    return [1, 2, 3].includes(rank) ? `rank${rank}` : 'rank0'
  }

  getMedal(rank: number) {
    if (rank === 1) {
      return 'assets/images/national-learning/Medal1.svg'
    } else if (rank === 2) {
      return 'assets/images/national-learning/Medal2.svg'
    } else {
      return 'assets/images/national-learning/Medal3.svg'
    }
  }

  handleSearchQuery(e: any) {
    if (e.target.value && e.target.value.length > 0) {
      this.searchTerm = e.target.value
      const searchVal = e.target.value.toLowerCase()
      let data = (this.result.mdoLeaderBoard || [])
        .filter(user => user.size === this.currentPill &&
          (user.org_name || user.orgName || '').toLowerCase().includes(searchVal))

      if (this.hasTabs && this.activeTopTab?.title) {
        const isStateTab = this.activeTopTab.title.toLowerCase() === 'state'
        data = data.filter(user => !!user.is_state === isStateTab)
      }

      this.filteredData = data.map(user => ({ ...user, children: [] })).slice(0, 5)
    } else {
      this.filteredData = this.getFilteredData(this.result.mdoLeaderBoard || [])
    }
  }

  toggleWeekHightlits() {
    this.expand = !this.expand
  }

  scrollToRight() {
    this.scrollableContent.nativeElement.scrollBy({ left: 200, behavior: 'smooth' })
    this.disableLeft = false
    this.disableRight = true
  }

  scrollToLeft() {
    this.scrollableContent.nativeElement.scrollBy({ left: -200, behavior: 'smooth' })
    this.disableLeft = true
    this.disableRight = false
  }

  onEdit() {
    const eventData = {
      source: 'mdoLeaderboard',
      action: 'edit',
      data: {
        fieldName: 'mdoLeaderboardConfig',
        displayName: 'MDO Leaderboard Configuration',
        value: this.object,
        fieldType: 'mdoLeaderboardConfig'
      }
    }

    if (this.eventCallback && typeof this.eventCallback === 'function') {
      this.eventCallback(eventData)
      return
    }

    if ((window as any).__INJECTOR_DATA?.eventCallback) {
      (window as any).__INJECTOR_DATA.eventCallback(eventData)
    }
  }
}
