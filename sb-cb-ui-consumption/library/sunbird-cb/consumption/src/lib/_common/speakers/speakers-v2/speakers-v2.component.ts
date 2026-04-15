import { Component, EventEmitter, Injector, Input, OnInit, Output, QueryList, ViewChildren } from '@angular/core'
import { Router } from '@angular/router'
import { ScrollableItemDirective } from '../../../_directives/scrollable-item/scrollable-item.directive';

@Component({
  selector: 'sb-uic-speakers-v2',
  templateUrl: './speakers-v2.component.html',
  styleUrls: ['./speakers-v2.component.scss']
})
export class SpeakersV2Component  implements OnInit {
  @Input() objectData: any
  @Input() isEdit: boolean = false;
  @Input() isEditable: boolean = false;
  @Output() editClicked = new EventEmitter<any>();

  currentIndex = 0
  contentdata: any = []
  styleData: any = {}
  expand: boolean = true

  // Will store the event callback function from the parent
  private eventCallback: Function | undefined

  @ViewChildren(ScrollableItemDirective) scrollableItems: QueryList<ScrollableItemDirective>

  constructor(
    private route: Router,
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
    // Handle both direct structure and nested structure with data
    const speakerData = this.objectData?.speakerOftheDay?.data || this.objectData?.data || this.objectData

    // Set styleData if available
    this.styleData = speakerData?.sliderData?.styleData || {}

    // Process speaker list
    this.contentdata = []
    const speakerList = speakerData?.list || []

    if (speakerList.length > 0) {
      speakerList.forEach((contentEle: any) => {
        let localData: any = {}
        localData['cardSubType'] = "card-wide-lib"
        localData['speakerDesignation'] = contentEle.speakerDesignation
        localData['thumbnail'] = contentEle.thumbnail || ''
        localData['identifier'] = contentEle.identifier || ''
        localData['eventTitle'] = contentEle.eventTitle || ''
        localData['speakerName'] = contentEle.speakerName || ''
        this.contentdata.push(localData)
      })
    }

    // Clear any additional event callbacks that might be causing duplicate modals
    if (!this.eventCallback) {
      try {
        this.eventCallback = this.injector.get('eventCallback')
      } catch (e) {
        // No eventCallback in injector
      }
    }
  }

  getCurrentIndex(indexValue: any) {
    this.currentIndex = indexValue
  }

  toggleWeekHightlits() {
    this.expand = !this.expand
  }

  goToEvent(eventData: any) {
    if (eventData && eventData.identifier) {
      this.route.navigateByUrl(`/app/event-hub/home/${eventData.identifier}`)
    }
  }

  // Helper method to get title text with fallback
  getTitleText(): string {
    const title = this.objectData?.speakerOftheDay?.data?.title ||
      this.objectData?.data?.title ||
      this.objectData?.title

    // Return title if it exists and is not empty, otherwise use default
    return title && title.trim() !== '' ? title : 'Speaker of the day'
  }

  /**
   * Handle edit button click
   * Emits an event to be handled by parent component (mdo-channel-v3)
   */
  onEdit() {
    // Extract data for editing - handle both structures and ensure we're sending complete data
    const speakerData = this.objectData?.speakerOftheDay || this.objectData

    // Check if we have the original list in the data
    if (!speakerData.data || !speakerData.data.list || speakerData.data.list.length === 0) {
      // If the list is missing or empty, but we have contentdata, reconstruct the list
      if (this.contentdata && this.contentdata.length > 0) {
        // Create a properly formatted data structure if it's missing
        if (!speakerData.data) {
          speakerData.data = {
            title: '',
            infoText: '',
            list: []
          }
        } else if (!speakerData.data.list) {
          speakerData.data.list = []
        }

        // Reconstruct the speaker list from contentdata
        speakerData.data.list = this.contentdata.map(item => ({
          title: item.name,
          description: item.description,
          profileImage: item.profileImage,
          identifier: item.identifier
        }))
      }
    }

    const eventData = {
      source: 'speakers',
      action: 'edit',
      data: {
        fieldName: 'speakersConfig',
        displayName: 'Speaker of the day Configuration',
        value: speakerData,
        fieldType: 'speakersConfig'
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
