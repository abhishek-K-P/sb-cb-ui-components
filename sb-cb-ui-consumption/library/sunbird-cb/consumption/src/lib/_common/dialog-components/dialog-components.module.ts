import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CertificateDialogComponent } from './certificate-dialog/certificate-dialog.component';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpLoaderFactory } from '../content-strip-with-tabs-lib/content-strip-with-tabs-lib.module';
import { HttpClient } from '@angular/common/http';
import { PipeSafeSanitizerModule } from '@sunbird-cb/utils-v2';
import { AddCompetencyPopupComponent } from './add-competency-popup/add-competency-popup.component';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { SnackbarComponent } from './snackbar/snackbar.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { NlwCertificateDialogComponent } from './nlw-certificate-dialog/nlw-certificate-dialog.component';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';



@NgModule({
    declarations: [
        CertificateDialogComponent, 
        AddCompetencyPopupComponent, 
        SnackbarComponent,
        ConfirmationDialogComponent,
        NlwCertificateDialogComponent
    ],
    imports: [
        CommonModule,
        MatMenuModule,
        MatCardModule,
        MatIconModule,
        MatDialogModule,
        PipeSafeSanitizerModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient],
            },
        }),
        MatFormFieldModule,
        ReactiveFormsModule,
        MatCheckboxModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule
    ],
    exports: [
        CertificateDialogComponent, 
        AddCompetencyPopupComponent, 
        SnackbarComponent,
        ConfirmationDialogComponent,
        NlwCertificateDialogComponent
    ]
})
export class DialogComponentsModule { }
