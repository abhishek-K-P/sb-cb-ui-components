import { Component, Input, OnChanges, Output, EventEmitter, inject } from '@angular/core'
import { Router } from '@angular/router'
import { EventService, UtilityService, WsEvents } from '@sunbird-cb/utils-v2'
import { TranslateModule } from '@ngx-translate/core'

@Component({
  selector: 'sb-uic-in-progress-card-v2',
  templateUrl: './in-progress-card-v2.component.html',
  styleUrls: ['./in-progress-card-v2.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class InProgressCardV2Component implements OnChanges {
  @Input() course: any = null
  @Input() isLoading = true
  @Input() showHeader = true
  @Input() showViewAll = true
  @Output() resumed = new EventEmitter<void>()
  /** Navigation + telemetry for "View All" stay with the parent, which owns the section */
  @Output() viewAllClicked = new EventEmitter<void>()

  private readonly router = inject(Router)
  private readonly eventSvc = inject(EventService)
  private readonly utilitySvc = inject(UtilityService)

  readonly circumference = 2 * Math.PI * 30  // r=30 → ~188.5

  progressPercent = 0
  courseName = ''
  courseOrg = ''
  courseId = ''
  isRetired = false

  ngOnChanges() {
    if (this.course) {
      // contentTemp = c.content with extra fields; contentTemp.content = c.content
      const content = this.course.content || this.course
      this.progressPercent = Math.round(this.course.completionPercentage || this.course.progress || 0)
      this.courseName = content.name || content.courseName || ''
      this.courseOrg = (content.organisation && content.organisation[0]) || ''
      // External (CIOS) enrolments carry contentId ('ext_...') and no identifier, so identifier
      // alone leaves courseId empty and Resume silently no-ops
      this.courseId = content.identifier || content.contentId || this.course.courseId || ''
      this.isRetired = (content.status || '').toLowerCase() === 'retired'
    }
  }

  onViewAll() {
    this.viewAllClicked.emit()
  }

  get strokeDashoffset(): number {
    return this.circumference - (this.circumference * this.progressPercent / 100)
  }

  resume() {
    this.utilitySvc.setRouteData([{ module: WsEvents.EnumTelemetrymodules.HOME, pageId: 'page/home' }])
    this.eventSvc.raiseInteractTelemetry(
      {
        type: WsEvents.EnumInteractTypes.CLICK,
        subType: 'resume-content-popup-home',
        id: 'resume-learning',
      },
      {
        id: this.courseId,
        type: this.course?.primaryCategory || 'Course',
      },
      {
        module: WsEvents.EnumTelemetrymodules.HOME,
      }
    )
    this.navigate()
  }

  private navigate(): void {
    const id = this.courseId
    if (!id) { return }

    // External content (partner-hosted)
    if (id.startsWith('ext_')) {
      this.router.navigateByUrl(`/app/toc/ext/${id}`)
      return
    }

    // Event / Offline Session → event-hub
    const content = this.course?.content || this.course
    const category = content?.primaryCategory || ''
    if (category === 'Offline Session') {
      this.router.navigate([`/app/event-hub/home/${id}`])
      return
    }

    // Course, Program, Blended Program, Curated Program,
    // Standalone Assessment, and all other do_ identifiers → TOC
    this.router.navigate(['/app/toc', id, 'overview'])
  }
}
