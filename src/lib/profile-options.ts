// Shared between the onboarding wizard and the settings profile editor so
// the two never drift apart.

export type SelfLevel = "zero" | "beginner" | "elementary" | "intermediate";

export const LANGUAGES = [
  { code: "ja", flag: "🇯🇵", name: "Japonca", nameEn: "Japanese" },
  { code: "zh", flag: "🇨🇳", name: "Çince", nameEn: "Chinese" },
  { code: "nl", flag: "🇳🇱", name: "Hollandaca", nameEn: "Dutch" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const languageLabel = (code: string, uiLanguage?: string | null) => {
  const l = LANGUAGES.find((l) => l.code === code);
  if (!l) return code;
  return `${l.flag} ${uiLanguage === "en" ? l.nameEn : l.name}`;
};

/** Turkish display name of a target language (single source for prompts/UI). */
export const languageName = (code: string) =>
  LANGUAGES.find((l) => l.code === code)?.name ?? code;

// Native (spoken) language of the learner. Drives the language of all
// LLM-generated content and the UI string catalog. UI catalogs exist for
// tr/en; other native languages would fall back to English UI.
export const NATIVE_LANGUAGES = [
  { code: "tr", flag: "🇹🇷", name: "Türkçe" },
  { code: "en", flag: "🇬🇧", name: "English" },
] as const;

export type NativeLanguageCode = (typeof NATIVE_LANGUAGES)[number]["code"];

/**
 * Name used in prompt directives ("Tüm açıklamalar X dilinde olacak").
 * Falls back to the raw code so an exotic value degrades loudly, not silently.
 */
export const nativeLanguageName = (code: string) =>
  NATIVE_LANGUAGES.find((l) => l.code === code)?.name ?? code;

// Option VALUES are canonical Turkish strings — they're stored in the DB
// (profiles.goals/interests) and fed into prompts, so they never change with
// the UI language. English UI shows a translated *label* via OPTION_LABELS_EN.
export const GOAL_OPTIONS = [
  "Günlük konuşma",
  "Seyahat",
  "Anime / dizi / film anlamak",
  "Kitap ve manga okumak",
  "İş / kariyer",
  "Sınav (JLPT vb.)",
  "Kültürü tanımak",
];

export const INTEREST_OPTIONS = [
  "Anime & Manga",
  "Yemek",
  "Teknoloji",
  "Müzik",
  "Oyunlar",
  "Tarih",
  "Seyahat",
  "Spor",
  "Sanat",
  "Doğa",
];

/** English display labels for goal/interest VALUES (values stay Turkish). */
export const OPTION_LABELS_EN: Record<string, string> = {
  "Günlük konuşma": "Everyday conversation",
  Seyahat: "Travel",
  "Anime / dizi / film anlamak": "Understanding anime / shows / films",
  "Kitap ve manga okumak": "Reading books and manga",
  "İş / kariyer": "Work / career",
  "Sınav (JLPT vb.)": "Exams (JLPT etc.)",
  "Kültürü tanımak": "Exploring the culture",
  "Anime & Manga": "Anime & Manga",
  Yemek: "Food",
  Teknoloji: "Technology",
  Müzik: "Music",
  Oyunlar: "Games",
  Tarih: "History",
  Spor: "Sports",
  Sanat: "Art",
  Doğa: "Nature",
};

/** Display label for a goal/interest value in the given UI language. */
export const optionLabel = (value: string, uiLanguage?: string | null) =>
  uiLanguage === "en" ? (OPTION_LABELS_EN[value] ?? value) : value;

export const LEVELS: { value: SelfLevel; label: string; desc: string }[] = [
  { value: "zero", label: "Sıfır", desc: "Hiç bilmiyorum, tamamen yeniyim" },
  { value: "beginner", label: "Çaylak", desc: "Birkaç kelime ve selamlaşma biliyorum" },
  { value: "elementary", label: "Temel", desc: "Basit cümleler kurabiliyorum" },
  { value: "intermediate", label: "Orta", desc: "Günlük konuşmaları takip edebiliyorum" },
];

export const LEVELS_EN: { value: SelfLevel; label: string; desc: string }[] = [
  { value: "zero", label: "Zero", desc: "I don't know anything, completely new" },
  { value: "beginner", label: "Beginner", desc: "I know a few words and greetings" },
  { value: "elementary", label: "Elementary", desc: "I can form simple sentences" },
  { value: "intermediate", label: "Intermediate", desc: "I can follow everyday conversations" },
];

export const levelsFor = (uiLanguage?: string | null) =>
  uiLanguage === "en" ? LEVELS_EN : LEVELS;

export const levelLabel = (value: string, uiLanguage?: string | null) =>
  levelsFor(uiLanguage).find((l) => l.value === value)?.label ?? value;

export const MINUTE_OPTIONS = [
  { value: 60, label: "Haftada ~1 saat", desc: "Sakin tempo" },
  { value: 150, label: "Haftada 2-3 saat", desc: "Dengeli tempo" },
  { value: 300, label: "Haftada 5+ saat", desc: "Kararlıyım!" },
];

export const MINUTE_OPTIONS_EN = [
  { value: 60, label: "~1 hour a week", desc: "Relaxed pace" },
  { value: 150, label: "2-3 hours a week", desc: "Balanced pace" },
  { value: 300, label: "5+ hours a week", desc: "I'm committed!" },
];

export const minuteOptionsFor = (uiLanguage?: string | null) =>
  uiLanguage === "en" ? MINUTE_OPTIONS_EN : MINUTE_OPTIONS;
