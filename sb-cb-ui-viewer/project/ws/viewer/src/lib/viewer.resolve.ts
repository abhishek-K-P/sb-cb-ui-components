import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Router } from '@angular/router'
import { catchError, map, tap } from 'rxjs/operators'
import { Observable, of } from 'rxjs'
// import { AccessControlService } from '@ws/author'
import { WidgetContentService } from '@sunbird-cb/toc'
import { NsContent } from '@sunbird-cb/collection'
import { IResolveResponse, AuthMicrosoftService, ConfigurationsService } from '@sunbird-cb/utils'
import { ViewerDataService } from './viewer-data.service'
import { MobileAppsService } from './services/mobile-apps.service'
import { Platform } from '@angular/cdk/platform'
import { VIEWER_ROUTE_FROM_MIME } from './services/viewer-route-utils'

const ADDITIONAL_FIELDS_IN_CONTENT = ['creatorContacts', 'source', 'exclusiveContent']
@Injectable()
export class ViewerResolve {
  constructor(
    private contentSvc: WidgetContentService,
    private viewerDataSvc: ViewerDataService,
    private mobileAppsSvc: MobileAppsService,
    private router: Router,
    // private accessControlSvc: AccessControlService,
    private msAuthSvc: AuthMicrosoftService,
    private configSvc: ConfigurationsService,
    private platform: Platform,
  ) { }

  resolve(route: ActivatedRouteSnapshot): Observable<IResolveResponse<NsContent.IContent>> | null {
    //     console.log('route.data--', route)
    const resourceType = route.data.resourceType
    this.viewerDataSvc.reset(route.paramMap.get('resourceId'))
    if (!this.viewerDataSvc.resourceId) {
      return null
    }

    const forPreview = window.location.href.includes('/author/') || route.queryParamMap.get('preview') === 'true'
    return (forPreview
      ? this.contentSvc.fetchAuthoringContent(this.viewerDataSvc.resourceId)
      : (route.queryParamMap.get('preAssessment') ? this.contentSvc.fetchContentData(
        this.viewerDataSvc.resourceId
      ) : this.contentSvc.fetchContent(
        this.viewerDataSvc.resourceId,
        'detail',
        ADDITIONAL_FIELDS_IN_CONTENT,
      ))
    ).pipe(map((data: any) => {
    //       console.log('content data', data)
      return data
    })).pipe(tap((content: any) => {
    //       console.log('content data 1', content)
      if (route.queryParamMap.get('preAssessment')) {

      } else {
        if (content && content.result && content.result.content) {
          content = content.result.content
        }

      }

      let mimeType: any
      if (content && content?.courseCategory === 'Pre Enrolment Assessment') {
        mimeType = 'application/vnd.sunbird.questionset'
        if (content?.children && content?.children?.length) {
          if (content?.children[0]['contextCategory'] && content?.children[0]['contextCategory'] === 'Pre Enrolment Assessment') {
            content = content?.children[0]
          }
        }
      } else {
        mimeType = content?.mimeType
        // content = content.result.content
      }
      if (content.status === 'Deleted' || content.status === 'Expired') {
        this.router.navigate([
          `${forPreview ? '/author' : '/app'}/toc/${content.identifier}/overview`,
        ])
      }
      if (content.ssoEnabled) {
        this.msAuthSvc.loginForSSOEnabledEmbed(
          (this.configSvc.userProfile && this.configSvc.userProfile.email) || '',
        )
      }

      if (resourceType === 'unknown') {
        this.router.navigate([
          `${forPreview ? '/author' : ''}/viewer/${VIEWER_ROUTE_FROM_MIME(mimeType)}/${content.identifier
          }`,
        ])
      } else if (resourceType === VIEWER_ROUTE_FROM_MIME(mimeType)) {
        this.viewerDataSvc.updateResource(content, null)
      } else {
        this.viewerDataSvc.updateResource(null, {
          errorType: 'mimeTypeMismatch',
          mimeType: mimeType,
          probableUrl: `${forPreview ? '/author' : ''}/viewer/${VIEWER_ROUTE_FROM_MIME(
            mimeType,
          )}/${content.identifier}`,
        })
      }
    }), // tslint:disable-next-line: align
      map((data: any) => {
        if (route.queryParamMap.get('preAssessment')) {

        } else {
          if (data && data.result && data.result.content) {
            data = data.result.content
          }

        }

        let mimeType: any = ''
        if (data && data?.courseCategory === 'Pre Enrolment Assessment') {
          mimeType = 'application/vnd.sunbird.questionset'
          if (data?.children && data?.children?.length) {
            if (data?.children[0]['contextCategory'] && data?.children[0]['contextCategory'] === 'Pre Enrolment Assessment') {
              data = data?.children[0]
            }
          }
        } else {
          mimeType = data?.mimeType
        }
        if (resourceType === 'unknown') {
          this.router.navigate([
            `${forPreview ? '/author' : ''}/viewer/${VIEWER_ROUTE_FROM_MIME(mimeType)}/${data.identifier
            }`,
          ])
        } else if (resourceType === VIEWER_ROUTE_FROM_MIME(mimeType)) {
          data.platform = this.platform
          this.mobileAppsSvc.sendViewerData(data)
          return { data, error: null }
        }
        return { data: null, error: 'mimeTypeMismatch' }
      }),
      // tslint:disable-next-line: align
      catchError(error => {
        this.viewerDataSvc.updateResource(null, error)
        return of({ error, data: null })
      }),
    )
  }
}