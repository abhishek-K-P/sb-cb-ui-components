import { Component, Input, OnInit } from '@angular/core'
import { NsContent } from '../_services/widget-content.model'
import { IContentRating } from './contentRating.model'
import { WidgetContentService } from '../_services/widget-content.service'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'

@Component({
  selector: 'ws-widget-user-content-detailed-rating',
  templateUrl: './user-content-detailed-rating.component.html',
  styleUrls: ['./user-content-detailed-rating.component.scss'],
})
export class UserContentDetailedRatingComponent implements OnInit {
  @Input() contentId!: string
  @Input() isDisabled = true
  @Input() contentTyp!: NsContent.EContentTypes
  isRequesting = true
  userRating!: IContentRating
  @Input() forPreview = false
  averageRatings = 0
  defaultValue = [{ key: 5, value: 0 }, { key: 4, value: 0 }, { key: 3, value: 0 }, { key: 2, value: 0 }, { key: 1, value: 0 }]

  constructor(
    // private events: EventService,
    private contentSvc: WidgetContentService,
    private configSvc: ConfigurationsService,
  ) { }

  ngOnInit() {
    if (!this.forPreview) {
      this.contentSvc.getRatingSummary(this.contentId, this.contentTyp).subscribe(
        res => {
          this.isRequesting = false
          this.userRating = res.result.response
          this.defaultValue = [
            { key: 5, value: this.userRating.totalcount5stars || 0 },
            { key: 4, value: this.userRating.totalcount4stars || 0 },
            { key: 3, value: this.userRating.totalcount3stars || 0 },
            { key: 2, value: this.userRating.totalcount2stars || 0 },
            { key: 1, value: this.userRating.totalcount1stars || 0 },
          ]
        },
        _err => {
          this.isRequesting = false
        },
      )
    }
  }

  // addRating(index: number) {
  //   if (!this.forPreview && !this.isDisabled) {
  //     this.isRequesting = true
  //     const previousRating = this.userRating
  //     if (this.userRating !== index + 1) {
  //       this.userRating = index + 1
  //       this.events.raiseInteractTelemetry('rating', 'content', {
  //         contentId: this.contentId,
  //         rating: this.userRating,
  //       })
  //       this.contentSvc.addContentRating(this.contentId, { rating: this.userRating }).subscribe(
  //         _ => {
  //           this.isRequesting = false
  //         },
  //         _ => {
  //           this.isRequesting = false
  //           this.userRating = previousRating
  //         },
  //       )
  //     } else {
  //       this.contentSvc.deleteContentRating(this.contentId).subscribe(
  //         _ => {
  //           this.userRating = 0
  //           this.isRequesting = false
  //         },
  //         _ => {
  //           this.isRequesting = false
  //           this.userRating = previousRating
  //         },
  //       )
  //     }
  //   } else {
  //     this.userRating = index + 1
  //   }
  // }

  public get enableFeature(): boolean {
    switch (this.configSvc.rootOrg) {
      default:
        return true
    }
  }
}
