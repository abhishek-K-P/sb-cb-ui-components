import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef, Inject } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Location } from '@angular/common'
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar'
import { delay, switchMap } from 'rxjs/operators'
import { of } from 'rxjs'
import { PvConfigStepComponent } from '../pv-config-step/pv-config-step.component'
import { HorizontalDynamicStepperComponent } from '../../../horizontal-dynamic-stepper/horizontal-dynamic-stepper.component'
import { PeerValidationService } from '../../service/peer-validation.service'
import { LOADER_SERVICE, ILoaderService } from '../../service/loader-service.token'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'

@Component({
  selector: 'sb-uic-pv-create',
  templateUrl: './pv-create.component.html',
  styleUrls: ['./pv-create.component.scss']
})
export class PvCreateComponent implements OnInit, AfterViewInit {
  @ViewChild(PvConfigStepComponent) configStepComponent!: PvConfigStepComponent
  @ViewChild(HorizontalDynamicStepperComponent) stepperComponent!: HorizontalDynamicStepperComponent

  stepsLabels = ['Configuration', 'Questions']
  currentStepperIndex = 0
  isNewSurvey = false
  formId: string | null = null
  formData: any = null
  originalSnapshot: any = null

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar,
    private peerValidationService: PeerValidationService,
    private configSvc: ConfigurationsService,
    @Inject(LOADER_SERVICE) private loaderService: ILoaderService
  ) { }

  ngOnInit() {
    // Check for edit route with form id
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.formId = params['id']
        this.isNewSurvey = false
        this.loadFormData(this.formId)
      } else {
        // Detect if this is a new survey from the URL
        const urlSegments = this.router.url.split('/')
        this.isNewSurvey = urlSegments.includes('new')
        // Also check query params
        this.route.queryParams.subscribe(queryParams => {
          if (queryParams['mode'] === 'new') {
            this.isNewSurvey = true
          }
        })
      }
    })
  }

  loadFormData(id: string) {
    if (this.loaderService) {
      this.loaderService.changeLoaderState(true)
    }
    this.peerValidationService.getFormById(id).subscribe({
      next: (response) => {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        // Extract the actual form data from nested response structure
        const data = response?.result?.response || response
        if (!data || !data.formId) {
          this.snackBar.open('No data found.', '', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          })
          if (this.peerValidationService.isSpvRoute) {
            this.router.navigate(['/app/home/spv/peer-validation'], { queryParams: { tab: 'draft' } })
          } else {
            this.router.navigate(['/app/home/peer-validation'], { queryParams: { tab: 'draft' } })
          }
          return
        }
        this.formData = data
        // If the config step component is already available, populate it
        if (this.configStepComponent) {
          this.populateConfigForm()
        }
      },
      error: (error) => {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        console.error('Error loading form data:', error)
        this.snackBar.open('No data found.', '', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        })
        if (this.peerValidationService.isSpvRoute) {
          this.router.navigate(['/app/home/spv/peer-validation'], { queryParams: { tab: 'draft' } })
        } else {
          this.router.navigate(['/app/home/peer-validation'], { queryParams: { tab: 'draft' } })
        }
      }
    })
  }

  refreshFormData(formId: string | null, callback?: () => void): void {
    if (!formId) { return }
    if (this.loaderService) {
      this.loaderService.changeLoaderState(true)
    }
    of(null).pipe(
      delay(1000), // Add a slight delay to ensure backend has processed the update before we fetch
      switchMap(() => this.peerValidationService.getFormById(formId))
    ).subscribe({
      next: (response) => {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        this.formData = response?.result?.response || response
        this.captureSnapshot()
        if (callback) { callback() }
      },
      error: (err) => {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        console.error('Failed to refresh form data:', err)
        if (callback) { callback() }
      }
    })
  }

  populateConfigForm() {
    if (this.configStepComponent && this.formData) {
      // Populate the form with the loaded data
      this.configStepComponent.populateForm(this.formData)
      // Capture snapshot after population so we can detect changes later
      this.captureSnapshot()
    }
  }

  captureSnapshot() {
    const ap = this.formData?.additionalProperties || {}
    this.originalSnapshot = {
      identifier: ap.identifier || '',
      triggerAfter: ap.triggerAfter ?? 30,
      completionLookBack: ap.completionLookBack ?? 90,
      endDate: this.formData?.endDate ? new Date(this.formData.endDate).toISOString() : ''
    }
  }

  hasFormChanged(): boolean {
    if (!this.originalSnapshot) {
      return true
    }
    const formValues = this.configStepComponent?.configForm?.value
    const course = this.configStepComponent?.selectedCourse
    if (!formValues || !course) {
      return false
    }
    const currentEndDate = formValues.endDate ? new Date(formValues.endDate).toISOString() : ''
    const originalEndDate = this.originalSnapshot.endDate
      ? new Date(this.originalSnapshot.endDate).toISOString()
      : ''
    return (
      course.identifier !== this.originalSnapshot.identifier ||
      formValues.minTriggerDays !== this.originalSnapshot.triggerAfter ||
      formValues.maxTriggerDays !== this.originalSnapshot.completionLookBack ||
      currentEndDate !== originalEndDate
    )
  }

  ngAfterViewInit() {
    // If form data was already loaded before the view initialized, populate the form now
    if (this.formData && this.configStepComponent) {
      this.populateConfigForm()
    }
  }

  backToDashboard() {
    // Navigate back to survey dashboard
    if (this.peerValidationService.isSpvRoute) {
      this.router.navigate(['/app/home/spv/peer-validation'], { queryParams: { tab: 'all' } })
    } else {
      this.router.navigate(['/app/home/peer-validation'], { queryParams: { tab: 'all' } })
    }
  }

  onLoaderChange(value: boolean) {
    if (this.loaderService) {
      this.loaderService.changeLoaderState(value)
    }
  }

  saveDraftAndExit() {
    if (this.currentStepperIndex === 0) {
      const selectedCourse = this.configStepComponent?.selectedCourse
      if (!selectedCourse) {
        this.snackBar.open('Please select a content to save to draft', '', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        })
        return
      }

      if (this.loaderService) {
        this.loaderService.changeLoaderState(true)
      }

      // Check if it's edit mode (formId exists) or create mode
      if (this.formId) {
        // Only update if something has changed
        if (!this.hasFormChanged()) {
          if (this.loaderService) {
            this.loaderService.changeLoaderState(false)
          }
          if (this.peerValidationService.isSpvRoute) {
            this.router.navigate(['/app/home/spv/peer-validation'], { queryParams: { tab: 'draft' } })
          } else {
            this.router.navigate(['/app/home/peer-validation'], { queryParams: { tab: 'draft' } })
          }
          return
        }
        // Update existing form
        const payload = this.buildUpdatePayload()
        this.peerValidationService.updateForm(this.formId, payload).subscribe({
          next: () => {
            if (this.loaderService) {
              this.loaderService.changeLoaderState(false)
            }
            this.snackBar.open('Draft updated successfully', '', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            })
            if (this.peerValidationService.isSpvRoute) {
              this.router.navigate(['/app/home/spv/peer-validation'], { queryParams: { tab: 'draft' } })
            } else {
              this.router.navigate(['/app/home/peer-validation'], { queryParams: { tab: 'draft' } })
            }
          },
          error: (error) => {
            if (this.loaderService) {
              this.loaderService.changeLoaderState(false)
            }
            console.error('Error updating draft:', error)
            this.snackBar.open('Failed to update draft. Please try again.', '', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            })
          }
        })
      } else {
        // Create new draft
        const payload = this.buildDraftPayload()
        this.peerValidationService.saveDraft(payload).subscribe({
          next: () => {
            if (this.loaderService) {
              this.loaderService.changeLoaderState(false)
            }
            this.snackBar.open('Draft saved successfully', '', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            })
            if (this.peerValidationService.isSpvRoute) {
              this.router.navigate(['/app/home/spv/peer-validation'], { queryParams: { tab: 'draft' } })
            } else {
              this.router.navigate(['/app/home/peer-validation'], { queryParams: { tab: 'draft' } })
            }
          },
          error: (error) => {
            if (this.loaderService) {
              this.loaderService.changeLoaderState(false)
            }
            console.error('Error saving draft:', error)
            this.snackBar.open(`${error?.error?.params?.errMsg || 'Failed to create draft. Please try again.'}`, '', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            })
          }
        })
      }
    } else {
      if (this.peerValidationService.isSpvRoute) {
        this.router.navigate(['/app/home/spv/peer-validation'], { queryParams: { tab: 'draft' } })
      } else {
        this.router.navigate(['/app/home/peer-validation'], { queryParams: { tab: 'draft' } })
      }
    }
  }

  buildDraftPayload(): any {
    const formData = this.configStepComponent.configForm.value
    const course = this.configStepComponent.selectedCourse
    const userProfile: any = this.configSvc?.userProfile || ''
    const endDate = formData.endDate ? new Date(formData.endDate).toISOString() : ''

    const payload: any = {
      title: course.name || '',
      endDate: endDate,
      clientVersion: 1.1,
      additionalProperties: {
        identifier: course.identifier || '',
        triggerAfter: formData.minTriggerDays,
        completionLookBack: formData.maxTriggerDays,
        thumbnail: course.posterImage || '',
        duration: (course.courseCategory === 'Blended Program') ? String(course.programDuration)
          : (course.duration ? String(course.duration) : '0')
      }
    }

    // Remove empty string fields from additionalProperties
    Object.keys(payload.additionalProperties).forEach(key => {
      if (payload.additionalProperties[key] === '') {
        delete payload.additionalProperties[key]
      }
    })

    // Remove empty string fields from top-level
    Object.keys(payload).forEach(key => {
      if (payload[key] === '') {
        delete payload[key]
      }
    })

    if (this.peerValidationService.isSpvRoute) {
      payload.createdFor = [{
        orgId: userProfile?.rootOrgId || '',
        orgName: userProfile?.departmentName || '',
      }]
    }

    return payload
  }

  buildUpdatePayload(): any {
    if (!this.formData) {
      return this.buildDraftPayload()
    }

    const formValues = this.configStepComponent.configForm.value
    const course = this.configStepComponent.selectedCourse

    const endDate = formValues.endDate ? new Date(formValues.endDate).toISOString() : ''

    // Destructure out fields that must not be sent in the update request
    const { updatedBy, updatedDate, mandatoryFields, meta, ...baseFormData } = this.formData

    // Merge remaining original form data with updated values
    const payload: any = {
      ...baseFormData,
      title: course.name || this.formData.title,
      endDate: endDate,
      additionalProperties: {
        ...this.formData.additionalProperties,
        identifier: course.identifier || this.formData.additionalProperties?.identifier || '',
        triggerAfter: formValues.minTriggerDays,
        completionLookBack: formValues.maxTriggerDays,
        thumbnail: course.posterImage || this.formData.additionalProperties?.thumbnail || '',
        duration: (course.courseCategory === 'Blended Program') ? String(course.programDuration)
          : (course.duration ? String(course.duration) : this.formData.additionalProperties?.duration || '0')
      }
    }

    return payload
  }

  onNext() {
    // Validate current step before proceeding
    if (this.currentStepperIndex === 0) {
      if (!this.configStepComponent || !this.configStepComponent.isFormValid()) {
        // Mark all fields as touched to show inline validation errors
        if (this.configStepComponent && this.configStepComponent.configForm) {
          Object.keys(this.configStepComponent.configForm.controls).forEach(key => {
            this.configStepComponent.configForm.get(key)?.markAsTouched()
          })
        }
        // Show toaster with missing field names
        const missingFields = this.configStepComponent?.getMissingFields() || []
        const message = missingFields.length > 0
          ? `Please fill in the required fields: ${missingFields.join(', ')}`
          : 'Please fill in all required fields'
        this.snackBar.open(message, '', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar']
        })
        return
      }

      // If in edit mode, update the form before proceeding
      if (this.formId) {
        // Only update if something has changed
        if (!this.hasFormChanged()) {
          if (this.currentStepperIndex < this.stepsLabels.length - 1) {
            this.currentStepperIndex++
          }
          return
        }
        if (this.loaderService) {
          this.loaderService.changeLoaderState(true)
        }
        const payload = this.buildUpdatePayload()
        this.peerValidationService.updateForm(this.formId, payload).subscribe({
          next: () => {
            if (this.loaderService) {
              this.loaderService.changeLoaderState(false)
            }
            // Re-fetch updated form data to keep state in sync
            this.refreshFormData(this.formId)
            // Proceed to next step
            if (this.currentStepperIndex < this.stepsLabels.length - 1) {
              this.currentStepperIndex++
            }
          },
          error: (error) => {
            if (this.loaderService) {
              this.loaderService.changeLoaderState(false)
            }
            console.error('Error updating form:', error)
            this.snackBar.open('Failed to update form. Please try again.', '', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            })
          }
        })
        return
      } else {
        // New survey — call saveDraft first, then proceed to questions step
        if (this.loaderService) {
          this.loaderService.changeLoaderState(true)
        }
        const payload = this.buildDraftPayload()
        this.peerValidationService.saveDraft(payload).subscribe({
          next: (response) => {
            // Extract formId from create response: result.response.formId
            const created = response?.result?.response || response
            const newFormId = created?.formId || created?.id || null
            if (!newFormId) {
              if (this.loaderService) { this.loaderService.changeLoaderState(false) }
              this.snackBar.open('Failed to get form ID after save.', '', {
                duration: 3000, horizontalPosition: 'center', verticalPosition: 'bottom', panelClass: ['error-snackbar']
              })
              return
            }
            this.formId = newFormId
            // Read the full form data with the new formId after a delay
            this.refreshFormData(this.formId, () => {
              if (this.loaderService) { this.loaderService.changeLoaderState(false) }
              // Silently update URL to edit/:formId without triggering route.params subscription
              if (this.peerValidationService.isSpvRoute) {
                this.location.replaceState(`/app/home/spv/peer-validation/edit/${this.formId}`)
              } else {
                this.location.replaceState(`/app/home/peer-validation/edit/${this.formId}`)
              }
              this.currentStepperIndex = 1
            })
          },
          error: (error) => {
            if (this.loaderService) {
              this.loaderService.changeLoaderState(false)
            }
            console.error('Error creating draft:', error)
            this.snackBar.open(`${error?.error?.params?.errMsg || 'Failed to create draft. Please try again.'}`, '', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
              panelClass: ['error-snackbar']
            })
            this.currentStepperIndex = 0
            if (this.stepperComponent) {
              this.stepperComponent.goToStep(0)
            }
            this.cdr.detectChanges()
          }
        })
        return
      }
    }

    if (this.currentStepperIndex < this.stepsLabels.length - 1) {
      this.currentStepperIndex++
    }
  }

  onPreviousStepper() {
    if (this.currentStepperIndex > 0) {
      this.currentStepperIndex--
    }
  }

  onStepChanged(index: number) {
    // Navigating forward from configuration step — run the same save/validate logic as Next
    if (this.currentStepperIndex === 0 && index > 0) {
      // If validation fails, revert the MatStepper back to step 0
      // (MatStepper visually advances before this event fires)
      if (!this.configStepComponent || !this.configStepComponent.isFormValid()) {
        setTimeout(() => {
          if (this.stepperComponent) {
            this.stepperComponent.goToStep(0)
          }
          this.cdr.detectChanges()
        }, 0)
      }
      this.onNext()
      return
    }
    // Backward navigation or any other step change — just update index directly
    this.currentStepperIndex = index
  }

  validateConfigurationStep(): boolean {
    // Check if we have the component reference
    if (!this.configStepComponent) {
      console.error('Config Step component reference not found')
      // Revert to step 0
      setTimeout(() => {
        this.currentStepperIndex = 0
        this.cdr.detectChanges()
      }, 0)
      return false
    }

    // Check if form is valid
    if (!this.configStepComponent.isFormValid()) {
      // Mark all fields as touched to show validation errors
      if (this.configStepComponent.configForm) {
        Object.keys(this.configStepComponent.configForm.controls).forEach(key => {
          this.configStepComponent.configForm.get(key)?.markAsTouched()
        })
      }
      // Revert to step 0
      setTimeout(() => {
        this.currentStepperIndex = 0
        this.cdr.detectChanges()
      }, 0)
      return false
    }

    return true
  }

  onFieldRemoved(fieldName: string): void {
    if (!this.formId || !this.formData) {
      return
    }

    const updatedFields = (this.formData.fields || []).filter((f: any) => f.name !== fieldName)
    const { updatedBy, updatedDate, mandatoryFields, meta, ...baseFormData } = this.formData
    const payload = {
      ...baseFormData,
      fields: updatedFields,
      endDate: this.formData.endDate ? new Date(this.formData.endDate).toISOString() : undefined
    }

    if (this.loaderService) {
      this.loaderService.changeLoaderState(true)
    }

    this.peerValidationService.updateForm(this.formId, payload).subscribe({
      next: () => {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        this.snackBar.open('Question removed successfully', '', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        })
        this.refreshFormData(this.formId)
      },
      error: (error) => {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        console.error('Error removing question field:', error)
        this.snackBar.open('Failed to remove question. Please try again.', '', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar']
        })
      }
    })
  }

  onFieldAdded(field: any): void {
    if (!this.formId || !this.formData) {
      return
    }

    // Append the new field to formData.fields
    const updatedFields = [...(this.formData.fields || []), field]
    const { updatedBy, updatedDate, mandatoryFields, meta, ...baseFormData } = this.formData
    const payload = {
      ...baseFormData,
      fields: updatedFields,
      endDate: this.formData.endDate ? new Date(this.formData.endDate).toISOString() : undefined
    }

    if (this.loaderService) {
      this.loaderService.changeLoaderState(true)
    }

    this.peerValidationService.updateForm(this.formId, payload).subscribe({
      next: () => {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        this.snackBar.open('Question saved successfully', '', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        })
        // Re-fetch so formData stays in sync
        this.refreshFormData(this.formId)
      },
      error: (error) => {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        console.error('Error saving question field:', error)
        this.snackBar.open('Failed to save question. Please try again.', '', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar']
        })
      }
    })
  }

  onPublish() {
    if (!this.formId || !this.formData) {
      this.snackBar.open('No form to publish.', '', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      })
      return
    }

    if (this.loaderService) {
      this.loaderService.changeLoaderState(true)
    }

    const { updatedBy, updatedDate, mandatoryFields, meta, ...baseFormData } = this.formData

    this.peerValidationService.publishForm(this.formId).subscribe({
      next: () => {
        this.snackBar.open('Survey published successfully', '', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        })
        setTimeout(() => {
          if (this.loaderService) {
            this.loaderService.changeLoaderState(false)
          }
          if (this.peerValidationService.isSpvRoute) {
            this.router.navigate(['/app/home/spv/peer-validation'], { queryParams: { tab: 'active' } })
          } else {
            this.router.navigate(['/app/home/peer-validation'], { queryParams: { tab: 'active' } })
          }
        }, 2000)
      },
      error: (error) => {
        if (this.loaderService) {
          this.loaderService.changeLoaderState(false)
        }
        console.error('Error publishing form:', error)
        this.snackBar.open('Failed to publish survey. Please try again.', '', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar']
        })
      }
    })
  }

}
