/**
 * COMPETENCY LIST COMPONENT - SELF-MANAGING COMPETENCY SELECTION
 *
 * WHAT THIS COMPONENT DOES:
 * - Displays competency area, theme, sub-theme selection UI
 * - Manages internal list of selected competencies automatically
 * - Loads competency data from API if not provided via inputs
 * - Shows selected competencies in a table with remove functionality
 *
 * USAGE:
 * 1. Import CompetenciesModule in your module
 * 2. Use in template: <sb-uic-competency-list [selectedCompetencies]="initialCompetencies" (selectedCompetency)="handleUpdated($event)"></sb-uic-competency-list>
 * 3. Handle the selectedCompetency output to get updated competencies array
 *
 * EXPECTED INPUTS:
 * - competencyAreas/Themes/SubThemes: Optional custom data arrays (will auto-load API if empty)
 * - selectedCompetencies: Initial array of competencies (for editing existing data)
 * - viewMode: 'view' (readonly) or 'edit' (default: edit)
 * - labels: Custom UI labels {areaLabel, themeLabel, subThemeLabel, addButtonLabel}
 * - showTable: Show/hide competencies table (default: true)
 *
 * EXPECTED OUTPUTS:
 * - selectedCompetency: Emits updated CompetencyData[] array whenever add/remove happens
 * - addTehem: Emits CompetencyData when a competency is added (for future tracking)
 * - deletedTeheme: Emits deleted CompetencyData when a competency is removed (for future tracking)
 *
 * SIMPLE PARENT COMPONENT EXAMPLE:
 * // Template:
 * <sb-uic-competency-list
 *   [selectedCompetencies]="myCompetencies"
 *   (selectedCompetency)="myCompetencies = $event">
 * </sb-uic-competency-list>
 *
 * // Component:
 * myCompetencies: CompetencyData[] = [];
 *
 * NO NEED TO HANDLE ADD/REMOVE MANUALLY - Component manages internal state!
 */

import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges, Inject } from '@angular/core'
import { UntypedFormControl } from '@angular/forms'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { CompetencyPassbookService } from '../../competency-passbook/competency-passbook.service'
import * as _ from 'lodash'

export interface CompetencyLabels {
  areaLabel?: string
  themeLabel?: string
  subThemeLabel?: string
  addButtonLabel?: string
}

export interface CompetencyData {
  // Area
  competencyAreaIdentifier: string
  competencyAreaRefId: string
  competencyAreaName: string
  competencyAreaDescription: string

  // Theme
  competencyThemeIdentifier: string
  competencyThemeRefId: string
  competencyThemeName: string
  competencyThemeType: string
  competencyThemeDescription: string
  competencyThemeAdditionalProperties: any

  // Sub-theme
  competencySubThemeIdentifier: string
  competencySubThemeRefId: string
  competencySubThemeName: string
  competencySubThemeDescription: string
  competencySubThemeAdditionalProperties: any
}

@Component({
  selector: 'sb-uic-competency-list',
  templateUrl: './competency-list.component.html',
  styleUrls: [
    './competency-list.component.scss',
    '../../../styles/round-controls.scss'
  ],
  standalone: false
})
export class CompetencyListComponent implements OnInit, OnChanges {

  // Inputs
  @Input() competencyAreas: any[] = []
  @Input() competencyThemes: any[] = []
  @Input() competencySubThemes: any[] = []
  @Input() viewMode: string = ''
  @Input() labels: CompetencyLabels = {}
  @Input() selectedCompetencies: CompetencyData[] = []
  @Input() showTable: boolean = true
  @Input() showCompetencyAdd: boolean = true
  @Input() showRoundControls: boolean = true

  // Outputs
  @Output() selectedCompetency = new EventEmitter<CompetencyData[]>()
  @Output() addTehem = new EventEmitter<CompetencyData>()
  @Output() deletedTeheme = new EventEmitter<CompetencyData>()

  // Component state
  allCompetencies: any[] = []
  filteredallCompetencies: any[] = []
  allCompetencyTheme: any[] = []
  filteredallCompetencyTheme: any[] = []
  allCompetencySubtheme: any[] = []
  filteredallCompetencySubtheme: any[] = []
  enableCompetencyAdd = false
  seletedCompetencyArea: any
  seletedCompetencyTheme: any
  seletedCompetencySubTheme: any
  queryThemeControl = new UntypedFormControl('')
  querySubThemeControl = new UntypedFormControl('')
  isTableExpanded = true
  listView = true
  allThemeData: any
  allSubThemeData: any

  expand: boolean = false
  selectedAreaValue: string | null = null

  // Internal competencies array managed by component
  internalCompetencies: CompetencyData[] = []

  // Default labels
  defaultLabels: CompetencyLabels = {
    areaLabel: 'Competency Area',
    themeLabel: 'Competency Theme',
    subThemeLabel: 'Competency Sub theme',
    addButtonLabel: 'Add'
  }

  constructor(
    private competencySvc: CompetencyPassbookService,
  ) {
  }

  ngOnInit(): void {
    this.initializeComponent()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['competencyAreas'] && changes['competencyAreas'].currentValue) {
      this.allCompetencies = changes['competencyAreas'].currentValue
      this.filteredallCompetencies = this.allCompetencies
    }

    if (changes['competencyThemes'] && changes['competencyThemes'].currentValue) {
      this.allThemeData = changes['competencyThemes'].currentValue
    }

    if (changes['competencySubThemes'] && changes['competencySubThemes'].currentValue) {
      this.allSubThemeData = changes['competencySubThemes'].currentValue
    }

    if (changes['labels']) {
      this.labels = { ...this.defaultLabels, ...this.labels }
    }

    // Initialize internal competencies from input (for editing existing data)
    if (changes['selectedCompetencies'] && changes['selectedCompetencies'].currentValue) {
      this.internalCompetencies = [...changes['selectedCompetencies'].currentValue]
    }

    // If no data is provided, load from API
    if (!this.competencyAreas?.length && !this.competencyThemes?.length && !this.competencySubThemes?.length) {
      this.loadCompetencyMaster()
    }
  }

  initializeComponent() {
    this.labels = { ...this.defaultLabels, ...this.labels }
    this.setupFormControls()

    // Initialize internal competencies from input
    this.internalCompetencies = [...(this.selectedCompetencies || [])]

    // If no input data provided, load from service
    if (!this.competencyAreas?.length) {
      this.loadCompetencyMaster()
    } else {
      this.allCompetencies = this.competencyAreas
      this.filteredallCompetencies = this.allCompetencies
      this.allThemeData = this.competencyThemes
      this.allSubThemeData = this.competencySubThemes
    }
  }

  setupFormControls() {
    this.queryThemeControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe(value => {
        this.filteredallCompetencyTheme = this.filterValues(value || '', this.allCompetencyTheme)
      })

    this.querySubThemeControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe(value => {
        this.filteredallCompetencySubtheme = this.filterValues(value || '', this.allCompetencySubtheme)
      })
  }

  loadCompetencyMaster() {
    this.competencySvc.fetchCompetencyV6().subscribe(response => {
      if (response && response.params && response.params.status && response.params.status.toLowerCase() === 'successful') {
        this.allCompetencies = response.result.framework.categories.filter((v: any) => v.code === 'competencyarea')[0].terms
        this.allThemeData = response.result.framework.categories.filter((v: any) => v.code === 'theme')[0].terms
        this.allSubThemeData = response.result.framework.categories.filter((v: any) => v.code === 'subtheme')[0].terms
        this.filteredallCompetencies = this.allCompetencies
      } else {
        this.allCompetencies = []
        this.filteredallCompetencies = []
      }
    })
  }

  filterValues(searchValue: string, array: any[]) {
    if (!searchValue) {
      return array
    }
    const lower = searchValue.toLowerCase()
    return array.filter((value: any) =>
      (value.name || '').toLowerCase().includes(lower)
    )
  }

  compAreaSelected(option: any) {
    this.resetCompSubfields()
    this.selectedAreaValue = option.name
    this.allCompetencies.forEach((val: any) => {
      if (option.identifier === val.identifier) {
        this.seletedCompetencyArea = val
        this.allCompetencyTheme = val.associations
        this.filteredallCompetencyTheme = this.allCompetencyTheme
      }
    })
    this.expand = true
  }

  compThemeSelected(option: any) {
    this.enableCompetencyAdd = false
    this.allCompetencyTheme.forEach((val: any) => {
      if (option.identifier === val.identifier) {
        this.seletedCompetencyTheme = val
        this.allCompetencySubtheme = this.allThemeData.filter((v: any) => v.identifier === val.identifier)[0].associations
        this.filteredallCompetencySubtheme = this.allCompetencySubtheme
      }
    })
  }

  compSubThemeSelected(option: any) {
    this.seletedCompetencySubTheme = option
    this.enableCompetencyAdd = true
  }

  resetCompSubfields() {
    this.enableCompetencyAdd = false
    this.seletedCompetencyTheme = null
    this.seletedCompetencySubTheme = null
    this.allCompetencySubtheme = []
    this.filteredallCompetencySubtheme = []
    this.queryThemeControl.setValue('')
    this.querySubThemeControl.setValue('')
  }

  addCompetency() {
    if (!this.seletedCompetencyArea || !this.seletedCompetencyTheme || !this.seletedCompetencySubTheme) {
      return
    }

    const area = this.seletedCompetencyArea
    const theme = this.seletedCompetencyTheme
    const subTheme = this.seletedCompetencySubTheme

    const competencyData: CompetencyData = {
      // Area
      competencyAreaIdentifier: area.identifier || area.id || area.name,
      competencyAreaRefId: area.refId || area.identifier || '',
      competencyAreaName: area.name,
      competencyAreaDescription: area.description || '',

      // Theme
      competencyThemeIdentifier: theme.identifier || theme.id || theme.name,
      competencyThemeRefId: theme.refId || theme.identifier || '',
      competencyThemeName: theme.name,
      competencyThemeType: theme.category || 'theme',
      competencyThemeDescription: theme.description || '',
      competencyThemeAdditionalProperties: theme.additionalProperties || {},

      // Sub-theme
      competencySubThemeIdentifier: subTheme.identifier || subTheme.id || subTheme.name,
      competencySubThemeRefId: subTheme.refId || subTheme.identifier || '',
      competencySubThemeName: subTheme.name,
      competencySubThemeDescription: subTheme.description || '',
      competencySubThemeAdditionalProperties: subTheme.additionalProperties || {},
    }

    // Check for duplicates
    const isDuplicate = this.internalCompetencies.some(item =>
      item.competencyAreaIdentifier === competencyData.competencyAreaIdentifier &&
      item.competencyThemeIdentifier === competencyData.competencyThemeIdentifier &&
      item.competencySubThemeIdentifier === competencyData.competencySubThemeIdentifier
    )

    if (!isDuplicate) {
      // Add to internal array
      this.internalCompetencies.push(competencyData)

      // Emit all outputs
      this.selectedCompetency.emit([...this.internalCompetencies])
      this.addTehem.emit(competencyData)
    }
    this.expand = false
    this.seletedCompetencyArea = null
    this.selectedAreaValue = null
    this.resetCompSubfields()
  }

  removeCompetencyV2(area: string, theme: string, subtheme: string): void {
    // Find the competency to remove
    const competencyToRemove = this.internalCompetencies.find(comp =>
      comp.competencyAreaName === area &&
      comp.competencyThemeName === theme &&
      comp.competencySubThemeName === subtheme
    )

    if (competencyToRemove) {
      // Remove from internal array
      this.internalCompetencies = this.internalCompetencies.filter(comp =>
        !(comp.competencyAreaName === area &&
          comp.competencyThemeName === theme &&
          comp.competencySubThemeName === subtheme)
      )

      // Emit all outputs
      this.selectedCompetency.emit([...this.internalCompetencies])
      this.deletedTeheme.emit(competencyToRemove)
    }
  }

  updateQuery(key: string, field: 'theme' | 'subtheme') {
    if (field === 'theme') {
      this.filteredallCompetencyTheme = this.filterValues(key, this.allCompetencyTheme)
    } else {
      this.filteredallCompetencySubtheme = this.filterValues(key, this.allCompetencySubtheme)
    }
  }

  resetSearch(field: 'theme' | 'subtheme') {
    if (field === 'theme') {
      this.queryThemeControl.setValue('')
      this.filteredallCompetencyTheme = this.allCompetencyTheme
      if (!this.seletedCompetencySubTheme) {
        this.filteredallCompetencySubtheme = []
        this.querySubThemeControl.setValue('')
      } else {
        this.querySubThemeControl.setValue('')
      }
    } else {
      this.querySubThemeControl.setValue('')
      this.filteredallCompetencySubtheme = this.allCompetencySubtheme
    }
  }

  // Getters for table display
  get uniqueAreas(): string[] {
    if (!this.internalCompetencies || !this.internalCompetencies.length) {
      return []
    }

    return Array.from(new Set(
      this.internalCompetencies.map((comp: any) => comp.competencyAreaName)
    ))
  }

  getUniqueThemesForArea(areaName: string): string[] {
    if (!this.internalCompetencies || !this.internalCompetencies.length) {
      return []
    }

    const themesForArea = this.internalCompetencies
      .filter((comp: any) => comp.competencyAreaName === areaName)
      .map((comp: any) => comp.competencyThemeName)

    return Array.from(new Set(themesForArea))
  }

  getSubthemesForAreaAndTheme(areaName: string, themeName: string): string[] {
    if (!this.internalCompetencies || !this.internalCompetencies.length) {
      return []
    }

    return this.internalCompetencies
      .filter((comp: any) =>
        comp.competencyAreaName === areaName &&
        comp.competencyThemeName === themeName
      )
      .map((comp: any) => comp.competencySubThemeName)
  }

  getTotalRowsForArea(areaName: string): number {
    let totalRows = 0
    for (const theme of this.getUniqueThemesForArea(areaName)) {
      totalRows += this.getSubthemesForAreaAndTheme(areaName, theme).length
    }
    return totalRows
  }
}
