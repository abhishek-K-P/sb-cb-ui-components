import { Component, Inject, OnInit, OnDestroy, ElementRef, ViewChild, inject } from "@angular/core";
import { AccessControlService } from "../../../_services/access-control.service";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { FormControl } from "@angular/forms";
import { BATCH_RANGES, CHECKBOX_OPTIONS } from "../../../_constants/app.constants";
import { NsAccessControlConfig } from "../../../_models/access-control.model";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { MatTabChangeEvent } from "@angular/material/tabs";
import { MatRadioChange } from "@angular/material/radio";
import * as _ from "lodash";
import { MatCheckboxChange } from "@angular/material/checkbox";
import { CadreMappingService } from "../../../_services/cadre-mapping.service";

@Component({
  selector: "sb-uic-entity-selections",
  templateUrl: "./entity-selections.component.html",
  styleUrls: ["./entity-selections.component.scss"],
})
export class EntitySelectionsComponent implements OnInit, OnDestroy {
  @ViewChild("tabGroup", { read: ElementRef }) tabGroupRef!: ElementRef;
  private destroy$ = new Subject<void>();
  isLoading = false;
  searchControl = new FormControl("");
  filterValue: "all" | "selected" | "notSelected" = "all";
  alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

  dataList: any[] = [];
  dataListDup: any[] = [];

  selectedCentralDeputation: boolean = false;

  selectedData: any[] = [];
  selectedDataTemp: any[] = [];

  groupedEntityData: { [key: string]: any[] } = {};
  selectionType: any;
  selectionTypeEnum = NsAccessControlConfig.SelectionType;
  radioSelections: { value: string; label: string }[] = [];
  batchRanges: any;
  selectedCharacterRange: string;
  accessControlCriteriaSelection!: NsAccessControlConfig.IAccessControlCriteriaSelection;
  activeTab = 0;
  userProfile: any;
  content: any;
  searchedOrganisationFlagWithQuery: boolean = false;

  public readonly data = inject<{ rule: any; condition: any; selected: any[]; activeTabSelected: number; disabled: boolean }>(MAT_DIALOG_DATA);
  searchedDesignationFlagWithQuery: any;
  orgSelectionIds = [];

  paginationOffset = 0;
  totalItemsCount = 0;
  paginationLImit = 100
  isFetchingMore = false;

  application = "";
  APPLICATION_ENUM = NsAccessControlConfig.Application;
  rawCadreconfigData: any;
  accessControlConfig: NsAccessControlConfig.IAccessControlConfig | null = null;

  serviceSelectionTypes = ["All Services"];
  selectedServiceType = "All Services";
  customeFieldValues: any;
  isEntityCustomField: boolean;

  entityFilterOptions = CHECKBOX_OPTIONS;
  isCCA = false;
  environment: any
  ODCSMasterFramework: any
  applyNewServiceSelections = true
  canLoadMasterDesignation = false
  constructor(
      public dialogRef: MatDialogRef<EntitySelectionsComponent>,
      private accessControlService: AccessControlService,
      private cadreMappingService: CadreMappingService,
      @Inject("environment") environment: any
    ) {
      this.environment = environment;
    }

  ngOnInit(): void {
    // If data was passed to the dialog, initialize selections
    if (this.environment.ODCSMasterFramework) {
      this.ODCSMasterFramework = this.environment.ODCSMasterFramework
    }
    this.accessControlConfig = this.accessControlService.accessControlConfig();

    this.accessControlCriteriaSelection = this.accessControlConfig?.accessControlCriteriaSelection;
    this.userProfile = this.accessControlConfig?.userConfig;
    this.content = this.accessControlConfig?.content;
    this.application = this.accessControlConfig?.application || "";
    this.isCCA = this.accessControlConfig?.userConfig?.org?.isCCA ?? false;
    
    // if(this.content && this.content?.externalId) {
    //   this.applyNewServiceSelections = true
    // }
    
    if (this.data) {
      this.selectionType = this.data?.condition?.entity;
    }

    this.isEntityCustomField = this.checkIfCustomeField(this.data.condition);
    if (this.isEntityCustomField) {
      this.customeFieldValues = this.accessControlService.customesFieldData().find((ele: any) => ele?.value === this.data.condition.entity);
      this.selectionType = NsAccessControlConfig.SelectionType.CustomField;
    }

    if (this.data && this.data.selected && this.data.selected.length) {
      if (this.selectionType === NsAccessControlConfig.SelectionType.Batch) {
        this.selectedData = [...this.data.selected.map((ele: any) => _.toNumber(ele))];
        this.selectedDataTemp = [...this.selectedData];
      } else if (this.selectionType === NsAccessControlConfig.SelectionType.CentralDeputation) {
        this.selectedCentralDeputation = this.data.selected[0] === 'true' || this.data.selected[0] === true;
      } else {
        this.selectedData = [...this.data.selected];
        this.selectedDataTemp = [...this.selectedData];
      }

      if (this.application === NsAccessControlConfig.Application.MDO) {
        this.selectedServiceType = "All Services";
      }

      this.activeTab = this.data?.activeTabSelected || 0;
      this.filterValue = this.data?.activeTabSelected > 0 ? "selected" : "all";
    }

     if (this.selectionType === NsAccessControlConfig.SelectionType.CentralDeputation) {
      this.selectedDataTemp = [this.selectedCentralDeputation];
    }

    // Subscribe to search control changes
    this.searchControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((query: string) => {
      if (this.selectionType) {
        switch (this.selectionType) {
          case this.selectionTypeEnum.Service:
            this.getServicesList(query);
            break;
          case this.selectionTypeEnum.Cadre:
            this.getCadreList(query);
            break;
          case this.selectionTypeEnum.Batch:
            this.getBatchList(query);
            break;
        }
      }
    });

    this.initializeDisplay();
  }

  initializeDisplay(): void {
    switch (this.selectionType) {
      case NsAccessControlConfig.SelectionType.Organizations:
        if (this.activeTab === 0) {
          this.selectedCharacterRange = "A";
          this.getOrganisationsList("", [], this.selectedCharacterRange);
        } else {
          this.getOrganisationsList("", this.selectedData, undefined);
          this.alphabet = [];
        }
        this.radioSelections = this.accessControlCriteriaSelection.organizationRadioSelection;
        break;
      case NsAccessControlConfig.SelectionType.Designation:
        
        // For isCCA = false , fetch designations within their orgs only
        if (!this.isCCA && this.application === NsAccessControlConfig.Application.MDO) {
          this.orgSelectionIds = this.accessControlConfig.userConfig.org?.rootOrgId ? [this.accessControlConfig.userConfig.org?.rootOrgId] : [];
        } else {
          this.orgSelectionIds = this.data?.rule?.conditions?.find(
            (c: any) => c.entity === NsAccessControlConfig.SelectionType.Organizations
          )?.selections;
        }

        if(this.orgSelectionIds?.length) {
          this.alphabet = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
          this.selectedCharacterRange = "#";
        } else this.selectedCharacterRange = "A";

        if (this.activeTab === 0) {
          this.getDesignationsList(this.paginationOffset, "", [], this.selectedCharacterRange);
        } else {
          this.getDesignationsList(this.paginationOffset, "", this.selectedData, undefined);
          this.alphabet = [];
        }

        this.radioSelections = this.accessControlCriteriaSelection?.designationRadioSelection;
        break;
      case NsAccessControlConfig.SelectionType.Service:
        this.radioSelections = this.accessControlCriteriaSelection?.servicesRadioSelection;
        this.getServicesList(this.searchControl.value);
        break;
      case NsAccessControlConfig.SelectionType.Cadre:
        this.radioSelections = this.accessControlCriteriaSelection?.cadreRadioSelection;
        this.getCadreList(this.searchControl.value);
        break;
      case NsAccessControlConfig.SelectionType.Batch:
        this.radioSelections = this.accessControlCriteriaSelection?.batchRadioSelection;
        this.getBatchList(this.searchControl.value);
        break;
      case NsAccessControlConfig.SelectionType.Group:
        this.getGroupList();
        break;
      case NsAccessControlConfig.SelectionType.VerificationStatus:
        this.getVerificationStatus();
        break;
      case NsAccessControlConfig.SelectionType.CustomField:
        this.radioSelections = this.accessControlCriteriaSelection[this.customeFieldValues?.value];
        this.getCustomsFieldList();
        break;
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  private getSelectionValue(item: any): any {
    if (typeof item !== "object" || item === null) {
      return item
    } else if (
      this.selectionType === NsAccessControlConfig.SelectionType.Cadre ||
      this.selectionType === NsAccessControlConfig.SelectionType.Service ||
      this.selectionType === NsAccessControlConfig.SelectionType.Designation
    ) {
      return item?.name?.toLowerCase() || item?.designation?.toLowerCase();
    } else if (this.selectionType === NsAccessControlConfig.SelectionType.Batch) {
      return Number(item);
    }

    return item?.id?.toLowerCase() || item?.identifier?.toLowerCase() || item;
  }

 isSelected(item: any): boolean {
  const value = this.getSelectionValue(item);
  const compareList = this.filterValue === "selected" ? this.selectedData : this.selectedDataTemp;

  return compareList.some(selected => {
    if (typeof selected === 'string' && typeof value === 'string') {
      return selected === value ||
             selected.toLowerCase() === value.toLowerCase() ||
             selected.toUpperCase() === value.toUpperCase();
    } else {
      return selected === value;
    }
  });
}

  toggleSelection(item: any): void {
    const value = this.getSelectionValue(item);
    if (this.filterValue === "all") {
      if (this.selectedDataTemp.includes(value)) {
        this.selectedDataTemp = this.selectedDataTemp.filter((v) => v !== value);
      } else {
        this.selectedDataTemp = [...this.selectedDataTemp, value];
      }
    } else if (this.filterValue === "selected") {
      if (this.selectedData.includes(value)) {
        this.selectedData = this.selectedData.filter((v) => v !== value);
      } else {
        this.selectedData = [...this.selectedData, value];
      }
      this.selectedDataTemp = [...this.selectedData];
    }
  }

  setSelected(): void {
    this.selectedData = [...this.selectedDataTemp];
    this.activeTab = 1;
  }

  onFilterChange(event: MatTabChangeEvent): void {
    if ((event?.tab?.textLabel).toLowerCase().includes("selected")) {
      this.filterValue = "selected";
      this.searchControl.setValue("");
    } else {
      this.filterValue = "all";
    }
    if (this.selectionType === NsAccessControlConfig.SelectionType.Organizations) {
      if (this.activeTab === 0) {
        this.selectedCharacterRange = "A";
        this.getOrganisationsList("", [], this.selectedCharacterRange);
      } else {
        this.getOrganisationsList("", this.selectedData, undefined);
      }
    }

    if (this.selectionType === NsAccessControlConfig.SelectionType.Designation) {
      if (this.orgSelectionIds?.length) {
          this.alphabet = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
          this.selectedCharacterRange = "#";
      } else this.selectedCharacterRange = "A"; 

      if (this.activeTab === 0) {
        this.getDesignationsList(this.paginationOffset, "", [], this.selectedCharacterRange);
      } else {
        this.getDesignationsList(this.paginationOffset, "", this.selectedData, undefined);
      }
    }

    this.getFilteredEntityGrouped();
    if (this.selectionType === NsAccessControlConfig.SelectionType.Batch) {
      this.updateBatchRanges();
    } else {
      this.updateAlphabet();
    }

    if (this.selectionType === NsAccessControlConfig.SelectionType.Cadre || this.selectionType === NsAccessControlConfig.SelectionType.Service) {
      this.alphabet = [];
    }
  }

  search(): void {
    this.paginationOffset = 0;
    switch (this.selectionType) {
      case NsAccessControlConfig.SelectionType.Designation:
        if (this.filterValue === "all" && !this.searchControl.value) {
          this.selectedCharacterRange = "A";
          this.updateAlphabet();
          this.getDesignationsList(this.paginationOffset, this.searchControl.value, [], this.selectedCharacterRange);
        } else {
          this.getDesignationsList(this.paginationOffset, this.searchControl.value);
        }
        break;
      case NsAccessControlConfig.SelectionType.Organizations:
        this.selectedCharacterRange = "A";
        if (this.filterValue === "all" && !this.searchControl.value) this.updateAlphabet();
        this.getOrganisationsList(this.searchControl.value, []);
        break;
      case NsAccessControlConfig.SelectionType.Service:
        this.getServicesList(this.searchControl.value);
        break;
      case NsAccessControlConfig.SelectionType.Cadre:
        this.getCadreList(this.searchControl.value);
        break;
      case NsAccessControlConfig.SelectionType.Batch:
        this.getCadreList(this.searchControl.value);
        break;
    }
  }

  getFilteredEntityGrouped(): void {
    this.isLoading = true;
    let filtered = this.dataList;

    if (this.filterValue === "selected") {
      if (this.selectionType === NsAccessControlConfig.SelectionType.CustomField) {
        const selectedData = this.selectedData.map((ele) => ele.fieldValue);
        filtered = this.dataListDup.filter((item) => this.isSelected(item) && selectedData.includes(item?.fieldValue));
      } else {
          filtered = this.dataListDup.filter(item => {
          const keysToCheck = [item?.name, item?.designation, item?.id, item?.identifier, item];
          return this.isSelected(item) && keysToCheck.some(key =>
            key && this.selectedData.some(selected => {
              if (typeof selected === 'string' && typeof key === 'string') {
                return selected === key ||
                      selected.toLowerCase() === key.toLowerCase() ||
                      selected.toUpperCase() === key.toUpperCase();
              } else {
                return selected === key;
              }
            })
          );
        });
      }
    }

    if (filtered.length === 0) {
      this.groupedEntityData = {};
      this.isLoading = false;
      return;
    }

    // For batch, group by range and chunk each range
    if (this.selectionType === this.selectionTypeEnum.Batch) {
      const batchGrouped = this.groupBatchByRange(filtered);
      const chunked: { [key: string]: any[][] } = {};
      for (const key in batchGrouped) {
        chunked[key] = this.chunkArray(batchGrouped[key], 8);
      }
      this.groupedEntityData = chunked;
      this.isLoading = false;
      return;
    }

    // For cadre and service, group 8 items irrespective of letter
    if (this.selectionType === this.selectionTypeEnum.Cadre || this.selectionType === this.selectionTypeEnum.Service) {
      // sort the filtered list by name
      filtered = filtered.sort((a, b) => {
        const nameA = a?.name?.toLowerCase() || "";
        const nameB = b?.name?.toLowerCase() || "";
        return nameA.localeCompare(nameB);
      });

      // chunk the filtered list into groups of 8
      const grouped: { [key: string]: any[][] } = {};
      grouped["All"] = this.chunkArray(filtered, 8);
      this.groupedEntityData = grouped;
      this.isLoading = false;
      return;
    }

    if(this.selectionType === this.selectionTypeEnum.CustomField) {
      filtered = filtered.sort((a, b) => {
        const nameA = a?.fieldValue?.toLowerCase() || "";
        const nameB = b?.fieldValue?.toLowerCase() || "";
        return nameA.localeCompare(nameB);
      });

      // chunk the filtered list into groups of 8
      const grouped: { [key: string]: any[][] } = {};
      grouped["All"] = this.chunkArray(filtered, 8);
      this.groupedEntityData = grouped;
      this.isLoading = false;
      return;
    }

    // For Designation or organizations with search query, don't group by letter
    if ((this.selectionType === this.selectionTypeEnum.Designation || this.selectionType === this.selectionTypeEnum.Organizations) && this.searchControl.value) {
      const grouped: { [key: string]: any[][] } = {};
      grouped["All"] = this.chunkArray(filtered, 8);
      this.groupedEntityData = grouped;
      this.isLoading = false;
      this.alphabet = [];
      return;
    }

    // For all other types, group by letter and chunk each group
    const grouped: { [key: string]: any[][] } = {};
    const temp: { [key: string]: any[] } = {};
    for (const org of filtered) {
      let entity = org?.channel || org?.name || org?.designation;
      let letter = entity?.trim()?.charAt(0)?.toUpperCase() || "#";
      if (!/^[A-Z]$/.test(letter)) {
        letter = "#";
      }
      if (!temp[letter]) temp[letter] = [];
      temp[letter].push(org);
    }
    // Ensure # group is assigned at the end
    const sortedLetters = Object.keys(temp)
      .filter((l) => l !== "#")
      .sort();
    if (temp["#"]) sortedLetters.push("#");
    for (const letter of sortedLetters) {
      grouped[letter] = this.chunkArray(temp[letter], 7);
    }
    this.groupedEntityData = grouped;
    this.isLoading = false;
  }

  scrollToSection(letter: string) {
    this.paginationOffset = 0;
    if (this.selectionType === NsAccessControlConfig.SelectionType.Organizations && this.filterValue === "all" && !this.searchedOrganisationFlagWithQuery) {
      this.selectedCharacterRange = letter;
      this.getOrganisationsList("", [], letter);
      return;
    }
    if (this.selectionType === NsAccessControlConfig.SelectionType.Designation && this.filterValue === "all" && !this.searchedDesignationFlagWithQuery) {
      // !this.orgSelectionIds?.length
      this.selectedCharacterRange = letter;
      this.getDesignationsList(this.paginationOffset, "", [], letter);
      return;
    }

    const section = document.getElementById(`section-${letter}`);
    if (section) {
      this.selectedCharacterRange = letter;
      section.scrollIntoView({ behavior: "auto", inline: "start" });
    }
  }

  private updateAlphabet(): void {
    this.selectedCharacterRange = "A";
    const chars = new Set<string>();

    const sourceList =
      this.filterValue === "selected"
        ? this.dataListDup.filter((item) => this.isSelected(item) && this.selectedData.includes(item?.name || item?.designation || item?.id || item?.identifier || item))
        : this.dataList;

    for (const data of sourceList) {
      const value = data?.channel || data?.name || data?.designation || "";
      let letter = value.charAt(0)?.toUpperCase() || "#";
      if (!/^[A-Z]$/.test(letter)) {
        letter = "#";
      }
      chars.add(letter);
    }

    const sorted = Array.from(chars)
      .filter((c) => c !== "#")
      .sort();
    if (chars.has("#")) sorted.push("#");

    // Show all characters for Organizations
    if (
      (this.selectionType === NsAccessControlConfig.SelectionType.Organizations || this.selectionType === NsAccessControlConfig.SelectionType.Designation) &&
      this.filterValue === "all" &&
      !this.searchControl.value
    ) {
      if( this.selectionType === NsAccessControlConfig.SelectionType.Designation && this.orgSelectionIds?.length) {
        this.alphabet = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
        this.selectedCharacterRange = "#";
      } else {
        this.alphabet = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "#"];
      }
    } else {
      this.alphabet = sorted;
    }
  }

  get checkIfData(): boolean {
    return (
      (this.groupedEntityData && Object.keys(this.groupedEntityData).length > 0) ||
      (this.selectionType === NsAccessControlConfig.SelectionType.Group && this.dataList.length > 0) ||
      (this.selectionType === NsAccessControlConfig.SelectionType.VerificationStatus && this.dataList.length > 0) ||
      (this.selectionType === NsAccessControlConfig.SelectionType.Designation && this.dataList.length > 0)
    );
  }

  onScrollPaginate(event: any): void {
    const threshold = 150;
    const position = event.target.scrollLeft + event.target.offsetWidth;
    const width = event.target.scrollWidth;
    if (width - position < threshold && !this.isLoading && !this.isFetchingMore && this.dataList.length < this.totalItemsCount) {
      this.loadMore();
    }
  }

  loadMore(): void {
    if (this.dataList.length >= this.totalItemsCount || this.isFetchingMore) return;
    this.isFetchingMore = true;
    this.paginationOffset += this.accessControlConfig.accessControlCriteriaSelection.paginationLimit || this.paginationLImit;
    
    switch (this.selectionType) {
      case this.selectionTypeEnum.Designation:
        if (this.searchControl.value) this.selectedCharacterRange = "";
        this.getDesignationsList(this.paginationOffset, this.searchControl.value, [], this.selectedCharacterRange, true);
        break;
      case this.selectionTypeEnum.Organizations:
        if (this.searchControl.value) this.selectedCharacterRange = "";
        this.getOrganisationsList(this.searchControl.value, [], this.selectedCharacterRange, true);
        break;
    }
  }

  getOrganisationsList(query: string, selectedData?: string[], character?: string, append: boolean = false): void {
    if (!append) {
      this.isLoading = true;
    }
    
    const pagination = {
      limit: this.accessControlConfig.accessControlCriteriaSelection.paginationLimit || this.paginationLImit,
      offset: this.paginationOffset
    };

    this.accessControlService.fetchOrgList(query, pagination, query ? [] : selectedData, character)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.result && response?.result?.response?.content) {
            const newData = response.result.response.content;
            this.dataList = append ? [...this.dataList, ...newData] : newData;
            this.dataListDup = _.uniqWith([...this.dataListDup, ...newData], _.isEqual);
            this.totalItemsCount = response.result.response.count;

            if (query) this.searchedOrganisationFlagWithQuery = true;
            else this.searchedOrganisationFlagWithQuery = false;

            if (this.filterValue === "selected" || query) this.updateAlphabet();

            this.getFilteredEntityGrouped();
          } else {
            this.dataList = [];
            this.alphabet = [];
            this.dataListDup = [];
            this.groupedEntityData = {};
          }
        },
        complete: () => {
          this.isLoading = false;
          this.isFetchingMore = false;
        },
      });
  }

  getDesignationsList(paginationOffset: number, query: string, selectedData?: string[], character?: string, append: boolean = false): void {
    if (!append) {
      this.isLoading = true;
    }

    // // For isCCA = false , fetch designations within their orgs only
    // if(!this.isCCA && this.application === NsAccessControlConfig.Application.MDO) {
    //   this.orgSelectionIds = this.accessControlConfig.userConfig.org?.rootOrgId ? [this.accessControlConfig.userConfig.org?.rootOrgId] : [];
    // } else {
    //   this.orgSelectionIds = this.data?.rule?.conditions?.find((c: any) => c.entity === NsAccessControlConfig.SelectionType.Organizations)?.selections;
    // }
    if (this.orgSelectionIds?.length && !this.canLoadMasterDesignation) {
      const categories = this.orgSelectionIds.map((ele: string) => `${ele}_${this.ODCSMasterFramework ? this.ODCSMasterFramework : 'odcs'}_designation`);
      this.accessControlService
        .fetchDesignationsWithOrg(paginationOffset, categories, query, query ? [] : selectedData, character)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response?.result && response?.result?.Term) {
              // const newData = response?.result?.Term;
              const newData = _.uniqBy(response.result.Term, (item: any) => item?.identifier && item?.name);

              this.dataList = append ? [...this.dataList, ...newData] : newData;
              this.dataListDup = _.uniqWith([...this.dataListDup, ...newData], _.isEqual);
              this.totalItemsCount = response?.result?.count;

              if (query) this.searchedDesignationFlagWithQuery = true;
              if (this.filterValue === "selected" || query) this.updateAlphabet();
              this.getFilteredEntityGrouped();

            } else if(response?.result && response?.result?.count) {
              // ignore empty block - no data but count exists
            } else {
              this.dataList = [];
              this.dataListDup = [];
              this.groupedEntityData = {};
              if (query) this.alphabet = [];

              if(!query && selectedData?.length) {
                this.loadMoreDesignation();
              }
            }
          },
          complete: () => {
            this.isLoading = false;
            this.isFetchingMore = false;
          },
        });
    } else {
      const pageSize = this.accessControlConfig.accessControlCriteriaSelection.paginationLimit || this.paginationLImit;
      const pagination = {
        pageSize: pageSize,
        pageNumber: Math.floor(paginationOffset / pageSize)
      };
      
      this.accessControlService
        .fetchDesignation(query, pagination, query ? [] : selectedData, character)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response?.result && response?.result?.result?.data) {
              const newData = response?.result?.result?.data;
              this.dataList = append ? [...this.dataList, ...newData] : newData;
              this.dataListDup = _.uniqWith([...this.dataListDup, ...newData], _.isEqual);
              this.totalItemsCount = response?.result?.result?.totalCount;

              if (query) this.searchedDesignationFlagWithQuery = true;
              else this.searchedDesignationFlagWithQuery = false;
              
              if (this.filterValue === "selected" || query) this.updateAlphabet();
              this.getFilteredEntityGrouped();

              if(!query && selectedData?.length && this.orgSelectionIds?.length) {
                this.canLoadMasterDesignation = true;
              }
            } else {
              this.dataList = [];
              this.dataListDup = [];
              this.groupedEntityData = {};
              this.alphabet = [];
            }
          },
          complete: () => {
            this.isLoading = false;
            this.isFetchingMore = false;
          },
        });
    }
  }

  getServicesList(query: string): void {
    if (this.application === NsAccessControlConfig.Application.MDO || this.applyNewServiceSelections) {
      const baseList = this.accessControlService.holdServiceCadrebatch().service;
      const baseServiceNames = new Set(baseList.map(service => service.name?.trim().toLowerCase()));
      
      const cadreDataRaw = this.cadreMappingService.getCadreConfigData()?.civilServiceType?.civilServiceTypeList || [];
      
      // Update service types only once when first loading
      if (this.serviceSelectionTypes.length === 1) {
        this.serviceSelectionTypes = ["All Services", ...cadreDataRaw.map((element: any) => element.name)];
      }

      let selectedTypes: string[];
      if (this.selectedServiceType === "All Services") {
        selectedTypes = cadreDataRaw.map((element: any) => element.name);
      } else {
        selectedTypes = [this.selectedServiceType];
      }
      let allServices: any[] = [];
      cadreDataRaw.forEach((item: any) => {
        if (selectedTypes.includes(item.name) && Array.isArray(item.serviceList)) {
          // Filter services that exist in baseList
          const filteredServices = item.serviceList.filter((service: any) => 
            baseServiceNames.has(service.name?.trim().toLowerCase())
          );
          allServices = allServices.concat(filteredServices);
        }
      });
      
      allServices = _.uniqBy(allServices, (service: any) => service.name?.trim().toLowerCase());
      this.dataList = query ? allServices.filter((service) => service.name?.toLowerCase().includes(query.toLowerCase())) : allServices;
      this.dataListDup = _.uniqWith([...this.dataListDup, ...this.dataList], _.isEqual);
      this.alphabet = [];
      this.getFilteredEntityGrouped();
    } else {
      const baseList = this.accessControlService.holdServiceCadrebatch().service;
      this.dataList = query ? baseList.filter((service) => service.name?.toLowerCase().includes(query.toLowerCase())) : baseList;
      this.dataListDup = _.uniqWith([...this.dataListDup, ...this.dataList], _.isEqual);
      this.alphabet = [];
      this.getFilteredEntityGrouped();
    }
  }

  getCadreList(query: string): void {
    const baseList = this.accessControlService.holdServiceCadrebatch().cadre;
    this.dataList = query ? baseList.filter((cadre) => cadre.name?.toLowerCase().includes(query.toLowerCase())) : baseList;
    this.dataListDup = _.uniqWith([...this.dataListDup, ...this.dataList], _.isEqual);

    this.alphabet = [];
    this.getFilteredEntityGrouped();
  }

  getBatchList(query: string): void {
    const baseList = this.accessControlService.holdServiceCadrebatch().batch;
    this.dataList = query ? baseList.filter((batch) => batch.toString().includes(query)) : baseList;
    this.dataListDup = _.uniqWith([...this.dataListDup, ...this.dataList], _.isEqual);

    this.updateBatchRanges();
    this.getFilteredEntityGrouped();
  }

  getGroupList(): void {
    this.isLoading = true;
    this.accessControlService
      .fetchGroupsList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response?.result && response?.result?.response) {
            this.dataList = response.result.response;
          }
        },
        complete: () => {
          this.isLoading = false;
        },
      });
  }

  getVerificationStatus(): void {
    this.dataList = this.accessControlCriteriaSelection.verificationStatus;
  }

  getCustomsFieldList(): void {
    if(this.customeFieldValues?.reversedOrderCustomFieldData?.length) {
      const mappedValues = this.customeFieldValues?.reversedOrderCustomFieldData;
      
      this.dataList = mappedValues || [];
      this.dataListDup = _.uniqWith([...mappedValues], _.isEqual);
      this.alphabet = [];
  
      if (this.data && this.data.selected && Array.isArray(this.data.selected) && this.data.selected.length) {
        if (this.data.selected.every((item) => typeof item === "string")) {
          const dataFields = this.dataList.filter((ele) => this.data.selected.includes(ele?.fieldValue));
          this.selectedData = [...dataFields];
          this.selectedDataTemp = [...this.selectedData];
        }
      }
      this.getFilteredEntityGrouped();
      
    } else {
      this.dataList = []
      this.dataListDup = []
      this.getFilteredEntityGrouped();
    }
    
  }

  updateBatchRanges(): void {
    const isSelectedFilter = this.filterValue === "selected";

    const sourceList = isSelectedFilter ? this.dataListDup.filter((item) => this.isSelected(item) && this.selectedData.includes(item)) : this.dataList;

    const validLabels: string[] = [];

    for (const { label, start, end } of BATCH_RANGES) {
      const hasItemInRange = sourceList.some((item) => item >= start && item <= end);
      if (hasItemInRange) {
        validLabels.push(label);
      }
    }

    this.batchRanges = validLabels;
  }

  groupBatchByRange(batchList: number[]) {
    const grouped: { [key: string]: number[] } = {};
    for (const range of BATCH_RANGES) {
      grouped[range.label] = batchList.filter((year) => year >= range.start && year <= range.end);
    }
    return grouped;
  }

  getModalTitle(): string {
    switch (this.selectionType) {
      case NsAccessControlConfig.SelectionType.Designation:
        return "Select Designation";
      case NsAccessControlConfig.SelectionType.Organizations:
        return "Select Organisation";
      case NsAccessControlConfig.SelectionType.Service:
        return "Select Services";
      case NsAccessControlConfig.SelectionType.Cadre:
        return "Select Cadre";
      case NsAccessControlConfig.SelectionType.Batch:
        return "Select Batch";
      case NsAccessControlConfig.SelectionType.Group:
        return "Select Group";
      case NsAccessControlConfig.SelectionType.VerificationStatus:
        return "Verification Status";
      case NsAccessControlConfig.SelectionType.CustomField:
        return `Select ${this.capitalizeFirstLetter(this.customeFieldValues?.label)}` || "Select Value";
      case NsAccessControlConfig.SelectionType.CentralDeputation:
        return "Central Deputation";
    }
    return "";
  }

  applySelections(): void {
    if (
      this.selectionType === NsAccessControlConfig.SelectionType.Group ||
      this.selectionType === NsAccessControlConfig.SelectionType.VerificationStatus ||
      this.selectionType === NsAccessControlConfig.SelectionType.CentralDeputation
    ) {
      this.selectedData = this.selectedDataTemp;
    }
    this.dialogRef.close({
      rule: this.data.rule,
      condition: this.data.condition,
      selected: this.selectedData,
    });
  }

  chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const results: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      results.push(array.slice(i, i + chunkSize));
    }
    return results;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onVerificationChange(event: MatRadioChange) {
    const value = event.value;
    const index = this.selectedDataTemp.indexOf(value);
    if (index > -1) {
      this.selectedDataTemp.splice(index, 1);
    } else {
      this.selectedDataTemp.push(value);
    }
  }

  isSelectedVerification(event: any): boolean {
    return this.selectedDataTemp.includes(event?.value);
  }

  disableOrganisationIfModerated(item: any): boolean {
    const value = this.getSelectionValue(item);

    // // Case 1: It's the user's own root org AND content is MDO-specific
    // const isOwnRootOrgAndMdoSpecific =
    //   value === this.userProfile?.rootOrgId &&
    //   this.content?.accessSetting === NsAccessControlConfig.IAccessSetting.MDO_SPECIFIC;

    // // Case 2: Org is already selected AND content is/was Live → prevent deselection
    // const isAlreadySelectedAndLive =
    //   this.data.selected.includes(value) &&
    //   (this.content?.status === "Live" || this.content?.prevStatus === "Live");

    // // Disable if EITHER condition is true
    // return isOwnRootOrgAndMdoSpecific || isAlreadySelectedAndLive;

    if (value === this.userProfile?.rootOrgId && this.content?.accessSetting === NsAccessControlConfig.IAccessSetting.MDO_SPECIFIC) return true;
    return false;
  }

  disabledVerifiedIfModerated(item: any): boolean {
    // const isVerifiedOption = item?.value === "VERIFIED";
    // const isMdoSpecific = this.content?.accessSetting === NsAccessControlConfig.IAccessSetting.MDO_SPECIFIC;

    // const isSelectedAndLive = this.data.selected.includes(item?.value) && (this.content?.status === "Live" || this.content?.prevStatus === "Live");

    // return isMdoSpecific && (isVerifiedOption || isSelectedAndLive);
    if (item?.value === "VERIFIED" && this.content?.accessSetting === NsAccessControlConfig.IAccessSetting.MDO_SPECIFIC) return true;
    return false;
  }

  // On Mdo Portal, Service Selection Type Change
  onChangeServiceSelectionType(event: MatRadioChange): void {
  const wasSelectAllChecked = this.areAllSelected();
  this.selectedServiceType = event.value;
  this.getServicesList(this.searchControl.value);
  
  // If selectAll was checked before, auto-select all items in the new filtered list
  if (wasSelectAllChecked) {
    this.selectedDataTemp = this.dataList.map((item) => this.getSelectionValue(item));
    this.getFilteredEntityGrouped();
  } 
}

  checkIfCustomeField(condition: any): boolean {
    const optionsEntity = this.accessControlConfig.accessControlCriteriaSelection.optionsEntity;
    if (optionsEntity && optionsEntity.length) {
      const matched = optionsEntity.find((ele: any) => ele?.value === condition?.entity);
      return matched?.isCustomField || false;
    }
    return false;
  }

  isCentralDeputationSelected(isDeputation: string): boolean {
    return this.selectedDataTemp.includes(isDeputation);
  }

  onCentralDeputationChange(event: any): void {
    const isChecked = event?.target?.checked;
    this.selectedDataTemp = [isChecked];
  }

  selectAvailableOptions(event: MatCheckboxChange): void {
    const checked = event.checked;
    const value = event.source.value;

    if (!checked) {
      const currentItems = this.dataList.map((item) => this.getSelectionValue(item));
      this.selectedDataTemp = this.selectedDataTemp.filter(item => !currentItems.includes(item));
      return;
    }

    switch (value) {
      case "selectAll":
        const newSelections = this.dataList.map((item) => this.getSelectionValue(item));
        const merged = [...this.selectedDataTemp];
        newSelections.forEach(item => {
          if (!merged.includes(item)) {
            merged.push(item);
          }
        });
        this.selectedDataTemp = merged;
        break;
      case "isCCA":
        const ccaItems = this.dataList.filter((item) => item?.iscca === true).map((item) => this.getSelectionValue(item));
        const mergedCca = [...this.selectedDataTemp];
        ccaItems.forEach(item => {
          if (!mergedCca.includes(item)) {
            mergedCca.push(item);
          }
        });
        this.selectedDataTemp = mergedCca;
        break;
    }

    switch (this.selectionType) {
      case this.selectionTypeEnum.Organizations:
      case this.selectionTypeEnum.Designation:
      case this.selectionTypeEnum.Group:
      case this.selectionTypeEnum.CustomField:
      case this.selectionTypeEnum.Cadre:
      case this.selectionTypeEnum.Batch:
        this.getFilteredEntityGrouped();
        break;
    }
  }

  areAllSelected(): boolean {
    if (!this.dataList.length) return false;
    return this.dataList.every((item) => this.selectedDataTemp.includes(this.getSelectionValue(item)));
  }

  isOptionSelected(value: string): boolean {
    switch (value) {
      case "selectAll":
        return this.areAllSelected();
      case "isCCA":
        if (!this.dataList.length) return false;
        const ccaItems = this.dataList.filter(item => item?.iscca === true).map(item => this.getSelectionValue(item));
        return ccaItems.length > 0 && ccaItems.every(item => this.selectedDataTemp.includes(item));
      default:
        return false;
    }
  }

  capitalizeFirstLetter(str: string) {
    if (typeof str !== "string" || str.length === 0) {
      return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  loadMoreDesignation(): void {
    this.canLoadMasterDesignation = true;
    if(this.filterValue === "all") {
      this.getDesignationsList(this.paginationOffset, '', [], 'A', false);
    } else {
      this.getDesignationsList(this.paginationOffset, '', this.selectedData, '', false);
    }
  }

}
