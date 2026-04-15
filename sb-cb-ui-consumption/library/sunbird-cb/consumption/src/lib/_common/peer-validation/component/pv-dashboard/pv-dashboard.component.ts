import { Component, OnInit, ViewChild, Inject } from '@angular/core'
import { FormBuilder, FormGroup } from '@angular/forms'
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog'
import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator'
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table'
import { Router, ActivatedRoute } from '@angular/router'
import { debounceTime } from 'rxjs/operators'
import { ConfirmationDialogComponent } from '../../../dialog-components/confirmation-dialog/confirmation-dialog.component'
import { PeerValidationService } from '../../service/peer-validation.service'
import { ILoaderService, LOADER_SERVICE } from '../../service/loader-service.token'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'

interface Survey {
  id: string
  formId: string
  courseName: string
  thumbnail: string
  organisation?: string
  createdBy?: string
  status: 'Draft' | 'Active' | 'Ended' | 'Archived'
  startDate: string
  endDate: string
  archiveDate: string
  submissionRate: string
  submissionCount: number
  totalCount: number
}

interface MDOOption {
  orgName: string
  orgId: string
  count: number
}

interface DownloadReport {
  id: string
  formid: string
  formtitle: string
  orgname: string
  downloadStatus: 'In Progress' | 'Ready'
  fileName: string
  generatedAt: number
  requestedOn: string
  fileUrl?: string
  thumbnail?: string
}

@Component({
  selector: 'sb-uic-pv-dashboard',
  templateUrl: './pv-dashboard.component.html',
  styleUrls: ['./pv-dashboard.component.scss']
})
export class PvDashboardComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator

  filterForm!: FormGroup
  displayedColumns: string[] = ['courseName', 'status', 'startDate', 'endDate', 'submissionRate', 'actions']
  displayedDownloadColumns: string[] = ['courseName', 'organisation', 'requestedOn', 'downloadStatus', 'actions']
  dataSource = new MatTableDataSource<Survey>([])
  allSurveys: Survey[] = []
  downloadReports: DownloadReport[] = []
  paginatedDownloadReports: DownloadReport[] = []
  selectedTabIndex = 0
  selectedTab: 'all' | 'active' | 'ended' | 'draft' | 'archived' | 'download' = 'all'
  totalCount = 0
  downloadTotalCount = 0
  readonly downloadDefaultPageSize = 20
  allCount = 0
  activeCount = 0
  endedCount = 0
  draftCount = 0
  archivedCount = 0
  isSPVRoute = false
  isLoading = false
  loggedInUserId = ''
  sortBy = 'createdDate'
  sortOrder: 'ASC' | 'DESC' = 'DESC'

  statusOptions = ['All Status', 'Active', 'Draft', 'Ended', 'Archived']
  mdoOptions: (string | MDOOption)[] = []
  mdoDisplayOptions: (string | MDOOption)[] = []

  hasActiveFilters = false

  compareMdo = (a: MDOOption, b: MDOOption): boolean => {
    return a && b ? a.orgId === b.orgId : a === b
  }

  private computeHasActiveFilters(): boolean {
    if (!this.filterForm) return false
    const v = this.filterForm.value
    return !!v.searchText ||
      !!v.startDate ||
      !!v.endDate ||
      (v.status && v.status !== 'All Status') ||
      (v.mdo && Array.isArray(v.mdo) && v.mdo.length > 0)
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private peerValidationService: PeerValidationService,
    private dialog: MatDialog,
    private configSvc: ConfigurationsService,
    @Inject(LOADER_SERVICE) private loaderService: ILoaderService
  ) { }

  ngOnInit(): void {
    // Store logged-in user ID
    this.loggedInUserId = this.configSvc?.userProfile?.userId || ''

    // Check if URL contains spv/peer-validation
    this.isSPVRoute = this.router.url.includes('spv/peer-validation')

    // Update displayed columns if SPV route
    if (this.isSPVRoute) {
      this.displayedColumns = ['courseName', 'organisation', 'startDate', 'endDate', 'submissionRate', 'actions']
    }

    this.initializeForm()

    // Check for query parameter to select tab, then load
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tabMap: { [key: string]: number } = { 'all': 0, 'active': 1, 'ended': 2, 'draft': 3, 'archived': 4, 'download': 5 }
        this.selectedTab = params['tab'] as 'all' | 'active' | 'ended' | 'draft' | 'archived' | 'download' || 'all'
        this.selectedTabIndex = tabMap[params['tab']] || 0
      }
      this.updateDisplayedColumns()
      if (this.selectedTab === 'download') {
        this.loadDownloadReports()
        this.loadStatusCounts()
      } else {
        this.loadSurveys()
      }
    })
  }

  initializeForm(): void {
    const formConfig: any = {
      searchText: [''],
      startDate: [''],
      endDate: [''],
      status: ['All Status']
    }

    if (this.isSPVRoute) {
      formConfig.mdo = [[]]
    }

    this.filterForm = this.fb.group(formConfig)

    // Re-load surveys when any filter value changes
    // debounceTime prevents rapid successive calls; skip during tab transitions
    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe((values) => {
      const hasStart = !!values.startDate
      const hasEnd = !!values.endDate
      if (hasStart !== hasEnd) {
        return // wait until both dates are selected or both are cleared
      }
      this.hasActiveFilters = this.computeHasActiveFilters()
      if (this.paginator) {
        this.paginator.pageIndex = 0
      }
      this.loadSurveys()
    })
  }

  clearAllFilters(): void {
    this.filterForm.patchValue({
      searchText: '',
      startDate: '',
      endDate: '',
      status: 'All Status',
      ...(this.isSPVRoute ? { mdo: [] } : {})
    })
    this.hasActiveFilters = false
  }

  buildSearchPayload(): any {
    const statusMap: { [key: string]: string } = {
      'active': 'Active',
      'ended': 'Ended',
      'draft': 'Draft',
      'archived': 'Archived'
    }

    const userProfile: any = this.configSvc?.userProfile || ''

    const pageSize = this.paginator?.pageSize || 15
    const pageIndex = this.paginator?.pageIndex || 0

    const payload: any = {
      query: this.filterForm.value.searchText || '',
      filters: {},
      facets: ['status'],
      page: pageIndex,
      size: pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    }

    // Add orgNames facet for SPV route
    if (this.isSPVRoute) {
      payload.facets.push('orgNames')
    }

    // Add status filter based on tab
    if (this.selectedTab === 'all') {
      // On 'all' tab, apply the status dropdown filter if a specific status is selected,
      // otherwise send all three statuses
      const selectedStatus = this.filterForm?.value?.status
      if (selectedStatus && selectedStatus !== 'All Status') {
        payload.filters['status'] = [selectedStatus]
      } else {
        payload.filters['status'] = ['Ended', 'Draft', 'Active', 'Archived']
      }
    } else if (statusMap[this.selectedTab]) {
      payload.filters['status'] = [statusMap[this.selectedTab]]
    }

    // Add date range filters (epoch format in milliseconds)
    const startDate = this.filterForm?.value?.startDate
    const endDate = this.filterForm?.value?.endDate
    if (startDate) {
      payload.filters['startDateFrom'] = new Date(startDate).getTime()
    }
    if (endDate) {
      payload.filters['endDateTo'] = new Date(endDate).getTime()
    }

    // Add orgIds filter for SPV route
    if (this.isSPVRoute) {
      const selectedMdos = this.filterForm?.value?.mdo || []
      const mdoOrgIds = Array.isArray(selectedMdos) ? selectedMdos.map((mdo: any) => mdo.orgId).filter((id: string) => id) : []

      if (mdoOrgIds.length > 0) {
        payload.filters['orgIds'] = mdoOrgIds
      } else {
        payload.filters['orgIds'] = [
          userProfile?.rootOrgId || '',
        ]
      }
    }

    return payload
  }

  loadSurveys(): void {
    if (this.selectedTab === 'download') {
      return
    }

    this.isLoading = true
    const payload = this.buildSearchPayload()
    if (this.loaderService) {
      this.loaderService.changeLoaderState(true)
    }
    this.peerValidationService.searchPeerValidations(payload).subscribe({
      next: (response: any) => {
        this.isLoading = false
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        const records = response?.result?.response || response?.result?.data || response?.result || []
        const list: any[] = Array.isArray(records) ? records : records?.content || []

        this.allSurveys = list.map((item: any) => this.mapToSurvey(item))
        this.dataSource = new MatTableDataSource(this.allSurveys)
        this.totalCount = response?.result?.response?.count || response?.result?.count || this.allSurveys.length
        // Load status counts for the facet display not to be removed as it is required to show the count in the tabs.
        this.loadStatusCounts()
      },
      error: (error: any) => {
        this.isLoading = false
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        console.error('Error loading surveys:', error)
        this.allSurveys = []
        this.dataSource = new MatTableDataSource([])
      }
    })
  }

  loadDownloadReports(): void {
    this.isLoading = true
    if (this.loaderService) {
      this.loaderService.changeLoaderState(true)
    }

    this.peerValidationService.downloadList().subscribe({
      next: (response: any) => {
        this.isLoading = false
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }

        const records = response?.result?.response || response?.result?.data || response?.result || response || []
        const list: any[] = Array.isArray(records) ? records : records?.content || []
        this.downloadReports = list.map((item: any, index: number) => this.mapToDownloadReport(item, index))
        this.refreshDownloadReports()
      },
      error: (error: any) => {
        this.isLoading = false
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        console.error('Error loading download reports:', error)
        this.downloadReports = []
        this.refreshDownloadReports()
      }
    })
  }

  mapToDownloadReport(item: any, index: number): DownloadReport {
    const rawStatus = item?.downloadStatus || item?.status || item?.reportStatus || ''
    const normalizedStatus: 'In Progress' | 'Ready' =
      ['ready', 'completed', 'success', 'done'].includes(String(rawStatus).toLowerCase()) ? 'Ready' : 'In Progress'

    const generatedAtRaw = item?.generatedAt || item?.createdOn || item?.createdDate || item?.updatedOn
    const generatedAtParsed = typeof generatedAtRaw === 'number' ? generatedAtRaw : Date.parse(generatedAtRaw)
    const generatedAt = Number.isNaN(generatedAtParsed) ? 0 : generatedAtParsed

    const requestedOnRaw = item?.dateCreatedOn || item?.createdOn || item?.createdDate
    let requestedOn = ''
    if (requestedOnRaw) {
      const d = new Date(requestedOnRaw)
      if (!Number.isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0')
        const month = d.toLocaleString('en-US', { month: 'short' })
        const year = d.getFullYear()
        let hours = d.getHours()
        const minutes = String(d.getMinutes()).padStart(2, '0')
        const ampm = hours >= 12 ? 'PM' : 'AM'
        hours = hours % 12 || 12
        requestedOn = `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`
      }
    }

    return {
      id: String(item?.id || item?.reportId || item?.formid || index),
      formid: String(item?.formid || item?.id || ''),
      formtitle: item?.formtitle || item?.formName || item?.title || '',
      orgname: item?.orgname || item?.orgName || item?.organization || '',
      downloadStatus: normalizedStatus,
      fileName: item?.fileName || item?.name || '',
      generatedAt,
      requestedOn,
      fileUrl: item?.fileUrl || item?.downloadUrl || '',
      thumbnail: item?.thumbnail || item?.courseThumbnail || item?.image || ''
    }
  }

  refreshDownloadReports(): void {
    this.downloadTotalCount = this.downloadReports.length
  }

  loadStatusCounts(): void {
    const userProfile: any = this.configSvc?.userProfile || ''
    const payload: any = {
      query: this.filterForm.value.searchText || '',
      filters: { status: ['Ended', 'Draft', 'Active', 'Archived'] },
      facets: ['status'],
      page: 0,
      size: 0,
      sortBy: 'createdDate',
      sortOrder: 'DESC'
    }

    if (this.isSPVRoute) {
      payload.filters['orgIds'] = [
        userProfile?.rootOrgId || '',
      ]
      // Add orgNames facet for SPV route to extract MDO list
      payload.facets.push('orgNames')
    }

    if (this.loaderService) {
      this.loaderService.changeLoaderState(true)
    }

    this.peerValidationService.searchPeerValidations(payload).subscribe({
      next: (response: any) => {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        const statusFacets = response?.result?.response?.facets?.status || {}
        this.activeCount = statusFacets['Active'] || 0
        this.endedCount = statusFacets['Ended'] || 0
        this.draftCount = statusFacets['Draft'] || 0
        this.archivedCount = statusFacets['Archived'] || 0
        this.allCount = Object.values(statusFacets as Record<string, number>).reduce((sum: number, val: number) => sum + val, 0) || response?.result?.response?.count || 0

        // Extract MDO list from facets.orgNames for SPV route (only populate once)
        if (this.isSPVRoute && this.mdoOptions.length === 0) {
          const orgNamesFacets = response?.result?.response?.facets?.orgNames || []
          if (orgNamesFacets && orgNamesFacets.length > 0) {
            this.mdoOptions = orgNamesFacets.map((org: any) => ({
              orgName: org.orgName,
              orgId: org.orgId,
              count: org.count
            } as MDOOption))
          }
        }
      },
      error: () => {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
      }
    })
  }

  mapToSurvey(item: any): Survey {
    return {
      id: item.id || item.formId || '',
      formId: item.formId || '',
      courseName: item.title || '',
      thumbnail: item.additionalProperties?.thumbnail || '',
      organisation: item.createdFor?.[0]?.orgName || item.organisation || item.createdByName || '',
      createdBy: item.createdBy || '',
      status: item.status || 'Draft',
      startDate: item.createdDate ? new Date(item.createdDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      endDate: item.endDate ? new Date(item.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      archiveDate: item.archivedDate ? new Date(item.archivedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      submissionRate: item.additionalProperties?.submissionRate || '0%',
      submissionCount: item.additionalProperties?.submissionCount || 0,
      totalCount: item.additionalProperties?.notificationReadCount || 0
    }
  }

  ngAfterViewInit(): void {
    this.refreshDownloadReports()
  }

  filterByTab(): void {
    this.loadSurveys()
  }

  toggleSort(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC'
    } else {
      this.sortBy = field
      this.sortOrder = 'ASC'
    }
    if (this.paginator) {
      this.paginator.pageIndex = 0
    }
    this.loadSurveys()
  }

  updateDisplayedColumns(): void {
    if (this.selectedTab === 'archived') {
      this.displayedColumns = ['courseName', 'startDate', 'endDate', 'archiveDate', 'submissionRate']
    } else if (this.isSPVRoute) {
      this.displayedColumns = ['courseName', 'organisation', 'startDate', 'endDate', 'submissionRate', 'actions']
    } else {
      this.displayedColumns = ['courseName', 'status', 'startDate', 'endDate', 'submissionRate', 'actions']
    }
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index

    const tabNames: Array<'all' | 'active' | 'ended' | 'draft' | 'archived' | 'download'> = ['all', 'active', 'ended', 'draft', 'archived', 'download']
    this.selectedTab = tabNames[index] || 'all'

    this.updateDisplayedColumns()

    if (this.paginator) {
      this.paginator.pageIndex = 0
    }

    if (this.selectedTab !== 'download') {
      if (this.paginator) {
        this.paginator.pageSize = 15
      }
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: this.selectedTab },
      queryParamsHandling: 'merge'
    })
  }

  onPaginatorChange(): void {
    this.loadSurveys()
  }

  onSearch(): void {
    this.loadSurveys()
  }

  createNewSurvey(): void {
    this.router.navigate(['/app/home/peer-validation/new'])
  }

  editSurvey(survey: Survey): void {
    this.router.navigate(['/app/home/peer-validation/edit', survey.formId || survey.id])
  }

  endSurvey(survey: Survey): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: {
        title: 'End Survey',
        description: `Are you sure you want to end the survey?`,
        messages: [{ message: `If you end this survey now, learner will not be able to complete the survey.` }],
        iconName: 'warning',
        type: 'warning',
        buttonsPositionClass: 'justify-center',
        buttons: [
          { text: 'No', classes: 'btn-out-line', response: false },
          { text: 'Yes', classes: 'succes-button', response: true }
        ]
      },
      autoFocus: false
    })

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(true)
        }
        this.peerValidationService.endForm(survey.formId || survey.id).subscribe({
          next: () => {
            setTimeout(() => {
              this.loadSurveys()
            }, 2000)
          },
          error: (err: any) => {
            if (this.loaderService) {
              this.loaderService.changeLoaderState(false)
            }
            console.error('Error ending survey:', err)
          }
        })
      }
    })
  }

  archiveSurvey(survey: Survey): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: {
        title: 'Archive Survey',
        description: `Are you sure you want to archive this survey?`,
        iconName: 'warning',
        type: 'warning',
        buttonsPositionClass: 'justify-center',
        buttons: [
          { text: 'No', classes: 'btn-out-line', response: false },
          { text: 'Yes', classes: 'succes-button', response: true }
        ]
      },
      autoFocus: false
    })

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(true)
        }
        this.peerValidationService.archiveForm(survey.formId || survey.id).subscribe({
          next: () => {
            setTimeout(() => {
              this.loadSurveys()
            }, 2000)
          },
          error: (err: any) => {
            if (this.loaderService) {
              this.loaderService.changeLoaderState(false)
            }
            console.error('Error archiving survey:', err)
          }
        })
      }
    })
  }

  downloadExcel(survey: Survey): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: {
        title: 'Download CSV',
        description: 'Your file will be ready to download in the downloadable reports tab. Please wait for some time.',
        iconName: 'info',
        type: 'info',
        buttonsPositionClass: 'justify-center',
        buttons: [
          { text: 'OK', classes: 'succes-button', response: true }
        ]
      },
      autoFocus: false
    })

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(true)
        }

        this.peerValidationService.initDownloadReport(survey.formId || survey.id).subscribe({
          next: () => {
            setTimeout(() => {
              if (this.loaderService) {
                this.loaderService.changeLoaderState(false)
              }
              this.onTabChange(5)
            }, 2000)
          },
          error: (err: any) => {
            if (this.loaderService) {
              this.loaderService.changeLoaderState(false)
            }
            console.error('Error initiating download report:', err)
          }
        })
      }
    })
  }

  triggerReportDownload(report: DownloadReport): void {
    if (report.downloadStatus !== 'Ready') {
      return
    }

    if (this.loaderService) {
      this.loaderService.changeLoaderState(true)
    }

    this.peerValidationService.downloadReport({ formId: report.formid, fileName: report.fileName }).subscribe({
      next: (csvData: string) => {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', report.fileName || 'report.csv')
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      },
      error: (err: any) => {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        console.error('Error downloading report:', err)
      }
    })
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Active':
        return 'status-active'
      case 'Draft':
        return 'status-draft'
      case 'Ended':
        return 'status-ended'
      case 'Archived':
        return 'status-archived'
      default:
        return ''
    }
  }
}
