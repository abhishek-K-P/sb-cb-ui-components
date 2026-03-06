import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import * as _ from 'lodash';


const API_END_POINTS = {
  LIST: (pageNumber: number, pageSize: number) => `apis/proxies/v8/v1/notifications/list?page=${pageNumber}&size=${pageSize}`,
  LIST_WITH_CATEGORY: (pageNumber: number, pageSize: number, subType: string) => `apis/proxies/v8/v1/notifications/list?page=${pageNumber}&size=${pageSize}&sub_type=${subType}`,
  MARK_AS_READ: `apis/proxies/v8/v1/notifications/read`,
  MARK_MANDATORY_AS_READ: `apis/proxies/v8/v1/notifications/mandatory/read`,
  NOTIFICATIONS: (pageNumber: number, pageSize: number) => `apis/proxies/v8/v1/notifications/list?page=${pageNumber}&size=${pageSize}`,
  SEARCH: `apis/proxies/v8/sunbirdigot/search`,
  MANDATORY: `apis/proxies/v8/v1/notifications/mandatory/list`
}

@Injectable({
  providedIn: 'root'
})
export class LibNotificationsService {
  _unreadCount = new BehaviorSubject<number>(0)
  unreadCount$ = this._unreadCount.asObservable()
  notificationsCallCount = 0

  _handleClick = new BehaviorSubject<any>('')
  handleClick$ = this._handleClick.asObservable()

  constructor(private http: HttpClient) { }
  getNotifications(pageNumber: number, pageSize: number, subType: string): Observable<any> {
    let api = ''
    if (subType === 'all') {
      api = API_END_POINTS.LIST(pageNumber, pageSize)
    } else {
      api = API_END_POINTS.LIST_WITH_CATEGORY(pageNumber, pageSize, subType)
    }
    return this.http.get(api).pipe(
          mergeMap((res: any) => {
            if (_.get(res, 'result.notifications', []).length) {
              res.result.notifications = this.removeRichTextFromNotification(_.get(res, 'result.notifications', []))
            }
            return of(res)
          })
        )
  }

  removeRichTextFromNotification(notifications: any) {
    if (notifications && notifications.length > 0) {
      notifications.forEach((notification: any) => {
        if(_.get(notification, 'sub_category') === 'PROFANITY_CHECK' && _.get(notification, 'message.body')){
          notification.message.body = this.formatNotificationMessage(notification.message.body)
        }
      })
    }
    return notifications
  }

  formatNotificationMessage(message: string, maxLength: number = 30): string {
  // Match the quoted part (user post)
    const match = message.match(/"(.*?)"/);
    if (!match) return this.removeRichText(message);

    // Remove HTML tags from the quoted part
    let userPost = this.removeRichText(match[1]).trim();

    // Truncate if necessary
    if (userPost.length > maxLength) {
      userPost = userPost.slice(0, maxLength).trim() + '...';
    }

    // Replace the original quoted part with the cleaned, truncated one
    return message.replace(/"(.*?)"/, `"${userPost}"`);
  }
  removeRichText(text: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    return tempDiv.innerText || tempDiv.textContent || '';
  }

  getNotificationsByType(pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get(API_END_POINTS.NOTIFICATIONS(pageNumber, pageSize))
  }

  markAsRead(request: any): Observable<any> {
    return this.http.patch(API_END_POINTS.MARK_AS_READ, request);
  }

  markMandatoryAsRead(request: any): Observable<any> {
    return this.http.patch(API_END_POINTS.MARK_MANDATORY_AS_READ, request);
  }

  markAllAsRead(request: any): Observable<any> {
    return this.http.patch(API_END_POINTS.MARK_AS_READ, request);
  }

  updateUnreadCount(): void {
    this.notificationsCallCount = this.notificationsCallCount + 1
    this._unreadCount.next(this.notificationsCallCount)
  }

  searchContent(query: string): Observable<any> {
    return this.http.post(API_END_POINTS.SEARCH, query);
  }

  emitClick(content: any): void {
    this._handleClick.next(content)
  }
  getMandatoryNotifications(pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get(`${API_END_POINTS.MANDATORY}?page=${pageNumber}&size=${pageSize}`)
  }

}
