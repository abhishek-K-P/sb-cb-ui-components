import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ReactiveFormsModule, FormsModule } from '@angular/forms'

// Angular Material Legacy imports (following project pattern)
import { MatLegacyRadioModule } from '@angular/material/legacy-radio'
import { MatLegacyFormFieldModule } from '@angular/material/legacy-form-field'
import { MatLegacyInputModule } from '@angular/material/legacy-input'
import { MatLegacyButtonModule } from '@angular/material/legacy-button'
import { MatIconModule } from '@angular/material/icon'

// Local pipe imports
import { OrderByPipeModule } from '../../_pipes/order-by/order-by.pipe.module'

// Component import
import { CompetencyListComponent } from './competency-list/competency-list.component'

@NgModule({
  declarations: [
    CompetencyListComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatLegacyRadioModule,
    MatLegacyFormFieldModule,
    MatLegacyInputModule,
    MatLegacyButtonModule,
    MatIconModule,
    OrderByPipeModule
  ],
  exports: [
    CompetencyListComponent
  ]
})
export class CompetenciesModule { }
