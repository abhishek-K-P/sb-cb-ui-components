import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
  untracked,
} from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { Router } from '@angular/router'
import { EventService, TelemetryService, UtilityService, WsEvents } from '@sunbird-cb/utils-v2'
import { NsSpotlightCardsV2 } from './spotlight-cards-v2.model'

/** Falls back to the token the SCSS used before the background became configurable. */
const DEFAULT_CARD_BACKGROUND = 'var(--surface-secondary)'
import { TranslateModule } from '@ngx-translate/core'
import { ContentApiService } from '../strips-v2/services/content-api.service'
import { CarouselComponent } from '../carousel/carousel.component'

/** Card box from the mockup — kept in sync with .ws-spotlight__card in the SCSS. */
const CARD_WIDTH = 248
const CARD_GAP = 24

@Component({
  selector: 'sb-uic-spotlight-cards-v2',
  standalone: true,
  imports: [MatIconModule, TranslateModule, CarouselComponent],
  templateUrl: './spotlight-cards-v2.component.html',
  styleUrls: ['./spotlight-cards-v2.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SbUicSpotlightCardsV2Component {

  /** Section heading shown at the top-left. */
  heading = input<string>('In Spotlight')

  /** Cards to render. */
  cards = input<NsSpotlightCardsV2.ISpotlightCard[]>([])

  /** Whether the accordion toggle button is visible. */
  showToggle = input<boolean>(true)

  /** Initial collapsed state. */
  collapsed = input<boolean>(false)

  /** Accept the full config object as an alternative to individual inputs. */
  config = input<NsSpotlightCardsV2.ISpotlightCardsConfig | null>(null)

  /** Show skeleton loading state instead of real cards. */
  isLoading = input<boolean>(false)

  /** Number of skeleton placeholder cards to render while loading. */
  skeletonCount = input<number>(4)

  // Internal collapsed state (toggled by user, seeded from inputs)
  isCollapsed = signal(false)

  /** Carousel geometry, exposed for the template. */
  readonly cardWidth = CARD_WIDTH
  readonly cardGap = CARD_GAP

  // Resolved values — config input overrides individual inputs when provided
  resolvedHeading = computed(() => this.config()?.heading ?? this.heading())
  resolvedCards = computed(() => this.config()?.cards ?? this.cards() ?? [])
  resolvedShowToggle = computed(() => this.config()?.showToggle ?? this.showToggle())
  resolvedIsLoading = computed(() => this.config()?.isLoading ?? this.isLoading())

  /**
   * Cards with their background resolved into a light/dark pair, fed to the template as CSS
   * custom properties. The theme switch itself is handled in CSS off the `data-theme`
   * attribute ThemeService sets on <html>, so no theme subscription is needed here.
   */
  styledCards = computed(() => this.resolvedCards().map(card => {
    const background = this.resolveCardBackground(card?.cardBackgroundColor)
    return { ...card, bgLight: background.light, bgDark: background.dark }
  }))

  /** Array used to render skeleton card placeholders with @for. */
  skeletonItems = computed(() =>
    Array.from({ length: this.skeletonCount() }, (_, i) => i)
  )
  constructor(
    private readonly router: Router,
    private readonly events: EventService,
    private readonly contentApiSvc: ContentApiService,
    private utilitySvc: UtilityService,
    private telemetrySvc: TelemetryService,
  ) {
    // Seed isCollapsed from config or collapsed input reactively
    effect(() => {
      const cfg = this.config()
      const col = this.collapsed()
      untracked(() => {
        this.isCollapsed.set(cfg?.collapsed ?? col)
      })
    })
  }

  /**
   * Splits the configured `cardBackgroundColor` into the light and dark values.
   * A CSS variable is checked first and never comma-split, because `var(--x, #fff)`
   * legitimately contains a comma. A single plain colour is reused for both themes.
   */
  private resolveCardBackground(raw: string | undefined): { light: string, dark: string } {
    const value = (raw ?? '').trim()
    if (!value) {
      return { light: DEFAULT_CARD_BACKGROUND, dark: DEFAULT_CARD_BACKGROUND }
    }
    if (value.startsWith('var(') || value.startsWith('--')) {
      const cssVar = value.startsWith('--') ? `var(${value})` : value
      return { light: cssVar, dark: cssVar }
    }
    const [light, dark] = value.split(',').map(part => part.trim()).filter(Boolean)
    const resolvedLight = light || DEFAULT_CARD_BACKGROUND
    return { light: resolvedLight, dark: dark || resolvedLight }
  }

  toggle(): void {
    this.isCollapsed.update(v => !v)
    this.events.raiseInteractTelemetry(
      {
        type: WsEvents.EnumInteractTypes.CLICK,
        subType: 'spotlight-toggle',
        id: this.isCollapsed() ? 'collapse' : 'expand',
      },
      {
        id: this.resolvedHeading(),
        type: 'spotlight-section',
      },
      { module: WsEvents.EnumTelemetrymodules.HOME },
    )
  }

  navigate(card: NsSpotlightCardsV2.ISpotlightCard): void {
    if (!card.redirectionUrl) {
      return
    }
    this.utilitySvc.setRouteData([{ module: 'Home', pageId: 'page/home' }])
    this.telemetrySvc.sendEmptyObjectForNextInteract()
    this.events.raiseInteractTelemetry(
      {
        type: WsEvents.EnumInteractTypes.CLICK,
        subType: card?.cardClickDetails?.subType || 'spotlight',
        id: card?.cardClickDetails?.id || card.label,
      },
      {},
      { module: WsEvents.EnumTelemetrymodules.HOME },
    )
    if (card.externalUrl) {
      window.open(card.redirectionUrl, '_blank', 'noopener,noreferrer')
    } else {
      this.router.navigateByUrl(card.redirectionUrl)
    }
  }

  emitDetails(cardClickDetails: NsSpotlightCardsV2.cardClickDetails): void {
    if (cardClickDetails) {
      this.contentApiSvc.publishCardClickDetails(cardClickDetails)
    }
  }
}
