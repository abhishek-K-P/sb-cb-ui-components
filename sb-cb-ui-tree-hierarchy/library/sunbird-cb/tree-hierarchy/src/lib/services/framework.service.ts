import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable, of } from 'rxjs'
import { catchError, map, switchMap, tap } from 'rxjs/operators'
import { FRAMEWORK } from '../constants/data'
import { NSFramework } from '../models/framework.model'
import { HttpClient } from '@angular/common/http'
import { v4 as uuidv4 } from 'uuid'
import { IConnection } from '../models/connection.model'
import { LocalConnectionService } from './local-connection.service'
/* tslint:disable */
import _ from 'lodash'
// import { TreeHierarchyService } from '../tree-hierarchy.service';
/* tslint:enable */

const API_ENDPOINT = {
  ORG_V1_SEARCH: '/apis/proxies/v8/org/v1/search',
  CREATE_TERMS: `/apis/proxies/v8/action/framework/v3/term/create`,
  UPDATE_TERMS: `/apis/proxies/v8/framework/v1/term/update/`,
  UPDATE_ASSOCIATION: `/apis/proxies/v8/framework/v1/term/update/`,
  PUBLISH_FRAMEWORK: `/apis/proxies/v8/framework/v1/publish/`,
  RETIRE_TREM: `/apis/proxies/v8/framework/v1/term/retire`,
  UPDATE_CATEGORY: `/apis/proxies/v8/framework/v1/category/update/`,
  USERS_SEARCH: `/apis/proxies/v8/user/v1/search`
}

interface NotifierType {
  type: 'select' | 'insert' | 'update' | 'delete'
  action: string
  data: any
}

@Injectable({
  providedIn: 'root'
})
export class FrameworkService {
  categoriesHash: BehaviorSubject<NSFramework.ICategory[] | []> = new BehaviorSubject<NSFramework.ICategory[] | []>([]);
  isDataUpdated: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  currentSelection: BehaviorSubject<{ type: string, data: any, cardRef?: any, isUpdate?: boolean } | null> =
    new BehaviorSubject<{ type: string, data: any, cardRef?: any, isUpdate?: boolean } | null>(null);
  termSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  afterAddOrEditSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  list = new Map<string, NSFramework.IColumnView>();
  selectionList = new Map<string, any>();
  insertUpdateDeleteNotifier: BehaviorSubject<NotifierType | null> = new BehaviorSubject<NotifierType | null>(null);
  environment: any
  libConfig!: IConnection
  frameworkId!: string
  rootConfig: any
  proxiesPath = 'apis/proxies/v8';
  cardClkData: any
  CurrentCardClk = new BehaviorSubject<any>(null);
  completeResponse: any
  additionalData: any // Add a property to store additional data
  userCountData: any // Add a property to store user count data

  constructor(
    private http: HttpClient,
    public localConfig: LocalConnectionService,
    // private treeHierarchySvc: TreeHierarchyService
  ) { }

  getFrameworkInfo(_orgData?: any, _childOrgData?: any): Observable<any> {
    localStorage.removeItem('terms')
    if (this.localConfig.connectionType === 'online') {
      let url = `/${this.proxiesPath}/framework/v1/read/`
      if (_orgData) {
        url = url + _orgData.orgHierarchyFrameworkId
      } else {
        url = url + this.environment.frameworkName
      }
      return this.http.get(`${url}`, { withCredentials: true }).pipe(
        switchMap((frameworkResponse: any) => {
          const originalFrameworkResponse = frameworkResponse
          return this.getSelectedStateOrg(_orgData).pipe(
            switchMap((orgListData: any) => {
              this.additionalData = orgListData?.result?.response?.content || []
              return this.getUserPerOrg().pipe(
                map(() => {
                  return originalFrameworkResponse
                })
              )
            })
          )
        }),
        tap(async (response: any) => {
          this.resetAll()
          this.formateData(response, _orgData, _childOrgData)
          this.completeResponse = response.result.framework
        }),
        catchError((err) => {
          this.resetAll()
          this.list.clear()
          this.categoriesHash.next([])
          throw 'Error in source. Details: ' + err
        })
      )
    } else {
      this.resetAll()
      this.formateData(FRAMEWORK)
      return of(FRAMEWORK)
    }
  }

  readTerms(frameworkId: string, categoryId: string, requestBody: any): Observable<any> {
    return this.http.post(`/${this.proxiesPath}/framework/v1/term/search?framework=${frameworkId}&category=${categoryId}`, requestBody).pipe(
      map((res: any) => res.result))
  }

  createTerm(frameworkId: string, categoryId: string, requestBody: any): Observable<any> {
    return this.http.post(`/${this.proxiesPath}/framework/v1/term/create?framework=${frameworkId}&category=${categoryId}`, requestBody)
  }

  createTermsWrapper(category: string, requestBody: any): Observable<any> {
    let categoryItem: string
    if (category === 'theme') {
      categoryItem = 'competencyTheme'
    } else {
      categoryItem = 'competencySubTheme'
    }

    return this.http.post(`/${this.proxiesPath}/${categoryItem}/create/term`, requestBody)
      .pipe(map(res => _.get(res, 'result')))
  }

  retireTerm(frameworkId: string, categoryId: string, categoryTermCode: string): Observable<any> {
    return this.http.delete(`/${this.proxiesPath}/framework/v1/term/retire/${categoryTermCode}?framework=${frameworkId}&category=${categoryId}`)
  }

  retireMultipleTerm(frameworkId: string, categoryId: string, requestBody: any): Observable<any> {
    return this.http.post(`/${this.proxiesPath}/framework/v1/term/retire?framework=${frameworkId}&category=${categoryId}`, requestBody)
  }

  updateTerm(frameworkId: string, categoryId: string, categoryTermCode: string, requestBody: any): Observable<any> {
    return this.http.patch(`/${this.proxiesPath}/framework/v1/term/update/${categoryTermCode}?framework=${frameworkId}&category=${categoryId}`, requestBody)
  }

  publishFramework(): Observable<any> {
    return this.http.post(`/${this.proxiesPath}/framework/v1/publish/${this.environment.frameworkName}`, {})
  }

  getUuid(): string {
    return uuidv4()
  }

  updateEnvironment(env: any): void {
    this.environment = env
  }

  getEnviroment(): any {
    return this.environment
  }

  getFrameworkId(): string {
    return this.frameworkId
  }

  getNextCategory(currentCategory: string): NSFramework.ICategory | null {
    const currentIndex = this.categoriesHash.value.findIndex((a: NSFramework.ICategory) => {
      return a.code === currentCategory
    })
    let categoryLength = this.categoriesHash.getValue().length
    return (currentIndex + 1) < categoryLength ? this.categoriesHash.getValue()[currentIndex + 1] : null
  }

  getPreviousCategory(currentCategory: string): NSFramework.ICategory | null {
    const currentIndex = this.categoriesHash.value.findIndex((a: NSFramework.ICategory) => {
      return a.code === currentCategory
    })
    return (currentIndex - 1) >= 0 ? this.categoriesHash.getValue()[currentIndex - 1] : null
  }

  getParentTerm(currentCategory: string): any {
    const parent = this.getPreviousCategory(currentCategory) || null
    return parent ? this.selectionList.get(parent.code) : null
  }

  childClick(event: { type: string, data: any }): void {
    this.currentSelection.next(event)
  }

  resetAll(): void {
    this.categoriesHash.next([])
    this.currentSelection.next(null)
    this.selectionList.clear()
    this.list.clear()
  }

  isLastColumn(colCode: string): boolean {
    return this.categoriesHash.value && (this.categoriesHash.value.findIndex((a: NSFramework.ICategory) => {
      return a.code === colCode
    })) === (this.categoriesHash.value.length - 1)
  }

  removeItemFromArray(array: any[], item: any): any[] {
    /* assign a empty array */
    var tmp: any[] = []
    /* loop over all array items */
    for (var index in array) {
      if (array[index] !== item) {
        /* push to temporary array if not like item */
        tmp.push(array[index])
      }
    }
    /* return the temporary array */
    return tmp
  }

  set setTerm(res: any) {
    this.termSubject.next(res)
    let oldTerms = this.getTerm || []
    oldTerms.push(res)
    localStorage.setItem('terms', JSON.stringify(oldTerms))
  }

  get getTerm(): any[] {
    return JSON.parse(localStorage.getItem('terms') || '[]') || []
  }

  updateAfterAddOrEditSubject(res: any): void {
    if (res) {
      this.afterAddOrEditSubject.next(res)
    }
  }

  getLocalTermsByParent(parentCode: string): any[] {
    const filteredData = this.getTerm.filter(x => {
      return x.parent && x.parent.category === parentCode
    }) || []

    return filteredData.map(x => {
      return x.term
    })
  }

  getLocalTermsByCategory(parentCode: string): any[] {
    const filteredData = this.getTerm.filter(x => {
      return x.term && x.term.category === parentCode
    }) || []

    return filteredData
  }

  getLocalTermsCategory(category: string): any[] {
    const filteredData = this.getTerm.filter(x => {
      return x.category === category
    }) || []

    return filteredData
  }

  formateData(response: any, _orgData?: any, _childOrgData?: any): void {
    this.frameworkId = response.result.framework.code
    let categories = response.result.framework.categories
    if (_childOrgData?.id && _orgData?.id && _childOrgData.id !== _orgData.id) {
      categories = this.getOrgFromChildOnwards(categories || [], _childOrgData)
    }
    if (categories?.length > 0) {
      categories = _.sortBy(categories, 'index')
    }
    response.result.framework.categories = categories;
    (categories).forEach((a: any, _idx: number) => {
      this.list.set(a.code, {
        code: a.code || '',
        identifier: a.identifier,
        index: (_idx + 1),
        name: a.name,
        selected: a.selected,
        status: a.status as NSFramework.TNodeStatus,
        description: a.description,
        translations: a.translations,
        category: a.category,
        associations: a.associations,
        config: this.getConfig(a.code, _childOrgData),
        children: (a.terms || []).map((c: any) => {
          const associations = c.associations || []
          const tempCount = this.getUserCount(c)
          Object.assign(c, { userCount: tempCount })
          if (associations.length > 0) {
            Object.assign(c, { children: associations })
          }
          return c
        })
      })
    })

    const allCategories: NSFramework.ICategory[] = []
    this.list.forEach(a => {
      allCategories.push({
        code: a.code,
        identifier: a.identifier,
        index: a.index,
        name: a.name,
        status: a.status as NSFramework.TNodeStatus,
        description: a.description,
        translations: a.translations,
      } as NSFramework.ICategory)
    })
    this.categoriesHash.next(allCategories)
  }

  getOrgFromChildOnwards(_categories: any, _childOrgData: any) {
    const colIndexToBeRemoved: number[] = []
    let termFoundIndex: any = -1
    if (_categories?.length > 0) {
      _categories.forEach((ele: any) => {
        if (ele?.terms?.length > 0) {
          const termFound = ele.terms.find((term: any) => term.name === _childOrgData.channel)
          if (!termFound && termFoundIndex === -1) {
            colIndexToBeRemoved.push(ele.index)
          } else if (termFoundIndex === -1) {
            termFoundIndex = ele.index
            ele.terms = ele.terms.filter((term: any) => term.name === _childOrgData.channel)
          }
        }
      })
    }
    return _categories.filter((category: any) => !colIndexToBeRemoved.includes(category.index))
  }

  removeOldLine(): void {
    const eles = Array.from(document.getElementsByClassName('leader-line') || [])
    if (eles.length > 0) {
      eles.forEach(ele => ele.remove())
    }
  }

  setConfig(config: any): void {
    this.rootConfig = config
  }

  getConfig(code: string, _childOrgData?: any): any {
    let categoryConfig: any
    if (this.rootConfig && this.rootConfig[0]) {
      this.rootConfig.forEach((config: any) => {
        if (this.frameworkId == config.frameworkId) {
          categoryConfig = config.config.find((obj: any) => obj.category == code)
        }
      })
    }
    if (!categoryConfig) {
      const config = this.rootConfig.config[0]
      return config
    }
    return categoryConfig
  }

  getAllSelectedTerms(): any[] {
    const selectedTerms: any[] = []
    this.list.forEach(l => {
      if (l.children && l.children.length) {
        l.children.forEach(c => {
          if (c.selected) {
            selectedTerms.push(c)
          }
        })
      }
    })
    return selectedTerms
  }

  getPreviousSelectedTerms(code: string): any[] {
    let prevSelectedTerms: any[] = []
    this.selectionList.forEach(sl => {
      if (sl.category !== code) {
        prevSelectedTerms.push(sl)
      }
    })
    return prevSelectedTerms
  }

  getKcmSearchList(requestBody: any, category: string): Observable<any> {
    let categoryItem: string
    if (category === 'theme') {
      categoryItem = 'competencyTheme'
    } else {
      categoryItem = 'competencySubTheme'
    }

    return this.http.post(`/${this.proxiesPath}/${categoryItem}/search`, requestBody)
      .pipe(map(res => _.get(res, 'result.result')))
  }

  updateLocalList(item: any, parent: any, selectedTermArray: any[], updateType: string): void {
    if (item && item.children && item.children.length) {
      if (updateType === 'delete') {
        item.children.forEach((itmData: any) => {
          if (itmData.identifier === parent.identifier) {
            const associationList: any = _.differenceWith(itmData.associations, selectedTermArray, (a: any, b: any) => a.identifier === b.identifier)
            const childrenList: any = _.differenceWith(itmData.children, selectedTermArray, (a: any, b: any) => a.identifier === b.identifier)
            itmData['associations'] = associationList
            itmData['children'] = childrenList
          }
          if (itmData.children) {
            this.updateLocalList(itmData, parent, selectedTermArray, updateType)
          }
        })
      } else {
        item.children.forEach((itmData: any) => {
          if (itmData.identifier === parent.identifier) {
            let differenceData: any[] = []
            if (itmData && itmData.children && itmData.children.length) {
              differenceData = _.differenceBy(selectedTermArray, itmData.children, 'identifier')
            } else {
              differenceData = selectedTermArray
            }
            itmData['associations'] = itmData && itmData.associations ? [...itmData.associations, ...differenceData] : differenceData
            itmData['children'] = itmData && itmData.children ? [...itmData.children, ...differenceData] : differenceData
          }
          if (itmData.children) {
            this.updateLocalList(itmData, parent, selectedTermArray, updateType)
          }
        })
      }
    }
  }

  updateFrameworkList(columnCode: string, parentData: any, selectedTermArray: any[], updateType?: string): void {
    let listData: any = this.list.get(columnCode)
    if (updateType === 'delete') {
      const associationList: any = _.differenceWith(listData.associations, selectedTermArray, (a: any, b: any) => a.identifier === b.identifier)
      const childrenList: any = _.differenceWith(listData.children, selectedTermArray, (a: any, b: any) => a.identifier === b.identifier)
      listData['associations'] = associationList
      listData['children'] = childrenList

      this.selectionList.forEach((selectedData: any) => {
        let listData: any = this.list.get(selectedData.category)
        if (listData && listData.children && listData.children.length) {
          this.updateLocalList(listData, parentData, selectedTermArray, updateType)
        }
      })
    } else {
      let differenceData: any[] = []
      if (listData && listData.children && listData.children.length) {
        differenceData = _.differenceBy(selectedTermArray, listData.children, 'identifier')
      } else {
        differenceData = selectedTermArray
      }
      listData['associations'] = listData && listData.associations ? [...listData.associations, ...differenceData] : differenceData
      listData['children'] = listData && listData.children ? [...listData.children, ...differenceData] : differenceData

      this.selectionList.forEach((selectedData: any) => {
        let listData: any = this.list.get(selectedData.category)
        if (listData && listData.children && listData.children.length) {
          this.updateLocalList(listData, parentData, selectedTermArray, updateType || '')
        }
      })
    }
  }

  getFrameworkRead(frameWorkId: string): Observable<any> {
    if (this.localConfig.connectionType === 'online') {
      return this.http.get(`/${this.proxiesPath}/framework/v1/read/${frameWorkId}`, { withCredentials: true }).pipe(
        map((response: any) => _.get(response, 'result.framework'))
      )
    } else {
      return of({})
    }
  }

  getConfigOfCategoryConfigByFrameWorkId(code: string, frameworkId: string): any {
    let categoryConfig: any
    if (this.rootConfig && this.rootConfig[0]) {
      this.rootConfig.forEach((config: any) => {
        if (frameworkId == config.frameworkId) {
          categoryConfig = config.config.find((obj: any) => obj.category == code)
        }
      })
    }
    return categoryConfig
  }

  getConfigByFrameWorkId(frameworkId: string): any {
    let categoryConfig: any
    if (this.rootConfig && this.rootConfig[0]) {
      this.rootConfig.forEach((config: any) => {
        if (frameworkId == config.frameworkId) {
          categoryConfig = config
        }
      })
    }
    return categoryConfig
  }

  updateFullTermDataLocalMap(_columnCode: string, parentData: any): void {
    this.selectionList.forEach((selectedData: any) => {
      let listData: any = this.list.get(selectedData.category)
      if (listData && listData.children && listData.children.length) {
        this.updateLocalListTerm(listData, parentData)
      }
    })
  }

  updateLocalListTerm(item: any, parent: any): void {
    if (item && item.children && item.children.length) {
      item.children.forEach((itmData: any) => {
        if (itmData.identifier === parent.identifier) {
          itmData['description'] = parent['description']
          itmData['additionalProperties'] = parent['additionalProperties']
        }
        if (itmData.children) {
          this.updateLocalListTerm(itmData, parent)
        }
      })
    }
  }

  private getSelectedStateOrg(_orgData?: any): Observable<any> {
    const requestBody = {
      request: {
        filters: {
          status: 1,
          ministryOrStateType: (_orgData) ?
            _orgData.sbOrgType : '',
          ministryOrStateId: (_orgData?.identifier) ?
            _orgData?.identifier : (_orgData?.rootOrgId) ? _orgData.rootOrgId : ''
        },
        sort_by: {
          createdDate: "desc"
        },
        limit: 9999,
        offset: 0,
        fields: [
          'identifier',
          'orgName',
          'description',
          'parentOrgName',
          'ministryOrStateId',
          'ministryOrStateType',
          'ministryOrStateName',
          'sbOrgSubType',
          'rootOrgId'
        ]
      }
    }
    return this.http.post(`${API_ENDPOINT.ORG_V1_SEARCH}`, requestBody).pipe(
      catchError(error => {
        console.error('Error fetching Org data:', error)
        // Return empty data to continue the chain even if this API fails
        return of({})
      })
    )
  }

  private getUserPerOrg(_orgData?: any): Observable<any> {
    const orgIds = this.additionalData.map((org: any) => org.identifier)
    const requestBody = {
      request: {
        filters: {
          rootOrgId: orgIds
        },
        fields: [
          'identifier',
          'rootOrgId'
        ],
        limit: 1,
        facets: [
          "rootOrgId"
        ],
        sort_by: {
          "createdDate": "desc"
        }
      }
    }
    const orgIdCounts: { id: string, count: number }[] = []
    if (this.additionalData && this.additionalData.length > 0) {
      this.additionalData.forEach((org: any) => {
        if (org.identifier) {
          orgIdCounts.push({
            id: org.identifier,
            count: 0
          })
        }
      })
    }
    return this.http.post(`${API_ENDPOINT.USERS_SEARCH}`, requestBody).pipe(
      map((res: any) => {
        if (res && res.result && res.result.response && res.result.response.count) {
          const facetsValue = res.result.response.facets || []
          if (facetsValue && facetsValue.length > 0) {
            const orgFacet = facetsValue.find((facet: any) => facet.name === 'rootOrgId')
            if (orgFacet && orgFacet.values) {
              orgFacet.values.forEach((value: any) => {
                const orgIndex = orgIdCounts.findIndex(org => org.id === value.name)
                if (orgIndex !== -1) {
                  orgIdCounts[orgIndex].count = value.count || 0
                }
              })
            }
          }
        }
        this.userCountData = orgIdCounts
      }),
      catchError(error => {
        console.error('Error fetching user count data:', error)
        return of({})
      })
    )
  }

  getUserCount(term: any): number {
    if (term && term.additionalProperties && term.additionalProperties.orgId) {
      if (this.userCountData && this.userCountData.length > 0) {
        const userCount = this.userCountData.filter((user: any) => user.id === term.additionalProperties.orgId)[0]?.count
        return userCount || 0
      }
    }
    return 0
  }
}