// Settings type definitions mirrored from upstream storeTypes.ts
// https://github.com/Dreamlinerm/Netflix-Prime-Auto-Skip

export interface RatingThreshold {
  color: string;
  value: number;
}

export interface AmazonSettings {
  skipIntro: boolean;
  skipCredits: boolean;
  watchCredits: boolean;
  selfAd: boolean;
  skipAd: boolean;
  speedSlider: boolean;
  filterPaid: boolean;
  continuePosition: boolean;
  showRating: boolean;
  xray: boolean;
  improveUI: boolean;
}

export interface NetflixSettings {
  skipIntro: boolean;
  skipRecap: boolean;
  skipCredits: boolean;
  watchCredits: boolean;
  skipBlocked: boolean;
  skipAd: boolean;
  speedSlider: boolean;
  profile: boolean;
  showRating: boolean;
  removeGames: boolean;
  hideTitles: boolean;
}

export interface DisneySettings {
  skipIntro: boolean;
  skipCredits: boolean;
  watchCredits: boolean;
  skipAd: boolean;
  speedSlider: boolean;
  showRating: boolean;
  selfAd: boolean;
  hideTitles: boolean;
}

export interface CrunchyrollSettings {
  skipIntro: boolean;
  skipCredits: boolean;
  skipAfterCredits: boolean;
  speedSlider: boolean;
  releaseCalendar: boolean;
  profile: boolean;
  bigPlayer: boolean;
  filterQueued: boolean;
  dubLanguage: string;
  filterDuplicates: boolean;
}

export interface HBOSettings {
  skipIntro: boolean;
  skipCredits: boolean;
  watchCredits: boolean;
  speedSlider: boolean;
  showRating: boolean;
}

export interface ParamountSettings {
  skipIntro: boolean;
  skipCredits: boolean;
  watchCredits: boolean;
  speedSlider: boolean;
  showRating: boolean;
  skipAd: boolean;
}

export interface VideoSettings {
  playOnFullScreen: boolean;
  epilepsy: boolean;
  userAgent: boolean;
  doubleClick: boolean;
  scrollVolume: boolean;
  showYear: boolean;
  dimLowRatings: boolean;
}

export interface GeneralSettings {
  sliderSteps: number;
  sliderMin: number;
  sliderMax: number;
  Crunchyroll_skipTimeout: number;
  RatingThresholds: RatingThreshold[];
}

export interface SettingsType {
  Amazon: AmazonSettings;
  Netflix: NetflixSettings;
  Disney: DisneySettings;
  Crunchyroll: CrunchyrollSettings;
  HBO: HBOSettings;
  Paramount: ParamountSettings;
  Video: VideoSettings;
  General: GeneralSettings;
}
