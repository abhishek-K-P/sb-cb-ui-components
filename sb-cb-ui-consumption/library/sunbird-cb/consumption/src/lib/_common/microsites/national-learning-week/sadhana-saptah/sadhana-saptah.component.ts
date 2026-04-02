import { Component, Inject, Input, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { EventService, UtilityService } from '@sunbird-cb/utils-v2';
import * as _ from 'lodash'

@Component({
  selector: 'sb-uic-sadhana-saptah',
  templateUrl: './sadhana-saptah.component.html',
  styleUrls: ['./sadhana-saptah.component.scss']
})
export class SadhanaSaptahComponent implements OnInit {
  @Input() sectionList:any = []
  @Input() configDetails: any
  @Input() nlwConfiguration: any
  @Input() individualSection: any = {}
  providerId: string = '123456789'
  providerName: ''
  descriptionMaxLength = 500
  environment: any
  isMobile: boolean = false
  constructor(@Inject('environment') environment: any,
  public router: Router, private events: EventService,
  private domSanitizer: DomSanitizer,
  public utilitySvc: UtilityService) {
    this.environment = environment
    this.isMobile = this.utilitySvc.isMobile
   }

   ngOnInit(): void {
    this.getLookerProUrl();
   }


  hideKeyHightlight(event: any, learnerReview: any) {
    if (event) {
      learnerReview['hideSection'] = true
    }
  }

  showAllContent(_stripData: any, columnData: any) {
    if (columnData && columnData.contentStrip && columnData.contentStrip.strips && columnData.contentStrip.strips.length) {
      const stripData: any = _stripData
        let tabSelected =  stripData.viewMoreUrl && stripData.viewMoreUrl.queryParams && stripData.viewMoreUrl.queryParams.tabSelected && stripData.viewMoreUrl.queryParams.tabSelected || ''
        this.router.navigate(
          [`app/learn/karmayogi-saptah/see-all`],
          { queryParams: {  pageDetails: true, tabSelected, key: columnData.sectionKey  } })

    } else {
       this.router.navigate(
        [`/app/learn/browse-by/provider/${this.providerName}/${this.providerId}/all-CBP`],
        { queryParams: { pageDetails: true } })
    }
  }

  hideContentStrip(event: any, contentStripData: any) {
    if (event) {
      contentStripData.contentStrip['hideSection'] = true
    }
  }

  raiseTabClick(event) {
    this.events.raiseInteractTelemetry(
      {
        type: 'click',
        subType: 'mdo-leaderboard',
        id: `${event}-tab`,
      },
      {
      },
      {
        module: 'National Learning Week',
      }
    )
  }


  raiseTelemetryInteratEvent(event: any) {
    let  _subType = 'mandatory-courses'
    let _id = 'mandatory-courses-card'
    if (event.typeOfTelemetry === 'learningContent') {
      _subType = 'explore-learning-content'
      _id = 'explore-learning-content-card'
    } 
    this.events.raiseInteractTelemetry(
      {
        type: 'click',
        subType: _subType,
        id: _id,
      },
      {
        id: event.identifier,
        type: event.primaryCategory,
      },
      {
        pageIdExt: _id,
        module: 'National Learning Week',
      }
    )
  }
  getLookerProUrl() {
    this.sectionList.forEach((ele: any) => {
      if(ele?.column && ele?.column?.length) {
        ele.column.forEach((colEle: any) => {
          if(colEle.key === 'lookerSection' && colEle.data) {
            colEle.data.sanitizedUrl = this.domSanitizer
              .bypassSecurityTrustResourceUrl(this.isMobile ? colEle.data.lookerProMobileUrl : colEle.data.lookerProDesktopUrl)
          }
        });
      }
    });
  }


}
