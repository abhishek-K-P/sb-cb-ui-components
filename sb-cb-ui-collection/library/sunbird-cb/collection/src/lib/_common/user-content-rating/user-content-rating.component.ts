import { Component, Input, OnInit } from '@angular/core'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'
import { WidgetContentService } from '../../_services/widget-content.service'
import _ from 'lodash'
import { IContentRating } from '../../user-content-detailed-rating/contentRating.model'

@Component({
  selector: 'ws-widget-user-content-rating',
  templateUrl: './user-content-rating.component.html',
  styleUrls: ['./user-content-rating.component.scss'],
})
export class UserContentRatingComponent implements OnInit {
  @Input() contentId!: string
  @Input() contenttyp!: string
  @Input() isDisabled = true
  @Input() className = false
  isRequesting = true
  userRating!: IContentRating
  @Input() forPreview = false
  averageRatings = 0

  constructor(
    // private events: EventService,
    private contentSvc: WidgetContentService,
    private configSvc: ConfigurationsService,
  ) { }

  ngOnInit() {
    if (!this.forPreview) {
      this.contentSvc.getRatingSummary(this.contentId, this.contenttyp).subscribe(
        res => {
          const breakDownArray: any[] = []
          this.isRequesting = false
          this.userRating = res.result.response
          const ratingSummaryPr = {
            breakDown: breakDownArray,
            latest50reviews: breakDownArray,
            ratingsNumber: breakDownArray,
            total_number_of_ratings: (this.userRating) ? this.userRating.total_number_of_ratings || 0 : 0,
            avgRating: '0',
          }
          const totRatings = (this.userRating) ? this.userRating.sum_of_total_ratings : 0
          ratingSummaryPr.breakDown.push({
            percent: this.countStarsPercentage(_.get(this.userRating, 'totalcount1stars'), totRatings),
            key: 1,
            value: _.get(this.userRating, 'totalcount1stars'),
          })
          ratingSummaryPr.breakDown.push({
            percent: this.countStarsPercentage(_.get(this.userRating, 'totalcount2stars'), totRatings),
            key: 2,
            value: _.get(this.userRating, 'totalcount2stars'),
          })
          ratingSummaryPr.breakDown.push({
            percent: this.countStarsPercentage(_.get(this.userRating, 'totalcount3stars'), totRatings),
            key: 3,
            value: _.get(this.userRating, 'totalcount3stars'),
          })
          ratingSummaryPr.breakDown.push({
            percent: this.countStarsPercentage(_.get(this.userRating, 'totalcount4stars'), totRatings),
            key: 4,
            value: _.get(this.userRating, 'totalcount4stars'),
          })
          ratingSummaryPr.breakDown.push({
            percent: this.countStarsPercentage(_.get(this.userRating, 'totalcount5stars'), totRatings),
            key: 5,
            value: _.get(this.userRating, 'totalcount5stars'),
          })
          const meanRating = ratingSummaryPr.breakDown.reduce((val, item) => {
            // console.log('item', item)
            return val + (item.key * item.value)
            // tslint:disable-next-line: align
          }, 0) as number
          const totalRatings = (this.userRating) ? this.userRating.total_number_of_ratings || 0 : 0
          if (totalRatings) {
            ratingSummaryPr.avgRating = parseFloat(`${meanRating / totalRatings}`).toFixed(1)
            this.userRating.total_number_of_ratings = totalRatings
            this.userRating.avgRating = ratingSummaryPr.avgRating
            this.userRating.breakDown = ratingSummaryPr.breakDown
          }// if (this.content) {
          //   this.content.averageRating = ratingSummaryPr.avgRating
          // }
        },
        _err => {
          this.isRequesting = false
        },
      )
    }
  }
  countStarsPercentage(value: any, total: any) {
    return ((value / total) * 100).toFixed(2)
  }
  getRatingIconClass(ratingIndex: number, avg: number): boolean {
    return this.contentSvc.getRatingIconClass(ratingIndex, avg)
  }
  getRatingIcon(ratingIndex: number, avg: number): 'star' | 'star_border' | 'star_half' {
    return this.contentSvc.getRatingIcon(ratingIndex, avg)
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
