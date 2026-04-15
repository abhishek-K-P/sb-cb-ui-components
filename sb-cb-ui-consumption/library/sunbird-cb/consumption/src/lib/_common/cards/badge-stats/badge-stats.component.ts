import { Component, Input } from '@angular/core'

@Component({
  selector: 'sb-uic-app-badge-stats',
  templateUrl: './badge-stats.component.html',
  styleUrls: ['./badge-stats.component.scss']
})
export class BadgeStatsComponent {

  @Input() stats: any[] = [];
  tooltipText1 =
    'Displays the total number of learning contents associated with Badges that you have successfully completed.';

  tooltipText2 =
    'Shows the Percentage of badges successfully earned out of total badge-enabled courses you are enrolled in.';

}