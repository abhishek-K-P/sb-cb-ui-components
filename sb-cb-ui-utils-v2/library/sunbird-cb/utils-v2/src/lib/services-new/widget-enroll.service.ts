import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigurationsService } from '../services/configurations.service';
import { Observable } from 'rxjs';
import { NsContent } from '../services/widget-content.model';
import { map } from 'rxjs/operators';




const PROXIES_V8 = '/apis/proxies/v8';
const API_END_POINTS = {
  ENROLL_CONTENT_DATA: `${PROXIES_V8}/learner/course/v4/user/enrollment/details`
};

@Injectable({
  providedIn: 'root'
})
export class WidgetEnrollService {

  constructor(
        private http: HttpClient,
        private configSvc: ConfigurationsService
  ) { }

  fetchEnrollContentData(payload: any): Observable<NsContent.IContent[]> {
    let userId = this.configSvc.userProfile && this.configSvc.userProfile.userId
      return this.http.post<NsContent.IContent[]>(
        `${API_END_POINTS.ENROLL_CONTENT_DATA}/${userId}`, payload
      )
  }
  fetchInternalEnrollmentData(userId: string , payload: any) {
    return this.http.post(`apis/proxies/v8/learner/course/v4/user/enrollment/list/${userId}`, payload)
  }

fetchExternalEnrollmentData(payload: any) {
  return this.http.post(`apis/proxies/v8/cios-enroll/v1/courselist/byuserid`, payload).pipe(map((extRes: any) => {
    if (extRes && extRes?.result && extRes?.result?.courses) {
      extRes?.result?.courses?.forEach((ele: any) => {
        ele['completionPercentage'] = ele['completionpercentage']
        if (ele?.content) {
          ele['content']['issuedCertificates'] = ele['issued_certificates'] || []
        }
        ele['lastContentAccessTime'] = ele?.content?.lastUpdatedOn ? new Date(ele.content.lastUpdatedOn).getTime() : ''
     if(ele?.content){
            ele['content']['organisation'] = ele?.content && ele?.content?.contentPartner && ele?.content?.contentPartner?.contentPartnerName ? [ele?.content?.contentPartner?.contentPartnerName]: []
            ele['content']['completionStatus'] = ele['completionpercentage']< 100 ? 1: 2
            ele['content']['creatorLogo'] = ele['content']['contentPartner']['link']

          }
      })
    }
    return extRes
  }))
}

  fetchEventsEnrollmentData(userId: string , payload: any) {
    return this.http.post(`apis/proxies/v8/user/events/list/${userId}`, payload)
  }

  fetchEnrollStats(userId: any): Observable<NsContent.IContent[]> {
      return this.http.get<NsContent.IContent[]>(
        `apis/proxies/v8/learner/course/v4/user/enrollment/summary/${userId}`
      )
  }

}
