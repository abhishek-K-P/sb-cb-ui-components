import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { Observable } from 'rxjs'

const API_END_POINTS = {
  CONTENT_SEARCH: 'apis/proxies/v8/sunbirdigot/v4/search',
  SAVE_DRAFT: 'apis/proxies/v8/forms/mdo/peersurvey',
  FORM_READ: (id: any) => `apis/proxies/v8/forms/v2/getFormById?formId=${id}`,
  UPDATE_FORM: (id: any) => `apis/proxies/v8/forms/mdo/update/peersurvey/${id}`,
  PEER_VALIDATION_SEARCH: `apis/proxies/v8/forms/mdo/peersurvey/search`,
  PUBLISH_FORM: (id: any) => `apis/proxies/v8/forms/peersurvey/publish/${id}`,
  ARCHIVE_FORM: (id: any) => `apis/proxies/v8/forms/peersurvey/archive/${id}`,
  END_FORM: (id: any) => `apis/proxies/v8/forms/peersurvey/end/${id}`,
  SPV_CREATE_FORM: 'apis/proxies/v8/forms/spv/peersurvey',
  SPV_UPDATE_FORM: (id: any) => `apis/proxies/v8/forms/spv/update/peersurvey/${id}`,
  SPV_PEER_VALIDATION_SEARCH: `apis/proxies/v8/forms/spv/peersurvey/search`,
  PV_INIT_DOWNLOAD_REPORT: (id: any) => `apis/proxies/v8/peervalidation/v1/report/initiate/${id}`,
  PV_DOWNLOAD_REPORT: `apis/proxies/v8/storage/v1/peervalidation/report/download`,
  PV_DOWNLOAD_LIST: `apis/proxies/v8/peervalidation/v1/list/report`
}
@Injectable({
  providedIn: 'root'
})
export class PeerValidationService {

  private selectedCourse: any

  constructor(private http: HttpClient, private router: Router) { }

  get isSpvRoute(): boolean {
    return this.router.url.includes('spv/peer-validation')
  }

  searchContent(payload: any): Observable<any> {
    return this.http.post(API_END_POINTS.CONTENT_SEARCH, payload)
  }

  setSelectedCourse(course: any) {
    this.selectedCourse = course
  }

  getSelectedCourse() {
    return this.selectedCourse
  }

  saveDraft(payload: any): Observable<any> {
    const url = this.isSpvRoute ? API_END_POINTS.SPV_CREATE_FORM : API_END_POINTS.SAVE_DRAFT
    return this.http.post(url, payload)
  }

  getFormById(id: any): Observable<any> {
    return this.http.get(API_END_POINTS.FORM_READ(id))
  }

  updateForm(id: any, payload: any): Observable<any> {
    const url = this.isSpvRoute ? API_END_POINTS.SPV_UPDATE_FORM(id) : API_END_POINTS.UPDATE_FORM(id)
    return this.http.put(url, payload)
  }

  publishForm(id: any): Observable<any> {
    return this.http.put(API_END_POINTS.PUBLISH_FORM(id), {})
  }

  archiveForm(id: any): Observable<any> {
    return this.http.put(API_END_POINTS.ARCHIVE_FORM(id), {})
  }

  endForm(id: any): Observable<any> {
    return this.http.put(API_END_POINTS.END_FORM(id), {})
  }

  searchPeerValidations(payload: any): Observable<any> {
    const url = this.isSpvRoute ? API_END_POINTS.SPV_PEER_VALIDATION_SEARCH : API_END_POINTS.PEER_VALIDATION_SEARCH
    return this.http.post(url, payload)
  }

  initDownloadReport(id: any): Observable<any> {
    return this.http.get(API_END_POINTS.PV_INIT_DOWNLOAD_REPORT(id))
  }

  downloadReport(payload: any): Observable<string> {
    return this.http.post(API_END_POINTS.PV_DOWNLOAD_REPORT, payload, { responseType: 'text' })
  }

  downloadList(): Observable<any> {
    return this.http.get(API_END_POINTS.PV_DOWNLOAD_LIST)
  }
}
