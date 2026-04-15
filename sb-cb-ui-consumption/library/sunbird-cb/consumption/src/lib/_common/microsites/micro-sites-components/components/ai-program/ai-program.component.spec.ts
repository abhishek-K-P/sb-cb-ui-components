import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiProgramComponent, AiProgramData, ContentData } from './ai-program.component';

describe('AiProgramComponent', () => {
  let component: AiProgramComponent;
  let fixture: ComponentFixture<AiProgramComponent>;

  const mockProgramData: AiProgramData = {
    enabled: true,
    title: 'AI Daksh',
    description: 'The program contain 16 courses, Once you complete the 3 course you will get AI Daksh Badge',
    image: 'https://example.com/image.png',
    noOfCoursesToComplete: '3',
    badgeImage: 'https://example.com/badge.png',
    styleData: {
      'border-radius': '32px',
      'background': 'linear-gradient(to bottom right, #266EEB 43%, #133F8B 50%)',
    },
    contentData: {
      posterImage: 'https://example.com/thumbnail.png',
      name: 'Course name',
      identifier: 'do_1234567890',
      source: 'iGotKarmayogi',
      creatorLogo: 'https://example.com/logo.png',
      duration: '120',
      courseCategory: 'Program',
      rating: 4.5,
      ratingCount: 234,
    },
    completedCourses: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AiProgramComponent],
    });
    fixture = TestBed.createComponent(AiProgramComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('totalCourses', () => {
    it('should parse noOfCoursesToComplete from string', () => {
      component.programData = mockProgramData;
      expect(component.totalCourses).toBe(3);
    });

    it('should default to 3 when not provided', () => {
      component.programData = { ...mockProgramData, noOfCoursesToComplete: '' };
      expect(component.totalCourses).toBe(3);
    });
  });

  describe('completedCourses', () => {
    it('should return completedCourses from programData', () => {
      component.programData = mockProgramData;
      expect(component.completedCourses).toBe(1);
    });

    it('should not exceed totalCourses', () => {
      component.programData = { ...mockProgramData, completedCourses: 10 };
      expect(component.completedCourses).toBeLessThanOrEqual(3);
    });

    it('should return 0 when not provided', () => {
      component.programData = { ...mockProgramData, completedCourses: undefined };
      expect(component.completedCourses).toBe(0);
    });
  });

  describe('checkpoints', () => {
    it('should generate totalCourses checkpoints (milestones + badge)', () => {
      component.programData = mockProgramData;
      // 2 milestones + 1 badge = 3
      expect(component.checkpoints.length).toBe(3);
    });

    it('should return empty array when programData is null', () => {
      component.programData = null as any;
      expect(component.checkpoints).toEqual([]);
    });
  });

  describe('getProgressPercentage', () => {
    it('should return 0 when no courses completed', () => {
      component.programData = { ...mockProgramData, completedCourses: 0 };
      expect(component.getProgressPercentage()).toBe(0);
    });

    it('should calculate correct percentage', () => {
      component.programData = mockProgramData; // 1 of 3
      expect(component.getProgressPercentage()).toBeCloseTo(33.33, 1);
    });

    it('should return 100 when all courses completed', () => {
      component.programData = { ...mockProgramData, completedCourses: 3 };
      expect(component.getProgressPercentage()).toBe(100);
    });
  });

  describe('getCheckpointPosition', () => {
    beforeEach(() => {
      component.programData = mockProgramData; // 3 checkpoints (0,1,2)
    });

    it('should position first at 0%', () => {
      expect(component.getCheckpointPosition(0)).toBe(0);
    });

    it('should position last at 100%', () => {
      expect(component.getCheckpointPosition(2)).toBe(100);
    });

    it('should evenly space middle checkpoint', () => {
      expect(component.getCheckpointPosition(1)).toBe(50);
    });
  });

  describe('getRomanNumeral', () => {
    it('should convert 1 to I', () => {
      expect(component.getRomanNumeral(1)).toBe('I');
    });

    it('should convert 3 to III', () => {
      expect(component.getRomanNumeral(3)).toBe('III');
    });

    it('should fallback to string for numbers > 10', () => {
      expect(component.getRomanNumeral(11)).toBe('11');
    });
  });

  describe('formatDuration', () => {
    it('should convert "120" to "2 hrs"', () => {
      expect(component.formatDuration('120')).toBe('2 hrs');
    });

    it('should convert "90" to "1 hrs 30 min"', () => {
      expect(component.formatDuration('90')).toBe('1 hrs 30 min');
    });

    it('should convert "45" to "45 min"', () => {
      expect(component.formatDuration('45')).toBe('45 min');
    });

    it('should return empty string for invalid input', () => {
      expect(component.formatDuration('')).toBe('');
    });
  });

  describe('onContentClick', () => {
    it('should emit contentClicked with contentData', (done) => {
      component.programData = mockProgramData;
      component.contentClicked.subscribe((data: ContentData) => {
        expect(data.identifier).toBe('do_1234567890');
        done();
      });
      component.onContentClick();
    });

    it('should not emit when contentData is missing', () => {
      component.programData = { ...mockProgramData, contentData: undefined as any };
      spyOn(component.contentClicked, 'emit');
      component.onContentClick();
      expect(component.contentClicked.emit).not.toHaveBeenCalled();
    });
  });

  describe('Template rendering', () => {
    beforeEach(() => {
      component.programData = mockProgramData;
      fixture.detectChanges();
    });

    it('should render header title', () => {
      const el = fixture.nativeElement.querySelector('.header-title');
      expect(el.textContent).toContain('AI Daksh');
    });

    it('should render header description', () => {
      const el = fixture.nativeElement.querySelector('.header-description');
      expect(el.textContent).toContain('16 courses');
    });

    it('should render checkpoint nodes (2 milestones + 1 badge)', () => {
      const nodes = fixture.nativeElement.querySelectorAll('.checkpoint-node');
      expect(nodes.length).toBe(3);
    });

    it('should render roman numerals in milestone nodes', () => {
      const labels = fixture.nativeElement.querySelectorAll('.node-label');
      expect(labels.length).toBe(2); // 2 milestones, badge has no label
      expect(labels[0].textContent.trim()).toBe('I');
      expect(labels[1].textContent.trim()).toBe('II');
    });

    it('should render badge image for last checkpoint', () => {
      const medalImg = fixture.nativeElement.querySelector('.medal-img');
      expect(medalImg).toBeTruthy();
      expect(medalImg.src).toContain('badge.png');
    });

    it('should render course card', () => {
      const card = fixture.nativeElement.querySelector('.course-card');
      expect(card).toBeTruthy();
    });

    it('should render course title', () => {
      const title = fixture.nativeElement.querySelector('.course-title');
      expect(title.textContent).toContain('Course name');
    });

    it('should render formatted duration', () => {
      const badge = fixture.nativeElement.querySelector('.duration-badge');
      expect(badge.textContent).toContain('2 hrs');
    });

    it('should render category badge', () => {
      const typeBadge = fixture.nativeElement.querySelector('.type-text');
      expect(typeBadge.textContent).toContain('Program');
    });

    it('should render source/author', () => {
      const author = fixture.nativeElement.querySelector('.author-text');
      expect(author.textContent).toContain('iGotKarmayogi');
    });

    it('should apply dynamic styles via ngStyle', () => {
      const card = fixture.nativeElement.querySelector('.ai-program-card');
      expect(card.style.borderRadius).toBe('32px');
    });

    it('should not render wrapper when enabled is false', () => {
      component.programData = { ...mockProgramData, enabled: false };
      fixture.detectChanges();
      const wrapper = fixture.nativeElement.querySelector('.ai-program-wrapper');
      expect(wrapper).toBeFalsy();
    });
  });
});
