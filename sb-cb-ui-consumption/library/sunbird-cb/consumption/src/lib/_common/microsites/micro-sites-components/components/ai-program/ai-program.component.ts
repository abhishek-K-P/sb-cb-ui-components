
import { Component, Input, Output, EventEmitter, OnChanges, OnInit, OnDestroy, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { ConfigurationsService } from '@sunbird-cb/utils-v2';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

export interface ContentData {
  posterImage: string;
  name: string;
  identifier: string;
  source: string;
  creatorLogo: string;
  duration: string;            // in minutes, e.g. "120"
  courseCategory: string;      // e.g. "Program"
  rating?: number;
  ratingCount?: number;
  completionPercentage?: number;
}

export interface StyleData {
  [key: string]: string;       // e.g. { "border-radius": "32px", "background": "..." }
}

export interface AiProgramMessages {
  notEnrolled?: string;
  inProgress?: string;
  badgeEarned?: string;
}

export interface AiProgramData {
  enabled: boolean;
  title: string;
  description: string;
  messages?: AiProgramMessages;
  image: string;
  noOfCoursesToComplete: string;  // e.g. "4"
  badgeImage: string;
  identifier: string;             // program identifier sent to enrollment API
  courseIdentifiers: string[];     // course do_IDs to track completion
  timeToCallApi?: number;         // cache TTL in minutes (default 5)
  styleData: StyleData;
  contentData: ContentData;
  isEnrolled?: boolean;           // whether the user is enrolled in the program
  completedCourses?: number;      // tracks how many courses the user finished
  disableBadgeImage?: string;
}

/** Shape of the per-program localStorage cache */
interface EnrollmentCache {
  timestamp: number;              // epoch ms when API was last called
  isEnrolled: boolean;
  completedCourseIds: string[];   // which courseIdentifiers are completed
  completedCount: number;
}

/** Represents a single element in the progress track */
export interface ProgressItem {
  type: 'bar' | 'shield' | 'badge';
  index: number;
  id: string;  // stable identity for trackBy
}

const PROXIES_V8 = '/apis/proxies/v8';
const ENROLLMENT_API = `${PROXIES_V8}/learner/course/v4/user/enrollment/details`;

@Component({
  selector: 'sb-uic-ai-program',
  templateUrl: './ai-program.component.html',
  styleUrls: ['./ai-program.component.scss'],
})
export class AiProgramComponent implements OnInit, OnChanges, OnDestroy {
  @Input() programData: AiProgramData;
  @Output() contentClicked = new EventEmitter<ContentData>();

  /** Cached progress items — rebuilt only when programData changes */
  progressItemsCached: ProgressItem[] = [];

  /** Enrollment state — drives the progress bar */
  enrolled = false;
  completedCount = 0;

  private enrollSub: Subscription | null = null;

  private readonly romanNumerals: string[] = [
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  ];

  constructor(
    private http: HttpClient,
    private configSvc: ConfigurationsService,
    private router: Router,
  ) {}

  // ────────────────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.checkEnrollmentAndRefresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.programData) {
      this.progressItemsCached = this.buildProgressItems();
      // Re-check enrollment when programData changes (e.g. different program)
      if (!changes.programData.firstChange) {
        this.checkEnrollmentAndRefresh();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.enrollSub) {
      this.enrollSub.unsubscribe();
    }
  }

  // ────────────────────────────────────────────────────────────
  // Enrollment + localStorage caching
  // ────────────────────────────────────────────────────────────

  /** localStorage key scoped to this program */
  private get cacheKey(): string {
    return `ai_program_enrollment_${this.programData?.identifier}`;
  }

  /** TTL in milliseconds (defaults to 5 minutes) */
  private get cacheTtlMs(): number {
    const minutes = this.programData?.timeToCallApi || 5;
    return minutes * 60 * 1000;
  }

  /**
   * Main entry point:
   *  1. Try to read from localStorage
   *  2. If cache is fresh → use it
   *  3. Otherwise → call enrollment API, update cache
   */
  private checkEnrollmentAndRefresh(): void {
    if (!this.programData?.identifier) {
      return;
    }

    const cached = this.readCache();
    if (cached && this.isCacheFresh(cached)) {
      // Use cached values
      this.applyEnrollmentState(cached.isEnrolled, cached.completedCount);
      return;
    }

    // Cache missing or stale → call the enrollment API
    this.fetchEnrollmentData();
  }

  /** Read the cached enrollment data from localStorage */
  private readCache(): EnrollmentCache | null {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      return raw ? JSON.parse(raw) as EnrollmentCache : null;
    } catch {
      return null;
    }
  }

  /** Check whether the cache is within the TTL window */
  private isCacheFresh(cache: EnrollmentCache): boolean {
    return (Date.now() - cache.timestamp) < this.cacheTtlMs;
  }

  /** Persist enrollment state to localStorage */
  private writeCache(isEnrolled: boolean, completedCourseIds: string[], completedCount: number): void {
    const cache: EnrollmentCache = {
      timestamp: Date.now(),
      isEnrolled,
      completedCourseIds,
      completedCount,
    };
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(cache));
    } catch {
      // Storage full or blocked — silently ignore
    }
  }

  /** Call the enrollment API and process the response */
  private fetchEnrollmentData(): void {
    const userId = this.configSvc.userProfile && this.configSvc.userProfile.userId;
    if (!userId) {
      // No logged-in user — treat as not enrolled
      this.applyEnrollmentState(false, 0);
      this.writeCache(false, [], 0);
      return;
    }

    const payload = {
      request: {
        retiredCoursesEnabled: true,
        courseId: [this.programData.identifier],
      },
    };

    if (this.enrollSub) {
      this.enrollSub.unsubscribe();
    }

    this.enrollSub = this.http
      .post<any>(`${ENROLLMENT_API}/${userId}`, payload)
      .subscribe(
        (res) => this.handleEnrollmentResponse(res),
        () => {
          // API error — fall back to cached or not enrolled
          const cached = this.readCache();
          if (cached) {
            this.applyEnrollmentState(cached.isEnrolled, cached.completedCount);
          } else {
            this.applyEnrollmentState(false, 0);
            this.writeCache(false, [], 0);
          }
        },
      );
  }

  /**
   * Process the enrollment API response:
   *  - If no courses → not enrolled
   *  - Otherwise → enrolled; cross-reference courseIdentifiers to find completed
   *    A course is "completed" when its status === 2
   */
  private handleEnrollmentResponse(res: any): void {
    const courses: any[] = (res && res.result && res.result.courses) || [];

    if (!courses.length) {
      // No enrollment record → not enrolled
      this.applyEnrollmentState(false, 0);
      this.writeCache(false, [], 0);
      return;
    }

    // User is enrolled (the program identifier was found in the enrollment list)
    const trackIds = new Set(this.programData.courseIdentifiers || []);

    // Build a map of contentId → status from API response
    const statusMap = new Map<string, number>();
    courses.forEach((c: any) => {
      if (c.contentId) {
        statusMap.set(c.contentId, c.status);
      }
    });

    // Find which tracked courses are completed (status === 2)
    const completedIds: string[] = [];
    trackIds.forEach((id) => {
      if (statusMap.get(id) === 2) {
        completedIds.push(id);
      }
    });

    const count = completedIds.length;
    this.applyEnrollmentState(true, count);
    this.writeCache(true, completedIds, count);
  }

  /** Apply enrollment state and rebuild progress items */
  private applyEnrollmentState(isEnrolled: boolean, completedCount: number): void {
    this.enrolled = isEnrolled;
    this.completedCount = completedCount;
    // Rebuild progress items so bar/shield colours update
    this.progressItemsCached = this.buildProgressItems();
  }

  // ────────────────────────────────────────────────────────────
  // Progress bar helpers
  // ────────────────────────────────────────────────────────────

  /** Total number of courses required for the badge */
  get totalCourses(): number {
    return parseInt(this.programData?.noOfCoursesToComplete, 10) || 3;
  }

  /** Number of courses the user has completed (from API / cache) */
  get completedCourses(): number {
    return Math.min(this.completedCount, this.totalCourses);
  }

  /** Whether the user is enrolled */
  get isEnrolled(): boolean {
    return this.enrolled || this.completedCourses > 0;
  }

  /**
   * Builds the ordered progress track (cached via ngOnChanges):
   *   bar[0] → shield[0] → bar[1] → shield[1] → … → bar[N-1] → badge
   */
  private buildProgressItems(): ProgressItem[] {
    const total = this.totalCourses;
    if (!total || !this.programData) {
      return [];
    }
    const items: ProgressItem[] = [];
    for (let i = 0; i < total; i++) {
      items.push({ type: 'bar', index: i, id: `bar-${i}` });
      if (i < total - 1) {
        items.push({ type: 'shield', index: i, id: `shield-${i}` });
      } else {
        items.push({ type: 'badge', index: i, id: `badge-${i}` });
      }
    }
    return items;
  }

  /** trackBy for *ngFor — prevents DOM recreation */
  trackByItem(_: number, item: ProgressItem): string {
    return item.id;
  }

  /**
   * Bar state:
   *  - 'full'  → bar[i] is completely orange (course i already completed, or enrolled and i===0 with completedCourses > 0)
   *  - 'half'  → bar[i] is 50% orange (the "current" bar — user just reached this step)
   *  - 'none'  → bar[i] is white/inactive
   *
   * Logic:
   *  bar[0]: full when completedCourses >= 1; half when enrolled but 0 completed; else none
   *  bar[i>0]: full when completedCourses > i; half when completedCourses === i; else none
   */
  getBarState(index: number): 'full' | 'half' | 'none' {
    if (index === 0) {
      if (this.completedCourses >= 1) {
        return 'full';
      }
      return this.isEnrolled ? 'half' : 'none';
    }
    if (this.completedCourses > index) {
      return 'full';
    }
    if (this.completedCourses === index) {
      return 'half';
    }
    return 'none';
  }

  /** shield[i] active when course (i+1) is completed */
  isShieldActive(index: number): boolean {
    return this.completedCourses >= index + 1;
  }

  /** Badge at full opacity only when ALL courses completed */
  get isBadgeEarned(): boolean {
    return this.completedCourses >= this.totalCourses;
  }

  /**
   * Returns the appropriate message based on enrollment/completion state.
   * Falls back to programData.description if messages object is not provided.
   */
  get currentMessage(): string {
    const msgs = this.programData?.messages;
    if (msgs) {
      if (this.isBadgeEarned && msgs.badgeEarned) {
        return msgs.badgeEarned;
      }
      if (this.completedCourses > 0 && msgs.inProgress) {
        return msgs.inProgress;
      }
      if (msgs.notEnrolled) {
        return msgs.notEnrolled;
      }
    }
    return this.programData?.description || '';
  }

  /** Convert 1-based number to Roman numeral string */
  getRomanNumeral(num: number): string {
    if (num > 0 && num <= this.romanNumerals.length) {
      return this.romanNumerals[num - 1];
    }
    return String(num);
  }

  /** Convert duration in minutes to human-readable format */
  formatDuration(minutes: string | number): string {
    const mins = typeof minutes === 'string' ? parseInt(minutes, 10) : minutes;
    if (!mins || isNaN(mins)) {
      return '';
    }
    if (mins < 60) {
      return `${mins} min`;
    }
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs} hrs ${remainingMins} min` : `${hrs} hrs`;
  }

  /** Navigate to the program TOC page and emit event */
  onContentClick(): void {
    if (this.programData?.contentData) {
      this.contentClicked.emit(this.programData.contentData);
      const identifier = this.programData.contentData.identifier || this.programData.identifier;
      if (identifier) {
        this.router.navigate(['/app/toc', identifier, 'overview']);
      }
    }
  }
}
