import { LogoutComponent } from './logout.component'

describe('LogoutComponent', () => {
  let component: LogoutComponent
  let dialogRef: any
  let authSvc: any
  let configSvc: any
  let utilitySvc: any
  let indexedDbSvc: any
  let translate: any
  let callOrder: string[]

  const createComponent = () => new LogoutComponent(
    dialogRef, authSvc, configSvc, utilitySvc, indexedDbSvc, translate
  )

  beforeEach(() => {
    callOrder = []
    dialogRef = { close: jasmine.createSpy('close').and.callFake(() => callOrder.push('close')) }
    authSvc = { force_logout: jasmine.createSpy('force_logout').and.callFake(() => callOrder.push('force_logout')) }
    configSvc = { restrictedFeatures: undefined, instanceConfig: undefined }
    utilitySvc = { iOsAppRef: false, isAndroidApp: false }
    indexedDbSvc = {
      clearAppDatabase: jasmine.createSpy('clearAppDatabase').and.callFake(() => {
        callOrder.push('clearAppDatabase')
        return Promise.resolve()
      }),
    }
    translate = {
      setDefaultLang: jasmine.createSpy('setDefaultLang'),
      use: jasmine.createSpy('use'),
    }
    spyOn(localStorage, 'getItem').and.returnValue(null)
    component = createComponent()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('constructor', () => {
    it('should not touch translate when websiteLanguage is not set', () => {
      expect(translate.setDefaultLang).not.toHaveBeenCalled()
      expect(translate.use).not.toHaveBeenCalled()
    })

    it('should set default lang and use stored language', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue('hi')
      createComponent()
      expect(translate.setDefaultLang).toHaveBeenCalledWith('en')
      expect(translate.use).toHaveBeenCalledWith('hi')
    })
  })

  describe('ngOnInit', () => {
    it('should keep downloads disabled when restrictedFeatures is missing', () => {
      component.ngOnInit()
      expect(component.isDownloadableIos).toBeFalse()
      expect(component.isDownloadableAndroid).toBeFalse()
    })

    it('should enable downloads when features are not restricted', () => {
      configSvc.restrictedFeatures = new Set<string>()
      component.ngOnInit()
      expect(component.isDownloadableIos).toBeTrue()
      expect(component.isDownloadableAndroid).toBeTrue()
    })

    it('should disable downloads for restricted features', () => {
      configSvc.restrictedFeatures = new Set<string>(['iosDownload', 'androidDownload'])
      component.ngOnInit()
      expect(component.isDownloadableIos).toBeFalse()
      expect(component.isDownloadableAndroid).toBeFalse()
    })
  })

  describe('confirmed', () => {
    beforeEach(() => {
      spyOn(component, 'clearCookies').and.callFake(() => { callOrder.push('clearCookies') })
      spyOn(component, 'clearStorage').and.callFake(() => { callOrder.push('clearStorage') })
    })

    it('should disable the button and close the dialog', async () => {
      await component.confirmed()
      expect(component.disabled).toBeTrue()
      expect(dialogRef.close).toHaveBeenCalled()
    })

    it('should clear cookies, db, then force logout, then storage in order', async () => {
      await component.confirmed()
      expect(callOrder).toEqual(['close', 'clearCookies', 'clearAppDatabase', 'force_logout', 'clearStorage'])
    })

    it('should wait for the database clear before force logout', async () => {
      let resolveDb: () => void = () => undefined
      indexedDbSvc.clearAppDatabase.and.returnValue(new Promise<void>(r => { resolveDb = r }))
      const pending = component.confirmed()
      await Promise.resolve()
      expect(authSvc.force_logout).not.toHaveBeenCalled()
      resolveDb()
      await pending
      expect(authSvc.force_logout).toHaveBeenCalled()
    })
  })

  describe('clearStorage', () => {
    it('should clear localStorage and sessionStorage', () => {
      const lsClear = spyOn(localStorage, 'clear')
      const ssClear = spyOn(sessionStorage, 'clear')
      component.clearStorage()
      expect(lsClear).toHaveBeenCalled()
      expect(ssClear).toHaveBeenCalled()
    })

    it('should still clear sessionStorage when localStorage.clear throws', () => {
      spyOn(localStorage, 'clear').and.throwError('denied')
      const ssClear = spyOn(sessionStorage, 'clear')
      const err = spyOn(console, 'error')
      component.clearStorage()
      expect(ssClear).toHaveBeenCalled()
      expect(err).toHaveBeenCalled()
    })

    it('should not throw when sessionStorage.clear throws', () => {
      spyOn(localStorage, 'clear')
      spyOn(sessionStorage, 'clear').and.throwError('denied')
      const err = spyOn(console, 'error')
      expect(() => component.clearStorage()).not.toThrow()
      expect(err).toHaveBeenCalled()
    })
  })

  describe('clearCookies', () => {
    let writes: string[]
    let cookieValue: string
    let originalDescriptor: PropertyDescriptor | undefined

    beforeEach(() => {
      writes = []
      cookieValue = ''
      originalDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => cookieValue,
        set: (v: string) => { writes.push(v) },
      })
    })

    afterEach(() => {
      delete (document as any).cookie
      if (originalDescriptor) {
        Object.defineProperty(Document.prototype, 'cookie', originalDescriptor)
      }
    })

    it('should do nothing when there are no cookies', () => {
      component.clearCookies()
      expect(writes.length).toBe(0)
    })

    it('should expire each cookie on path / and per domain level', () => {
      cookieValue = 'a=1; b=2'
      component.clearCookies()
      const host = window.location.hostname || ''
      const domains = host.split('.').length
      const forA = writes.filter(w => w.startsWith('a=;'))
      const forB = writes.filter(w => w.startsWith('b=;'))
      expect(forA.length).toBe(1 + domains)
      expect(forB.length).toBe(1 + domains)
      expect(forA[0]).toContain('expires=Thu, 01 Jan 1970 00:00:00 GMT')
      expect(forA[0]).toContain('path=/')
      expect(forA.slice(1).every(w => w.includes(';domain='))).toBeTrue()
    })

    it('should handle cookies without a value', () => {
      cookieValue = 'flag'
      component.clearCookies()
      expect(writes[0].startsWith('flag=;')).toBeTrue()
    })

    it('should skip empty cookie names', () => {
      cookieValue = ' =x'
      component.clearCookies()
      expect(writes.length).toBe(0)
    })

    it('should keep going when a cookie write throws', () => {
      cookieValue = 'a=1; b=2'
      let count = 0
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => cookieValue,
        set: (v: string) => {
          count++
          if (v.startsWith('a=;')) { throw new Error('blocked') }
          writes.push(v)
        },
      })
      expect(() => component.clearCookies()).not.toThrow()
      expect(count).toBeGreaterThan(1)
      expect(writes.some(w => w.startsWith('b=;'))).toBeTrue()
    })
  })

  describe('isDownloadable', () => {
    it('should be false without instanceConfig', () => {
      expect(component.isDownloadable).toBeFalse()
    })

    it('should be false when content download is not available', () => {
      configSvc.instanceConfig = { isContentDownloadAvailable: false }
      utilitySvc.isAndroidApp = true
      expect(component.isDownloadable).toBeFalse()
    })

    it('should be false on web even when download is available', () => {
      configSvc.instanceConfig = { isContentDownloadAvailable: true }
      expect(component.isDownloadable).toBeFalse()
    })

    it('should be true on android app', () => {
      configSvc.instanceConfig = { isContentDownloadAvailable: true }
      utilitySvc.isAndroidApp = true
      expect(component.isDownloadable).toBeTrue()
    })

    it('should be true on iOS app', () => {
      configSvc.instanceConfig = { isContentDownloadAvailable: true }
      utilitySvc.iOsAppRef = true
      expect(component.isDownloadable).toBeTrue()
    })
  })
})
