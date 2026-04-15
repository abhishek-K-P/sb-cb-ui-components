import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { IUserGroupDetails } from '../_models/widget-user.model';
import { NsContent } from '../_models/widget-content.model';
import 'rxjs/add/observable/of'
import dayjs from 'dayjs';
// const dayjs = dayjs_
// import { environment } from 'src/environments/environment'
import { NsCardContent } from '../_models/card-content-v2.model';
import * as lodash from 'lodash';
import { WidgetEnrollService } from '@sunbird-cb/utils-v2';


const PROTECTED_SLAG_V8 = '/apis/protected/v8';
const API_END_POINTS = {
  FETCH_EXTERNAL_ENROLLMENT_LIST: 'apis/proxies/v8/cios-enroll/v1/courselist/byuserid',
  FETCH_EVENTS_ENROLLMENT_LIST: (userId: string) => `apis/proxies/v8/user/events/list/${userId}`,
  FETCH_USER_GROUPS: (userId: string) =>
    `${PROTECTED_SLAG_V8}/user/group/fetchUserGroup?userId=${userId}`,
  FETCH_CPB_PLANS: `/apis/proxies/v8/user/v1/cbplan`,
  FETCH_USER_ENROLLMENT_LIST: (userId: string | undefined, competencyKey: string) =>
    // tslint:disable-next-line: max-line-length
    `/apis/proxies/v8/learner/course/v2/user/enrollment/list/${userId}?orgdetails=orgName,email&licenseDetails=name,description,url&fields=contentType,primaryCategory,courseCategory,topic,name,channel,mimeType,appIcon,gradeLevel,resourceType,identifier,medium,pkgVersion,board,subject,trackable,posterImage,duration,creatorLogo,license,version,versionKey,avgRating,additionalTags,${competencyKey}&batchDetails=name,endDate,startDate,status,enrollmentType,createdBy,certificates,batchAttributes`,
  FETCH_USER_ENROLLMENT_LIST_PROFILE: (userId: string | undefined, competencyKey: string) =>
    // tslint:disable-next-line: max-line-length
    `/apis/proxies/v8/learner/course/v2/user/enrollment/list/${userId}?orgdetails=orgName,email&licenseDetails=name,description,url&fields=contentType,primaryCategory,courseCategory,topic,name,channel,mimeType,appIcon,gradeLevel,resourceType,identifier,medium,pkgVersion,board,subject,trackable,posterImage,duration,creatorLogo,license,version,versionKey,avgRating,additionalTags,${competencyKey}&batchDetails=name,endDate,startDate,status,enrollmentType,createdBy,certificates,batchAttributes&retiredCoursesEnabled=true`,
  // tslint:disable-next-line: max-line-length
  FETCH_USER_ENROLLMENT_LIST_V2: (userId: string | undefined, orgdetails: string, licenseDetails: string, fields: string, batchDetails: string, competencyKey: string) =>
    // tslint:disable-next-line: max-line-length
    `apis/proxies/v8/learner/course/v2/user/enrollment/list/${userId}?orgdetails=${orgdetails}&licenseDetails=${licenseDetails}&fields=${fields},courseCategory,${competencyKey}&batchDetails=${batchDetails}`,
  FETCH_DESIGNATION_COURSES: `/apis/proxies/v8/courseRecommend/v1/courses`,
  GET_RECOMMENDED_COURSES_WITH_FEEDBACK: (userId: string) => `/apis/proxies/v8/courseRecommendation/read/${userId}`,
  ORG_READ: '/api/org/v1/read',
};

@Injectable({
  providedIn: 'root',
})
export class WidgetUserServiceLib {
  environment: any;
  enrollmentDataIds: any = []
  constructor(
    @Inject('environment') environment: any,
    private enrollSvc: WidgetEnrollService,
    private http: HttpClient) {
    this.environment = environment;
  }

  handleError(error: ErrorEvent) {
    let errorMessage = ''
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`
    }
    return throwError(errorMessage)
  }

  handleError1(error: ErrorEvent) {
    let errorMessage = ''
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`
    }
    return throwError('')
  }

  fetchUserGroupDetails(userId: string): Observable<IUserGroupDetails[]> {
    return this.http
      .get<IUserGroupDetails[]>(API_END_POINTS.FETCH_USER_GROUPS(userId))
      .pipe(catchError(this.handleError))
  }
  // tslint:disable-next-line: max-line-length
  fetchUserBatchList(userId: string | undefined, queryParams?: { orgdetails: any, licenseDetails: any, fields: any, batchDetails: any }): Observable<NsContent.ICourse[]> {
    let path = ''
    if (queryParams) {
      // tslint:disable-next-line: max-line-length
      path = API_END_POINTS.FETCH_USER_ENROLLMENT_LIST_V2(userId, queryParams.orgdetails, queryParams.licenseDetails, queryParams.fields, queryParams.batchDetails, this.environment.compentencyVersionKey)
    } else {
      path = API_END_POINTS.FETCH_USER_ENROLLMENT_LIST(userId, this.environment.compentencyVersionKey)
    }
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate, post-check=0, pre-check=0',
      Pragma: 'no-cache',
      Expires: '0',
    })
    const result: any = this.http.get(path, { headers }).pipe(catchError(this.handleError), map(
      (data: any) => {
        const coursesData: any = []
        if (data && data.result && data.result.courses) {
          data.result.courses.forEach((content: any) => {
            if (content.contentStatus) {
              delete content.contentStatus
            }
            this.enrollmentDataIds.push(content.contentId)
            coursesData.push(content)
          })
          // this.storeUserEnrollmentInfo(data.result.userCourseEnrolmentInfo,
          //                              data.result.courses.length)
          data.result.courses = coursesData
        }
        return data.result
      }
    )
    )
    return result
  }

  // tslint:disable-next-line: max-line-length
  fetchProfileUserBatchList(userId: string | undefined, queryParams?: { orgdetails: any, licenseDetails: any, fields: any, batchDetails: any }): Observable<NsContent.ICourse[]> {
    let path = ''
    if (queryParams) {
      // tslint:disable-next-line: max-line-length
      path = API_END_POINTS.FETCH_USER_ENROLLMENT_LIST_V2(userId, queryParams.orgdetails, queryParams.licenseDetails, queryParams.fields, queryParams.batchDetails, this.environment.compentencyVersionKey)
    } else {
      path = API_END_POINTS.FETCH_USER_ENROLLMENT_LIST_PROFILE(userId, this.environment.compentencyVersionKey)
    }
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate, post-check=0, pre-check=0',
      Pragma: 'no-cache',
      Expires: '0',
    })
    return this.http
      .get(path, { headers })
      .pipe(
        catchError(this.handleError),
        map(
          (data: any) => data.result
        )
      )
  }

  checkStorageData(key: any, dataKey: any) {
    const checkTime = localStorage.getItem('timeCheck')
    if (checkTime) {
      const parsedData = JSON.parse(checkTime)
      if (parsedData[key]) {
        const date = dayjs()
        const diffMin = date.diff(parsedData[key], 'minute')
        const timeCheck = this.environment.apiCache || 0
        if (diffMin >= timeCheck) {
          return true
        }
        return localStorage.getItem(dataKey) ? false : true
      }
      return true
    }
    return true
  }

  getData(key: any): Observable<any> {
    return Observable.of(JSON.parse(localStorage.getItem(key) || '{}'))
  }

  getCBPData(key: any): Observable<any> {
    return Observable.of(JSON.parse(localStorage.getItem(key) || '[]'))
  }
  getSavedData(key: any): Observable<any> {
    return JSON.parse(localStorage.getItem(key) || '')
  }

  setTime(key: any) {
    const checkTime = localStorage.getItem('timeCheck')
    if (checkTime) {
      const parsedData = JSON.parse(checkTime)
      parsedData[key] = new Date().getTime()
      localStorage.setItem('timeCheck', JSON.stringify(parsedData))
    } else {
      const data: any = {}
      data[key] = new Date().getTime()
      localStorage.setItem('timeCheck', JSON.stringify(data))
    }
  }

  resetTime(key: any) {
    const checkTime = localStorage.getItem('timeCheck')
    if (checkTime) {
      const parsedData = JSON.parse(checkTime)
      if (parsedData[key]) {
        delete parsedData[key]
        localStorage.setItem('timeCheck', JSON.stringify(parsedData))
      }
    }
  }

  fetchCbpPlanList(userId: string, callApi?: boolean) {
    // If callApi is true, always fetch from API and return full metadata (not reduced)
    if (callApi) {
        const result: any = this.http.get(API_END_POINTS.FETCH_CPB_PLANS).pipe(catchError(this.handleError), map(
          async (data: any) => {
            if (data.result && data.result.content && data.result.content.length) {
              let cbpData: any = this.getCbpFormatedData(data.result.content)
              let cbpContentData: any = cbpData.cbpContentData || []
              let request = {
                request: {
                  courseId: cbpData.contentIds
                }
              }
              const responseData = await this.enrollSvc.fetchEnrollContentData(request).toPromise().then(async (res: any) => {
                const enrollData: any = {}
                if (res && res.result && res.result.courses && res.result.courses.length) {
                  res.result.courses.forEach((data: any) => {
                    enrollData[data.collectionId] = data
                  })
                  return enrollData
                } else {
                  return {}
                }
              }).catch((_err: any) => {
                return {}
              });
              // ask for full metadata (fullMeta = true)
              return await this.mapCbpData(cbpContentData, responseData, true)
            }
            // return an empty full-meta list when API response has no content
            return await this.mapCbpData([], {}, true)
          }
        ))
        return result
    }

    // Default behavior: use cache check and return reduced/minified metadata
    if (this.checkStorageData('cbpService', 'cbpData')) {
      const result: any = this.http.get(API_END_POINTS.FETCH_CPB_PLANS).pipe(catchError(this.handleError), map(
        async (data: any) => {
          if (data.result && data.result.content && data.result.content.length) {
            let cbpData: any = this.getCbpFormatedData(data.result.content)
            let cbpDoIds = cbpData.contentIds.join(',')
            let cbpContentData: any = cbpData.cbpContentData || []
            let request = {
              request: {
                courseId: cbpData.contentIds
              }
            }
            const responseData = await this.enrollSvc.fetchEnrollContentData(request).toPromise().then(async (res: any) => {

              const enrollData: any = {}
              if (res && res.result && res.result.courses && res.result.courses.length) {
                res.result.courses.forEach((data: any) => {
                  enrollData[data.collectionId] = data
                })
                return enrollData
              } else {
                return {}
              }
            }).catch((_err: any) => {
              return {}
            });
            // default: return reduced metadata (fullMeta = false)
            return await this.mapCbpData(cbpContentData, responseData, false)
          }
          // return an empty reduced list and update cache when API response has no content
          return await this.mapCbpData([], {}, false)
        }
      )
      )
      this.setTime('cbpService')
      return result
    }
    return this.getCBPData('cbpData')
  }

  // storeUserEnrollmentInfo(enrollmentData: any, enrolledCourseCount: number) {
  //   const userData = {
  //     enrolledCourseCount,
  //     userCourseEnrolmentInfo: enrollmentData,
  //   }
  //   localStorage.removeItem('userEnrollmentCount')
  //   localStorage.setItem('userEnrollmentCount', JSON.stringify(userData))
  // }


  fetchEnrollmentDataByContentId(userId, contentdata) {
    let path = API_END_POINTS.FETCH_USER_ENROLLMENT_LIST(userId, this.environment.compentencyVersionKey)
    path = `${path}&courseIds=${contentdata}&cache=true'`
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate, post-check=0, pre-check=0',
      Pragma: 'no-cache',
      Expires: '0',
    })
    return this.http
      .get(path, { headers })
      .pipe(
        catchError(this.handleError),
        map(
          (data: any) => data.result
        )
      )
  }

  getCbpFormatedData(cbpContent: any) {
    let cbpContentData = []
    let contentIds = []
    const todayDate = dayjs().format('YYYY-MM-DD')
    cbpContent.forEach((c: any) => {
      c.contentList.forEach((childData: any) => {
        const endDate = dayjs(c.endDate).format('YYYY-MM-DD')
        const daysCount = dayjs(endDate).diff(todayDate, 'day')
        childData['planDuration'] = daysCount < 0 ? NsCardContent.ACBPConst.OVERDUE : daysCount > 29
          ? NsCardContent.ACBPConst.SUCCESS : NsCardContent.ACBPConst.UPCOMING
        childData['endDate'] = c.endDate
        childData['parentId'] = c.id
        childData['planType'] = 'cbPlan'
        childData['contentStatus'] = 0
        childData['isApar'] = c.isApar
        contentIds.push(childData.identifier)
        if (childData.status !== NsCardContent.IGOTConst.RETIRED) {
          cbpContentData.push(childData)
        }
      })
    })
    return { cbpContentData, contentIds }
  }
  async mapCbpData(cbpContent: any, enrollmentData: any, fullMeta: boolean = false) {
    let cbpFilteredContent: any = []
    if (cbpContent && cbpContent.length) {
      if (Object.keys(enrollmentData).length) {
        cbpContent.forEach((cbp: any) => {
          const childEnrollData = enrollmentData[cbp.identifier]

          const competencyArea: any = []
          const competencyTheme: any = []
          const competencyThemeType: any = []
          const competencySubTheme: any = []
          const competencyAreaId: any = []
          const competencyThemeId: any = []
          const competencySubThemeId: any = []
          cbp['contentStatus'] = 0
          if (childEnrollData) {
            cbp['contentStatus'] = childEnrollData.status
          }
          if (cbp[this.environment.compentencyVersionKey] && cbp[this.environment.compentencyVersionKey].length) {
            cbp[this.environment.compentencyVersionKey].forEach((element: any) => {
              if (!competencyArea.includes(element.competencyArea)) {
                competencyArea.push(element.competencyArea)
                competencyAreaId.push(element.competencyAreaId)
              }
              if (!competencyTheme.includes(element.competencyTheme)) {
                competencyTheme.push(element.competencyTheme)
                competencyThemeId.push(element.competencyThemeId)
              }
              if (!competencyThemeType.includes(element.competencyThemeType)) {
                competencyThemeType.push(element.competencyThemeType)
              }
              if (!competencySubTheme.includes(element.competencySubTheme)) {
                competencySubTheme.push(element.competencySubTheme)
                competencySubThemeId.push(element.competencySubThemeId)
              }
            })
          }

          cbp['competencyArea'] = competencyArea
          cbp['competencyTheme'] = competencyTheme
          cbp['competencyThemeType'] = competencyThemeType
          cbp['competencySubTheme'] = competencySubTheme
          cbp['competencyAreaId'] = competencyAreaId
          cbp['competencyThemeId'] = competencyThemeId
          cbp['competencySubThemeId'] = competencySubThemeId
          if (cbp.status !== NsCardContent.IGOTConst.RETIRED) {
            cbpFilteredContent.push(cbp)
          } else {
            if (childEnrollData && childEnrollData.status === 2) {
              cbpFilteredContent.push(cbp)
            }
          }
        });
        if (cbpFilteredContent.length > 1) {
          const sortedData: any = cbpFilteredContent.sort((a: any, b: any) => {
            const firstDate: any = new Date(a.endDate)
            const secondDate: any = new Date(b.endDate)

            return secondDate > firstDate ? 1 : -1
          })
          const uniqueUsersByID = lodash.uniqBy(sortedData, 'identifier')
          const sortedByEndDate = lodash.orderBy(uniqueUsersByID, ['endDate'], ['asc'])
          const sortedByStatus = lodash.orderBy(sortedByEndDate, ['contentStatus'], ['asc'])
          if (fullMeta) {
            return sortedByStatus
          }
          let cbpContentSorted = this.requiredCBPData(sortedByStatus)
          return cbpContentSorted
        }
        if (fullMeta) {
          return cbpFilteredContent
        }
        let cbpContentFiltered = this.requiredCBPData(cbpFilteredContent)
        return cbpContentFiltered
      }
      if (fullMeta) {
        return cbpContent
      }
      let cbpContentAll = this.requiredCBPData(cbpContent)
      return cbpContentAll
    }
    if (fullMeta) {
      return []
    }
    let cbpContentEmpty = this.requiredCBPData([])
    return cbpContentEmpty
  }

  requiredCBPData(cbpData: any) {
    const requiredCbpData: any[] = []
    if (cbpData?.length) {
      cbpData.forEach((cbp: any) => {
        const cbpObj: any = {}
        // Always include identifier
        cbpObj.identifier = cbp.identifier
        // Common display fields
        if (cbp.name) {
          cbpObj.name = cbp.name
        }
        // normalize download URL (handle both downloadUrl and downloaUrl)
        const download = cbp.downloaUrl || cbp.downloadUrl || (cbp.variants && cbp.variants.spine && cbp.variants.spine.ecarUrl) || (cbp.variants && cbp.variants.online && cbp.variants.online.ecarUrl)
        if (download) {
          cbpObj.downloaUrl = download
        }
        // scheduling / plan fields
        ;['endDate', 'planDuration','appIcon','difficultyLevel','avgRating','posterImage','duration','primaryCategory','courseCategory','planType', 'contentStatus', 'status', 'isApar'].forEach((k: string) => {
          if (cbp[k] !== undefined) {
            cbpObj[k] = cbp[k]
          }
        })
        // competency related fields (already computed in mapCbpData)
        // ;['competencies_v5', 'competencyArea', 'competencyTheme', 'competencyThemeType', 'competencySubTheme', 'competencyAreaId', 'competencyThemeId', 'competencySubThemeId'].forEach((k: string) => {
        //   if (cbp[k] !== undefined) {
        //     cbpObj[k] = cbp[k]
        //   }
        // })
        requiredCbpData.push(cbpObj)
      })
    }
    // persist only the reduced metadata to keep localStorage small
    localStorage.setItem('cbpData', JSON.stringify(requiredCbpData))
    return requiredCbpData
  }
  mapEnrollmentData(courseData: any) {
    const enrollData: any = {}
    if (courseData && courseData.courses.length) {
      courseData.courses.forEach((data: any) => {
        enrollData[data.collectionId] = data
      })
    }
    return enrollData
  }

  fetchExtEnrollData() {
    return this.http.get(API_END_POINTS.FETCH_EXTERNAL_ENROLLMENT_LIST).pipe(map((extRes: any) => {
      if (extRes && extRes.result && extRes.result.courses) {
        extRes.result.courses.forEach((ele: any) => {
          ele['completionPercentage'] = ele['completionpercentage']
          // ele['content']['appIcon'] = ele['completionpercentage']
          ele['lastContentAccessTime'] = ele.content && ele.content.lastUpdatedOn ? new Date(ele.content.lastUpdatedOn).getTime() : ''
          if (ele.content) {
            ele['content']['organisation'] = ele.content && ele.content.contentPartner && ele.content.contentPartner.contentPartnerName ? [ele.content.contentPartner.contentPartnerName] : []
            ele['content']['completionStatus'] = ele['completionpercentage'] < 100 ? 1 : 2
            ele['content']['creatorLogo'] = ele['content']['contentPartner']['link']

          }
        })
      }
      return extRes
    }))
  }

  fetchEventEnrollData(userId: any) {
    return this.http.get(API_END_POINTS.FETCH_EVENTS_ENROLLMENT_LIST(userId)).pipe(map((eventRes: any) => {
      if (eventRes && eventRes.result && eventRes.result.events) {
        eventRes.result.events.forEach((ele: any) => {
          ele['event']['eventId'] = ele.contentId
          ele['completionPercentage'] = ele['completionpercentage'] > 50 ? 100 : ele['completionpercentage']
        })
      }
      return eventRes
    }))
  }
  fetchDesignationsData() {
    const result: any = this.http.get(API_END_POINTS.FETCH_DESIGNATION_COURSES).pipe(catchError(this.handleError1), map(
      async (data: any) => {
        if (data.result && data.result.courseList) {
          return data.result.courseList
        }
        return ''
      })
    )
    return result
  }
  generateCoursesSakshamAI(apiEndpoint: string, requestBody: any) {
    const result: any = this.http.post(apiEndpoint, requestBody).pipe(catchError(this.handleError1), map(
      async (data: any) => {
        return data
      })
    )
    return result
  }

  getRecommendedCoursesSakshamAI(userId: string) {
    const result: any = this.http.get(API_END_POINTS.GET_RECOMMENDED_COURSES_WITH_FEEDBACK(userId)).pipe(catchError(this.handleError1), map(
      async (data: any) => {
        return data
      })
    )
    return result
  }

  getOrgReadData(organisationId: string): Observable<any> {
      const request = {
          request: {
            organisationId,
          },
      };
      return this.http.post<any>(API_END_POINTS.ORG_READ, request).pipe(
          map((res: any) => {
          return lodash.get(res, 'result.response');
          })
      );
    }

}
