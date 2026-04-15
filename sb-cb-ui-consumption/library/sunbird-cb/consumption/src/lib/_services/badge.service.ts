import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'

@Injectable({
  providedIn: 'root',
})
export class BadgeService {
  private apiUrl =
    '/apis/proxies/v8/badge/dynamic/v1/generate'

  constructor(private http: HttpClient) {}

  // generateBadge(data: any): Observable<Blob> {
  //   const headers = new HttpHeaders({
  //     'Content-Type': 'application/json',
  //   })
  //   console.log('data========', data)
  //   return this.http.post(this.apiUrl, data, {
  //     headers,
  //     responseType: 'blob', // important for download
  //     withCredentials: true, // for cookie
  //   })
  // }
  generateBadge(data: any): Observable<any> {
  return this.http.post(this.apiUrl, data, {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
    withCredentials: true,
  })
}
}