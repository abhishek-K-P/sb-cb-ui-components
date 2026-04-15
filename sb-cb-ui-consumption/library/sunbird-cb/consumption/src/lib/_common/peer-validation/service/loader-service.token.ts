import { InjectionToken } from '@angular/core'

export interface ILoaderService {
  changeLoaderState(isLoading: boolean): void
}

export const LOADER_SERVICE = new InjectionToken<ILoaderService>('LOADER_SERVICE')
