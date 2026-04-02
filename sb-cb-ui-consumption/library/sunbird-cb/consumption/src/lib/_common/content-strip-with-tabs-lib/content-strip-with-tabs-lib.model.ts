import { NsWidgetResolver } from '@sunbird-cb/resolver-v2'
import { NSSearch } from '../../_models/widget-search.model'
import { NsContent } from '../../_models/widget-content.model'
import { NsCardContent } from '../../_models/card-content.model'

export namespace NsContentStripWithTabs {
  export interface IContentStripMultiple {
    errorWidget?: NsWidgetResolver.IRenderConfigWithAnyData
    loader?: boolean
    noDataWidget?: NsWidgetResolver.IRenderConfigWithAnyData
    strips: IContentStripUnit[]
    isChannelStrip?: boolean
    enabled?: boolean
  }
  export interface IContentStripUnit {
    disableTranslate?: any
    key: string
    title: string
    secondaryTitle?: string
    titleClass?: string
    customeClass?: string
    nodataMsg?: string
    stripTitleLink?: {
      link: {
        queryParams: string
      },
      icon: string,
      queryParams: string
    }
    sliderConfig?: {
      showNavs: boolean,
      showDots: boolean,
      maxWidgets?: number
      cerificateCardMargin?: boolean,
      dotsAlign?: "right" | "left",
      arrowsPlacement?: "bottom-right" | "bottom-center" | "bottom-left" | "middle-inline",
      responsive?: {
        showNavs: boolean,
        showDots: boolean,
        dotsAlign?: "right" | "left",
        arrowsPlacement?: "bottom-right" | "bottom-center" | "bottom-left" | "middle-inline",
      }
    }
    tabsType?: string
    tabs?: NsContentStripWithTabs.IContentStripTab[] | undefined
    titleDescription?: string
    name?: string
    mode?: 'accordion'
    info?: IStripInfo
    logo?: string
    stripInfo: any
    preWidgets?: NsWidgetResolver.IRenderConfigWithAnyData[]
    postWidgets?: NsWidgetResolver.IRenderConfigWithAnyData[]
    stripConfig?: IStripConfig
    canHideStrip?: boolean
    filters?: any[]
    selectAll?: boolean | null
    request?: {
      myEvents?: any
      playlistRead: any
      playlistSearch?: any
      ciosContent?: any
      search?: NSSearch.ISearchRequest
      searchV6?: NSSearch.ISearchV6Request
      topContent?: any
      featureContent?: any
      bookmarkRead?: any
      enrollmentList?: any
      cbpList?: any,
      apiUrl: string
      condition: string
      searchRegionRecommendation?: NSSearch.ISearchOrgRegionRecommendationRequest
      api?: IStripRequestApi
      networkApi?: INetworkRequestApi
      ids?: string[]
      recommendedCourses?: any,
      masterCompetency?: any
      trendingSearch?: any,
      fetchData?: string,
      payloda?: any,
      hasIdentifiersApi?: boolean,
      identifiersApiUrl?: string,
    }
    searchV6Type?: 'KB' | 'Collections' | 'searchQuery' | null
    stripBackground?: string
    noDataWidget?: NsWidgetResolver.IRenderConfigWithAnyData
    loader?: boolean
    loaderWidgets?: any
    errorWidget?: NsWidgetResolver.IRenderConfigWithAnyData
    refreshEvent?: Record<'eventType' | 'from', string>
    fetchLikes?: boolean
    secondaryHeading?: any
    viewMoreUrl?: {
      queryParams?: any
      viewMoreText: string
      path: string
    }
    data?: []
  }

  export interface IStripRequestApi {
    path: string
    queryParams?: {
      pageNo?: number
      pageSize?: number
      pageState?: string
      sourceFields?: string
    }
  }
  export interface INetworkRequestApi {
    path: string
    data?: any
  }
  export interface IStripInfo {
    mode: 'below' | 'popup' | 'modal'
    visibilityMode?: 'hidden' | 'visible'
    icon: {
      icon: string
      scale: number
      style?: any // added for UI
    }
    widget: NsWidgetResolver.IRenderConfigWithAnyData
  }
  interface IStripConfig {
    // card subType key is used to determine the content Card display type
    cardSubType: NsCardContent.TCardSubType
    // to show view more card for a search strip
    postCardForSearch?: boolean
    intranetMode?: 'greyOut' | 'hide'
    deletedMode?: 'greyOut' | 'hide'
    contentTags?: IContentTags
    hideShowAll?: boolean
    publicCard?: any
  }

  export interface IContentTags {
    daysSpan?: number
    excludeContentType?: NsContent.EContentTypes[]
    excludeMimeType?: string[]
    tag: string
    criteriaField: string
  }
  export interface IContentStripResponseApi {
    contents: NsContent.IContent[]
    hasMore?: boolean
    pageState?: string
    totalHits?: number
  }

  export interface IContentStripTab {
    label: string
    value: string
    showTabDataCount: boolean
    requestRequired?: boolean
    computeDataOnClick?: boolean
    computeDataOnClickKey?: string
    request?: any
    widgets?: NsWidgetResolver.IRenderConfigWithAnyData[]
    maxWidgets?: number
    fetchTabStatus?: string
    nodataMsg?: string
    tabLoading?: boolean
    stripConfig?: IStripConfig
    customeClass?: string
    disableTranslate?: boolean
    contentShuffel?: boolean
    hideTab?: boolean
  }
}
