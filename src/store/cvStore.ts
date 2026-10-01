import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

export type PersonalInfoData = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  linkedIn: string;
  website: string;
};

export type PhotoShape = "circle" | "rectangle" | "rounded";
export type CVTemplate = "modern" | "classic" | "sidebar";
export type CVFontStyle = "formal" | "modern" | "humanist";
export type CVLanguage = "en" | "de" | "pl" | "fr";
export type CVColorway =
  | "navy"
  | "forest"
  | "burgundy"
  | "charcoal"
  | "teal"
  | "custom";

export type EducationEntry = {
  institution: string;
  qualification: string;
  fieldOfStudy: string;
  city: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type WorkEntry = {
  jobTitle: string;
  employer: string;
  city: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type LanguageEntry = {
  id: string;
  language: string;
  proficiency: string;
};

export type ProjectEntry = {
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  url: string;
  description: string;
};

export type CourseEntry = {
  name: string;
  provider: string;
  completionDate: string;
  description: string;
};

export type CVData = {
  personalInfo: PersonalInfoData;
  profileImage: string | null;
  photoShape: PhotoShape;
  template: CVTemplate;
  resumeLanguage: CVLanguage;
  fontStyle: CVFontStyle;
  fontSize: number;
  sidebarInset: boolean;
  colorway: CVColorway;
  customColor: string;
  hasCustomColor: boolean;
  photoSize: number;
  showPhotoBorder: boolean;
  summary: string;
  workExperience: WorkEntry[];
  education: EducationEntry[];
  skills: string;
  languages: LanguageEntry[];
  projects: ProjectEntry[];
  courses: CourseEntry[];
  interests: string;
  hobbies: string;
  dataProcessingConsent: string;
};

type CVStore = CVData & {
  isEditorCollapsed: boolean;
  setIsEditorCollapsed: (isCollapsed: boolean) => void;
  setPersonalInfo: Dispatch<SetStateAction<PersonalInfoData>>;
  setProfileImage: (profileImage: string | null) => void;
  setPhotoShape: (photoShape: PhotoShape) => void;
  setTemplate: (template: CVTemplate) => void;
  setResumeLanguage: (resumeLanguage: CVLanguage) => void;
  setFontStyle: (fontStyle: CVFontStyle) => void;
  setFontSize: (fontSize: number) => void;
  setSidebarInset: (sidebarInset: boolean) => void;
  setColorway: (colorway: CVColorway) => void;
  setCustomColor: (customColor: string) => void;
  setPhotoSize: (photoSize: number) => void;
  setShowPhotoBorder: (showPhotoBorder: boolean) => void;
  setSummary: Dispatch<SetStateAction<string>>;
  setWorkExperience: Dispatch<SetStateAction<WorkEntry[]>>;
  setEducation: Dispatch<SetStateAction<EducationEntry[]>>;
  setSkills: Dispatch<SetStateAction<string>>;
  setLanguages: Dispatch<SetStateAction<LanguageEntry[]>>;
  setProjects: Dispatch<SetStateAction<ProjectEntry[]>>;
  setCourses: Dispatch<SetStateAction<CourseEntry[]>>;
  setInterests: Dispatch<SetStateAction<string>>;
  setHobbies: Dispatch<SetStateAction<string>>;
  setDataProcessingConsent: Dispatch<SetStateAction<string>>;
  resetCVData: () => void;
};

export const initialCVData: CVData = {
  personalInfo: {
    firstName: "",
    lastName: "",
    jobTitle: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    linkedIn: "",
    website: "",
  },
  profileImage: null,
  photoShape: "rectangle",
  template: "modern",
  resumeLanguage: "en",
  fontStyle: "formal",
  fontSize: 100,
  sidebarInset: false,
  colorway: "navy",
  customColor: "#ffffff",
  hasCustomColor: false,
  photoSize: 100,
  showPhotoBorder: true,
  summary: "",
  workExperience: [],
  education: [],
  skills: "",
  languages: [],
  projects: [],
  courses: [],
  interests: "",
  hobbies: "",
  dataProcessingConsent: "",
};

export function normalizeCVPhotoShape(
  template: CVTemplate,
  photoShape: PhotoShape,
): PhotoShape {
  return template === "modern" && photoShape === "rounded"
    ? "rectangle"
    : photoShape;
}

export function normalizeCVLanguage(value: unknown): CVLanguage {
  return value === "de" || value === "pl" || value === "fr" ? value : "en";
}

export function normalizeCVFontSize(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 100;
  return Math.min(130, Math.max(80, Math.round(value / 5) * 5));
}

export function normalizeCVColorway(value: unknown): CVColorway {
  if (value === "copper" || value === "purple" || value === "monochrome") {
    return "navy";
  }
  if (
    value === "navy" ||
    value === "forest" ||
    value === "burgundy" ||
    value === "charcoal" ||
    value === "teal" ||
    value === "custom"
  ) {
    return value;
  }
  return "navy";
}

export const CV_STORAGE_KEY = "cv-builder-data";
const LEGACY_CV_COOKIE_NAME = "cv-builder-data";

export function ensureLanguageEntryIds(
  entries: LanguageEntry[],
): LanguageEntry[] {
  return entries.map((entry) => ({
    ...entry,
    id: entry.id || crypto.randomUUID(),
  }));
}

export function readSavedCVData(): Partial<CVData> | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const savedData = window.localStorage.getItem(CV_STORAGE_KEY);
    if (savedData) {
      const parsedData = JSON.parse(savedData) as Partial<CVData>;
      parsedData.resumeLanguage = normalizeCVLanguage(
        parsedData.resumeLanguage,
      );
      parsedData.fontSize = normalizeCVFontSize(parsedData.fontSize);
      parsedData.photoShape = normalizeCVPhotoShape(
        parsedData.template ?? initialCVData.template,
        parsedData.photoShape ?? initialCVData.photoShape,
      );
      if (Array.isArray(parsedData.languages)) {
        parsedData.languages = ensureLanguageEntryIds(parsedData.languages);
      }
      parsedData.colorway = normalizeCVColorway(parsedData.colorway);
      if (typeof parsedData.hasCustomColor !== "boolean") {
        parsedData.hasCustomColor =
          parsedData.colorway === "custom" ||
          (typeof parsedData.customColor === "string" &&
            parsedData.customColor.toLowerCase() !== "#8058a2");
      }
      return parsedData;
    }

    const legacyCookie = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${LEGACY_CV_COOKIE_NAME}=`));
    if (!legacyCookie) {
      return null;
    }

    const migratedData = JSON.parse(
      decodeURIComponent(legacyCookie.slice(LEGACY_CV_COOKIE_NAME.length + 1)),
    ) as Partial<CVData>;
    migratedData.resumeLanguage = normalizeCVLanguage(
      migratedData.resumeLanguage,
    );
    migratedData.fontSize = normalizeCVFontSize(migratedData.fontSize);
    migratedData.photoShape = normalizeCVPhotoShape(
      migratedData.template ?? initialCVData.template,
      migratedData.photoShape ?? initialCVData.photoShape,
    );
    if (Array.isArray(migratedData.languages)) {
      migratedData.languages = ensureLanguageEntryIds(migratedData.languages);
    }
    migratedData.colorway = normalizeCVColorway(migratedData.colorway);
    if (typeof migratedData.hasCustomColor !== "boolean") {
      migratedData.hasCustomColor =
        migratedData.colorway === "custom" ||
        (typeof migratedData.customColor === "string" &&
          migratedData.customColor.toLowerCase() !== "#8058a2");
    }
    saveCVDataToStorage(migratedData);
    clearLegacyCVCookie();
    return migratedData;
  } catch {
    return null;
  }
}

export function saveCVDataToStorage(data: Partial<CVData>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable when browser privacy or quota limits apply.
  }
}

function clearLegacyCVCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${LEGACY_CV_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function clearSavedCVData() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(CV_STORAGE_KEY);
    } catch {
      // Storage can be unavailable when browser privacy restrictions apply.
    }
  }
  clearLegacyCVCookie();
}

function applyUpdate<T>(update: SetStateAction<T>, currentValue: T): T {
  return typeof update === "function"
    ? (update as (currentValue: T) => T)(currentValue)
    : update;
}

export const useCVStore = create<CVStore>((set) => ({
  ...initialCVData,
  ...(readSavedCVData() ?? {}),
  isEditorCollapsed: false,
  setIsEditorCollapsed: (isEditorCollapsed) => set({ isEditorCollapsed }),
  setPersonalInfo: (update) =>
    set((state) => ({
      personalInfo: applyUpdate(update, state.personalInfo),
    })),
  setProfileImage: (profileImage) => set({ profileImage }),
  setPhotoShape: (photoShape) => set({ photoShape }),
  setTemplate: (template) =>
    set((state) => ({
      template,
      photoShape: normalizeCVPhotoShape(template, state.photoShape),
    })),
  setResumeLanguage: (resumeLanguage) => set({ resumeLanguage }),
  setFontStyle: (fontStyle) => set({ fontStyle }),
  setFontSize: (fontSize) => set({ fontSize: normalizeCVFontSize(fontSize) }),
  setSidebarInset: (sidebarInset) => set({ sidebarInset }),
  setColorway: (colorway) => set({ colorway }),
  setCustomColor: (customColor) => set({ customColor, hasCustomColor: true }),
  setPhotoSize: (photoSize) => set({ photoSize }),
  setShowPhotoBorder: (showPhotoBorder) => set({ showPhotoBorder }),
  setSummary: (update) =>
    set((state) => ({ summary: applyUpdate(update, state.summary) })),
  setWorkExperience: (update) =>
    set((state) => ({
      workExperience: applyUpdate(update, state.workExperience),
    })),
  setEducation: (update) =>
    set((state) => ({ education: applyUpdate(update, state.education) })),
  setSkills: (update) =>
    set((state) => ({ skills: applyUpdate(update, state.skills) })),
  setLanguages: (update) =>
    set((state) => ({ languages: applyUpdate(update, state.languages) })),
  setProjects: (update) =>
    set((state) => ({ projects: applyUpdate(update, state.projects) })),
  setCourses: (update) =>
    set((state) => ({ courses: applyUpdate(update, state.courses) })),
  setInterests: (update) =>
    set((state) => ({ interests: applyUpdate(update, state.interests) })),
  setHobbies: (update) =>
    set((state) => ({ hobbies: applyUpdate(update, state.hobbies) })),
  setDataProcessingConsent: (update) =>
    set((state) => ({
      dataProcessingConsent: applyUpdate(update, state.dataProcessingConsent),
    })),
  resetCVData: () => set(initialCVData),
}));
