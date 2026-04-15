import { HttpClient } from "@angular/common/http";
import { Injectable, signal, WritableSignal } from "@angular/core";
import { Observable } from "rxjs";
import { IUserGroupRequest, NsAccessControlConfig } from "../_models/access-control.model";
import { toNumber } from "lodash";

const PAGINATION_LIMIT = 100;
const ENDPOINTS = {
  SEARCH_USER_WITH_ADMIN: (query: string) => `/apis/proxies/v8/user/v1/autocomplete/${query}`,
  SEARCH_USER: `/apis/proxies/v8/user/v1/admin/search`,
  SEARCH_ORG: "/apis/proxies/v8/org/v1/admin/search",
  VALIDATE_USER: "/apis/proxies/v8/user/v1/search",
  GROUPS: "/apis/proxies/v8/user/v1/groups",
  CADRE_CONFIG: "/apis/proxies/v8/data/v2/system/settings/get/cadreConfig",
  DESIGNATION_LIST: "/apis/proxies/v8/designation/search",
  SEARCH_V4: "/apis/proxies/v8/sunbirdigot/v4/search",
  CREATE_USERGROUPS_CONTROL: "/apis/proxies/v8/accessSettings/v1/upsert",
  GET_ACCESS_CONTROL: (id: string) => `/apis/proxies/v8/accessSettings/read/${id}`,
  ACTION_CONTENT_V3: `apis/proxies/v8/action/content/v3/`,
  PRIVATE_CONTENT_V4: `apis/proxies/v8/private/content/v4/`,

  CUSTOMES_FIELD_SEARCH: "apis/proxies/v8/customFields/v1/search",
};

@Injectable({
  providedIn: "root",
})
export class AccessControlService {
  accessControlConfig: WritableSignal<NsAccessControlConfig.IAccessControlConfig>;
  holdServiceCadrebatch: WritableSignal<{
    service: { id: string; name: string }[];
    batch: number[];
    cadre: { id: string; name: string }[];
  }>;
  customesFieldData: WritableSignal<any[]> = signal([]);
  constructor(private readonly http: HttpClient) {
    this.accessControlConfig = signal<NsAccessControlConfig.IAccessControlConfig>(null);
    this.holdServiceCadrebatch = signal({
      service: [],
      batch: [],
      cadre: [],
    });
  }

  fetchUserListWithAdmin(queryString: string): Observable<any> {
    return this.http.get<any>(ENDPOINTS.SEARCH_USER_WITH_ADMIN(queryString));
  }

  fetchUserList(query: string, pagination: { limit: number; offset: number }, userIds?: string[], filters?: any, sorting?: any): Observable<any> {
    let request: any = {
      filters: {
        status: 1,
      },
      limit: pagination.limit || 5,
      offset: pagination.offset || 0,
      query: query,
      sort_by: {},
      fields: ["userId", "firstName", "maskedEmail", "rootOrgName", "phone"],
    };
    if (userIds?.length) {
      request.filters = { ...request.filters, userId: userIds };
    }
    if (filters) {
      request.filters = { ...request.filters, ...filters };
    }
    if (sorting) {
      request.sort_by = sorting;
    }
    return this.http.post<any>(ENDPOINTS.SEARCH_USER, { request: request });
  }

  fetchOrgList(query: string, pagination: { limit: number; offset: number }, selectedData?: string[], characterSearch?: string): Observable<any> {
    let request: any = {
      request: {
        filters: {
          status: 1,
          // isMdo: true,
        },
        // sort_by: {
        //   channel: "asc", 
        // },
        fields: ["channel", "identifier", "iscca"],
        query: query,
        limit: pagination.limit,
        offset: pagination.offset,
      },
    };
    if (selectedData?.length) {
      request.request.filters.identifier = selectedData;
      characterSearch = "";
    }

    if (characterSearch && characterSearch !== '#' && !query) {
      request.request.filters.channel = { startsWith: characterSearch };
    }
    return this.http.post<any>(ENDPOINTS.SEARCH_ORG, request);
  }

  validateUser(request: any): Observable<any> {
    return this.http.post<any>(ENDPOINTS.VALIDATE_USER, request);
  }

  fetchGroupsList(): Observable<any> {
    return this.http.get<any>(ENDPOINTS.GROUPS);
  }

  fetchCadreConfig(): Promise<any> {
    return this.http.get<any>(ENDPOINTS.CADRE_CONFIG).toPromise();
  }

  fetchDesignation(query: string, pagination: { pageSize: number; pageNumber: number }, selectedData?: string[], characterSearch?: string): Observable<any> {
    let payload: any = {
      filterCriteriaMap: {
        status: "Active",
      },
      requestedFields: ["designation", "id"],
      pageSize: pagination.pageSize || this.accessControlConfig()?.accessControlCriteriaSelection?.paginationLimit || PAGINATION_LIMIT,
      pageNumber: pagination.pageNumber || 0,
      // orderDirection: "ASC",
    };
    if (selectedData?.length) {
      payload.filterCriteriaMap.designation = selectedData;
      characterSearch = "";
    }
    if (query) {
      payload.searchString = query;
    }
    if (characterSearch && characterSearch !== '#' && !query) {
      payload.startsWith = characterSearch;
    }
    if (!query) {
      payload.orderBy = "designation";
    }
    return this.http.post<any>(ENDPOINTS.DESIGNATION_LIST, payload);
  }

  fetchDesignationsWithOrg(paginationOffset: number, categories: string[], query: string, selectedData?: string[], characterSearch?: string): Observable<any> {
    let payload: any = {
      request: {
        filters: {
          status: "Live",
          category: "designation",
          categories: categories,
          objectType: "Term",
        },
        fields: ["identifier", "name"],
        query: query,
        sort_by: { name: "asc" },
        facets: [],
        limit: this.accessControlConfig()?.accessControlCriteriaSelection?.paginationLimit || PAGINATION_LIMIT,
        offset: paginationOffset,
      },
    };
    if (selectedData?.length) {
      payload.request.filters.name = selectedData;
    }
    if (characterSearch && characterSearch !== '#' && !query) {
      if (!payload.request.filters.name || typeof payload.request.filters.name !== "object") {
        payload.request.filters.name = {};
      }
      payload.request.filters.name.startsWith = characterSearch;
    }
    return this.http.post<any>(ENDPOINTS.SEARCH_V4, payload);
  }

  applyUserGroupAccessControl(request: IUserGroupRequest): Observable<any> {
    return this.http.put<any>(ENDPOINTS.CREATE_USERGROUPS_CONTROL, request);
  }

  fetchUserGroupAccessControl(id: string): Observable<any> {
    return this.http.get<any>(ENDPOINTS.GET_ACCESS_CONTROL(id));
  }

  updateContentV3(meta: any, id: string): Observable<any> {
    return this.http.patch<any>(`${ENDPOINTS.ACTION_CONTENT_V3}update/${id}`, meta);
  }

  updateContentV4(meta: any, id: string): Observable<any> {
    return this.http.patch<any>(`${ENDPOINTS.PRIVATE_CONTENT_V4}update/${id}`, meta);
  }

  downloadFile(data: any, filename = "data") {
    const csvData = this.convertToCSV(data, ["email", "status", "mobile", "message"]);
    const blob = new Blob([`\ufeff${csvData}`], { type: "text/csv;charset=utf-8;" });
    const dwldLink = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const isSafariBrowser = navigator.userAgent.indexOf("Safari") !== -1 && navigator.userAgent.indexOf("Chrome") === -1;
    if (isSafariBrowser) {
      // if Safari open in new window to save file with random filename.
      dwldLink.setAttribute("target", "_blank");
    }
    dwldLink.setAttribute("href", url);
    dwldLink.setAttribute("download", `${filename}.csv`);
    dwldLink.style.visibility = "hidden";
    document.body.appendChild(dwldLink);
    dwldLink.click();
    document.body.removeChild(dwldLink);
  }

  convertToCSV(objArray: any, headerList: any) {
    const array = typeof objArray !== "object" ? JSON.parse(objArray) : objArray;
    let str = "";
    let row = "S.No,";

    for (const index in headerList) {
      if (headerList[index]) {
        row += `${headerList[index]} ,`;
      }
    }
    row = row.slice(0, -1);
    str += `${row}\r\n`;
    // for (let i = 0; i < array.length; i += 1) {
    for (const iIndex in array) {
      if (array[iIndex]) {
        let line = `${toNumber(iIndex) + 1} `;
        for (const index in headerList) {
          if (headerList[index]) {
            const head = headerList[index];

            line += `, ${array[iIndex][head]}`;
          }
        }
        str += `${line}\r\n`;
      }
    }
    return str;
  }

  createRequestContent(apiResponse: any, accessSettingsEnabled: boolean) {
    return {
      request: {
        content: {
          versionKey: apiResponse.versionKey || "",
          accessSettingsEnabled: accessSettingsEnabled || false,
        },
      },
    };
  }

  createRequesForMDOContent(apiResponse: any, accessSettingsEnabled: boolean, secureSettings: any) {
    return {
      request: {
        content: {
          versionKey: apiResponse.versionKey || "",
          accessSettingsEnabled: accessSettingsEnabled || false,
          secureSettings: secureSettings || null,
        },
      },
    };
  }

  fetchCustomsField(filterCriteria: any): Promise<any> {
    const requestPayload = {
      filterCriteriaMap: filterCriteria,
      requestedFields: ["name", "isActive", "createdBy", "createdOn", "isEnabled", "isMandatory", "customFieldData", "originalCustomFieldData", "attributeName", "type", "reversedOrderCustomFieldData"],
      pageNumber: 0,
      pageSize: this.accessControlConfig()?.accessControlCriteriaSelection?.paginationLimit || PAGINATION_LIMIT,
      orderDirection: "DESC",
      orderBy: "createdOn",
      facets: [],
    };
    return this.http.post<any>(ENDPOINTS.CUSTOMES_FIELD_SEARCH, requestPayload).toPromise()
  }

  enableDeputation(value: boolean) {
    const config = this.accessControlConfig();
    if (config) {
      const centralDeputationOption = { disabled: false, value: NsAccessControlConfig.SelectionType.CentralDeputation, label: "Central Deputation" };
      const centralDeputationCriteria = [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ];
      // Add if true, remove if false
      if (value) {
        // Add to optionsEntity if not present
        if (!config.accessControlCriteriaSelection.optionsEntity.some((o: any) => o.value === NsAccessControlConfig.SelectionType.CentralDeputation)) {
          config.accessControlCriteriaSelection.optionsEntity.push(centralDeputationOption);
        }
        // Add to accessControlCriteriaSelection if not present
        if (!config.accessControlCriteriaSelection.centralDeputation) {
          config.accessControlCriteriaSelection.centralDeputation = centralDeputationCriteria;
        }
      } else {
        // Remove from optionsEntity
        config.accessControlCriteriaSelection.optionsEntity = config.accessControlCriteriaSelection.optionsEntity.filter((o: any) => o.value !== NsAccessControlConfig.SelectionType.CentralDeputation);
        // Remove from accessControlCriteriaSelection
        if (config.accessControlCriteriaSelection.centralDeputation) {
          delete config.accessControlCriteriaSelection.centralDeputation;
        }
      }
      // Update Signal Value
      this.accessControlConfig.set({ ...config });
    }
  }
}
