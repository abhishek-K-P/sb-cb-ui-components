export namespace NsContent {
  export interface IContinueLearningData extends IContent {
    continueData: any
  }

  export interface IContinueLearningDataReq {
    request: {
      userId: string | undefined,
      courseId: string,
      contentIds: string[],
      batchId: string | undefined | null
      fields?: string[]
    }
  }

  export interface IContent {
    platform?: any
    addedOn: string
    appIcon: string
    artifactUrl: string
    averageRating?: any
    body?: string
    certificationList?: IRelatedContentMeta[]
    certificationStatus?: TCertificationStatus
    certificationSubmissionDate?: string
    certificationUrl: string
    children: IContent[]
    childrenClassifiers?: string[]
    clients?: IClient[]
    collections?: IContent[]
    complexityLevel: string
    contentId: string
    contentType: EContentTypes
    contentUrlAtSource: string
    creatorContacts: ICreator[]

    creatorDetails: ICreator[]
    creatorLogo: string
    creatorPosterImage: string
    creatorThumbnail: string

    curatedTags: string[]
    description: string
    displayContentType: EDisplayContentTypes // For UI
    downloadUrl?: string
    duration: number
    exclusiveContent?: boolean
    expiryDate?: string
    equivalentCertifications?: IRelatedContentMeta[]
    hasAccess: boolean
    hasAssessment?: string
    idealScreenSize?: string
    identifier: string
    introductoryVideo?: string
    introductoryVideoIcon?: string
    learningTrack?: string
    isExternal: boolean
    isIframeSupported: 'Yes' | 'No' | 'Maybe'
    isInIntranet?: boolean
    keywords?: string[]
    kArtifacts?: IRelatedContentMeta[]
    lastUpdatedOn: string
    learningMode?: TLearningMode
    learningObjective: string
    labels?: string[]
    locale?: string
    hasTranslations?: { identifier: string; locale: string }[]
    isTranslationOf?: { identifier: string; locale: string }[]
    me_totalSessionsCount: number
    mediaType: string
    mimeType: EMimeTypes
    msArtifactDetails?: IMSArtifactDetails
    mode?: ETagType
    name: string
    nextCertificationAttemptDate?: string
    playgroundInstructions?: string
    playgroundResources?: IResourcePlayground[]
    postContents?: IPrePostContent[]
    posterImage?: string
    preContents?: IPrePostContent[]
    preRequisites: string
    price?: {
      currency: string
      value: number
    }
    primaryCategory: string,
    proctorUrl?: string
    progress?: IMarkAsCompleteProgress
    publishedOn: string
    recentCertificationAttemptScore?: number
    recommendationReasons?: string[]
    region?: string[]
    registrationUrl?: string
    registrationInstructions?: string
    resourceCategory?: string[]
    resourceType: string
    size?: number
    skills: ISkill[]
    softwareRequirements?: IResourceDetail[]
    sourceName: string
    sourceShortName: string
    sourceIconUrl?: string
    sourceUrl?: string
    ssoEnabled?: boolean
    status:
    | 'Draft'
    | 'Review'
    | 'InReview'
    | 'QualityReview'
    | 'Reviewed'
    | 'Processing'
    | 'Live'
    | 'Deleted'
    | 'MarkedForDeletion'
    | 'Expired'
    subTitle?: string
    subTitles?: ISubtitle[]
    studyMaterials?: IRelatedContentMeta[]
    systemRequirements?: string[]
    tags: ITag[]
    topics: IContentTopic[]
    totalLikes?: { [key: string]: number }
    totalRating?: number
    track: ITrack[]
    uniqueLearners?: number
    viewCount?: { [key: string]: number }
    reason?: string // required for Knowledge board
    trainingLHubCount?: number // for LHub trainings
    verifiers?: {
      // required for External Certifications
      name: string
      email: string
      id: string
    }[]
    references?: { url: string; title: string }[]
    resumePage?: number // For player WebModule in UI
    [key: string]: any
  }

  export interface IContentResponse {
    id: string,
    params: any,
    responseCode: string,
    result: {
      content: IContent
    },
    ts: string,
    ver: string
  }

  export interface IBatch {
    batchId: string,
    createdBy: string,
    endDate: string | null,
    enrollmentType: string,
    identifier: string,
    name: string,
    startDate: string,
    status: number
    cert_templates: null
    collectionId: string
    courseId: string
    createdDate: string
    createdFor: string[]
    description: null
    enrollmentEndDate: string | null
    id: string
    mentors: string[] | null
    tandc: null
    updatedDate: string | null
  }

  export interface IBatchListResponse {
    content?: IBatch[]
    count?: number,
    enrolled?: boolean,
  }

  export interface ICourse {
    active: true
    addedBy: string
    batch: IBatch
    batchId: string
    certificates: []
    collectionId: string
    completedOn: string | null
    completionPercentage: number | null
    content: IContent
    contentId: string
    contentStatus: any
    courseId: string
    courseLogoUrl: string
    courseName: string
    dateTime: number
    description: string
    enrolledDate: string
    issuedCertificates: []
    lastReadContentId: string | null
    lastReadContentStatus: string | null
    leafNodesCount: number
    progress: number
    status: number
    userId: string
  }

  export interface IContentMinimal {
    appIcon: string
    artifactUrl: string
    complexityLevel: string
    contentType: EContentTypes
    description: string
    displayContentType?: EDisplayContentTypes
    duration: number
    identifier: string
    hasAccess?: boolean
    isInIntranet?: boolean
    learningMode?: TLearningMode
    mimeType: EMimeTypes
    name: string
    creatorDetails: ICreator[]
    creatorContacts: ICreator[]
    PosterImage: string
    resourceType?: string
    totalRating?: number
  }

  export interface ICollectionHierarchyResponse {
    data: IContent
    hasMore: boolean
    totalContents: number
  }

  export interface IRelatedContentMeta {
    identifier: string
    name: string
  }

  type TCertificationStatus = 'ongoing' | 'passed' | 'canAttempt' | 'cannotAttempt'
  export type TLearningMode = 'Self-Paced' | 'Instructor-Led' | 'Open' | 'Closed'

  interface IMarkAsCompleteProgress {
    progressStatus: 'open' | 'started' | 'completed'
    showMarkAsComplete: boolean
    markAsCompleteReason: string
    progressSupported: boolean
    progress: number | null
  }

  interface ITag {
    id: string
    type: string
    value: string
  }
  interface IMSArtifactDetails {
    channelId: string
    videoId: string
  }
  interface IClient {
    displayName: string
    id: string
    name: string
  }
  interface ISubtitle {
    srclang: string
    label: string
    url: string
  }
  interface IPrePostContent {
    identifier: string
    name: string
  }
  interface IResourceDetail {
    title?: string
    url?: string
  }
  interface IResourcePlayground {
    appIcon: string
    artifactUrl: string
    identifier: string
    name: string
  }
  interface ITrack {
    id: string
    name: string
    status: string
    visibility: string
  }
  interface ISkill {
    id: string
    category: string
    skill: string
    name: string
  }
  export interface ICreator {
    id: string
    name: string
    email: string
  }
  export interface IContentTopic {
    identifier: string
    name: string
  }
  // API Based

  export interface IContact {
    id: string
    name: string
    email: string
  }

  export interface IViewerContinueLearningRequest {
    resourceId: string
    contextPathId: string
    data: string
    dateAccessed: number
    contextType?: string
  }

  export enum EContentTypes {
    PROGRAM = 'Learning Path',
    CHANNEL = 'Channel',
    COURSE = 'Course',
    KNOWLEDGE_ARTIFACT = 'Knowledge Artifact',
    KNOWLEDGE_BOARD = 'Knowledge Board',
    LEARNING_JOURNEY = 'Learning Journeys',
    MODULE = 'Collection',
    RESOURCE = 'Resource',
  }

  export enum EMiscPlayerSupportedCollectionTypes {
    PLAYLIST = 'Playlist',
  }
  export const PLAYER_SUPPORTED_COLLECTION_TYPES: string[] = [
    EContentTypes.COURSE,
    EContentTypes.MODULE,
    EContentTypes.PROGRAM,
    EMiscPlayerSupportedCollectionTypes.PLAYLIST,
  ]
  export const KB_SUPPORTED_CONTENT_TYPES: EContentTypes[] = [
    EContentTypes.COURSE,
    EContentTypes.MODULE,
    EContentTypes.PROGRAM,
    EContentTypes.RESOURCE,
  ]
  export const PLAYLIST_SUPPORTED_CONTENT_TYPES: EContentTypes[] = [
    EContentTypes.COURSE,
    EContentTypes.MODULE,
    EContentTypes.PROGRAM,
    EContentTypes.RESOURCE,
  ]
  export enum EMimeTypes {
    COLLECTION = 'application/vnd.ekstep.content-collection',
    ZIP = 'application/vnd.ekstep.html-archive',
    ZIP2 = 'application/vnd.ekstep.ecml-archive',
    HTML = 'application/html',
    HTML_TEXT = 'text/html',
    ILP_FP = 'application/ilpfp',
    IAP = 'application/iap-assessment',
    M4A = 'audio/m4a',
    MP3 = 'audio/mpeg',
    MP4 = 'video/mp4',
    M3U8 = 'application/x-mpegURL',
    INTERACTION = 'video/interactive',
    PDF = 'application/pdf',
    QUIZ = 'application/quiz',
    DRAG_DROP = 'application/drag-drop',
    HTML_PICKER = 'application/htmlpicker',
    WEB_MODULE = 'application/web-module',
    WEB_MODULE_EXERCISE = 'application/web-module-exercise',
    YOUTUBE = 'video/x-youtube',
    HANDS_ON = 'application/integrated-hands-on',
    RDBMS_HANDS_ON = 'application/rdbms',
    CLASS_DIAGRAM = 'application/class-diagram',
    CHANNEL = 'application/channel',
    COLLECTION_RESOURCE = 'resource/collection',
    APPLICATION_JSON = 'application/json',
    PRACTICE_RESOURCE = 'application/vnd.sunbird.questionset',
    // Added on UI Only
    CERTIFICATION = 'application/certification',
    PLAYLIST = 'application/playlist',
    QUESTION_SET = 'application/vnd.sunbird.questionset',
    QUESTION = 'application/vnd.sunbird.question',
    FINAL_ASSESSMENT = 'application/vnd.sunbird.questionset',
    OFFLINE_SESSION = 'application/offline',
    SURVEY = 'application/survey',
    TEXT_WEB = 'text/x-url',
    UNKNOWN = 'application/unknown',
  }
  export enum EDisplayContentTypes {
    ASSESSMENT = 'ASSESSMENT',
    AUDIO = 'AUDIO',
    CERTIFICATION = 'CERTIFICATION',
    CHANNEL = 'Channel',
    CLASS_DIAGRAM = 'CLASS_DIAGRAM',
    COURSE = 'COURSE',
    DEFAULT = 'DEFAULT',
    DRAG_DROP = 'DRAG_DROP',
    EXTERNAL_CERTIFICATION = 'EXTERNAL_CERTIFICATION',
    EXTERNAL_COURSE = 'EXTERNAL_COURSE',
    GOALS = 'GOALS',
    HANDS_ON = 'HANDS_ON',
    IAP = 'IAP',
    INSTRUCTOR_LED = 'INSTRUCTOR_LED',
    INTERACTIVE_VIDEO = 'INTERACTIVE_VIDEO',
    KNOWLEDGE_ARTIFACT = 'KNOWLEDGE_ARTIFACT',
    MODULE = 'MODULE',
    PDF = 'PDF',
    PLAYLIST = 'PLAYLIST',
    PROGRAM = 'PROGRAM',
    QUIZ = 'QUIZ',
    RESOURCE = 'RESOURCE',
    RDBMS_HANDS_ON = 'RDBMS_HANDS_ON',
    VIDEO = 'VIDEO',
    WEB_MODULE = 'WEB_MODULE',
    WEB_PAGE = 'WEB_PAGE',
    YOUTUBE = 'YOUTUBE',
    KNOWLEDGE_BOARD = 'Knowledge Board',
    LEARNING_JOURNEY = 'Learning Journeys',
    LINK = 'LINK',
    STANDALONE_ASSESSMENT = 'STANDALONE ASSESSMENT',
    BLENDED_PROGRAM = 'BLENDED PROGRAM',
    CURATED_PROGRAM = 'CURATED PROGRAM',
    SURVEY = 'SURVEY'
  }
  // for UI
  export enum EFilterCategory {
    ALL = 'ALL',
    LEARN = 'LEARN',
    PRACTICE = 'PRACTICE',
    ASSESS = 'ASSESS',
  }

  // for UI
  export enum ETagType {
    NEWLY_ADDED = 'NEWLY ADDED',
  }

  export enum ROLE_MAP {
    CONTENT_CREATOR = 'content_creator',
    CONTENT_REVIEWER = 'content_reviewer',
    CONTENT_PUBLISHER = 'content_publisher',
    SPV_PUBLISHER = 'spv_publisher',
    PROGRAM_COORDINATOR = 'program_coordinator',
    PUBLIC = 'public',
    CONTENT_ADMIN = 'content_admin',
    CBP_ADMIN = 'cbp_admin',
    CBP_REVIEWER = 'cbp_reviewer',
    CBP_PUBLISHER = 'cbp_publisher',
    CBP_CREATOR = 'cbp_creator',
    PROGRAM_INSTRUCTOR = 'program_instructor',
  }

  export enum ECourseCategory {
    MODULE = 'Course Unit',
    INVITE_ONLY_PROGRAM = 'Invite-Only Program',
    MODERATED_PROGRAM = 'Moderated Program',
    BLENDED_PROGRAM = 'Blended Program',
    CURATED_PROGRAM = 'Curated Program',
    COURSE = 'Course',
    MODERATED_COURSE = 'Moderated Course',
    STANDALONE_ASSESSMENT = 'Standalone Assessment',
    MODERATED_ASSESSEMENT = 'Moderated Assessment',
    INVITE_ONLY_ASSESSMENT = 'Invite-Only Assessment',
    CQF_ASSESSMENT = 'CQF Assessment',
    CASE_STUDY = 'Case Study',
    PRE_ENROLMENT_ASSESSMENT = 'Pre Enrolment Assessment',
    COMPREHENSIVE_ASSESSMENT_PROGRAM = 'Comprehensive Assessment Program',
    MULTILINGUAL_COURSE = 'Multilingual Course',
    RESOURCE = 'Learning Resource',
  }

  export enum EPrimaryCategory {
    PROGRAM = 'Program',
    MODULE = 'Course Unit',
    COURSE = 'Course',
    RESOURCE = 'Learning Resource',
    ASSESSMENT = 'Practice Question Set',
    FINALASSESSMENT = 'Course Assessment',
    PROGRAM_END_SURVEY = 'Survey',
    FTB_QUESTION = 'FTB Question',
    MTF_QUESTION = 'MTF Question',
    MULTIPLE_CHOICE_QUESTION = 'Multiple Choice Question',
    SINGLE_CHOICE_QUESTION = 'Single Choice Question',
    STANDALONE_ASSESSMENT = 'Standalone Assessment',
    BLENDED_PROGRAM = 'Blended Program',
    OFFLINE_SESSION = 'Offline Session',
    CURATED_PROGRAM = 'Curated Program',
    PRACTICE_RESOURCE = 'Practice Question Set',
    CQF_ASSESSMENT = 'CQF Assessment',
    GOALS = 'GOALS',
    PLAYLIST = 'PLAYLIST',
    FINAL_ASSESSMENT = 'Course Assessment',
    COMP_ASSESSMENT = 'Competency Assessment',
    MANDATORY_COURSE_GOAL = 'Mandatory Course Goal',
    // following will not be available soon
    /**
     * @deprecated The type should not be used
     */
    KNOWLEDGE_ARTIFACT = 'Knowledge Artifact',
    /**
    * @deprecated The type should not be used
    */
    KNOWLEDGE_BOARD = 'Knowledge Board',
    /**
    * @deprecated The type should not be used
    */
    LEARNING_JOURNEY = 'Learning Journeys',
    /**
    * @deprecated The type should not be used
    */
    CHANNEL = 'Channel',
  }

  export enum EResourcePrimaryCategories {
    LEARNING_RESOURCE = 'Learning Resource',
    PRACTICE_RESOURCE = 'Practice Question Set',
    FINAL_ASSESSMENT = 'Course Assessment',
    COMP_ASSESSMENT = 'Competency Assessment',
    OFFLINE_SESSION = 'Offline Session',
  }

  export enum EResourceCategory {
    LEARNING_RESOURCE = 'Learning Resource', // This is default and is used to diff from course resource and standalone resource
    EVENT = 'Events',
    PODCAST = 'Podcasts',
    WEBINAR = 'Webinar',
    OTHERS = 'OTHERS',
    REFERENCE_RESOURCE = 'Reference Resource',
    TEACHERS_RESOURCE = 'Teachers Resource',
  }

  export interface ILookupRequest {
    activityId: string,
    activityType: string,
    rating?: number,
    limit?: number,
    updateOn?: string,
  }

  export const VIEWER_ROUTE_FROM_MIME = (mimeType: NsContent.EMimeTypes) => {
    switch (mimeType) {
      case NsContent.EMimeTypes.MP3:
        return 'audio'
      case NsContent.EMimeTypes.M4A:
        return 'audio-native'
      case NsContent.EMimeTypes.COLLECTION:
        return 'html'
      case NsContent.EMimeTypes.CHANNEL:
      // case 'application/json' as any:
      //   return 'channel'
      case NsContent.EMimeTypes.CERTIFICATION:
        return 'certification'
      case NsContent.EMimeTypes.HTML_TEXT:
      case NsContent.EMimeTypes.HTML:
      case NsContent.EMimeTypes.ZIP:
        if (window.location.href.includes('mobile/html')) {
          return 'mobile/html'
        }
        return 'html'
      case NsContent.EMimeTypes.TEXT_WEB:
        return 'youtube'
      case NsContent.EMimeTypes.SURVEY:
        return 'survey'
      case NsContent.EMimeTypes.IAP:
        return 'iap'
      case NsContent.EMimeTypes.ILP_FP:
        return 'ilp-fp'
      case NsContent.EMimeTypes.PDF:
        return 'pdf'
      case NsContent.EMimeTypes.MP4:
      case NsContent.EMimeTypes.M3U8:
        return 'video'
      case NsContent.EMimeTypes.YOUTUBE:
        return 'youtube'
      // return 'html'
      case NsContent.EMimeTypes.WEB_MODULE:
        return 'web-module'
      case NsContent.EMimeTypes.WEB_MODULE_EXERCISE:
        return 'web-module'
      case NsContent.EMimeTypes.CLASS_DIAGRAM:
        return 'class-diagram'
      case NsContent.EMimeTypes.HANDS_ON:
        return 'hands-on'
      case NsContent.EMimeTypes.RDBMS_HANDS_ON:
        return 'rdbms-hands-on'
      case NsContent.EMimeTypes.HTML_PICKER:
        return 'html-picker'
      case NsContent.EMimeTypes.QUIZ:
      case NsContent.EMimeTypes.APPLICATION_JSON:
        return 'quiz'
      case NsContent.EMimeTypes.PRACTICE_RESOURCE:
        return 'practice'
      case NsContent.EMimeTypes.COLLECTION_RESOURCE:
        return 'resource-collection'
      case NsContent.EMimeTypes.OFFLINE_SESSION:
        return 'offline-session'
      default:
        return 'html'
    }
  }

  export enum EQuestionTagging {
    PF_BASED = 'Proficiency',
    EMDH_BASED = 'EMDH',
  }

  export const FORM_TYPES = {
    COMPLETION_SURVEY: 'completionSurvey',
    FORM: 'form',
    AGK_PUBLIC_SURVEY: 'AGKPublicSurvey'
  }

  export const FORM_TYPES_LIST = [
    {
      key: 'Form',
      value: FORM_TYPES.FORM
    },
    {
      key: 'Survey',
      value: FORM_TYPES.COMPLETION_SURVEY
    },
    // {
    //   key: 'AGK Survey',
    //   value: FORM_TYPES.AGK_PUBLIC_SURVEY
    // }
  ]

  export enum EAccessSetting {
    ALL_USERS = 'allUsers',
    MDO_SPECIFIC = 'mdoSpecific',
    CUSTOME_USER = 'customeUser',
  }

  export enum EAssessmentType {
    QUESTION_WEIGHTAGE = 'questionWeightage',
    OPTION_WEIGHTAGE = 'optionalWeightage',
    QUESTION_OPTION_WEIGHTAGE = 'questionOptionWeightage',
  }

  export enum ECompatibility {
    COMPATIBILITY_SIX = 6,
    COMPATIBILITY_LATEST = 8,
  }

  export const END_SURVEY_FIELD_TYPES = [
    'checkbox', 'text', 'radio', 'rating'
  ]

  export const FIELD_TYPES_LIST = [
    'boolean', 'checkbox', 'date', 'dropdown', 'email',
    'numeric', 'phone number', 'radio', 'rating', 'text', 'textarea',
  ]

  export enum ESectionType {
    SECTION = 'section',
    PARAGRAPH = 'paragraph',
  }

  export enum EContextCategory {
    FINAL_PROGRAM_ASSESSMENT = 'Final Program Assessment',
    PRE_ENROLMENT_ASSESSMENT = 'Pre Enrolment Assessment',
  }

  export enum ECompatibilityProgram {
    LATEST = 5,
    PREVIOUS = 4,
  }

  export enum EContextLocking {
    COURSE_ASSESSMENT_ONLY = 'Course Assessment Only',
  }
}
