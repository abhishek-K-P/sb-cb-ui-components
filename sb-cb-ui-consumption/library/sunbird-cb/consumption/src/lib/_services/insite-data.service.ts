import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const API_END_POINTS = {
  PROVIDER_INSIGHTS: `/apis/proxies/v8/microsite/read/insights`,
  TRAINING_DETAILS: `apis/proxies/v8/sunbirdigot/search`,
  ANNOUNCEMENTS_DETAILS: `apis/proxies/v8/announcements/v1/search`,
  LEARNERS: `apis/proxies/v8/halloffame/top/learners`,
  LEADERBOARD: 'apis/proxies/v8/halloffame/v1/mdoleaderboard',
  LEADERBOARD_V2: 'apis/proxies/v8/walloffame/v1/mdoleaderboard',
  LEADERBOARD_USERS: `apis/proxies/v8/halloffame/v1/userleaderboard`,
  NLW_LEADERBOARD: `apis/proxies/v8/national/learning/week/insights`,
  INSIGHTS: `apis/proxies/v8/read/user/insights`,
  USER_PROGRESS: `apis/proxies/v8/halloffame/v1/userleaderboard`,
  SLW_LEADERBOARD: `apis/proxies/v8/halloffame/v1/state/mdoleaderboard`,
  SLW_TOP_LEARNERS: (stateOrgId: any) =>  `apis/proxies/v8/halloffame/state/top/learners/${stateOrgId}`,
  SLW_INSIGHTS: `apis/proxies/v8/state/learning/week/insights`
}

@Injectable({
  providedIn: 'root'
})
export class InsiteDataService {

  constructor(
    private http: HttpClient
  ) {}
  fetchSearchData(request: any): Observable<any> {
    return this.http.post<any>(API_END_POINTS.PROVIDER_INSIGHTS, request)
  }

  fetchAnnouncementsData(request: any): Observable<any> {
    return this.http.post<any>(API_END_POINTS.ANNOUNCEMENTS_DETAILS, request)
  }


  fetchTrainingDetails(request: any): Observable<any> {
    return this.http.post<any>(API_END_POINTS.TRAINING_DETAILS, request)
  }

  fetchSlwLeaderboard(request: any): Observable<any> {
    return this.http.post<any>(API_END_POINTS.SLW_LEADERBOARD, request)
  }

  fetchSwlStats(request:any) {
    return this.http.post(`${API_END_POINTS.SLW_INSIGHTS}`, request)
  }

  fetchSlwLearner(stateOrgId: any): Observable<any> {
    return this.http.get(`${API_END_POINTS.SLW_TOP_LEARNERS(stateOrgId)}`)
  }

  fetchLearner(channelId: any): Observable<any> {
    return this.http.get(`${API_END_POINTS.LEARNERS}/${channelId}`)
  }

  fetchLeaderboard() {
    return this.http.get(`${API_END_POINTS.LEADERBOARD}`)
  }


  fetchLeaderboardV2() {
    return this.http.get(`${API_END_POINTS.LEADERBOARD_V2}`)
  }

  fetchMdoUsers(orgId: any): Observable<any> {
    return this.http.get(`${API_END_POINTS.LEADERBOARD_USERS}/${orgId}`)
  }

  fetchNwlStats() {
    return this.http.get(`${API_END_POINTS.NLW_LEADERBOARD}`)
  }

  fetchInsightsData(payload: any) {
    const result = this.http.post(API_END_POINTS.INSIGHTS, payload)
    return result
  }

  fetchUserProgress() {
    return this.http.get(`${API_END_POINTS.USER_PROGRESS}`)
  }

}
