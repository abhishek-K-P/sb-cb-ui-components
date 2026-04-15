import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core'
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms'

interface ParsedField {
  id: string
  order: number
  name: string
  fieldType: 'numericRating' | 'textarea' | string
  isRequired: boolean
  minLabel: string
  maxLabel: string
  values: { key: string; value: string }[]
  notApplicable: boolean
  systemGenerated: boolean
}

interface AdditionalQuestion {
  id: number
  type: 'multiple-mcq' | 'single-mcq' | 'text'
  question: string
  selectionType: string
  isRequired: boolean
  allowNA: boolean
  options: string[]
  fieldName: string
}

@Component({
  selector: 'sb-uic-pv-question-step',
  templateUrl: './pv-question-step.component.html',
  styleUrls: ['./pv-question-step.component.scss']
})
export class PvQuestionStepComponent implements OnInit {
  private _formData: any = null
  private dataInitialized = false

  @Input()
  set formData(value: any) {
    this._formData = value
    if (value) {
      if (!this.dataInitialized) {
        this.parseFormData()
        this.dataInitialized = true
      } else {
        this.refreshSystemFields()
      }
    }
  }
  get formData(): any {
    return this._formData
  }

  @Output() fieldAdded = new EventEmitter<any>()
  @Output() fieldRemoved = new EventEmitter<string>()

  questionForm!: FormGroup
  courseName = ''
  charCounts: { [key: string]: number } = {}
  additionalQuestionCount = 0
  showMcqEditor = false
  currentMcqType: 'multiple-mcq' | 'single-mcq' | 'text' | null = null
  mcqEditorForm!: FormGroup
  savedAdditionalQuestions: AdditionalQuestion[] = []
  nextQuestionId = 1
  systemGeneratedFields: ParsedField[] = []

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.initializeMcqEditorForm()
  }

  // Called only once on initial load to seed everything including savedAdditionalQuestions.
  parseFormData(): void {
    if (!this.formData) {
      return
    }

    this.courseName = this.formData.title || ''

    const fields: ParsedField[] = (this.formData.fields || [])
      .filter((f: any) => f.systemGenerated)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .map((f: any) => ({
        id: f.id || '',
        order: f.order || 0,
        name: f.name || '',
        fieldType: f.fieldType || 'textarea',
        isRequired: f.isRequired || true,
        minLabel: f.minLabel || '',
        maxLabel: f.maxLabel || '',
        values: f.values || [],
        notApplicable: f.notApplicable || false,
        systemGenerated: f.systemGenerated || false
      }))

    this.systemGeneratedFields = fields
    this.buildForm(fields)

    // Seed saved additional questions from existing non-system fields on initial load only
    this.nextQuestionId = 1
    const additionalFields: AdditionalQuestion[] = (this.formData.fields || [])
      .filter((f: any) => !f.systemGenerated)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .map((f: any) => ({
        id: this.nextQuestionId++,
        type: f.fieldType === 'checkbox' ? 'multiple-mcq' : f.fieldType === 'radio' ? 'single-mcq' : 'text',
        question: f.name || '',
        selectionType: f.fieldType === 'checkbox' ? 'multiple-mcq' : f.fieldType === 'radio' ? 'single-mcq' : 'text',
        isRequired: f.isRequired || true,
        allowNA: f.notApplicable || false,
        options: (f.values || []).map((v: any) => v.value),
        fieldName: f.name || ''
      }))

    this.savedAdditionalQuestions = additionalFields
    this.additionalQuestionCount = additionalFields.length
  }

  // Updates only course name and system fields on subsequent formData changes.
  // Does NOT touch savedAdditionalQuestions so optimistic UI state is preserved.
  refreshSystemFields(): void {
    if (!this.formData) {
      return
    }

    this.courseName = this.formData.title || ''

    const fields: ParsedField[] = (this.formData.fields || [])
      .filter((f: any) => f.systemGenerated)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .map((f: any) => ({
        id: f.id || '',
        order: f.order || 0,
        name: f.name || '',
        fieldType: f.fieldType || 'textarea',
        isRequired: f.isRequired || true,
        minLabel: f.minLabel || '',
        maxLabel: f.maxLabel || '',
        values: f.values || [],
        notApplicable: f.notApplicable || false,
        systemGenerated: f.systemGenerated || false
      }))

    this.systemGeneratedFields = fields
    this.buildForm(fields)
  }

  buildForm(fields: ParsedField[]): void {
    const controls: { [key: string]: any } = {}
    fields.forEach(field => {
      const validators = field.isRequired ? [Validators.required] : []
      if (field.fieldType === 'textarea') {
        validators.push(Validators.maxLength(300))
      }
      controls[field.id] = ['', validators]
      this.charCounts[field.id] = 0
    })
    this.questionForm = this.fb.group(controls)
  }

  updateCharCount(fieldId: string, event: any): void {
    this.charCounts[fieldId] = event.target.value.length
  }

  getRatingValues(field: ParsedField): any[] {
    return field.values.length > 0
      ? field.values
      : [{ key: '1', value: '1' }, { key: '2', value: '2' }, { key: '3', value: '3' }, { key: '4', value: '4' }, { key: '5', value: '5' }]
  }

  initializeMcqEditorForm(): void {
    this.mcqEditorForm = this.fb.group({
      question: ['', Validators.required],
      selectionType: ['Multiple selection-MCQs'],
      isRequired: [true],
      allowNA: [false],
      options: this.fb.array([
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required)
      ])
    })
  }

  get mcqOptions(): FormArray {
    return this.mcqEditorForm.get('options') as FormArray
  }

  addOption(): void {
    if (this.mcqOptions.length < 6) {
      this.mcqOptions.push(this.fb.control('', Validators.required))
    }
  }

  removeOption(index: number): void {
    if (this.mcqOptions.length > 2) {
      this.mcqOptions.removeAt(index)
    }
  }

  addQuestionType(type: 'multiple-mcq' | 'single-mcq' | 'text'): void {
    if (this.additionalQuestionCount < 2) {
      this.currentMcqType = type
      this.showMcqEditor = true
      this.initializeMcqEditorForm()
      if (type === 'text') {
        this.mcqEditorForm.patchValue({ selectionType: 'text' })
        // Options not needed for text — clear their validators so form stays valid
        this.mcqOptions.controls.forEach(ctrl => {
          ctrl.clearValidators()
          ctrl.updateValueAndValidity()
        })
      } else {
        this.mcqEditorForm.patchValue({
          selectionType: type === 'multiple-mcq' ? 'multiple-mcq' : 'single-mcq'
        })
      }
      this.mcqEditorForm.get('selectionType')?.disable()
    }
  }

  closeMcqEditor(): void {
    this.showMcqEditor = false
    this.currentMcqType = null
    this.initializeMcqEditorForm()
  }

  saveMcqQuestion(): void {
    if (this.mcqEditorForm.valid && this.currentMcqType) {
      const options: string[] = this.mcqOptions.value.filter((opt: string) => opt.trim() !== '')

      const newQuestion: AdditionalQuestion = {
        id: this.nextQuestionId++,
        type: this.currentMcqType,
        question: this.mcqEditorForm.value.question,
        selectionType: this.mcqEditorForm.value.selectionType,
        isRequired: this.mcqEditorForm.value.isRequired,
        allowNA: this.mcqEditorForm.value.allowNA,
        options,
        fieldName: this.mcqEditorForm.value.question
      }

      this.savedAdditionalQuestions.push(newQuestion)
      this.additionalQuestionCount++

      // Build the field payload and emit to parent for API update
      const nextOrder = this.formData?.fields?.length
        ? Math.max(...this.formData.fields.map((f: any) => f.order || 0)) + 1
        : 1

      const fieldType = this.currentMcqType === 'multiple-mcq' ? 'checkbox'
        : this.currentMcqType === 'single-mcq' ? 'radio'
          : 'textarea'

      const newField: any = {
        contextType: 'question',
        fieldType,
        formId: this.formData?.formId || '',
        id: crypto.randomUUID(),
        isRequired: newQuestion.isRequired,
        name: newQuestion.question,
        notApplicable: newQuestion.allowNA,
        order: nextOrder,
        status: 'Draft',
        systemGenerated: false
      }

      if (fieldType !== 'textarea') {
        newField['values'] = options.map(opt => ({ key: opt, value: opt }))
      }

      this.fieldAdded.emit(newField)
      this.closeMcqEditor()
    }
  }

  deleteAdditionalQuestion(id: number): void {
    const question = this.savedAdditionalQuestions.find(q => q.id === id)
    this.savedAdditionalQuestions = this.savedAdditionalQuestions.filter(q => q.id !== id)
    this.additionalQuestionCount--
    if (question) {
      this.fieldRemoved.emit(question.fieldName)
    }
  }

  isFormValid(): boolean {
    return this.questionForm.valid
  }

  getFormData() {
    return this.questionForm.value
  }
}
