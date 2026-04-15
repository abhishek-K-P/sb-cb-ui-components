import { StepperSelectionEvent } from '@angular/cdk/stepper'
import { AfterContentInit, Component, ContentChildren, EventEmitter, Input, Output, QueryList, TemplateRef, ViewChild } from '@angular/core'
import { MatStepper } from '@angular/material/stepper'

@Component({
  selector: 'sb-uic-horizontal-dynamic-stepper',
  templateUrl: './horizontal-dynamic-stepper.component.html',
  styleUrls: ['./horizontal-dynamic-stepper.component.scss']
})
export class HorizontalDynamicStepperComponent implements AfterContentInit {

  @ViewChild('stepper') stepper!: MatStepper
  @ContentChildren(TemplateRef) bodyTemplates!: QueryList<TemplateRef<any>>
  @Input() labels: string[] = [];
  @Input() selectedIndex = 0;

  @Output() stepChange = new EventEmitter<number>();

  stepBodies = new Map<number, TemplateRef<any>>();

  ngAfterContentInit() {
    this.bodyTemplates.forEach((tpl, index) => {
      this.stepBodies.set(index, tpl)
    })
  }

  onSelectionChange(event: StepperSelectionEvent) {
    this.stepChange.emit(event.selectedIndex)
  }

  /** Programmatically force the mat-stepper to a specific step index */
  goToStep(index: number) {
    if (this.stepper) {
      this.stepper.selectedIndex = index
    }
  }

}
