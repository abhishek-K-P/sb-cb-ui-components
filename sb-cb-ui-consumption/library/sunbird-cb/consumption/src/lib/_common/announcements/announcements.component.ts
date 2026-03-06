import { Component, EventEmitter, Input, OnInit, Output, Injector } from '@angular/core'
import { InsiteDataService } from '../../_services/insite-data.service'
import { MultilingualTranslationsService } from '../../_services/multilingual-translations.service'

@Component({
  selector: 'sb-uic-announcements',
  templateUrl: './announcements.component.html',
  styleUrls: ['./announcements.component.scss']
})
export class AnnouncementsComponent implements OnInit {

  @Input() objectData: any
  @Input() layoutType: any
  @Input() mobileHeight: boolean = false
  @Input() fetchDataFromApi: boolean = false
  @Input() channelId: any
  @Input() isEdit: boolean = false;
  @Input() isEditable: boolean = false;
  @Output() openDialog = new EventEmitter<any>()
  @Output() editClicked = new EventEmitter<any>();
  isLoading: boolean = false
  announcements: any = []
  expand = false
  expanded: boolean = false

  // Will store the event callback function from the parent
  private eventCallback: Function | undefined

  constructor(
    public insightSvc: InsiteDataService,
    private langtranslations: MultilingualTranslationsService,
    private injector: Injector
  ) {
    try {
      // Get values from injector
      const isEditInput = this.injector.get('isEdit', false)
      const isEditableInput = this.injector.get('isEditable', false)
      const eventCallbackInput = this.injector.get('eventCallback', null)

      // Set edit flags from injector
      if (typeof isEditInput === 'boolean') {
        this.isEdit = isEditInput
      }
      if (typeof isEditableInput === 'boolean') {
        this.isEditable = isEditableInput
      }

      // Store the event callback function
      if (eventCallbackInput && typeof eventCallbackInput === 'function') {
        this.eventCallback = eventCallbackInput
      }
    } catch (e) {
      console.error('Error getting values from injector', e)
    }
  }

  ngOnInit() {
    if(!this.objectData) this.objectData = {}
    if (this.fetchDataFromApi) {
      this.isLoading = true
      this.fetchData()
    }
  }

  fetchData() {
    let request = {
      filterCriteriaMap: {
        channel: [this.channelId],
        status: 'Active'
        //channel: ["01381906916850892825"],
      },
      requestedFields: [
        "name",
        "description",
        "createdOn",
        "updatedOn",
        "category",
        "announcementId"
      ],
      orderBy: "createdOn",
      orderDirection: "ASC",
      facets: [
        "channel"
      ],
      pageSize: this.objectData?.pageSize || 15
    }
    this.insightSvc.fetchAnnouncementsData(request).subscribe((res: any) => {
      if (res && res.result && res.result.data) {
        res.result.data.forEach((resp: any) => {
          this.announcements.push({
            description: resp.description,
            expanded: false,
            announcementId: resp.announcementId,
            name: resp.name,
            category: resp.category,
          })
        })
      }
      if (this.announcements.length > 3) {
        this.expand = true
      }
      this.objectData.list = this.announcements
      this.isLoading = false
    }, _error => {
      this.objectData.list = []
      this.isLoading = false
    })
  }

  viewMoreOrLess(item: any) {
    if (item.value.length > 152) {
      item.expanded = !item.expanded
    }
  }

  openAnnouncements() {
    this.openDialog.emit(true)
  }

  showMoreOrLess() {
    this.expanded = !this.expanded
  }

  translateLabels(label: string, type: any) {
    return this.langtranslations.translateLabel(label, type, '')
  }

  /**
   * Handle edit button click
   * Emits an event to be handled by parent component (mdo-channel-v3)
   */
  onEdit() {
    const eventData = {
      source: 'announcements',
      action: 'edit',
      data: {
        fieldName: 'announcementsConfig',
        displayName: 'Announcements Configuration',
        value: this.objectData,
        fieldType: 'announcementsConfig'
      }
    }
    // Use only the callback from injector which is the most reliable method
    if (this.eventCallback && typeof this.eventCallback === 'function') {
      this.eventCallback(eventData)
      return
    }

    // Fallback to global injector if direct callback isn't available
    if ((window as any).__INJECTOR_DATA?.eventCallback) {
      (window as any).__INJECTOR_DATA.eventCallback(eventData)
    }
  }

}
