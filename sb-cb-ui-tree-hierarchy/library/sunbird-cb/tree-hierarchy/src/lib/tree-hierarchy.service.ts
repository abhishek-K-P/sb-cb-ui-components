import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

const API_ENDPOINT = {
  ORG_V1_SEARCH: '/apis/proxies/v8/org/v1/search',
  CREATE_TERMS: `/apis/proxies/v8/action/framework/v3/term/create`,
  UPDATE_TERMS: `/apis/proxies/v8/framework/v1/term/update/`,
  UPDATE_ASSOCIATION: `/apis/proxies/v8/framework/v1/term/update/`,
  PUBLISH_FRAMEWORK: `/apis/proxies/v8/framework/v1/publish/`,
  RETIRE_TREM: `/apis/proxies/v8/framework/v1/term/retire`,
  UPDATE_CATEGORY: `/apis/proxies/v8/framework/v1/category/update/`,
  USERS_SEARCH: `/apis/proxies/v8/user/v1/search`,
  ORG_CONTENT_UPDATE: `/apis/proxies/v8/org/ext/v2/update`
}
@Injectable({
  providedIn: 'root'
})
export class TreeHierarchyService {

  private loaderSubject = new BehaviorSubject<boolean>(false);
  loaderState$ = this.loaderSubject.asObservable();

  constructor(private http: HttpClient,) { }

  orgSerachApi(requestBody: any): Observable<any> {
    return this.http.post(`${API_ENDPOINT.ORG_V1_SEARCH}`, requestBody);
  }

  createTerm(requestBody: any, frameworkObj:any): Observable<any> {
    return this.http.post(`${API_ENDPOINT.CREATE_TERMS}?framework=${frameworkObj.id}&category=${frameworkObj.category}`, requestBody);
  }

  updateTerm(requestBody: any, frameworkObj:any, codeId:any): Observable<any> {
    return this.http.patch(`${API_ENDPOINT.UPDATE_TERMS}/${codeId}?framework=${frameworkObj.id}&category=${frameworkObj.category}`, requestBody);
  }

  updateFrameworkAssociation(requestBody: any, frameworkObj:any, codeId:any): Observable<any> {
    return this.http.patch(`${API_ENDPOINT.UPDATE_ASSOCIATION}${codeId}?framework=${frameworkObj.id}&category=${frameworkObj.category}`, requestBody);
  }

  publishFreamework(frameworkObj:any): Observable<any> {
    return this.http.post(`${API_ENDPOINT.PUBLISH_FRAMEWORK}${frameworkObj.id}`, {});
  }

  setLoaderState(isLoading: boolean) {
    this.loaderSubject.next(isLoading)
  }

  retireTerm(requestBody: any, frameworkObj:any): Observable<any> {
    return this.http.post(`${API_ENDPOINT.RETIRE_TREM}?framework=${frameworkObj.id}&category=${frameworkObj.category}`, requestBody);
  }

  orgContentUpdate(requestBody: any): Observable<any> {
    return this.http.patch(`${API_ENDPOINT.ORG_CONTENT_UPDATE}`, requestBody);
  }

  updateCategory(requestBody: any, frameworkObj:any): Observable<any> {
    return this.http.patch(`${API_ENDPOINT.UPDATE_CATEGORY}${frameworkObj.category}?framework=${frameworkObj.id}`, requestBody);
  }

  getUsersSearch(requestBody: any): Observable<any> {
    return this.http.post(`${API_ENDPOINT.USERS_SEARCH}`, requestBody);
  }
  
}
