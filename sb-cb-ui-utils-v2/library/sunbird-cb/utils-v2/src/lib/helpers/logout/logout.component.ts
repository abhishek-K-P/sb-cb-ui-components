import { Component, OnInit } from '@angular/core'
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog'
import { AuthKeycloakService } from '../../services/auth-keycloak.service'
import { ConfigurationsService } from '../../services/configurations.service'
import { UtilityService } from '../../services/utility.service'
import { TranslateService } from '@ngx-translate/core'

@Component({
  selector: 'ws-utils-logout',
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.scss'],
})
export class LogoutComponent implements OnInit {

  disabled = false
  isDownloadableIos = false
  isDownloadableAndroid = false
  constructor(
    public dialogRef: MatDialogRef<LogoutComponent>,
    private authSvc: AuthKeycloakService,
    private configSvc: ConfigurationsService,
    private utilitySvc: UtilityService,
    private translate: TranslateService
  ) {
    if (localStorage.getItem('websiteLanguage')) {
      this.translate.setDefaultLang('en')
      // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
      // tslint:disable-next-line: no-non-null-assertion
      const lang = localStorage.getItem('websiteLanguage') || null!
      this.translate.use(lang)
    }
  }

  ngOnInit() {
    if (this.configSvc.restrictedFeatures) {
      this.isDownloadableIos = !this.configSvc.restrictedFeatures.has('iosDownload')
      this.isDownloadableAndroid = !this.configSvc.restrictedFeatures.has('androidDownload')
    }
  }

  confirmed() {
    this.disabled = true
    this.dialogRef.close()
    if (localStorage.getItem('ratingformID')) {
      localStorage.removeItem('ratingformID')
    }
    if (localStorage.getItem('ratingfeedID')) {
      localStorage.removeItem('ratingfeedID')
    }
    if (localStorage.getItem('platformratingTime')) {
      localStorage.removeItem('platformratingTime')
    }
    if (localStorage.getItem('websiteLanguage')) {
      localStorage.removeItem('websiteLanguage')
    }
    // this.authSvc.logout()
    this.clearCookies()
    this.authSvc.force_logout()
    if (localStorage.getItem('faq')) {
      localStorage.removeItem('faq')
    }
    if (localStorage.getItem('faq-languages')) {
      localStorage.removeItem('faq-languages')
    }
    if (sessionStorage.getItem('hideUpdateProfilePopUp')) {
      sessionStorage.removeItem('hideUpdateProfilePopUp')
    }
    if (localStorage.getItem('motivationalMessage')) {
      localStorage.removeItem('motivationalMessage')
    }
    if (localStorage.getItem('microSiteRedirectionData')) {
      localStorage.removeItem('microSiteRedirectionData')
    }
  }
  clearCookies() {
    if (!document) {
      // document not available in some environments; do not break logout
      // eslint-disable-next-line no-console
      console.warn('Document is not available; skipping cookie clear')
      return
    }
    if (!document.cookie) {
      // no cookies to clear; silently continue so logout isn't blocked
      return
    }

    const cookies = document.cookie.split(';')
    const hostname = window.location.hostname || ''
    const domainParts = hostname.split('.')
    const expire = 'Thu, 01 Jan 1970 00:00:00 GMT'

    cookies.forEach((c) => {
      try {
        const eqPos = c.indexOf('=')
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim()
        if (!name) {
          return
        }
        // delete for path /
        try {
          document.cookie = `${name}=;expires=${expire};path=/`
        } catch (e) {
          // ignore and continue
        }
        // attempt deleting for parent domains as well
        for (let i = 0; i < domainParts.length; i++) {
          const domain = domainParts.slice(i).join('.')
          try {
            document.cookie = `${name}=;expires=${expire};path=/;domain=${domain}`
          } catch (err) {
            // ignore domain-specific failures and continue
          }
        }
      } catch (err) {
        // ignore per-cookie parsing errors and continue
        // eslint-disable-next-line no-console
        console.warn('Error clearing cookie', c, err)
      }
    })
  }

  get isDownloadable() {
    if (this.configSvc.instanceConfig && this.configSvc.instanceConfig.isContentDownloadAvailable &&
      (this.utilitySvc.iOsAppRef || this.utilitySvc.isAndroidApp)) {
      return true
    }
    return false
  }

}
