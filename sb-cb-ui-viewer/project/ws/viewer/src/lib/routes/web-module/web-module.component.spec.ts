
import { HttpClient } from '@angular/common/http'
import { WidgetContentService } from '@sunbird-cb/toc'
import { ActivatedRoute } from '@angular/router'
import { EventService } from '@sunbird-cb/utils'
import { ViewerUtilService } from '../../viewer-util.service'
import { WebModuleComponent } from './web-module.component'

describe('WebModuleComponent', () => {
    let component: WebModuleComponent

    const activatedRoute: Partial<ActivatedRoute> = {}
    const contentSvc: Partial<WidgetContentService> = {}
    const http: Partial<HttpClient> = {}
    const eventSvc: Partial<EventService> = {}
    const viewSvc: Partial<ViewerUtilService> = {}

    beforeAll(() => {
        component = new WebModuleComponent(
            activatedRoute as ActivatedRoute,
            contentSvc as WidgetContentService,
            http as HttpClient,
            eventSvc as EventService,
            viewSvc as ViewerUtilService
        )
    })

    beforeEach(() => {
        jest.clearAllMocks()
        jest.resetAllMocks()
    })

    it('should create a instance of component', () => {
        expect(component).toBeTruthy()
    })
})