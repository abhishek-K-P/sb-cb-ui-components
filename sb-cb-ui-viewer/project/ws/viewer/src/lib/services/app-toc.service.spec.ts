(window as any)['env'] = {
  name: 'test-environment',
  sitePath: '/test-site-path',
  karmYogiPath: '/test-karm-yogi-path',
  cbpPath: '/test-cbp-path'
}

import { HttpClient } from '@angular/common/http'
import { AppTocService } from './app-toc.service'
import { ConfigurationsService } from '@sunbird-cb/utils'
import { WidgetContentService } from '@ws-widget/collection'
import { of } from 'rxjs'

describe('AppTocService', () => {
  let service: AppTocService
  let httpClientMock: jest.Mocked<HttpClient>
  let configServiceMock: jest.Mocked<ConfigurationsService>
  let widgetServiceMock: jest.Mocked<WidgetContentService>

  beforeEach(() => {
    httpClientMock = {
      get: jest.fn(),
      post: jest.fn(),
    } as any

    configServiceMock = {
      rootOrg: 'root-org',
      org: ['org1'],
      userProfile: {
        userId: 'test-user'
      }
    } as any

    widgetServiceMock = {
      getFirstChildInHierarchy: jest.fn()
    } as any

    service = new AppTocService(
      httpClientMock,
      configServiceMock,
      widgetServiceMock
    )
  })

  describe('showStartButton', () => {
    it('should return { show: false, msg: "" } when content is null', () => {
      const result = service.showStartButton(null)
      expect(result).toEqual({ show: false, msg: '' })
    })




  })




  describe('fetchContentAnalyticsData', () => {
    it('should fetch analytics data and emit through subject', (done) => {
      const mockAnalyticsData = { data: 'test' }
      httpClientMock.get.mockReturnValue(of(mockAnalyticsData))

      service.analyticsReplaySubject.subscribe(data => {
        expect(data).toEqual(mockAnalyticsData)
        done()
      })

      service.fetchContentAnalyticsData('test-content-id')
      expect(httpClientMock.get).toHaveBeenCalled()
    })
  })


  describe('getServerDate', () => {
    it('should make HTTP GET request to server date endpoint', () => {
      const mockDate = { result: { serverTime: Date.now() } }
      httpClientMock.get.mockReturnValue(of(mockDate))

      service.getServerDate()

      expect(httpClientMock.get).toHaveBeenCalled()
    })
  })

  describe('shareContent', () => {
    it('should make HTTP POST request to share content endpoint', () => {
      const mockShareResponse = { result: true }
      const shareRequest = { contentId: 'test-content', users: ['user1'] }

      httpClientMock.post.mockReturnValue(of(mockShareResponse))

      service.shareContent(shareRequest)

      expect(httpClientMock.post).toHaveBeenCalledWith(
        expect.stringContaining('/recommend'),
        shareRequest
      )
    })
  })
})