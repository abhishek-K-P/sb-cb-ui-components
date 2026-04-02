import { Injectable } from '@angular/core'
import { Data } from '@angular/router'
import { Subject, Observable, EMPTY, Subscription, BehaviorSubject, ReplaySubject, of, throwError } from 'rxjs'
import { HttpClient } from '@angular/common/http'
import { NsContent } from '../_services/widget-content.model'
import { NsContentConstants } from '../_constants/widget-content.constants'
import { WidgetContentService } from '../_services/widget-content.service'
import { NsAppToc, NsCohorts } from '../models/app-toc.model'
import { TFetchStatus, ConfigurationsService } from '@sunbird-cb/utils-v2'
// tslint:disable-next-line
import _ from 'lodash'
import { ContentLanguageService } from '@sunbird-cb/consumption'
import { map, catchError } from 'rxjs/operators'

// TODO: move this in some common place
const PROTECTED_SLAG_V8 = '/apis/protected/v8'
const PROXY_SLAG_V8 = '/apis/proxies/v8'

const API_END_POINTS = {
  BATCH_CREATE: `${PROXY_SLAG_V8}/learner/course/v1/batch/create`,
  CONTENT_PARENTS: `${PROTECTED_SLAG_V8}/content/parents`,
  CONTENT_NEXT: `${PROTECTED_SLAG_V8}/content/next`,
  CONTENT_HISTORYV2: `/apis/proxies/v8/read/content-progres`,
  CONTENT_PARENT: (contentId: string) => `${PROTECTED_SLAG_V8}/content/${contentId}/parent`,
  CONTENT_AUTH_PARENT: (contentId: string, rootOrg: string, org: string) =>
    `/apis/authApi/action/content/parent/hierarchy/${contentId}?rootOrg=${rootOrg}&org=${org}`,
  COHORTS: (cohortType: NsCohorts.ECohortTypes, contentId: string) =>
    `${PROTECTED_SLAG_V8}/cohorts/${cohortType}/${contentId}`,
  EXTERNAL_CONTENT: (contentId: string) =>
    `${PROTECTED_SLAG_V8}/content/external-access/${contentId}`,
  COHORTS_GROUP_USER: (groupId: number) => `${PROTECTED_SLAG_V8}/cohorts/${groupId}`,
  RELATED_RESOURCE: (contentId: string, contentType: string) =>
    `${PROTECTED_SLAG_V8}/khub/fetchRelatedResources/${contentId}/${contentType}`,
  POST_ASSESSMENT: (contentId: string) =>
    `${PROTECTED_SLAG_V8}/user/evaluate/post-assessment/${contentId}`,
  GET_CONTENT: (contentId: string) =>
    `${PROXY_SLAG_V8}/content/v2/read/${contentId}`,
  CERT_DOWNLOAD: (certId: any) => `${PROTECTED_SLAG_V8}/cohorts/course/batch/cert/download/${certId}`,
  SERVER_DATE: 'apis/public/v8/systemDate',
  SHARE_CONTENT: '/apis/proxies/v8/user/v1/content/recommend',
  GET_FORM_BYID: (formId: string) => `apis/proxies/v8/forms/v2/getFormById?formId=${formId}`,
  // SUBMIT_FORM: `/apis/proxies/v8/forms/v1/saveFormSubmit`,
  SUBMIT_FORM: `apis/proxies/v8/forms/v2/saveFormSubmit`,
  GET_FORM_BYID_PUBLIC: (formId: string) => `apis/public/v8/public/forms/v2/getFormById?formId=${formId}`,
  SUBMIT_FORM_PUBLIC: `apis/public/v8/public/forms/v2/saveFormSubmit`,
  // get answers for form
  GET_APPLICATIONS_BY_ID: (formId: string, contextId: string) => `/apis/proxies/v8/forms/v2/getApplicationsById?formId=${formId}&contextId=${contextId}`,
  AI_RESOURCE_VTT_FILE: `${PROXY_SLAG_V8}/chatbot/v3/transcoder/stats`,
  // GET_FORM_BYID: (formId: string) => `apis/proxies/v8/forms/getFormById?id=${formId}`,
  PRE_ENROLLMENT_STATE_READ: `/apis/proxies/v8/content/v2/state/read`,
  CREATE_RESOURCE: `apis/proxies/v8/action/content/v3/create`,
  READ_RESOURCE: `apis/proxies/v8/action/content/v3/`,
  UPLOAD_FILE: `apis/proxies/v8/upload/action/content/v3/`,
  UPDATE_RESOURCE: `apis/proxies/v8/action/content/v3/update`,
  SEARCH: `apis/proxies/v8/assignment/v1/search`,
  SUBMIT_DRAFT_ASSIGNMENT: `apis/proxies/v8/assignment/v1/submitDraft`,
  SUBMIT_ASSIGNMENT: `apis/proxies/v8/assignment/v1/submit`,
  ASSIGNMENT_STATUS: `apis/proxies/v8/forms/v2/submissions/search`,
  UPLOAD_ASSIGNMENT: `apis/proxies/v8/storage/v1/bp/assignment/answer`,
  READ_ASSIGNMENT: `apis/proxies/v8/storage/v1/bp/assignment/answer/read/file`,
  NOTIFY_ASSIGNMENT_SUBMISSION: `apis/proxies/v8/v1/notifyAssignment/submit`,
}

@Injectable({
  providedIn: 'root'
})
export class AppTocService {
  analyticsReplaySubject: Subject<any> = new Subject()
  analyticsFetchStatus: TFetchStatus = 'none'
  batchReplaySubject: Subject<any> = new Subject()
  setBatchDataSubject: Subject<any> = new Subject()
  getSelectedBatch: Subject<any> = new Subject()

  /**
   * Helper function to ensure completionStatus is always a number
   * Converts string values to 0 and ensures valid number range (0, 1, 2)
   */
  private safeCompletionStatus(value: any): number {
    const numValue = Number(value)
    if (isNaN(numValue) || typeof value === 'string') {
      return 0
    }
    return numValue
  }
  setWFDataSubject: Subject<any> = new Subject()
  resumeData: Subject<NsContent.IContinueLearningData | null> = new Subject<any>()
  private showSubtitleOnBanners = false
  private canShowDescription = false
  resumeDataSubscription: Subscription | null = null
  primaryCategory = NsContent.EPrimaryCategory
  private updateReviews = new BehaviorSubject(false)
  updateReviewsObservable = this.updateReviews.asObservable()
  public serverDate = new BehaviorSubject('')
  currentServerDate = this.serverDate.asObservable()
  public contentLoader = new BehaviorSubject(false)
  contentLoader$ = this.contentLoader.asObservable()
  public getPageScroll = new BehaviorSubject(true)
  updatePageScroll = this.getPageScroll.asObservable()
  public hashmap: any = {}
  private currentRootContentId: string | null = null // Track current content to avoid unnecessary hashmap clearing
  public hashmapUpdated = new BehaviorSubject<any>(null)
  hashmapUpdated$ = this.hashmapUpdated.asObservable()
  private transriptionDataSubject = new BehaviorSubject<any>(null); // Start with null
  transcriptionData$ = this.transriptionDataSubject.asObservable();
  public transriptionActiveLanguageDataObject = new BehaviorSubject<any>(null);
  public transriptionActiveLanguageDataObject$ = this.transriptionActiveLanguageDataObject.asObservable();
  public transriptionIdentifier = new Subject(); // Start with null
  changeTranscriptionLanguageEvent = new ReplaySubject(1)
  playTranscriptionVideo = new Subject()
  constructor(private http: HttpClient, private contentLangSvc: ContentLanguageService, private configSvc: ConfigurationsService, private widgetSvc: WidgetContentService) {
    // this resume data subscription is for on load
    this.resumeDataSubscription = this.resumeData.subscribe(
      (_dataResult: any) => {
      })
  }

  get subtitleOnBanners(): boolean {
    return this.showSubtitleOnBanners
  }
  set subtitleOnBanners(val: boolean) {
    this.showSubtitleOnBanners = val
  }
  get showDescription(): boolean {
    return this.canShowDescription
  }
  set showDescription(val: boolean) {
    this.canShowDescription = val
  }

  updateBatchData() {
    this.batchReplaySubject.next()
  }

  setBatchData(data: NsContent.IBatchListResponse) {
    this.setBatchDataSubject.next(data)
  }

  setWFData(data: any) {
    this.setWFDataSubject.next(data)
  }

  updateResumaData(data: any) {
    this.resumeData.next(data)
  }

  changeUpdateReviews(state: boolean) {
    this.updateReviews.next(state)
  }
  getSelectedBatchData(data: any) {
    this.getSelectedBatch.next(data)
  }

  changeServerDate(state: any) {
    this.serverDate.next(state)
  }

  mapSessionCompletionPercentage(batchData: any, resumeDataPass?: any) {
    if (resumeDataPass && resumeDataPass.length) {
      if (resumeDataPass && resumeDataPass.length && batchData.content && batchData.content.length) {
        this.sessionCompletionPercentage(batchData, resumeDataPass)
      }
    } else {
      this.resumeDataSubscription = this.resumeData.subscribe(
        (dataResult: any) => {
          if (dataResult && dataResult.length && batchData.content && batchData.content.length) {
            this.sessionCompletionPercentage(batchData, dataResult)
          }
        },
        () => {
          this.contentLoader.next(false)
        })
    }

  }
  sessionCompletionPercentage(batchData: any, resumeDataPass: any) {
    if (resumeDataPass && resumeDataPass.length) {
      if (batchData && batchData.content[0] &&
        batchData.content[0].batchAttributes &&
        batchData.content[0].batchAttributes.sessionDetails_v2
      ) {
        batchData.content[0].batchAttributes.sessionDetails_v2.map((sd: any) => {
          const foundContent = resumeDataPass.find((el: any) => el.contentId === sd.sessionId)
          if (foundContent) {
            sd.completionPercentage = foundContent.completionPercentage
            sd.completionStatus = this.safeCompletionStatus(foundContent.status)
            sd.lastCompletedTime = foundContent.lastCompletedTime
          }
        })
        this.contentLoader.next(false)
      }
    }
  }

  showStartButton(content: NsContent.IContent | null): { show: boolean; msg: string } {
    const status = {
      show: false,
      msg: '',
    }
    if (content) {
      if (
        content.artifactUrl && content.artifactUrl.match(/youtu(.)?be/gi) &&
        this.configSvc.userProfile &&
        this.configSvc.userProfile.country === 'China'
      ) {
        status.show = false
        status.msg = 'youtubeForbidden'
        return status
      }
      if (content.resourceType !== 'Certification') {
        status.show = true
        return status
      }
    }
    return status
  }

  initData(data: Data, needResumeData: boolean = false): NsAppToc.IWsTocResponse {
    let content: NsContent.IContent | null = null
    let errorCode: NsAppToc.EWsTocErrorCode | null = null
    this.contentLoader.next(true)
    if (data.content && data.content.data && data.content.data.identifier) {
      content = data.content.data
      if (needResumeData) {
        this.resumeDataSubscription = this.resumeData.subscribe(
          (dataResult: any) => {
            if (dataResult && dataResult.length) {
              this.contentLoader.next(true)
              this.mapCompletionPercentage(content, dataResult)
            }
          },
          () => {
            // tslint:disable-next-line: no-console
            console.log('error on resumeDataSubscription')
          },
        )
      } else {
        this.contentLoader.next(false)
      }
    } else {
      this.contentLoader.next(false)
      if (data.error) {
        errorCode = NsAppToc.EWsTocErrorCode.API_FAILURE
      } else {
        errorCode = NsAppToc.EWsTocErrorCode.NO_DATA
      }
    }
    // this.contentLoader.next(false)
    return {
      content,
      errorCode,
    }
  }

  mapCompletionPercentage(content: NsContent.IContent | null, dataResult: any) {
    if (content && content.children) {
      content.children.map(child => {
        const foundContent = dataResult.find((el: any) => el.contentId === child.identifier)
        if (foundContent) {
          child.completionPercentage = foundContent.completionPercentage || foundContent.progress
          child.completionStatus = this.safeCompletionStatus(foundContent.status)
        } else {
          this.mapCompletionPercentage(child, dataResult)
        }
      })
      this.contentLoader.next(false)
    } else {
      this.contentLoader.next(false)
    }
  }

  mapModuleCount(content: NsContent.IContent) {
    if (content && content.children) {
      content.children.map(child => {
        if (child.primaryCategory === NsContent.EPrimaryCategory.MODULE) {
          content['moduleCount'] = content['moduleCount'] ? content['moduleCount'] + 1 : 1
        }
        if (child.primaryCategory === NsContent.EPrimaryCategory.COURSE) {
          this.mapModuleCount(child)
        }
      })
    }
  }

  getMimeType(content: NsContent.IContent, identifier: string): NsContent.EMimeTypes {
    if (content.identifier === identifier) {
      return content.mimeType
    }
    if (content && content.children) {
      if (content.children.length === 0) {
        // if (content.children[0].identifier === identifier) {
        //   return content.mimeType
        // }
        // big blunder in data
        // this.logger.log(content.identifier, 'Wrong mimetypes for resume')
        return content.mimeType
      }
      const flatList: any[] = []
      const getAllItemsPerChildren: any = (item: NsContent.IContent) => {
        flatList.push(item)
        if (item.children) {
          return item.children.map((i: NsContent.IContent) => getAllItemsPerChildren(i))
        }
        return
      }
      getAllItemsPerChildren(content)
      const chld = _.first(_.filter(flatList, { identifier }))
      return (chld && chld.mimeType) || ''
    }
    // return chld.mimeType
    return NsContent.EMimeTypes.UNKNOWN
  }

  getTocStructure(
    content: NsContent.IContent,
    tocStructure: NsAppToc.ITocStructure,
  ): NsAppToc.ITocStructure {
    if (
      content &&
      !(content.primaryCategory === this.primaryCategory.RESOURCE
        // || content.primaryCategory === this.primaryCategory.KNOWLEDGE_ARTIFACT)
        || content.primaryCategory === this.primaryCategory.PRACTICE_RESOURCE
        || content.primaryCategory === this.primaryCategory.FINAL_ASSESSMENT
        || content.primaryCategory === this.primaryCategory.OFFLINE_SESSION
      )) {
      if (content.primaryCategory === NsContent.EPrimaryCategory.COURSE) {
        tocStructure.course += 1
      } else if (content.primaryCategory === NsContent.EPrimaryCategory.MODULE) {
        tocStructure.learningModule += 1
      }
      _.each(content.children, child => {
        // tslint:disable-next-line: no-parameter-reassignment
        tocStructure = this.getTocStructure(child, tocStructure)
      })
    } else if (
      content &&
      (
        content.primaryCategory === NsContent.EPrimaryCategory.RESOURCE
        // || content.contentType === 'Knowledge Artifact'
        || content.primaryCategory === NsContent.EPrimaryCategory.PRACTICE_RESOURCE
        || content.primaryCategory === NsContent.EPrimaryCategory.FINAL_ASSESSMENT
        || content.primaryCategory === NsContent.EPrimaryCategory.OFFLINE_SESSION)
    ) {
      switch (content.mimeType) {
        // case NsContent.EMimeTypes.HANDS_ON:
        //   tocStructure.handsOn += 1
        //   break
        case NsContent.EMimeTypes.MP3:
          tocStructure.podcast += 1
          break
        case NsContent.EMimeTypes.MP4:
        case NsContent.EMimeTypes.M3U8:
        case NsContent.EMimeTypes.YOUTUBE:
          tocStructure.video += 1
          break
        // case NsContent.EMimeTypes.INTERACTION:
        //   tocStructure.interactiveVideo += 1
        //   break
        case NsContent.EMimeTypes.PDF:
          tocStructure.pdf += 1
          break
        // case NsContent.EMimeTypes.HTML:
        case NsContent.EMimeTypes.TEXT_WEB:
          tocStructure.webPage += 1
          break
        case NsContent.EMimeTypes.SURVEY:
          tocStructure.survey += 1
          break
        case NsContent.EMimeTypes.QUIZ:
        case NsContent.EMimeTypes.APPLICATION_JSON:
          // if (content.resourceType === 'Assessment') {
          tocStructure.assessment += 1
          // } else {
          //   tocStructure.quiz += 1
          // }
          break
        case NsContent.EMimeTypes.OFFLINE_SESSION:
          // if (content.resourceType === 'Assessment') {
          tocStructure.offlineSession += 1
          // } else {
          //   tocStructure.quiz += 1
          // }
          break
        case NsContent.EMimeTypes.PRACTICE_RESOURCE:
           if(content.contextCategory === NsContent.EAssessmentContextCategory.PRELIMINARY_ASSESSMENT) {
            tocStructure['preEnrollmentAssessment'] += 1 
          }else if (content.primaryCategory === this.primaryCategory.PRACTICE_RESOURCE) {
            tocStructure.practiceTest += 1
          } else if (content.primaryCategory === this.primaryCategory.FINAL_ASSESSMENT) {
            tocStructure.finalTest += 1
          }
          break
        // case NsContent.EMimeTypes.WEB_MODULE:
        //   tocStructure.webModule += 1
        //   break
        case NsContent.EMimeTypes.ZIP2:
        case NsContent.EMimeTypes.ZIP:
          tocStructure.interactivecontent += 1
          break
        // case NsContent.EMimeTypes.YOUTUBE:
        //   tocStructure.youtube += 1
        //   break
        default:
          tocStructure.other += 1
          break
      }
      return tocStructure
    }
    return tocStructure
  }

  filterToc(
    content: NsContent.IContent,
    filterCategory: NsContent.EFilterCategory = NsContent.EFilterCategory.ALL,
  ): NsContent.IContent | null {
    if (content.primaryCategory === NsContent.EPrimaryCategory.RESOURCE
      //  || content.contentType === 'Knowledge Artifact'
      || content.primaryCategory === NsContent.EPrimaryCategory.PRACTICE_RESOURCE
      || content.primaryCategory === NsContent.EPrimaryCategory.FINAL_ASSESSMENT
      || content.primaryCategory === NsContent.EPrimaryCategory.OFFLINE_SESSION) {
      return this.filterUnitContent(content, filterCategory) ? content : null
    }
    const filteredChildren: NsContent.IContent[] =
      _.map(_.get(content, 'children'), childContent =>
        this.filterToc(childContent, filterCategory))
        .filter(unitContent => Boolean(unitContent)) as NsContent.IContent[]
    if (filteredChildren && filteredChildren.length) {
      return {
        ...content,
        children: filteredChildren,
      }
    }
    return null
  }

  filterUnitContent(
    content: NsContent.IContent,
    filterCategory: NsContent.EFilterCategory = NsContent.EFilterCategory.ALL,
  ): boolean {
    switch (filterCategory) {
      case NsContent.EFilterCategory.LEARN:
        return (
          !NsContentConstants.VALID_PRACTICE_RESOURCES.has(content.resourceType) &&
          !NsContentConstants.VALID_ASSESSMENT_RESOURCES.has(content.resourceType)
        )
      case NsContent.EFilterCategory.PRACTICE:
        return NsContentConstants.VALID_PRACTICE_RESOURCES.has(content.resourceType)
      case NsContent.EFilterCategory.ASSESS:
        return NsContentConstants.VALID_ASSESSMENT_RESOURCES.has(content.resourceType)
      case NsContent.EFilterCategory.ALL:
      default:
        return true
    }
  }
  fetchContentAnalyticsClientData(contentId: string) {
    if (this.analyticsFetchStatus !== 'fetching' && this.analyticsFetchStatus !== 'done') {
      this.getContentAnalyticsClient(contentId)
    }
  }
  private getContentAnalyticsClient(contentId: string) {
    this.analyticsFetchStatus = 'fetching'
    const url = `${PROXY_SLAG_V8}/LA/api/la/contentanalytics?content_id=${contentId}&type=course`
    this.http.get(url).subscribe(
      (result: any) => {
        this.analyticsFetchStatus = 'done'
        this.analyticsReplaySubject.next(result)
      },
      () => {
        this.analyticsReplaySubject.next(null)
        this.analyticsFetchStatus = 'done'
      },
    )
  }

  fetchContentAnalyticsData(contentId: string) {
    if (this.analyticsFetchStatus !== 'fetching' && this.analyticsFetchStatus !== 'done') {
      this.getContentAnalytics(contentId)
    }
  }
  private getContentAnalytics(contentId: string) {
    this.analyticsFetchStatus = 'fetching'
    // tslint:disable-next-line: max-line-length
    const url = `${PROXY_SLAG_V8}/LA/LA/api/Users?refinementfilter=${encodeURIComponent(
      '"source":["iGot","Learning Hub"]',
    )}$${encodeURIComponent(`"courseCode": ["${contentId}"]`)}`
    this.http.get(url).subscribe(
      (result: any) => {
        this.analyticsFetchStatus = 'done'
        this.analyticsReplaySubject.next(result)
      },
      () => {
        this.analyticsReplaySubject.next(null)
        this.analyticsFetchStatus = 'done'
      },
    )
  }

  clearAnalyticsData() {
    if (this.analyticsReplaySubject) {
      this.analyticsReplaySubject.unsubscribe()
    }
  }

  /**
   * Reset hashmap and related content data
   * Call this when navigating away from content to prevent stale data
   */
  resetContentData() {
    this.hashmap = {}
    this.currentRootContentId = null
    this.hashmapUpdated.next(null)
  }

  fetchContentParents(contentId: string): Observable<NsContent.IContentMinimal[]> {
    // return this.http.get<NsContent.IContentMinimal[]>(
    //   `${API_END_POINTS.CONTENT_PARENTS}/${contentId}`,
    // )
    if (contentId) { }
    return EMPTY
  }
  fetchContentWhatsNext(
    contentId: string,
    contentType?: string,
  ): Observable<NsContent.IContentMinimal[]> {
    if (contentType) {
      return this.http.get<NsContent.IContentMinimal[]>(
        `${API_END_POINTS.CONTENT_NEXT}/${contentId}?contentType=${contentType}`,
      )
    }
    return this.http.get<NsContent.IContentMinimal[]>(
      `${API_END_POINTS.CONTENT_NEXT}/${contentId}?ts=${new Date().getTime()}`,
    )
  }

  fetchMoreLikeThisPaid(contentId: string): Observable<NsContent.IContentMinimal[]> {
    return this.http.get<NsContent.IContentMinimal[]>(
      `${API_END_POINTS.CONTENT_NEXT
      }/${contentId}?exclusiveContent=true&ts=${new Date().getTime()}`,
    )
  }

  fetchMoreLikeThisFree(contentId: string): Observable<NsContent.IContentMinimal[]> {
    return this.http.get<NsContent.IContentMinimal[]>(
      `${API_END_POINTS.CONTENT_NEXT
      }/${contentId}?exclusiveContent=false&ts=${new Date().getTime()}`,
    )
  }

  fetchContentCohorts(
    cohortType: NsCohorts.ECohortTypes,
    contentId: string,
  ): Observable<NsCohorts.ICohortsContent[]> {
    return this.http.get<NsCohorts.ICohortsContent[]>(API_END_POINTS.COHORTS(cohortType, contentId), {
      headers: { rootOrg: this.configSvc.rootOrg || '', org: this.configSvc.org ? this.configSvc.org[0] : '' },
    })
  }
  fetchExternalContentAccess(contentId: string): Observable<{ hasAccess: boolean }> {
    return this.http.get<{ hasAccess: boolean }>(API_END_POINTS.EXTERNAL_CONTENT(contentId))
  }
  fetchCohortGroupUsers(groupId: number) {
    return this.http.get<NsCohorts.ICohortsGroupUsers[]>(API_END_POINTS.COHORTS_GROUP_USER(groupId))
  }
  fetchMoreLikeThis(contentId: string, contentType: string): Observable<any> {
    return this.http.get<NsContent.IContent[]>(
      API_END_POINTS.RELATED_RESOURCE(contentId, contentType),
    )
  }

  fetchPostAssessmentStatus(contentId: string) {
    return this.http.get<{ result: NsAppToc.IPostAssessment[] }>(
      API_END_POINTS.POST_ASSESSMENT(contentId),
    )
  }

  fetchGetContentData(contentId: string) {
    let url = ''
    const forPreview = window.location.href.includes('/public/') || window.location.href.includes('&preview=true')
    if (!forPreview) {
      return this.http.get<{ result: any }>(
        API_END_POINTS.GET_CONTENT(contentId),
      )
    }
    if (window.location.href.includes('editMode=true') && window.location.href.includes('_rc')) {
      url = `/apis/proxies/v8/content/v2/read/${contentId}`
    } else {
      url = `/api/content/v1/read/${contentId}`
    }
    return this.http.get<{ result: any }>(url)

  }

  fetchContentParent(contentId: string, data: NsAppToc.IContentParentReq, forPreview = false) {
    return this.http.post<NsAppToc.IContentParentResponse>(
      forPreview
        ? API_END_POINTS.CONTENT_AUTH_PARENT(
          contentId,
          this.configSvc.rootOrg || '',
          this.configSvc.org ? this.configSvc.org[0] : '',
        )
        : API_END_POINTS.CONTENT_PARENT(contentId),
      data,
    )
  }

  createBatch(batchData: any) {
    return this.http.post(
      API_END_POINTS.BATCH_CREATE,
      { request: batchData },
    )
  }

  async mapCompletionPercentageProgram(content: NsContent.IContent | null, enrolmentList: any, collectionId?: string) {
    this.contentLoader.next(true)
    let totalCount = 0
    let leafnodeCount = 0
    let completedLeafNodes: any = []
    let firstUncompleteCourse: any = ''
    let inprogressDataCheck: any = []
    if (content && content.children) {
      leafnodeCount = content.leafNodesCount
      this.contentLoader.next(true)
      const foundParentContent = this.findEnrolmentByCollectionId(enrolmentList, collectionId || content.identifier)
      if (foundParentContent && foundParentContent.completionPercentage === 100) {
        await this.mapCompletionChildPercentageProgram(content)
        totalCount = content.leafNodesCount
      } else {
        if (content?.primaryCategory !== NsContent.EPrimaryCategory.COURSE) {
          for (let i = 0; i < content.children.length; i += 1) {
            // content.children.forEach(async (parentChild,index) => {
            const parentChild = content.children[i]
            if (parentChild.primaryCategory === NsContent.EPrimaryCategory.COURSE) {
              const foundContent = this.findEnrolmentByCollectionId(enrolmentList, parentChild?.identifier)
              // tslint:disable-next-line: max-line-length
              // totalCount = foundContent && foundContent.completionPercentage ? totalCount + foundContent.completionPercentage : totalCount + 0
              // content.completionPercentage = Math.round(totalCount / leafnodeCount)
              if (foundContent && foundContent.completionPercentage === 100) {
                this.contentLoader.next(true)
                totalCount = totalCount += parentChild.leafNodesCount
                completedLeafNodes = [...completedLeafNodes, ...parentChild.leafNodes]
                if (foundContent.issuedCertificates.length > 0) {
                  const certificate: any = foundContent.issuedCertificates.sort((a: any, b: any) =>
                    new Date(a.lastIssuedOn).getTime() - new Date(b.lastIssuedOn).getTime())
                  const certId: any = certificate[0].identifier
                  parentChild.issuedCertificatesId = certId
                  // const certData: any = await this.dowonloadCertificate(certId).toPromise().catch(_error => {
                  //   this.contentLoader.next(false)
                  // })
                  // if (certData && certData.result) {
                  //   parentChild.issuedCertificatesSVG = certData.result.printUri
                  // }
                  this.contentLoader.next(false)
                }
                parentChild.completionPercentage = 100
                parentChild.completionStatus = 2
                await this.mapCompletionChildPercentageProgram(parentChild)
              } else {
                if (foundContent) {
                  this.contentLoader.next(true)
                  const language = this.contentLangSvc.getContentLanguage(parentChild)
                  const req = {
                    request: {
                      batchId: foundContent.batch.batchId,
                      userId: foundContent.userId,
                      language: language,
                      courseId: foundContent.collectionId,
                      contentIds: [],
                      fields: [
                        'progressdetails',
                      ],
                    },
                  }
                  firstUncompleteCourse = (parentChild.completionPercentage === 0 || !parentChild.completionPercentage) &&
                    !firstUncompleteCourse ? parentChild : firstUncompleteCourse
                  inprogressDataCheck = inprogressDataCheck
                  await this.fetchContentHistoryV2(req).toPromise().then((progressdata: any) => {
                    const data: any = progressdata
                    if (data.result && data?.result?.contentList?.length > 0) {
                      const completedCount = data.result.contentList.filter((ele: any) => ele.progress === 100)
                      this.checkCompletedLeafnodes(completedLeafNodes, completedCount)
                      totalCount = completedLeafNodes.length
                      inprogressDataCheck = [...inprogressDataCheck, ...data.result.contentList]
                      // inprogressDataCheck = inprogressDataCheck ? inprogressDataCheck :  data.result.contentList
                      this.updateResumaData(inprogressDataCheck)
                      this.mapCompletionPercentage(parentChild, data.result.contentList)
                      this.mapModuleCount(parentChild)
                    } else {
                      this.mapModuleCount(parentChild)
                    }
                    return progressdata
                  })
                  this.contentLoader.next(false)
                }
              }
            }
            //  else {
            //   if (content.primaryCategory !== NsContent.EPrimaryCategory.BLENDED_PROGRAM) {
            //     this.contentLoader.next(true)
            //     const foundContent = enrolmentList && enrolmentList.find((el: any) => el.collectionId === content.identifier)
            //     if (foundContent) {
            //       const req = {
            //         request: {
            //           batchId: foundContent.batch.batchId,
            //           userId: foundContent.userId,
            //           courseId: foundContent.collectionId,
            //           contentIds: [],
            //           fields: [
            //             'progressdetails',
            //           ],
            //         },
            //       }
            //       await this.fetchContentHistoryV2(req).toPromise().then((progressdata: any) => {
            //         const data: any  = progressdata
            //         if (data.result && data.result.contentList.length > 0) {
            //           const completedCount = data.result.contentList.filter((ele: any) => ele.progress === 100)
            //           this.checkCompletedLeafnodes(completedLeafNodes, completedCount)
            //           totalCount = completedLeafNodes.length
            //           inprogressDataCheck = inprogressDataCheck ? inprogressDataCheck :  data.result.contentList
            //           this.updateResumaData(inprogressDataCheck)
            //           this.mapCompletionPercentage(content, data.result.contentList)
            //         }
            //         this.contentLoader.next(false)
            //         return progressdata
            //       })
            //     }
            //     this.contentLoader.next(false)
            //   }
            // }
            this.contentLoader.next(false)
          }
        }
        if (content.primaryCategory === NsContent.EPrimaryCategory.BLENDED_PROGRAM
          || content.primaryCategory === NsContent.EPrimaryCategory.COURSE
          || content.primaryCategory === NsContent.EPrimaryCategory.STANDALONE_ASSESSMENT
          || content.primaryCategory === NsContent.EPrimaryCategory.CURATED_PROGRAM) {
          // this.mapCompletionPercentage(content, this.resumeData)
          const foundParentContent = this.findEnrolmentByCollectionId(enrolmentList, collectionId || content?.identifier)
          const language = this.contentLangSvc.getContentLanguage(content)
          const req = {
            request: {
              batchId: foundParentContent?.batch?.batchId,
              userId: foundParentContent?.userId,
              courseId: foundParentContent?.collectionId,
              language: language,
              contentIds: [],
              fields: [
                'progressdetails',
              ],
            },
          }
          await this.fetchContentHistoryV2(req).toPromise().then((progressdata: any) => {
            const data: any = progressdata
            if (data && data.result && data.result.contentList.length > 0) {
              const completedCount = data.result.contentList.filter((ele: any) => ele.progress === 100)
              this.checkCompletedLeafnodes(completedLeafNodes, completedCount)
              totalCount = completedLeafNodes.length
              inprogressDataCheck = [...inprogressDataCheck, ...data.result.contentList]
              // inprogressDataCheck = inprogressDataCheck ? inprogressDataCheck :  data.result.contentList
              this.updateResumaData(inprogressDataCheck)
              this.mapCompletionPercentage(content, data.result.contentList)
            }
            this.contentLoader.next(false)
            return progressdata
          })
        }

        if (inprogressDataCheck && inprogressDataCheck.length === 0 && firstUncompleteCourse) {
          const firstChildData = this.widgetSvc.getFirstChildInHierarchy(firstUncompleteCourse)
          const childEnrollmentData = enrolmentList.find((el: any) =>
            el.collectionId === firstUncompleteCourse.identifier)
          const resumeData = [{
            contentId: firstChildData.identifier,
            batchId: childEnrollmentData && childEnrollmentData.batchId,
            completedCount: 1,
            completionPercentage: 0.0,
            progress: 0,
            viewCount: 1,
            courseId: childEnrollmentData && childEnrollmentData.courseId,
            collectionId: childEnrollmentData && childEnrollmentData.courseId,
            status: 1,
          }]
          inprogressDataCheck = resumeData
          this.updateResumaData(inprogressDataCheck)
        }
      }
      // const parentContent = enrolmentList.find((el: any) => el.collectionId === content.identifier)
      // if (!parentContent.completionPercentage) {
      const calculatedPct = Math.floor((totalCount / leafnodeCount) * 100)
      content.completionPercentage = isNaN(calculatedPct) ? 0 : calculatedPct
      content.completionStatus = content.completionPercentage >= 100 ? 2 : (content.completionPercentage > 0 ? 1 : 0)
      if (content.completionPercentage === 100 && inprogressDataCheck && inprogressDataCheck.length === 0 && !firstUncompleteCourse) {
        const firstChildData = this.widgetSvc.getFirstChildInHierarchy(content)
        const childEnrollmentData = enrolmentList.find((el: any) =>
          el.collectionId === content.children[0].identifier)
        const resumeData = [{
          contentId: firstChildData.identifier,
          batchId: childEnrollmentData && childEnrollmentData.batchId,
          completedCount: 1,
          completionPercentage: 100,
          progress: 2,
          viewCount: 1,
          courseId: childEnrollmentData && childEnrollmentData.courseId,
          collectionId: childEnrollmentData && childEnrollmentData.courseId,
          status: 2,
        }]
        inprogressDataCheck = resumeData
        this.updateResumaData(inprogressDataCheck)
      }
      // // } else {
      //   content.completionPercentage = parentContent.completionPercentage
      // // }
      // })
      // this.mapModuleDurationAndProgress(content, content)
      this.callHirarchyProgressHashmap(content)
      this.checkModuleWiseData(content)
      // Compute milestone locking AFTER progress data is populated
      if (content.courseCategory === 'Learning Pathway') {
        // Check if user is enrolled by checking if enrollment data exists
        const isUserEnrolled = enrolmentList && enrolmentList.length > 0
        this.computeMilestoneLockingStatus(isUserEnrolled)
        // Ensure hashmap updates are published for change detection
        this.hashmap = { ...this.hashmap }
      }
      this.contentLoader.next(false)
    }
  }
  checkCompletedLeafnodes(leafNodes: any, completedCount: any) {
    if (completedCount.length > 0) {
      completedCount.forEach((ele: any) => {
        if (!leafNodes.includes(ele.contentId)) {
          leafNodes.push(ele.contentId)
        }
      })
    }
  }

  // async getProgressForChildCourse(request: any, content: any) {
  //  const data: any =   await this.fetchContentHistoryV2(request).toPromise().catch(_error => {})
  //   if (data.result && data.result.contentList.length > 0) {
  //     this.mapCompletionPercentage(content, data.result.contentList)
  // }
  // }

  findEnrolmentByCollectionId(enrolmentList: any, identifier: string) {
    return enrolmentList && enrolmentList?.length && enrolmentList.find((el: any) => el?.collectionId === identifier)
  }

  async mapCompletionChildPercentageProgram(course: any) {
    if (course && course.children) {
      await course.children.map(async (courseChild: any) => {
        if ((courseChild && courseChild.children) || courseChild.primaryCategory === NsContent.EPrimaryCategory.MODULE) {
          this.mapCompletionChildPercentageProgram(courseChild)
          course['moduleCount'] = course['moduleCount'] ? course['moduleCount'] + 1 : 1
        } else {
          courseChild['completionPercentage'] = 100
          courseChild['completionStatus'] = 2
        }
      })
    }
  }

  public mapModuleDurationAndProgress(content: NsContent.IContent | null, parent: NsContent.IContent | null) {
    if (content && content.children) {
      if (content.primaryCategory === NsContent.EPrimaryCategory.MODULE) {
        // content.children.map((item: NsContent.IContent)=> {
        /* tslint:disable-next-line */
        content = this.getCalculationsFromChildren(content)
        // })
      }

      content.children.map((item: NsContent.IContent) => {
        // if (item.primaryCategory === NsContent.EPrimaryCategory.MODULE) {
        //   this.mapModuleDurationAndProgress(item, parent)
        // } else {
        //   this.mapModuleDurationAndProgress(item, parent)
        // }
        if (item && item.children) {
          this.mapModuleDurationAndProgress(item, parent)
        }
      })
    }
  }

  public createHirarchyProgressHashmap(hierarchyData: NsContent.IContent, rootCourseCategory?: string, parentId?: string) {
    if (hierarchyData && hierarchyData.children) {
      hierarchyData.children.forEach((child: NsContent.IContent) => {
        // IMPORTANT: Pass the current hierarchyData's identifier as the parent for children
        // This ensures correct parent-child relationships in the hashmap
        if (child && child.children) {
          this.createHirarchyProgressHashmap(child, rootCourseCategory, hierarchyData.identifier)
        }
        const primaryCat = child.primaryCategory as string
        const courseCat = (child.courseCategory || child.primaryCategory || '') as string
        const isMilestone = primaryCat === 'Milestone' || courseCat === 'Milestone'
        const isCollection = child.mimeType === NsContent.EMimeTypes.COLLECTION
        const isModule = child.primaryCategory === NsContent.EPrimaryCategory.MODULE
        const isResource = child.primaryCategory === NsContent.EPrimaryCategory.RESOURCE ||
          child.primaryCategory === NsContent.EPrimaryCategory.PRACTICE_RESOURCE ||
          child.primaryCategory === NsContent.EPrimaryCategory.FINAL_ASSESSMENT ||
          child.primaryCategory === NsContent.EPrimaryCategory.COMP_ASSESSMENT
        const isLearningPathway = rootCourseCategory === 'Learning Pathway'

        // Check if content is mandatory (isMandatory flag or mandatory property)
        // By default, courses are mandatory unless isMandatory is explicitly false
        let isMandatory = true
        if (typeof child.isMandatory !== 'undefined') {
          isMandatory = child.isMandatory !== false
        } else if (typeof (child as any).mandatory !== 'undefined') {
          isMandatory = (child as any).mandatory !== false
        }

        // Use passed parentId (from iteration context) or fallback to child?.parent (from API)
        // This ensures nested children (e.g., assessments inside courses) have correct parent references
        const correctParentId = hierarchyData.identifier || child?.parent

        let localMap: any = {
          parent: correctParentId,
          identifier: child.identifier,
          leafNodesCount: child.leafNodesCount || null,
          leafNodes: child.leafNodes || [],
          completionPercentage: child.completionPercentage || child.progress || 0,
          completionStatus: this.safeCompletionStatus(child.completionStatus || child.status),
          status: this.safeCompletionStatus(child.status || child.completionStatus),
          progress: child.progress,
          primaryCategory: child.primaryCategory,
          courseCategory: courseCat,
          duration: child.duration || 0,
          expectedDuration: child.expectedDuration || 0,
          // Additional metadata for performance optimization
          mimeType: child.mimeType,
          isLocked: child.isLocked || false,
          artifactUrl: child.artifactUrl || null,
          name: child.name || '',
          contentType: child.contentType || '',
          // Pre-computed flags for Learning Pathway
          isMilestone: isMilestone,
          isCollection: isCollection,
          isModule: isModule,
          isResource: isResource,
          isLearningPathway: isLearningPathway,
          isMandatory: isMandatory,
          // Milestone specific data
          milestoneIndex: (child as any).milestoneIndex,
          completedLeafNodesCount: (child as any).completedLeafNodesCount || 0,
          // Pre-assessment flag (for milestone gating)
          isPreAssessment: (child as any).isPreAssessment || false,
        }

        // Debug logging for milestones
        if (isMilestone) {
          // Progress tracked for milestone
        }

        // Debug logging for assessment parent-child relationships
        // Note: FINAL_ASSESSMENT maps to 'Course Assessment' in the enum, not 'Final Assessment'
        const isAssessment = 
          child.primaryCategory === 'Course Assessment' ||
          child.primaryCategory === 'Standalone Assessment' ||
          child.mimeType === 'application/vnd.sunbird.questionset'
        
        if (isAssessment) {

        }

        

        this.hashmap[child.identifier] = localMap
      })
    }
  }

  public createPreAssessmentHirarchyProgressHashmap(hierarchyData: NsContent.IContent) {
    if (hierarchyData && hierarchyData.preEnrolmentResources) {
      hierarchyData.preEnrolmentResources.forEach((child: NsContent.IContent) => {
        if (child && child.preEnrolmentResources) {
          this.createPreAssessmentHirarchyProgressHashmap(child)
        }
        let localMap = {}
        localMap = {
          parent: child?.parent,
          identifier: child.identifier,
          leafNodesCount: child.leafNodesCount || null,
          leafNodes: child.leafNodes || [],
          completionPercentage: child.completionPercentage || child.progress,
          completionStatus: this.safeCompletionStatus(child.completionStatus),
          status: this.safeCompletionStatus(child.status || child.completionStatus),
          progress: child.progress,
          primaryCategory: child.primaryCategory,
          courseCategory: child.courseCategory || child.primaryCategory || '',
          duration: child.duration || 0,
          expectedDuration: child.expectedDuration || 0,
          // Mark as pre-assessment ONLY if explicitly set - do NOT default to true
          isPreAssessment: child.isPreAssessment || false,
        }
        this.hashmap[child.identifier] = localMap
      })
    }
  }

  public callHirarchyProgressHashmap(hierarchyData: NsContent.IContent | null) {
    if (hierarchyData) {
      const rootCourseCategory = hierarchyData.courseCategory || hierarchyData.primaryCategory || ''
      const isLearningPathway = rootCourseCategory === 'Learning Pathway'

      // CRITICAL: Only clear hashmap when navigating to DIFFERENT content
      // This prevents loss of real-time progress updates when content is being actively consumed
      // Clear when:
      // 1. Different Learning Pathways (which may have milestones with same generic IDs like M1, M2)
      // 2. Learning Pathway to regular Course (prevents stale milestone data)
      // 3. Regular Course to Learning Pathway
      // 4. Different regular Course
      const isNewContent = this.currentRootContentId !== hierarchyData.identifier
      if (isNewContent) {
        this.hashmap = {}
        this.currentRootContentId = hierarchyData.identifier
      }

      this.hashmap[hierarchyData.identifier] = {
        parent: hierarchyData.parent,
        identifier: hierarchyData.identifier,
        leafNodesCount: hierarchyData.leafNodesCount || null,
        leafNodes: hierarchyData.leafNodes || [],
        completionPercentage: hierarchyData.completionPercentage || hierarchyData.progress || 0,
        completionStatus: this.safeCompletionStatus(hierarchyData.completionStatus),
        progress: hierarchyData.progress,
        primaryCategory: hierarchyData.primaryCategory,
        courseCategory: rootCourseCategory,
        expectedDuration: hierarchyData.expectedDuration || 0,
        // Additional metadata
        mimeType: hierarchyData.mimeType,
        isLocked: hierarchyData.isLocked || false,
        artifactUrl: hierarchyData.artifactUrl || null,
        name: hierarchyData.name || '',
        contentType: hierarchyData.contentType || '',
        isMilestone: false,
        isCollection: hierarchyData.mimeType === NsContent.EMimeTypes.COLLECTION,
        isModule: hierarchyData.primaryCategory === NsContent.EPrimaryCategory.MODULE,
        isResource: false,
        isLearningPathway: isLearningPathway,
      }
      if (hierarchyData.primaryCategory === NsContent.EPrimaryCategory.CURATED_PROGRAM &&
        hierarchyData.compatibilityLevel >= 5 && hierarchyData.contextLockingType &&
        hierarchyData.contextLockingType === NsContent.EContextLockingType.COURSE_ASSESSMENT_ONLY) {
        this.hashmap[hierarchyData.identifier] = {
          ...this.hashmap[hierarchyData.identifier],
          contextLockingType: hierarchyData.contextLockingType,
          compatibilityLevel: hierarchyData.compatibilityLevel,
        }
      }
      this.createHirarchyProgressHashmap(hierarchyData, rootCourseCategory)
      // NOTE: computeMilestoneLockingStatus is called AFTER progress data is populated
      // in mapCompletionPercentageProgram, not here where completion data is still 0
      this.hashmap = { ...this.hashmap }
    }
  }

  public computeMilestoneLockingStatus(isEnrolled: boolean = true) {
    
    if (!this.hashmap || Object.keys(this.hashmap).length === 0) {
      return
    }
    
    
    // STEP 1: Find all milestones and sort by index
    const milestoneEntries = Object.keys(this.hashmap)
      .filter(key => {
        const item = this.hashmap[key]
        return item.isMilestone || item.primaryCategory === 'Milestone' || item.courseCategory === 'Milestone'
      })
      .sort((a, b) => {
        const itemA = this.hashmap[a]
        const itemB = this.hashmap[b]
        if (itemA.milestoneIndex !== undefined && itemB.milestoneIndex !== undefined) {
          return itemA.milestoneIndex - itemB.milestoneIndex
        }
        const numA = parseInt(a.replace(/\D/g, '')) || 0
        const numB = parseInt(b.replace(/\D/g, '')) || 0
        return numA - numB
      })

    if (milestoneEntries.length === 0) {
      return
    }
    

    // STEP 2: If user NOT enrolled, lock ALL milestones and children
    if (!isEnrolled) {
      milestoneEntries.forEach(milestoneId => {
        this.hashmap[milestoneId].computedIsLocked = true
        this.hashmap[milestoneId].unlockMessage = 'Enroll in this course to access milestones'
      })
      // Lock all children
      Object.keys(this.hashmap).forEach(key => {
        if (!this.hashmap[key].isMilestone) {
          this.hashmap[key].isParentMilestoneLocked = true
        }
      })
      this.hashmap = { ...this.hashmap }
      this.hashmapUpdated.next({ timestamp: Date.now(), hashmap: this.hashmap })
      return
    }

    // STEP 3: Check pre-assessment completion
    const isPreAssessmentCompleted = this.checkPreAssessmentCompletion()

    // STEP 4: Compute locking for each milestone
    
    milestoneEntries.forEach((milestoneId, index) => {
      const milestone = this.hashmap[milestoneId]
      if (!milestone) return

      const milestoneNum = index + 1

      // MILESTONE 1: Unlocks when pre-assessment complete
      if (index === 0) {
        const isLocked = !isPreAssessmentCompleted
        this.hashmap[milestoneId].computedIsLocked = isLocked
        this.hashmap[milestoneId].unlockMessage = isLocked ?
          'Complete the preliminary assessment to unlock this milestone' : ''
        
        
        
        // For unlocked M1, check assessment locking
        if (!isLocked) {
          this.computeAssessmentLockingInMilestone(milestoneId)
        } else {
          this.markMilestoneChildrenAsParentLocked(milestoneId, true)
        }
        return
      }

      // MILESTONE N (N > 1): Unlocks when previous milestone complete
      const previousMilestoneId = milestoneEntries[index - 1]
      const previousMilestone = this.hashmap[previousMilestoneId]

      if (previousMilestone) {
        // Check completion via multiple strategies
        const prevCompletionPct = Number(previousMilestone.completionPercentage) || 0
        const prevCompletionStatus = Number(previousMilestone.completionStatus) || 0
        const prevStatus = Number(previousMilestone.status) || 0
        const prevCompletedLeafNodes = Number(previousMilestone.completedLeafNodesCount) || 0
        const prevLeafNodesCount = Number(previousMilestone.leafNodesCount) || 0

        

        let previousMilestoneComplete =
          prevCompletionPct >= 100 ||
          prevCompletionStatus === 2 ||
          prevStatus === 2 ||
          (prevLeafNodesCount > 0 && prevCompletedLeafNodes >= prevLeafNodesCount)


        // Fallback: Check individual items
        if (!previousMilestoneComplete) {
          const isPreviousMilestoneAssessmentComplete = this.checkMilestoneAssessmentComplete(previousMilestoneId)
          const isPreviousMilestoneMandatoryComplete = this.checkMilestoneMandatoryContentComplete(previousMilestoneId)
          previousMilestoneComplete = isPreviousMilestoneAssessmentComplete && isPreviousMilestoneMandatoryComplete
        }

        const isLocked = !previousMilestoneComplete
        this.hashmap[milestoneId].computedIsLocked = isLocked
        this.hashmap[milestoneId].unlockMessage = isLocked ?
          `Complete all mandatory content and assessment in Milestone ${index} to unlock this milestone` : ''
        
        
        
        // For unlocked milestones, check assessment locking
        if (!isLocked) {
          this.computeAssessmentLockingInMilestone(milestoneId)
        } else {
          this.markMilestoneChildrenAsParentLocked(milestoneId, true)
        }
      } else {
        this.hashmap[milestoneId].computedIsLocked = true
        this.hashmap[milestoneId].unlockMessage = 'Previous milestone not found'
      }
    })

    // STEP 4.5: Debug log milestone leaf nodes and their completion status
    milestoneEntries.forEach((milestoneId, index) => {
      const milestone = this.hashmap[milestoneId]
      if (!milestone) return
      
      
      if (milestone.leafNodes && milestone.leafNodes.length > 0) {
        milestone.leafNodes.forEach((leafId: string, i: number) => {
          const leafData = this.hashmap[leafId]
          if (leafData) {
            const isComplete = 
              leafData.completionStatus === 2 || 
              leafData.status === 2 || 
              (leafData.completionPercentage && leafData.completionPercentage >= 100) ||
              (leafData.progress && leafData.progress >= 100)
            
          }
        })
      }
    })
    
    // STEP 5: Compute parent milestone lock status for ALL children
    Object.keys(this.hashmap).forEach(key => {
      const item = this.hashmap[key]
      if (item.isMilestone) return // Skip milestones themselves

      // Traverse up to find if any ancestor milestone is locked
      let currentParentId = item.parent
      let depth = 0
      const maxDepth = 5
      let foundLockedParent = false

      while (currentParentId && depth < maxDepth) {
        const parentData = this.hashmap[currentParentId]
        if (parentData) {
          if (parentData.isMilestone && parentData.computedIsLocked) {
            this.hashmap[key].isParentMilestoneLocked = true
            foundLockedParent = true
            break
          }
          currentParentId = parentData.parent
        } else {
          break
        }
        depth++
      }
      
      if (!foundLockedParent) {
        this.hashmap[key].isParentMilestoneLocked = false
      }
    })

    
    // Debug: Log final lock status for all milestones
    const milestonesFinal = Object.keys(this.hashmap).filter(key => 
      this.hashmap[key].isMilestone || 
      this.hashmap[key].primaryCategory === 'Milestone' || 
      this.hashmap[key].courseCategory === 'Milestone'
    )
  
    
    this.hashmap = { ...this.hashmap }
    this.hashmapUpdated.next({ timestamp: Date.now(), hashmap: this.hashmap })
  }

  /**
   * Trigger milestone lock update when hashmap progress is updated externally
   * Called from viewer-util.service.ts after progress updates
   */
  public triggerMilestoneLockUpdate() {
    
    // Check if we have a Learning Pathway in the hashmap
    const hasLearningPathway = Object.keys(this.hashmap).some(key => {
      const item = this.hashmap[key]
      // Check using OR condition - either flag indicates Learning Pathway
      return item.isLearningPathway === true || item.courseCategory === 'Learning Pathway'
    })
    
    if (hasLearningPathway) {
      // Assume enrolled since progress was just updated
      this.computeMilestoneLockingStatus(true)
    } else {
      // For regular content (non-Learning Pathway), just emit the hashmap update
      // so the top-bar component can recalculate the completion count
      this.hashmap = { ...this.hashmap }
      this.hashmapUpdated.next({ timestamp: Date.now(), hashmap: this.hashmap })
    }
  }

  /**
   * Check if pre-assessment (preliminary assessment) is completed
   * Pre-assessment is typically a Course Assessment at the root level of Learning Pathway (before milestones)
   */
  private checkPreAssessmentCompletion(): boolean {
    
    // Find the Learning Pathway root - check multiple conditions
    let learningPathwayId: string | null = null
    for (const key of Object.keys(this.hashmap)) {
      const item = this.hashmap[key]
      // Check if this is the Learning Pathway root by any of these conditions
      if (item.courseCategory === 'Learning Pathway' || 
          item.isLearningPathway === true ||
          (item.primaryCategory === 'Blended Program' && item.courseCategory === 'Learning Pathway')) {
        learningPathwayId = key
        break
      }
    }

    if (!learningPathwayId) {
      return false
    }

    
    
    let foundPreAssessmentFlag = false
    for (const key of Object.keys(this.hashmap)) {
      const item = this.hashmap[key]
      if (item.isPreAssessment === true) {
        foundPreAssessmentFlag = true
        // STRICT CHECK: Only return true if completionStatus is EXACTLY 2 (not undefined, null, or 0)
        // completionPercentage check must be >= 100 AND be a number
        const completionStatus = Number(item.completionStatus)
        const status = Number(item.status)
        const completionPercentage = Number(item.completionPercentage)
        const progress = Number(item.progress)
        
        const isCompleted = (completionStatus === 2 || status === 2 || 
                            (completionPercentage >= 100 && !isNaN(completionPercentage)) || 
                            (progress >= 100 && !isNaN(progress)))
        
        return isCompleted
      }
    }
    
    

    // Step 2: Fallback - Look for Course Assessment that is a direct child of Learning Pathway (not a milestone child)
    for (const key of Object.keys(this.hashmap)) {
      const item = this.hashmap[key]
      // Must be a direct child of the Learning Pathway
      if (item.parent !== learningPathwayId) continue
      // Skip milestones
      if (item.isMilestone || item.primaryCategory === 'Milestone' || item.courseCategory === 'Milestone') continue
      // Must be a Course Assessment or Standalone Assessment
      if (item.primaryCategory !== 'Course Assessment' && item.primaryCategory !== 'Standalone Assessment') continue
      
      
      
      // STRICT CHECK: Only return true if completionStatus is EXACTLY 2
      const completionStatus = Number(item.completionStatus)
      const status = Number(item.status)
      const completionPercentage = Number(item.completionPercentage)
      const progress = Number(item.progress)
      
      const isCompleted = (completionStatus === 2 || status === 2 || 
                          (completionPercentage >= 100 && !isNaN(completionPercentage)) || 
                          (progress >= 100 && !isNaN(progress)))
      
      return isCompleted
    }

    // Step 3: If no pre-assessment found at all, keep milestones LOCKED (fail-safe)
    return false
  }

  /**
   * Check if a milestone's assessment is completed
   * ONLY checks the milestone assessment (Course Assessment that is a direct child of the milestone)
   * Does NOT check assessments nested inside courses within the milestone
   */
  private checkMilestoneAssessmentComplete(milestoneId: string): boolean {
    const milestone = this.hashmap[milestoneId]
    
    let foundMilestoneAssessment = false
    let isMilestoneAssessmentComplete = false


    // Check all items in hashmap that are DIRECT children of this milestone
    for (const key of Object.keys(this.hashmap)) {
      const item = this.hashmap[key]

      // CRITICAL: Only check DIRECT children (parent === milestoneId)
      if (item.parent !== milestoneId) continue

      // Check if this is a milestone assessment (Course Assessment as direct child of milestone)
      const isMilestoneAssessment =
        item.primaryCategory === 'Course Assessment' ||
        item.primaryCategory === 'Final Assessment' ||
        item.primaryCategory === 'Standalone Assessment'

      if (!isMilestoneAssessment) continue

      // Found the milestone assessment
      foundMilestoneAssessment = true
      const isCompleted = item.completionStatus === 2 || item.status === 2 || item.completionPercentage >= 100 || item.progress >= 100
      
      
      
      if (isCompleted) {
        isMilestoneAssessmentComplete = true
      }
      
      // Usually only one milestone assessment per milestone, but check all just in case
    }

    // CRITICAL LOGIC:
    // - If NO milestone assessment found → consider complete (no assessment requirement)
    // - If milestone assessment found → it must be completed
    if (!foundMilestoneAssessment) {
      return true
    }
    
    return isMilestoneAssessmentComplete
  }

  /**
   * Check if a milestone's mandatory content is completed
   * Only checks courses/content that are marked as isMandatory
   */
  private checkMilestoneMandatoryContentComplete(milestoneId: string): boolean {
    const milestone = this.hashmap[milestoneId]

    let mandatoryCount = 0
    let completedMandatoryCount = 0



    // Check all items in hashmap that are direct children of this milestone (courses)
    for (const key of Object.keys(this.hashmap)) {
      const item = this.hashmap[key]

      // Check if this item is a direct child of the milestone (course level)
      if (item.parent !== milestoneId) continue

      // Skip if not a course or collection
      if (item.primaryCategory !== 'Course' && !item.isCollection) continue

      // Skip assessments - they're checked separately
      const isAssessment =
        item.primaryCategory === 'Course Assessment' ||
        item.primaryCategory === 'Final Assessment' ||
        item.primaryCategory === 'Standalone Assessment' ||
        item.courseCategory === 'Course Assessment' ||
        (item.name && item.name.toLowerCase().includes('assessment'))
      if (isAssessment) continue

      // CRITICAL: Check if this content is mandatory
      // By default, courses ARE mandatory unless explicitly marked as optional (isMandatory: false)
      const isMandatory = item.isMandatory !== false
      
      if (isMandatory) {
        mandatoryCount++
        const isCompleted = item.completionStatus === 2 || item.status === 2 || item.completionPercentage >= 100 || item.progress >= 100
        
        
        
        if (isCompleted) {
          completedMandatoryCount++
        }
      }
    }

    const allComplete = mandatoryCount === 0 || completedMandatoryCount >= mandatoryCount
    return allComplete
  }

  /**
   * Check if a content item is a child (direct or nested) of a milestone
   */
  private isChildOfMilestone(contentId: string, milestoneId: string): boolean {
    let currentId = contentId
    let depth = 0
    const maxDepth = 10

    while (currentId && depth < maxDepth) {
      const item = this.hashmap[currentId]
      if (!item) return false
      if (item.parent === milestoneId) return true
      currentId = item.parent
      depth++
    }
    return false
  }

  /**
   * Compute assessment locking within an unlocked milestone
   * Assessment locks until all mandatory courses in the milestone are completed
   */
  private computeAssessmentLockingInMilestone(milestoneId: string): void {
    const milestone = this.hashmap[milestoneId]
    if (!milestone) return


    // Find assessment in this milestone
    let assessmentId: string | null = null
    let assessment: any = null

    for (const key of Object.keys(this.hashmap)) {
      const item = this.hashmap[key]
      
      // Check if this is an assessment that belongs to this milestone
      // Must have BOTH: correct category/mimeType AND parent is milestone
      const isAssessment = (
        item.primaryCategory === 'Course Assessment' ||
        item.primaryCategory === 'Final Assessment' ||
        item.primaryCategory === 'Standalone Assessment' ||
        item.mimeType === 'application/vnd.sunbird.questionset' ||
        item.mimeType === 'application/quiz'
      ) && item.parent === milestoneId  // MUST be direct child of milestone

      if (isAssessment) {
        assessmentId = key
        assessment = item
        break
      }
    }

    if (!assessmentId || !assessment) {
      return
    }

    // Check if assessment is already completed - re-read from hashmap to get latest data
    const latestAssessment = this.hashmap[assessmentId]
    const assessmentCompleted = 
      latestAssessment.completionStatus === 2 || 
      latestAssessment.status === 2 || 
      latestAssessment.completionPercentage >= 100

    // Always check if all mandatory courses are complete, even if assessment is not completed
    // This ensures assessment is unlocked as soon as all mandatory courses are done
    let mandatoryCount = 0
    let completedMandatoryCount = 0
    
    
    for (const key of Object.keys(this.hashmap)) {
      const item = this.hashmap[key]
      if (key === assessmentId) continue
      
      // Only check DIRECT children of the milestone (courses)
      if (item.parent !== milestoneId) continue
      
      // Skip assessments
      const isItemAssessment =
        item.primaryCategory === 'Course Assessment' ||
        item.primaryCategory === 'Final Assessment' ||
        item.primaryCategory === 'Standalone Assessment' ||
        item.mimeType === 'application/vnd.sunbird.questionset' ||
        item.mimeType === 'application/quiz' ||
        (item.name && item.name.toLowerCase().includes('assessment'))
      if (isItemAssessment) continue
      
      // Only count courses, not other content types
      if (item.primaryCategory !== 'Course') continue
      
      // Check if this course is mandatory
      const isMandatory = item.isMandatory !== false
      
      if (isMandatory) {
        mandatoryCount++
        const isCompleted = 
          item.completionStatus === 2 || 
          item.status === 2 || 
          item.completionPercentage >= 100 ||
          item.progress >= 100
        
        
        
        if (isCompleted) {
          completedMandatoryCount++
        }
      }
    }
    
    const allMandatoryComplete = mandatoryCount === 0 || completedMandatoryCount >= mandatoryCount
    
    
    
    if (assessmentCompleted || allMandatoryComplete) {
      this.hashmap[assessmentId].isAssessmentLocked = false
      this.hashmap[assessmentId].milestoneAssessmentLocked = false
      this.hashmap[assessmentId].assessmentLockMessage = ''
      return
    }

    // If not unlocked, lock the assessment
    this.hashmap[assessmentId].isAssessmentLocked = true
    this.hashmap[assessmentId].milestoneAssessmentLocked = true
    this.hashmap[assessmentId].assessmentLockMessage = 'This content is locked. Complete all mandatory items to unlock the assessment.'

    
  }

  /**
   * Mark all children of a milestone as parent-locked or unlocked
   */
  private markMilestoneChildrenAsParentLocked(milestoneId: string, isLocked: boolean): void {
    for (const key of Object.keys(this.hashmap)) {
      const item = this.hashmap[key]
      
      // Direct children of milestone
      if (item.parent === milestoneId) {
        this.hashmap[key].isParentMilestoneLocked = isLocked
        
        // Also mark nested children (e.g., resources inside courses)
        if (item.children) {
          this.markNestedChildrenAsParentLocked(key, isLocked)
        }
      }
    }
  }

  /**
   * Recursively mark nested children as parent-locked
   */
  private markNestedChildrenAsParentLocked(parentId: string, isLocked: boolean): void {
    for (const key of Object.keys(this.hashmap)) {
      const item = this.hashmap[key]
      
      if (item.parent === parentId) {
        this.hashmap[key].isParentMilestoneLocked = isLocked
        
        // Recurse for deeper nesting
        if (item.children) {
          this.markNestedChildrenAsParentLocked(key, isLocked)
        }
      }
    }
  }

  getCalculationsFromChildren(item: NsContent.IContent) {
    item['duration'] = item.children.reduce((sum, child) => {
      return sum + Number(child.duration || 0)
    }, 0)
    const completedItems = _.filter(item.children, r => r.completionStatus === 2 || r.completionPercentage === 100)
    const totalCount = _.toInteger(_.get(item, 'leafNodesCount')) || 1
    item['completionPercentage'] = Number(((completedItems.length / totalCount) * 100).toFixed())
    item['completionStatus'] = (item.completionPercentage >= 100) ? 2 : 1
    return item
  }

  fetchContentHistoryV2(req: NsContent.IContinueLearningDataReq): Observable<NsContent.IContinueLearningData> {
    req.request.fields = ['progressdetails']

    if (req.request.courseId) {
      const reslut: any = this.http.post<NsContent.IContinueLearningData>(
        `${API_END_POINTS.CONTENT_HISTORYV2}/${req.request.courseId}`, req
      )
      // data.subscribe((subscribeData: any) => {
      //       this.programChildCourseResumeData.next({ resumeData: subscribeData.result.contentList, courseId: req.request.courseId })
      //     })
      return reslut
    }
    return of()

  }

  dowonloadCertificate(certId: any): Observable<any> {
    return this.http.get<{ result: any }>(
      API_END_POINTS.CERT_DOWNLOAD(certId),
    )
  }
  getServerDate() {
    return this.http.get<{ result: NsAppToc.IPostAssessment[] }>(
      API_END_POINTS.SERVER_DATE)
  }

  getFormById(formId: string) {
    return this.http.get(API_END_POINTS.GET_FORM_BYID(formId))
  }

  submitForm(formData: any) {
    return this.http.post<any>(API_END_POINTS.SUBMIT_FORM, formData)
  }

  getFormByIdPublic(formId: string) {
    return this.http.get(API_END_POINTS.GET_FORM_BYID_PUBLIC(formId))
  }

  submitFormPublic(formData: any) {
    return this.http.post<any>(API_END_POINTS.SUBMIT_FORM_PUBLIC, formData)
  }

  getApllicationsById(formId: string, contextId: string): Observable<any> {
    return this.http.get<any>(API_END_POINTS.GET_APPLICATIONS_BY_ID(formId, contextId))
  }

  shareContent(reqBody: any) {
    return this.http.post<any>(`${API_END_POINTS.SHARE_CONTENT}`, reqBody)
  }
  checkModuleWiseData(content: any) {
    if (content && content.children) {
      content.children.forEach((ele: any) => {
        if (ele.primaryCategory === NsContent.EPrimaryCategory.MODULE) {
          let moduleResourseCount = 0
          let offlineResourseCount = 0
          ele.children.forEach((childEle: any) => {
            if (childEle.primaryCategory !== NsContent.EPrimaryCategory.OFFLINE_SESSION) {
              moduleResourseCount = moduleResourseCount + 1
            } else {
              offlineResourseCount = offlineResourseCount + 1
            }
          })
          ele['moduleResourseCount'] = moduleResourseCount
          ele['offlineResourseCount'] = offlineResourseCount
        } else {
          if (ele.primaryCategory === NsContent.EPrimaryCategory.COURSE) {
            this.checkModuleWiseData(ele)
          }
        }
      })
    }
  }
  async fetchCourseHeirarchy(contentData: any) {
    if (contentData && contentData.children) {
      for (const ele of contentData.children) {
        if (ele.primaryCategory === NsContent.ECourseCategory.COURSE) {
          await this.widgetSvc.fetchContent(ele.identifier).toPromise().then(async (subEle: any) => {
            if (subEle.result && subEle.result.content
              && subEle.result.content.children && subEle.result.content.children.length) {
              ele['children'] = subEle.result.content.children
            }
          })
        }
      }
    }
  }

  setTranscriptionData(data: any) {
    this.transriptionDataSubject.next(data);
  }

  setActiveSubtitleLanguage(activeLang: any) {
    this.transriptionActiveLanguageDataObject.next(activeLang)
  }



  aiGetResourceVttFile(resourceID: any) {
    return this.http.get<any>(`${API_END_POINTS.AI_RESOURCE_VTT_FILE}?resource_id=${resourceID}`)
  }

  readPreEnrollmentResourcesState(req: any) {
    return this.http
      .post(`${API_END_POINTS.PRE_ENROLLMENT_STATE_READ}`, req)
  }

  createContentV2(requestBody: any) {
    return this.http
      .post(
        `${API_END_POINTS.CREATE_RESOURCE}`,
        requestBody,
      )
      .pipe(
        map((data: any) => {
          return data.result.identifier
        }),
      )
  }


  uploadAssignmentAnswer(contentId: string, batchId: string, assignmentId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name)
    return this.http.post(`${API_END_POINTS.UPLOAD_ASSIGNMENT}/${contentId}/${batchId}/${assignmentId}`, formData);
  }


  readContentV2(id: string): Observable<any> {
    return this.http.get<any>(
      `${API_END_POINTS.READ_RESOURCE}read/${id}?mode=edit`,
    ).pipe(
      map((data: any) => {
        return data.result.content
      })
    )
  }

  upload(
    data: FormData,
    contentData: any,
    options?: any,
  ): Observable<any> {

    const file = data.get('content') as File
    let fileName = file.name
    if (['channel.json'].indexOf(fileName) < 0) {
      fileName = this.appendToFilename(fileName)
    }
    const newFormData = new FormData()
    newFormData.append('data', file, fileName)
    return this.http.post<any>(
      `${API_END_POINTS.UPLOAD_FILE}upload/${contentData.contentId}`,
      newFormData,
      options
    )
  }

  appendToFilename(filename: string) {
    const timeStamp = new Date().getTime()
    const dotIndex = filename.lastIndexOf('.')
    if (dotIndex === -1) {
      return filename + timeStamp
    }
    return filename.substring(0, dotIndex) + timeStamp + filename.substring(dotIndex)
  }

  updateContentWithFewFields(requestBody: any, identifier: string): Observable<any> {
    return this.http.patch<any>(
      `${API_END_POINTS.UPDATE_RESOURCE}/${identifier}`,
      requestBody,
    )
  }

  searchAssignments(request: any): Observable<any> {
    return this.http.post(API_END_POINTS.SEARCH, request)
  }

  submitDraftAssignment(request: any): Observable<any> {
    return this.http.put(API_END_POINTS.SUBMIT_DRAFT_ASSIGNMENT, request)
  }

  submitAssignment(request: any): Observable<any> {
    return this.http.post(API_END_POINTS.SUBMIT_ASSIGNMENT, request)
  }

  notifyAssignmentSubmission(payload: any): Observable<any> {
    return this.http.post(API_END_POINTS.NOTIFY_ASSIGNMENT_SUBMISSION, payload)
  }

  getAssignmentStatus(request: any): Observable<any> {
    return this.http.post(`${API_END_POINTS.ASSIGNMENT_STATUS}`, request)
  }

  readAssignmentFile(contentId: string, batchId: string, assignmentId: string, fileName: string): Observable<any> {
    // Properly encode the parameters to avoid malformed request errors
    const encodedParams = new URLSearchParams({
      contentId: contentId || '',
      batchId: batchId || '',
      formId: assignmentId || '',
      fileName: fileName || ''
    });

    return this.http.get(`${API_END_POINTS.READ_ASSIGNMENT}?${encodedParams.toString()}`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/octet-stream, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    }).pipe(
      catchError((error: any) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate milestone achievement
   * @param userId User ID
   * @param courseId Course identifier
   * @param batchId Batch ID
   * @param milestoneId Milestone identifier (e.g., 'm1', 'm2')
   */
  generateMilestoneAchievement(userId: string, courseId: string, batchId: string, milestoneId: string): Observable<any> {
    const apiUrl = '/apis/proxies/v8/achievement/dynamic/v1/generate'
    const request = {
      request: {
        userId,
        courseId,
        batchId,
        milestoneId
      }
    }
    return this.http.post(apiUrl, request)
  }

}
