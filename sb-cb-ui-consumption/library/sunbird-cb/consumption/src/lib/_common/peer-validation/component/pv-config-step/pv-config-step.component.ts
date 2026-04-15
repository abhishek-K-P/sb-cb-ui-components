import { Component, OnInit, OnDestroy, Inject, ViewEncapsulation } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar'
import { Subject } from 'rxjs'
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators'
import { PeerValidationService } from '../../../peer-validation/service/peer-validation.service'
import { LOADER_SERVICE, ILoaderService } from '../../service/loader-service.token'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'

@Component({
  selector: 'sb-uic-pv-config-step',
  templateUrl: './pv-config-step.component.html',
  styleUrls: ['./pv-config-step.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PvConfigStepComponent implements OnInit, OnDestroy {
  configForm!: FormGroup
  courseCharCount = 0
  minTriggerDayOptions = Array.from({ length: 7 }, (_, i) => 30 + i * 5)  // [30, 35, 40, 45, 50, 55, 60]
  maxTriggerDayOptions = Array.from({ length: 19 }, (_, i) => 90 + i * 5) // [90, 95, ..., 180]
  courseSearchSubject = new Subject<string>()
  private destroy$ = new Subject<void>()
  courseSearchResults: any[] = []
  isSearching = false
  currentSearchQuery = ''
  currentOffset = 0
  pageSize = 5
  totalResults = 0
  hasMoreResults = false
  selectedCourse: any = null
  currentPage = 1
  cardsPerPage = 5
  environment: any
  minDate = new Date()
  courseCategoryList: string[] = [
    'Course',
    'Moderated Course',
    'Multilingual Course',
    'Curated Program',
    'Moderated Program',
    'Invite Only Program',
    'Blended Program',
    'Comprehensive Assessment Program'
  ]

  constructor(
    private fb: FormBuilder,
    private peerValidationService: PeerValidationService,
    private snackBar: MatSnackBar,
    private configSvc: ConfigurationsService,
    @Inject('environment') env: any,
    @Inject(LOADER_SERVICE) private loaderService: ILoaderService
  ) {
    this.environment = env
  }

  ngOnInit(): void {
    this.initializeForm()
    this.setupCourseSearch()
    this.setupCategoryChangeListener()
    this.updateMinDate()
    this.setupTriggerValueListener()
    // Load initial courses on component load
    this.searchCourses('')
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  initializeForm(): void {
    this.configForm = this.fb.group({
      course: ['', [Validators.maxLength(70)]],
      courseCategory: ['Course'],
      selectedCourseDetails: [null, Validators.required],
      minTriggerDays: [30, Validators.required],
      maxTriggerDays: [90, Validators.required],
      endDate: ['', Validators.required]
    })
  }

  setupTriggerValueListener(): void {
    this.configForm.get('minTriggerDays')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((minVal: number) => {
        this.updateMaxTriggerOptions(minVal)
        this.updateMinDate()
      })

    this.configForm.get('maxTriggerDays')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateMinDate()
      })
  }

  updateMaxTriggerOptions(minVal: number): void {
    const allMaxOptions = Array.from({ length: 19 }, (_, i) => 90 + i * 5)
    this.maxTriggerDayOptions = allMaxOptions.filter(v => v > minVal)

    const currentMax = this.configForm.get('maxTriggerDays')?.value
    if (currentMax && currentMax <= minVal) {
      this.configForm.patchValue({ maxTriggerDays: this.maxTriggerDayOptions[0] || null })
    }
  }

  updateMinDate(): void {
    const minTriggerDays = this.configForm.get('minTriggerDays')?.value || 30

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    this.minDate = new Date(today.getTime() + ((minTriggerDays + 1) * 24 * 60 * 60 * 1000))
  }

  setupCourseSearch(): void {
    this.courseSearchSubject
      .pipe(
        debounceTime(800),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchText: string) => {
        this.searchCourses(searchText)
      })
  }

  setupCategoryChangeListener(): void {
    this.configForm.get('courseCategory')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Clear search text and results, then make a fresh API call
        this.configForm.get('course')?.setValue('', { emitEvent: false })
        this.courseCharCount = 0
        this.currentSearchQuery = ''
        this.currentOffset = 0
        this.currentPage = 1
        this.courseSearchResults = []
        this.searchCourses('')
      })
  }

  onCourseSearch(event: any): void {
    const value = event.target.value || ''
    this.courseCharCount = value.length
    // Reset pagination when search query changes
    this.currentOffset = 0
    this.currentPage = 1
    this.courseSearchResults = []
    this.courseSearchSubject.next(value)
  }

  getCourseCategoryValue(): string {
    const selected = this.configForm.get('courseCategory')?.value || 'Course'
    if (selected === 'Invite Only Program') {
      return 'invite-only program'
    }
    return selected
  }

  searchCourses(query: string, offset: number = 0): void {
    this.currentSearchQuery = query
    const categoryValue = this.getCourseCategoryValue()
    const isModerated = categoryValue === 'Moderated Course' || categoryValue === 'Moderated Program'
    const userOrgId = this.configSvc?.userProfile?.rootOrgId || ''
    let payload: any
    if (isModerated) {
      payload = {
        request: {
          filters: {
            must: {
              courseCategory: [categoryValue],
            },
            status: ['Live'],
            'secureSettings.organisation': [
              userOrgId
            ]
          },
          offset: offset,
          limit: this.pageSize,
          query: query,
          sort_by: {
            lastUpdatedOn: 'desc'
          },
          fields: []
        }
      }
    } else {
      payload = {
        request: {
          secureSettings: false,
          filters: {
            accessSettingsEnabled: { "ne": true },
            must: {
              courseCategory: [categoryValue]
            },
            status: ['Live']
          },
          offset: offset,
          limit: this.pageSize,
          query: query,
          sort_by: {
            lastUpdatedOn: 'desc'
          },
          fields: []
        }
      }
    }

    this.isSearching = true
    if (this.loaderService) {
      this.loaderService.changeLoaderState(true)
    }
    this.peerValidationService.searchContent(payload).subscribe({
      next: (response: any) => {
        this.isSearching = false
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        if (response?.result?.content) {
          const results = response.result.content
          this.totalResults = response.result.count || 0
          this.courseSearchResults = results
          this.currentOffset = offset
          this.hasMoreResults = (offset + results.length) < this.totalResults
        }
      },
      error: (error) => {
        this.isSearching = false
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        console.error('Error searching courses:', error)
        this.courseSearchResults = []
      }
    })
  }

  loadMoreResults(): void {
    if (this.hasMoreResults && !this.isSearching) {
      const nextOffset = this.currentOffset + this.pageSize
      this.searchCourses(this.currentSearchQuery, nextOffset)
    }
  }

  get paginatedCourses(): any[] {
    return this.courseSearchResults
  }

  get totalPages(): number {
    return Math.ceil(this.totalResults / this.cardsPerPage)
  }

  get visiblePages(): number[] {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, this.currentPage - 2)
    const end = Math.min(this.totalPages, start + maxVisible - 1)

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  shouldShowEllipsis(): boolean {
    return this.totalPages > 5 && this.currentPage < this.totalPages - 2
  }

  shouldShowLastPageButton(): boolean {
    return this.totalPages > 5 && !this.visiblePages.includes(this.totalPages)
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page
      const offset = (page - 1) * this.pageSize
      this.searchCourses(this.currentSearchQuery, offset)
    }
  }

  goToFirstPage(): void {
    this.goToPage(1)
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages)
  }

  selectCourse(course: any): void {
    this.selectedCourse = course
    this.peerValidationService.setSelectedCourse(course)
    this.configForm.patchValue({
      selectedCourseDetails: course
    })
  }

  removeSelectedCourse(): void {
    this.selectedCourse = null
    this.peerValidationService.setSelectedCourse(null)
    this.configForm.patchValue({
      selectedCourseDetails: null,
      course: ''
    })
    // Clear search results and query
    this.courseSearchResults = []
    this.currentSearchQuery = ''
    this.courseCharCount = 0
  }

  isCourseSelected(course: any): boolean {
    return this.selectedCourse?.identifier === course.identifier
  }

  getCourseDuration(course: any): string {
    if (course.courseCategory?.toLowerCase() === 'blended program') {
      return this.formatProgramDuration(course.programDuration)
    }
    return this.formatDuration(course.duration)
  }

  formatProgramDuration(days: number): string {
    if (!days) {
      return ''
    }
    return days === 1 ? '1 day' : `${days} days`
  }

  formatDuration(durationInSeconds: number): string {
    if (!durationInSeconds) {
      return ''
    }
    const totalMinutes = Math.round(durationInSeconds / 60)
    if (totalMinutes < 60) {
      return `${totalMinutes} mins`
    }
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (minutes === 0) {
      return `${hours} hrs`
    }
    return `${hours} hrs ${minutes} mins`
  }

  getCorrectUrl(url: string): string {
    if (!url) {
      return '/assets/images/default.png'
    }

    // If URL contains content-store/content/, rewrite to use environment base
    if (url.includes('content-store/content/') && this.environment.karmYogi) {
      const relativePath = url.substring(url.indexOf('content-store/content/'))
      return this.environment.karmYogi + '/' + relativePath
    }

    // If URL already has http/https, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }

    // If it's a relative path, prepend environment URL
    if (this.environment.karmYogi) {
      return this.environment.karmYogi + url
    }

    return url
  }

  getLogoUrl(url: string): string {
    const defaultLogo = 'assets/instances/eagle/app_logos/KarmayogiBharat_Logo.svg'
    if (!url) {
      return defaultLogo
    }

    if (url.includes('content-store/content/') && this.environment.karmYogi) {
      const relativePath = url.substring(url.indexOf('content-store/content/'))
      return this.environment.karmYogi + '/' + relativePath
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }

    if (this.environment.karmYogi) {
      return this.environment.karmYogi + url
    }

    return defaultLogo
  }

  getMissingFields(): string[] {
    const missing: string[] = []
    if (!this.configForm.get('selectedCourseDetails')?.value) {
      missing.push('Content')
    }
    if (!this.configForm.get('minTriggerDays')?.value) {
      missing.push('Minimum Trigger Days')
    }
    if (!this.configForm.get('maxTriggerDays')?.value) {
      missing.push('Maximum Trigger Days')
    }
    if (!this.configForm.get('endDate')?.value) {
      missing.push('Survey End Date')
    }
    return missing
  }

  isFormValid(): boolean {
    return !!this.configForm.get('selectedCourseDetails')?.value && this.configForm.valid
  }

  getFormData() {
    return {
      ...this.configForm.value,
      selectedCourse: this.selectedCourse
    }
  }

  populateForm(formData: any): void {
    if (!formData) {
      return
    }

    // Extract data from the form response
    const additionalProperties = formData.additionalProperties || {}
    const identifier = additionalProperties.identifier || ''
    const minTriggerDays = additionalProperties.triggerAfter || 30
    const maxTriggerDays = additionalProperties.completionLookBack || 90
    const endDate = formData.endDate ? new Date(formData.endDate) : ''

    // Create a minimal course object from the form data to display the chip
    const courseData = {
      name: formData.title || '',
      identifier: identifier,
      posterImage: additionalProperties.thumbnail || '',
      appIcon: additionalProperties.thumbnail || '',
      duration: additionalProperties.duration ? parseInt(additionalProperties.duration, 10) : 0,
      programDuration: additionalProperties.duration ? parseInt(additionalProperties.duration, 10) : 0,
      courseCategory: additionalProperties.courseCategory || 'Course',
      lastPublishedOn: null
    }

    // Set the selected course if identifier exists
    if (identifier) {
      this.selectedCourse = courseData
      this.peerValidationService.setSelectedCourse(courseData)
    }

    // Patch the form with the values
    this.configForm.patchValue({
      selectedCourseDetails: identifier ? courseData : null,
      minTriggerDays: minTriggerDays,
      maxTriggerDays: maxTriggerDays,
      endDate: endDate
    })

    // Update max trigger options based on min value
    this.updateMaxTriggerOptions(minTriggerDays)
    this.updateMinDate()
  }
}
