import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core'
import { DatePipe } from '@angular/common'
import { Router } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { ConfigurationsService } from '@sunbird-cb/utils-v2'
import { PlanCardViewModel } from '../strips-v2/models/card.model'
import { ContentApiService } from '../strips-v2/services/content-api.service'

/**
 * A plan type as the card holds it, mapped to the key `/app/plans` speaks. The two
 * vocabularies differ — the card carries the API's 'APAR' / 'AICBP' / 'CBP', the listing
 * reads lowercase keys off the URL — so the translation happens once, here.
 */
const LISTING_PLAN_TYPE: Record<string, string> = {
  APAR: 'apar',
  AICBP: 'aicbp',
  CBP: 'cbp',
}

/**
 * Card for a single CBP / APAR / AI-CBP training plan (CardType.PlanCard).
 *
 * A plan is not content, so this is a sibling of CardCourseV2Component rather than a mode of
 * it: there is no thumbnail to show (the media area is drawn from the theme's primary and
 * secondary colours), no rating, no duration and no provider org. What a plan does have —
 * year, due date, how many contents it holds, who created it — is what the card leads with.
 */
@Component({
  selector: 'sb-uic-card-plan-v2',
  templateUrl: './card-plan-v2.component.html',
  styleUrls: ['./card-plan-v2.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [DatePipe, MatIconModule, MatTooltipModule, TranslateModule],
})
export class CardPlanV2Component {

  // ── Signal inputs ──────────────────────────────────────────────────────────
  plan = input<PlanCardViewModel | null>(null)
  isLoading = input<boolean>(false)
  /**
   * 'portrait' is the 254px grid/carousel card; 'landscape' is the full-width row the
   * mobile listing uses. Same data either way — only the composition differs: landscape
   * moves the status out of the media area and into the footer beside the owner.
   */
  layout = input<'portrait' | 'landscape'>('portrait')
  /** The pill's contentConfig — read for `cardClickDetails` only. */
  config = input<any | null>(null)

  // ── Signal view queries ────────────────────────────────────────────────────
  private readonly titleElRef = viewChild<ElementRef<HTMLElement>>('titleEl')
  private readonly ownerElRef = viewChild<ElementRef<HTMLElement>>('ownerEl')

  // ── Injected services ──────────────────────────────────────────────────────
  private readonly router = inject(Router)
  private readonly configSvc = inject(ConfigurationsService)
  private readonly contentApiService = inject(ContentApiService)

  // ── Internal mutable state ─────────────────────────────────────────────────
  readonly isTitleTruncated = signal(false)
  readonly isOwnerTruncated = signal(false)
  /** Instance logo, used wherever the owning org has none of its own. */
  readonly defaultSLogo = signal('')

  // ── Computed values ────────────────────────────────────────────────────────
  /** Translation key for the media badge; `inProgress` has no V1 equivalent to reuse. */
  readonly statusLabelKey = computed(() => {
    switch (this.plan()?.planStatus) {
      case 'overdue': return 'cardcontentv2.overDue'
      case 'completed': return 'cardcontentv2.completed'
      default: return 'cardplanv2.inProgress'
    }
  })

  readonly contentCountLabelKey = computed(() =>
    this.plan()?.contentCount === 1 ? 'cardplanv2.course' : 'cardplanv2.courses'
  )

  /** Text of the plan-type chip. APAR and AI CBP are the two that carry an icon. */
  readonly planTypeLabel = computed(() => {
    switch (this.plan()?.planType) {
      case 'APAR': return 'APAR'
      case 'AICBP': return 'AI CBP'
      default: return 'CBP'
    }
  })

  /**
   * The owning org's logo, or the instance logo when it has none.
   *
   * CBPlan V4 sends `createdByOrgLogo: null` for most orgs, so the fallback is the usual
   * path rather than the exception — an empty `src` would render a broken-image glyph.
   */
  readonly ownerLogo = computed(() => this.plan()?.createdByLogo || this.defaultSLogo())

  readonly planTypeIcon = computed(() => {
    switch (this.plan()?.planType) {
      case 'APAR': return 'assets/icons/content/apar.svg'
      case 'AICBP': return 'assets/icons/content/Ai_CBP.svg'
      default: return ''
    }
  })

  constructor() {
    const cfg = this.configSvc.instanceConfig
    this.defaultSLogo.set(cfg?.logos?.defaultSourceLogo || '/assets/instances/eagle/app_logos/KarmayogiBharat_Logo.svg')

    // Truncation detection — runs once after the first render pass
    afterNextRender(() => this.checkTruncation())
  }

  // ── Event handlers ─────────────────────────────────────────────────────────
  /**
   * Always the plan detail page (/app/plans/:id), which lists the plan's courses and its
   * progress — wherever the card is rendered, the home strip included.
   *
   * This deliberately does NOT branch to the MDO editor for users who could edit the plan, the
   * way TrainingPlansCardComponent.routeTrainingPlanDetails does in @sunbird-cb/search-listing:
   * an editor opening a plan from a learning surface wants to read it, not edit it. The editor
   * is still reachable from the MDO portal and from search.
   */
  onCardClick(): void {
    const plan = this.plan()
    if (!plan?.identifier) {
      return
    }
    this.emitDetails()
    // The detail page resolves the plan out of the CBPlan V4 cache in IndexedDB, which is
    // keyed by plan year — so it is handed the year THIS card was built from rather than left
    // to guess at one. `planType` comes along so the page's back link points at the right
    // listing before the plan itself has resolved.
    //
    // Either is omitted when the card does not carry it. Both are hints: the page falls back
    // to the read API, and to the plan's own type, without them.
    const queryParams: Record<string, string> = {}
    if (plan.planYear) {
      queryParams['planYear'] = plan.planYear
    }
    const listingType = LISTING_PLAN_TYPE[plan.planType ?? '']
    if (listingType) {
      queryParams['planType'] = listingType
    }
    this.router.navigate([`/app/plans/${plan.identifier}`], { queryParams })
  }

  emitDetails(): void {
    const cardClickDetails = this.config()?.cardClickDetails
    if (!cardClickDetails) {
      return
    }
    const planId = this.plan()?.identifier
    // The pill config's `id` is static (shared by every card in the strip); the home page
    // raises it as `edata.id`, so it is overridden with the plan's own id here.
    this.contentApiService.publishCardClickDetails({
      ...cardClickDetails,
      id: planId,
      identifier: planId,
      type: 'Plan',
    })
  }

  /**
   * Falls back to the instance logo when the org's own URL fails to load.
   *
   * `ownerLogo()` only covers a logo the payload omits; one that is present but dead — a
   * moved asset, a host that 404s — still reaches the browser and would leave a broken
   * image on the card. Guarded against re-entering if the default itself fails.
   */
  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement | null
    const fallback = this.defaultSLogo()
    if (img && fallback && img.src !== fallback) {
      img.src = fallback
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private checkTruncation(): void {
    const t = this.titleElRef()?.nativeElement
    const o = this.ownerElRef()?.nativeElement

    if (t) {
      const clampedHeight = t.clientHeight
      if (clampedHeight > 0) {
        t.style.setProperty('-webkit-line-clamp', 'none')
        t.style.display = 'block'
        const naturalHeight = t.scrollHeight
        t.style.removeProperty('-webkit-line-clamp')
        t.style.display = ''
        this.isTitleTruncated.set(naturalHeight > clampedHeight)
      } else {
        this.isTitleTruncated.set(false)
      }
    }

    this.isOwnerTruncated.set(!!o && o.scrollWidth > o.clientWidth)
  }
}
