import { Component, Input, Output, OnInit, EventEmitter, ViewChild } from '@angular/core'
import { MatStepper } from '@angular/material/stepper'
import { AssessmentService } from '../../service/assessment.service'
import { map, switchMap } from 'rxjs/operators'
import { MatSnackBar } from '@angular/material/snack-bar'
import { AssessmentSessionsComponent } from '../assessment-sessions/assessment-sessions.component'
import { NsAssessment } from '../../service/assessment.model'

@Component({
  selector: 'sb-uic-assessment-main',
  templateUrl: './assessment-main.component.html',
  styleUrls: ['./assessment-main.component.scss'],
  standalone: false
})
export class AssessmentMainComponent implements OnInit {

  @Input() config: any
  @Output() loader = new EventEmitter<any>()
  @Output() assessmentSaved = new EventEmitter<string>()
  @Output() assessmentUpdated = new EventEmitter<{ identifier: string, name: string }>()
  @ViewChild('stepper') stepper!: MatStepper
  @ViewChild(AssessmentSessionsComponent) sessionsComponent!: AssessmentSessionsComponent

  isStepTwoEnabled = false
  isAssessmentLoaded = false

  constructor(
    private assessmentService: AssessmentService,
    private snackBar: MatSnackBar,
  ) { }

  ngOnInit(): void {
    if (this.config && this.config.identifier === '' && this.config?.primaryCategory === '') {
      this.config.primaryCategory = NsAssessment.EAssessmentPrimaryCategory.FINAL_ASSESSMENT
    }
    this.assessmentService.setReadOnly(this.config?.isReadOnly)
    this.assessmentService.setPrimaryCategory(this.config?.primaryCategory)
    this.assessmentService.setContextCategory(this.config?.contextCategory)
    if (this.config && this.config.identifier !== '') {
      this.callLoader(true)
      this.assessmentService.getAssessmentHierarchyDetailsModeEdit(this.config.identifier).subscribe({
        next: (data: any) => {
          this.enableStepTwo()
          this.callLoader(false)
          this.isAssessmentLoaded = true
          this.config.primaryCategory = data.primaryCategory || NsAssessment.EAssessmentPrimaryCategory.FINAL_ASSESSMENT
          this.config.contextCategory = data.contextCategory || ''
          // Use setTimeout to ensure ViewChild is available
          setTimeout(() => {
            if (this.stepper) {
              this.stepper.next()
            }
          }, 0)
        },
        error: (error: any) => {
          console.error('Error loading assessment', error)
          this.snackBar.open('Error loading assessment. Please try again.', '', { duration: 5000 })
          this.callLoader(false)
          this.isAssessmentLoaded = true
        }
      })
    } else {
      this.isAssessmentLoaded = true
    }
  }

  enableStepTwo(): void {
    this.isStepTwoEnabled = true
  }

  callLoader(show: boolean): void {
    this.loader.emit(show)
  }

  saveAssessment(event: any) {
    const { children, ...assessmentDataWithoutChildren } = event
    const reqBody = {
      request: {
        questionset: {
          ...assessmentDataWithoutChildren
        }
      }
    }
    this.callLoader(true)
    if (this.config && this.config.identifier === '') {
      this.assessmentService.createAssessment(reqBody).pipe(
        switchMap((createResp: any) => {
          if (children && children.length > 0) {
            const hierarchyReq = this.assessmentService.createAssessmentHierarchyRequest(event, createResp.result.identifier)
            return this.assessmentService.updateAssessment(hierarchyReq).pipe(
              switchMap((hierarchyResp: any) => {
                return this.assessmentService.getAssessmentHierarchyDetailsModeEdit(createResp.result.identifier).pipe(
                  map((readResp: any) => {
                    return ({ createResp, hierarchyResp, readResp })
                  })
                )
              })
            )
          } else {
            // For basic assessments (no children initially), still use hierarchy endpoint
            return this.assessmentService.getAssessmentHierarchyDetailsModeEdit(createResp.result.identifier).pipe(
              map((readResp: any) => {
                return ({ createResp, readResp })
              })
            )
          }
        })
      ).subscribe({
        next: (resp: any) => {
          this.snackBar.open('Assessment created successfully')
          this.enableStepTwo()
          setTimeout(() => {
            if (this.stepper) {
              this.stepper.next()
            }
            // Reload sessions component data to get the created assessment
            if (this.sessionsComponent) {
              this.sessionsComponent.reloadAssessmentData()
            }
          }, 500)
          // Emit the assessment identifier to parent
          this.assessmentSaved.emit(resp.createResp.result.identifier)
          this.callLoader(false)
        },
        error: (error: any) => {
          console.error('Error creating assessment', error)
          this.snackBar.open('Error creating assessment. Please try again.')
          this.callLoader(false)
        }
      })
    }
  }

  updateAssessment(event: any) {
    if (event && event.identifier) {
      const getAssessmentHierarchy = this.assessmentService.updateAssessmentHierarchyRequest(event.changedData, event.identifier, event.parentChanges)
      this.callLoader(true)
      this.assessmentService.updateAssessment(getAssessmentHierarchy).pipe(
        switchMap((updateResp: any) => {
          return this.assessmentService.getAssessmentHierarchyDetailsModeEdit(event.identifier).pipe(
            map((readResp: any) => {
              return ({ updateResp, readResp })
            })
          )
        })
      ).subscribe({
        next: (resp: any) => {
          this.snackBar.open('Assessment updated successfully')
          // Latest hierarchy is read; let the host refresh the title it lists for this assessment
          this.assessmentUpdated.emit({
            identifier: event.identifier,
            name: resp.readResp && resp.readResp.name ? resp.readResp.name : (event.changedData && event.changedData.name),
          })
          this.enableStepTwo()
          if (this.stepper) {
            this.stepper.next()
          }
          this.callLoader(false)
        },
        error: (error: any) => {
          console.error('Error updating assessment', error)
          this.snackBar.open('Error updating assessment. Please try again.')
          this.callLoader(false)
        }
      })
    }
  }

  saveSectionData(event: any): void {
    if (event) {
      // Extract sectionData and sectionIdentifier from event
      let sectionData = event.sectionData || event
      const sectionIdentifier = event.sectionIdentifier

      if (event.parentChanges && !sectionData.parentChanges) {
        sectionData = {
          ...sectionData,
          parentChanges: event.parentChanges
        }
      }
      // Use service method to build the hierarchy request
      // Pass sectionIdentifier if it exists (for updates), otherwise undefined (for create)
      const sectionHierarchyRequest = this.assessmentService.buildSectionHierarchyRequest(
        sectionData,
        sectionIdentifier
      )

      this.callLoader(true)
      this.assessmentService.updateAssessment(sectionHierarchyRequest).pipe(
        switchMap((updateResp: any) => {
          return this.assessmentService.getAssessmentHierarchyDetailsModeEdit(this.config.identifier).pipe(
            map((readResp: any) => {
              return ({ updateResp, readResp })
            })
          )
        })
      ).subscribe({
        next: (resp: any) => {
          this.snackBar.open('Section saved successfully')
          this.callLoader(false)
          // Reload sessions component data to get updated section
          if (this.sessionsComponent) {
            this.sessionsComponent.reloadAssessmentData()
          }
        },
        error: (error: any) => {
          this.snackBar.open('Error saving section. Please try again.')
          this.callLoader(false)
        }
      })
    } else {
      this.snackBar.open('Invalid section data for save')
    }
  }

  updateSectionData(event: any): void {
    if (event && event.sectionIdentifier && event.changedData) {
      const getSectionHierarchy = this.assessmentService.updateAssessmentHierarchyRequest(event.changedData, event.sectionIdentifier, event.parentChanges)
      this.callLoader(true)
      this.assessmentService.updateAssessment(getSectionHierarchy).pipe(
        switchMap((updateResp: any) => {
          return this.assessmentService.getAssessmentHierarchyDetailsModeEdit(this.config.identifier).pipe(
            map((readResp: any) => {
              return ({ updateResp, readResp })
            })
          )
        })
      ).subscribe({
        next: (resp: any) => {
          this.snackBar.open('Section updated successfully')
          this.callLoader(false)
        },
        error: (error: any) => {
          this.snackBar.open('Error updating section. Please try again.')
          this.callLoader(false)
        }
      })
    }
  }

  updateQuestionData(event: any): void {
    if (!event || !event.sectionIdentifier) {
      return
    }

    // Check if this is a delete operation
    if (event.isDelete && event.questionIdentifier) {
      // Handle question deletion
      const sectionIdentifier = event.sectionIdentifier
      const questionIdentifier = event.questionIdentifier

      // Build hierarchy request to remove question from section
      const deleteQuestionReq = this.assessmentService.deleteQuestionHierarchyRequest(questionIdentifier, sectionIdentifier)

      this.callLoader(true)
      this.assessmentService.updateAssessment(deleteQuestionReq).pipe(
        switchMap((updateResp: any) => {
          return this.assessmentService.getAssessmentHierarchyDetailsModeEdit(this.config.identifier).pipe(
            map((readResp: any) => {
              return ({ updateResp, readResp })
            })
          )
        })
      ).subscribe({
        next: (resp: any) => {
          this.snackBar.open('Question deleted successfully')
          this.callLoader(false)
          // Reload sessions component data to get updated question list
          if (this.sessionsComponent) {
            this.sessionsComponent.reloadAssessmentData()
          }
        },
        error: (error: any) => {
          console.error('Error deleting question', error)
          this.snackBar.open('Error deleting question. Please try again.')
          this.callLoader(false)
        }
      })
    } else if (event.changedData) {
      // Handle question create/update (single or bulk)
      const changedData = event.changedData
      const sectionIdentifier = event.sectionIdentifier
      let questionData: any

      // Check if changedData is an array (bulk upload) or single question object
      if (Array.isArray(changedData)) {
        // Convert array of questions to the expected object format
        questionData = {}
        const isOldTemplate = event.isOldTemplate || false

        changedData.forEach((question: any) => {
          const questionUUID = question.identifier

          // For new template, exclude identifier from metadata
          // For old template, include identifier in metadata
          const { identifier, ...questionWithoutId } = question
          const metadata = isOldTemplate ? question : questionWithoutId

          questionData[questionUUID] = {
            isNew: true,
            root: false,
            objectType: 'Question',
            metadata: metadata
          }
        })
      } else {
        // Single question update
        questionData = changedData
      }

      // Use service method to build the hierarchy request
      const questionHierarchyRequest = this.assessmentService.buildQuestionHierarchyRequest(
        questionData,
        sectionIdentifier
      )

      this.callLoader(true)
      this.assessmentService.updateAssessment(questionHierarchyRequest).pipe(
        switchMap((updateResp: any) => {
          return this.assessmentService.getAssessmentHierarchyDetailsModeEdit(this.config.identifier).pipe(
            map((readResp: any) => {
              return ({ updateResp, readResp })
            })
          )
        })
      ).subscribe({
        next: (resp: any) => {
          const message = Array.isArray(changedData)
            ? `${changedData.length} questions saved successfully`
            : 'Question saved successfully'
          this.snackBar.open(message)
          this.callLoader(false)
          // Reload sessions component data to get updated question list with identifiers
          if (this.sessionsComponent) {
            this.sessionsComponent.reloadAssessmentData()
          }
        },
        error: (error: any) => {
          console.error('Error updating question(s)', error)
          this.snackBar.open('Error saving question(s). Please try again.')
          this.callLoader(false)
        }
      })
    }
  }
}
