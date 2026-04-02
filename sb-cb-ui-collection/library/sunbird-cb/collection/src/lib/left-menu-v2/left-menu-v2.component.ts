
import { ILeftMenu, IMenu } from './left-menu-v2.model'
import { Component, OnInit, Input } from '@angular/core'
import { Router } from '@angular/router'
import { NsWidgetResolver, WidgetBaseComponent } from '@sunbird-cb/resolver-v2'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'
@Component({
  selector: 'ws-widget-left-menu-v2',
  templateUrl: './left-menu-v2.component.html',
  styleUrls: ['./left-menu-v2.component.scss'],
})
export class LeftMenuV2Component extends WidgetBaseComponent
  implements OnInit, NsWidgetResolver.IWidgetData<ILeftMenu> {
  @Input() widgetData!: ILeftMenu
  preserve = 'preserve'

  constructor(public configSvc: ConfigurationsService, private router: Router) {
    super()
  }

  ngOnInit(): void {
  }

  changeToDefaultImg($event: any) {
    $event.target.src = this.configSvc?.instanceConfig?.logos?.defaultSourceLogo || ''
  }

  isAllowed(tab: IMenu): boolean {
    let returnValue = false
    if (tab.requiredRoles && tab.requiredRoles.length > 0) {
      (tab.requiredRoles).forEach(v => {
        if ((this.configSvc.userRoles || new Set()).has(v)) {
          returnValue = true
        }
      })
    } else {
      returnValue = true
    }
    return returnValue
  }

  public isLinkActive2(url?: string): boolean {
    let returnval = false
    if (url) {
      const st = this.router.url.split('?')
      if (st && st[0] && st[0] === (url)) {
        returnval = true
      }
      // if(route.url.con)
    }
    return returnval
  }

  public isLinkActive(key?: string, _index?: number): boolean {
    return this.isLinkActive2(key)
  }

  public getLink(menu: IMenu): string {
    return menu.routerLink || ''
  }
}
