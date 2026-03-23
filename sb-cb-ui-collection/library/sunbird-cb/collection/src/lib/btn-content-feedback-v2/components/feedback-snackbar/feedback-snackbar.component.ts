import { Component, OnInit, Inject } from '@angular/core'
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar'
import { IFeedbackSnackbarData } from '../../models/feedback.model'

@Component({
  selector: 'ws-widget-feedback-snackbar',
  templateUrl: './feedback-snackbar.component.html',
  styleUrls: ['./feedback-snackbar.component.scss'],
  standalone: false
})
export class FeedbackSnackbarComponent implements OnInit {
  constructor(@Inject(MAT_SNACK_BAR_DATA) public snackbarData: IFeedbackSnackbarData) { }

  ngOnInit() { }
}
