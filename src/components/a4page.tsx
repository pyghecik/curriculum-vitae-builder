import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  useCVStore,
  type CVColorway,
  type CVData,
  type CVFontStyle,
  type CVLanguage,
  type CVTemplate,
} from "../store/cvStore";
import { appStrings } from "../localization";
import arrowIcon from "../assets/arrow.svg";

//PDF Export mechanisms
import { useReactToPrint } from "react-to-print";

type CVSectionId =
  | "experience"
  | "education"
  | "courses"
  | "skills"
  | "languages"
  | "projects"
  | "interests";

type CVEntryRange = { start: number; end?: number };
type CVSectionRanges = Partial<Record<CVSectionId, CVEntryRange>>;

function rangeEntries<T>(entries: T[], range?: CVEntryRange) {
  return entries
    .map((item, index) => ({ item, index }))
    .slice(range?.start ?? 0, range?.end);
}

const sectionOrder: CVSectionId[] = [
  "experience",
  "education",
  "courses",
  "skills",
  "languages",
  "projects",
  "interests",
];
const sidebarSectionOrder: CVSectionId[] = [
  "skills",
  "languages",
  "experience",
  "education",
  "courses",
  "projects",
  "interests",
];

const templates: { id: CVTemplate; label: string; note: string }[] = [
  { id: "modern", label: "Modern", note: "Clean and structured" },
  { id: "classic", label: "Classic", note: "Traditional and refined" },
  { id: "sidebar", label: "Sidebar", note: "Compact and editorial" },
];
const resumeCopy = {
  en: {
    curriculumVitae: "Curriculum vitae",
    continued: "Curriculum vitae · continued",
    unnamed: "Your name",
    present: "Present",
    sections: {
      contact: "Contact",
      summary: "Summary",
      experience: "Experience",
      education: "Education",
      skills: "Skills",
      languages: "Languages",
      projects: "Projects",
      courses: "Courses & certifications",
      interests: "Interests",
    },
    contact: {
      email: "Email",
      phone: "Phone",
      location: "Location",
      linkedIn: "LinkedIn",
      website: "Website",
      dateOfBirth: "Date of birth",
    },
  },
  de: {
    curriculumVitae: "Lebenslauf",
    continued: "Lebenslauf · Fortsetzung",
    unnamed: "Ihr Name",
    present: "Heute",
    sections: {
      contact: "Kontakt",
      summary: "Profil",
      experience: "Berufserfahrung",
      education: "Ausbildung",
      skills: "Fähigkeiten",
      languages: "Sprachen",
      projects: "Projekte",
      courses: "Kurse & Zertifikate",
      interests: "Interessen",
    },
    contact: {
      email: "E-Mail",
      phone: "Telefon",
      location: "Wohnort",
      linkedIn: "LinkedIn",
      website: "Webseite",
      dateOfBirth: "Geburtsdatum",
    },
  },
  pl: {
    curriculumVitae: "Curriculum vitae",
    continued: "Curriculum vitae · ciąg dalszy",
    unnamed: "Imię i nazwisko",
    present: "Obecnie",
    sections: {
      contact: "Kontakt",
      summary: "Podsumowanie zawodowe",
      experience: "Doświadczenie zawodowe",
      education: "Wykształcenie",
      skills: "Umiejętności",
      languages: "Języki",
      projects: "Projekty",
      courses: "Kursy i certyfikaty",
      interests: "Zainteresowania",
    },
    contact: {
      email: "E-mail",
      phone: "Telefon",
      location: "Lokalizacja",
      linkedIn: "LinkedIn",
      website: "Strona internetowa",
      dateOfBirth: "Data urodzenia",
    },
  },
  fr: {
    curriculumVitae: "Curriculum vitae",
    continued: "Curriculum vitae · suite",
    unnamed: "Votre nom",
    present: "Aujourd’hui",
    sections: {
      contact: "Coordonnées",
      summary: "Profil professionnel",
      experience: "Expérience professionnelle",
      education: "Formation",
      skills: "Compétences",
      languages: "Langues",
      projects: "Projets",
      courses: "Cours et certifications",
      interests: "Centres d’intérêt",
    },
    contact: {
      email: "E-mail",
      phone: "Téléphone",
      location: "Lieu",
      linkedIn: "LinkedIn",
      website: "Site web",
      dateOfBirth: "Date de naissance",
    },
  },
} satisfies Record<
  CVLanguage,
  {
    curriculumVitae: string;
    continued: string;
    unnamed: string;
    present: string;
    sections: Record<string, string>;
    contact: Record<string, string>;
  }
>;

const colorways: {
  id: CVColorway;
  label: string;
  accent: string;
  soft: string;
}[] = [
  { id: "navy", label: "Navy", accent: "#1f3a5f", soft: "#e9eef4" },
  { id: "forest", label: "Forest", accent: "#285941", soft: "#eaf2ed" },
  { id: "burgundy", label: "Burgundy", accent: "#7a2e3f", soft: "#f5ebed" },
  { id: "charcoal", label: "Charcoal", accent: "#3c4146", soft: "#eceeef" },
  { id: "teal", label: "Teal", accent: "#006b68", soft: "#e7f1f0" },
];

const fontStyles: {
  id: CVFontStyle;
  label: string;
  fontFamily: string;
}[] = [
  {
    id: "formal",
    label: "Formal",
    fontFamily: '"Lora", serif',
  },
  {
    id: "modern",
    label: "Modern",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  {
    id: "humanist",
    label: "Humanist",
    fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
  },
];

function nonEmptyEntries<T extends object>(entries: T[]) {
  return entries.filter((entry) =>
    Object.values(entry).some(
      (value) => typeof value === "string" && value.trim(),
    ),
  );
}

function splitItems(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string, language: CVLanguage) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language, {
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatFullDate(value: string, language: CVLanguage) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(
    date,
  );
}

function formatDateRange(
  startDate: string,
  endDate: string,
  language: CVLanguage,
) {
  const start = formatDate(startDate, language);
  const end =
    formatDate(endDate, language) ||
    (start ? resumeCopy[language].present : "");
  return [start, end].filter(Boolean).join(" - ");
}

function getDateTimestamp(value: string | undefined) {
  if (!value) return 0;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sortByLatestDateDesc<T extends Record<string, string | undefined>>(
  entries: T[],
  dateFields: (keyof T)[],
) {
  return [...entries].sort((a, b) => {
    const aTime = Math.max(
      ...dateFields.map((field) => getDateTimestamp(String(a[field] ?? ""))),
    );
    const bTime = Math.max(
      ...dateFields.map((field) => getDateTimestamp(String(b[field] ?? ""))),
    );

    return bTime - aTime;
  });
}

function getFullName(data: CVData) {
  return (
    [data.personalInfo.firstName, data.personalInfo.lastName]
      .filter(Boolean)
      .join(" ") || resumeCopy[data.resumeLanguage].unnamed
  );
}

function getLocation(data: CVData) {
  return [
    data.personalInfo.address,
    data.personalInfo.city,
    data.personalInfo.postalCode,
    data.personalInfo.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function getExternalHref(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`,
    );
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function getContactDetails(data: CVData) {
  const { personalInfo } = data;
  const contactLabels = resumeCopy[data.resumeLanguage].contact;
  return [
    { label: contactLabels.email, value: personalInfo.email },
    { label: contactLabels.phone, value: personalInfo.phone },
    { label: contactLabels.location, value: getLocation(data) },
    {
      label: contactLabels.linkedIn,
      value: personalInfo.linkedIn,
      href: getExternalHref(personalInfo.linkedIn),
    },
    {
      label: contactLabels.website,
      value: personalInfo.website,
      href: getExternalHref(personalInfo.website),
    },
    {
      label: contactLabels.dateOfBirth,
      value: formatFullDate(personalInfo.dateOfBirth, data.resumeLanguage),
    },
  ].filter((item) => item.value.trim());
}

function Portrait({
  data,
  className,
  size = "normal",
  sizeMultiplier = 1,
  fillSection = false,
  borderTone = "accent",
}: {
  data: CVData;
  className: string;
  size?: "normal" | "large";
  sizeMultiplier?: number;
  fillSection?: boolean;
  borderTone?: "accent" | "light";
}) {
  if (!data.profileImage) return null;

  const circle = data.photoShape === "circle";
  const roundCorners = data.photoShape === "rounded";
  const baseWidth =
    size === "large" ? (circle ? 144 : 128) : circle ? 112 : 104;
  const layoutClassName = fillSection
    ? circle
      ? "my-auto max-h-full"
      : "self-stretch"
    : "";
  const borderClassName = data.showPhotoBorder
    ? borderTone === "light"
      ? "border-2 border-white/70"
      : "border-2 border-[var(--cv-accent)]/55"
    : "border-0";
  const portraitStyle: CSSProperties = fillSection
    ? circle
      ? {
          width: `${30 * (data.photoSize / 100) * sizeMultiplier}%`,
          aspectRatio: "1",
        }
      : {
          width: `${30 * (data.photoSize / 100)}%`,
        }
    : {
        width: `min(${baseWidth * (data.photoSize / 100) * sizeMultiplier}px, 100%)`,
        aspectRatio: circle ? "1" : "4 / 5",
      };

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden ${circle ? "rounded-full" : roundCorners ? "rounded-md" : "rounded-none"} ${layoutClassName} ${borderClassName} ${className}`}
      role="img"
      aria-label={appStrings[data.resumeLanguage].editor.photo}
      style={portraitStyle}
    >
      <img
        src={data.profileImage}
        alt=""
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function Section({
  title,
  children,
  dark = false,
  className = "",
  sectionId,
  showTitle = true,
}: {
  title: string;
  children: ReactNode;
  dark?: boolean;
  className?: string;
  sectionId?: CVSectionId;
  showTitle?: boolean;
}) {
  return (
    <section
      data-cv-section={sectionId}
      className={`break-inside-avoid ${className}`}
    >
      {showTitle && (
        <h2
          className={`mb-2 border-b pb-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
            dark
              ? "border-white/25 text-white/75"
              : "border-[var(--cv-soft)] text-[var(--cv-accent)]"
          }`}
        >
          {title}
        </h2>
      )}
      <div className={dark ? "text-white/90" : "text-stone-700"}>
        {children}
      </div>
    </section>
  );
}

function ContactList({ data, dark = false }: { data: CVData; dark?: boolean }) {
  const contactDetails = getContactDetails(data);
  if (!contactDetails.length) return null;

  return (
    <Section
      title={resumeCopy[data.resumeLanguage].sections.contact}
      dark={dark}
    >
      <dl className="space-y-2">
        {contactDetails.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt
              className={`text-[8px] font-semibold uppercase tracking-wide ${
                dark ? "text-white/55" : "text-stone-500"
              }`}
            >
              {item.label}
            </dt>
            <dd className="break-words text-[10px] leading-4">
              {item.href ? <a href={item.href}>{item.value}</a> : item.value}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function Summary({ data, dark = false }: { data: CVData; dark?: boolean }) {
  if (!data.summary.trim()) return null;
  return (
    <Section
      title={resumeCopy[data.resumeLanguage].sections.summary}
      dark={dark}
    >
      <p className="whitespace-pre-line text-[10px] leading-[1.55]">
        {data.summary}
      </p>
    </Section>
  );
}

function Experience({ data, range }: { data: CVData; range?: CVEntryRange }) {
  const entries = rangeEntries(
    sortByLatestDateDesc(nonEmptyEntries(data.workExperience), [
      "endDate",
      "startDate",
    ]),
    range,
  );
  if (!entries.length) return null;

  return (
    <Section
      title={resumeCopy[data.resumeLanguage].sections.experience}
      sectionId="experience"
      showTitle={!range || range.start === 0}
    >
      <div className="space-y-3">
        {entries.map(({ item: entry, index }) => (
          <article
            key={`${entry.employer}-${index}`}
            data-cv-entry={index}
            className="space-y-1"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <h3 className="text-[10px] font-bold text-stone-900">
                {entry.jobTitle || entry.employer}
              </h3>
              <p className="text-[8px] text-stone-500">
                {formatDateRange(
                  entry.startDate,
                  entry.endDate,
                  data.resumeLanguage,
                )}
              </p>
            </div>
            {(entry.employer || entry.city) && (
              <p className="text-[9px] font-medium text-[var(--cv-accent)]">
                {[entry.employer, entry.city].filter(Boolean).join(" | ")}
              </p>
            )}
            {entry.description && (
              <p className="whitespace-pre-line text-[9px] leading-[1.5] text-stone-600">
                {entry.description}
              </p>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}

function Education({ data, range }: { data: CVData; range?: CVEntryRange }) {
  const entries = rangeEntries(
    sortByLatestDateDesc(nonEmptyEntries(data.education), [
      "endDate",
      "startDate",
    ]),
    range,
  );
  if (!entries.length) return null;

  return (
    <Section
      title={resumeCopy[data.resumeLanguage].sections.education}
      sectionId="education"
      showTitle={!range || range.start === 0}
    >
      <div className="space-y-3">
        {entries.map(({ item: entry, index }) => (
          <article
            key={`${entry.institution}-${index}`}
            data-cv-entry={index}
            className="space-y-1"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <h3 className="text-[10px] font-bold text-stone-900">
                {entry.qualification || entry.institution}
              </h3>
              <p className="text-[8px] text-stone-500">
                {formatDateRange(
                  entry.startDate,
                  entry.endDate,
                  data.resumeLanguage,
                )}
              </p>
            </div>
            {(entry.institution || entry.fieldOfStudy) && (
              <p className="text-[9px] font-medium text-[var(--cv-accent)]">
                {[entry.institution, entry.fieldOfStudy, entry.city]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
            )}
            {entry.description && (
              <p className="whitespace-pre-line text-[9px] leading-[1.5] text-stone-600">
                {entry.description}
              </p>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}

function Skills({
  data,
  dark = false,
  range,
  className = "",
}: {
  data: CVData;
  dark?: boolean;
  range?: CVEntryRange;
  className?: string;
}) {
  const items = rangeEntries(splitItems(data.skills), range);
  if (!items.length) return null;

  return (
    <Section
      title={resumeCopy[data.resumeLanguage].sections.skills}
      dark={dark}
      sectionId="skills"
      showTitle={!range || range.start === 0}
      className={className}
    >
      <ul className="flex flex-wrap gap-1.5">
        {items.map(({ item, index }) => (
          <li
            key={`${item}-${index}`}
            data-cv-entry={index}
            className={`rounded-sm px-2 py-1 text-[8px] ${
              dark
                ? "bg-white/15 text-white"
                : "bg-[var(--cv-soft)] text-[var(--cv-accent)]"
            }`}
          >
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Languages({
  data,
  dark = false,
  range,
  className = "",
}: {
  data: CVData;
  dark?: boolean;
  range?: CVEntryRange;
  className?: string;
}) {
  const entries = rangeEntries(nonEmptyEntries(data.languages), range);
  if (!entries.length) return null;

  return (
    <Section
      title={resumeCopy[data.resumeLanguage].sections.languages}
      dark={dark}
      sectionId="languages"
      showTitle={!range || range.start === 0}
      className={className}
    >
      <ul className="space-y-1.5">
        {entries.map(({ item: entry, index }) => (
          <li
            key={`${entry.language}-${index}`}
            data-cv-entry={index}
            className="flex flex-wrap justify-between gap-x-2 text-[9px]"
          >
            <span className="font-semibold">{entry.language}</span>
            <span className={dark ? "text-white/65" : "text-stone-500"}>
              {entry.proficiency}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Projects({
  data,
  dark = false,
  range,
}: {
  data: CVData;
  dark?: boolean;
  range?: CVEntryRange;
}) {
  const entries = rangeEntries(
    sortByLatestDateDesc(nonEmptyEntries(data.projects), [
      "endDate",
      "startDate",
    ]),
    range,
  );
  if (!entries.length) return null;

  return (
    <Section
      title={resumeCopy[data.resumeLanguage].sections.projects}
      dark={dark}
      sectionId="projects"
      showTitle={!range || range.start === 0}
    >
      <div className="space-y-3">
        {entries.map(({ item: entry, index }) => (
          <article
            key={`${entry.name}-${index}`}
            data-cv-entry={index}
            className="space-y-1"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <h3 className="text-[10px] font-bold">
                {entry.name || entry.role}
              </h3>
              <p
                className={`text-[8px] ${dark ? "text-white/65" : "text-stone-500"}`}
              >
                {formatDateRange(
                  entry.startDate,
                  entry.endDate,
                  data.resumeLanguage,
                )}
              </p>
            </div>
            {entry.role && (
              <p
                className={`text-[9px] font-medium ${dark ? "text-white/65" : "text-[var(--cv-accent)]"}`}
              >
                {entry.role}
              </p>
            )}
            {entry.description && (
              <p className="whitespace-pre-line text-[9px] leading-[1.5] text-stone-600">
                {entry.description}
              </p>
            )}
            {entry.url && (
              <p className="break-all text-[8px] text-[var(--cv-accent)]">
                {getExternalHref(entry.url) ? (
                  <a
                    href={getExternalHref(entry.url) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    - {entry.url}
                  </a>
                ) : (
                  entry.url
                )}
              </p>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}

function Courses({
  data,
  dark = false,
  range,
}: {
  data: CVData;
  dark?: boolean;
  range?: CVEntryRange;
}) {
  const entries = rangeEntries(
    sortByLatestDateDesc(nonEmptyEntries(data.courses), ["completionDate"]),
    range,
  );
  if (!entries.length) return null;

  return (
    <Section
      title={resumeCopy[data.resumeLanguage].sections.courses}
      dark={dark}
      sectionId="courses"
      showTitle={!range || range.start === 0}
    >
      <div className="space-y-3">
        {entries.map(({ item: entry, index }) => (
          <article
            key={`${entry.name}-${index}`}
            data-cv-entry={index}
            className="space-y-1"
          >
            <h3 className="text-[10px] font-bold text-stone-900">
              {entry.name || entry.provider}
            </h3>
            {(entry.provider || entry.completionDate) && (
              <p
                className={`text-[9px] ${dark ? "text-white/65" : "text-stone-500"}`}
              >
                {[
                  entry.provider,
                  formatDate(entry.completionDate, data.resumeLanguage),
                ]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
            )}
            {entry.description && (
              <p className="whitespace-pre-line text-[9px] leading-[1.5] text-stone-600">
                {entry.description}
              </p>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}

function PersonalInterests({
  data,
  dark = false,
  range,
}: {
  data: CVData;
  dark?: boolean;
  range?: CVEntryRange;
}) {
  const interests = splitItems(data.interests);
  const hobbies = splitItems(data.hobbies);
  const entries = rangeEntries([...interests, ...hobbies], range);
  if (!entries.length) return null;

  return (
    <Section
      title={resumeCopy[data.resumeLanguage].sections.interests}
      dark={dark}
      sectionId="interests"
      showTitle={!range || range.start === 0}
    >
      <p className="text-[9px] leading-[1.5]">
        {entries.map(({ item, index }, entryIndex) => (
          <span key={`${item}-${index}`} data-cv-entry={index}>
            {entryIndex > 0 ? " · " : ""}
            {item}
          </span>
        ))}
      </p>
    </Section>
  );
}

function ModernTemplate({
  data,
  visibleSections,
  entryRanges,
  isFirstPage,
}: {
  data: CVData;
  visibleSections: Set<CVSectionId>;
  entryRanges: CVSectionRanges;
  isFirstPage: boolean;
}) {
  const fullName = getFullName(data);
  return (
    <article
      className="flex-1 bg-white text-stone-900"
      style={{ fontFamily: "var(--cv-font-family)" }}
    >
      {isFirstPage ? (
        <header className="flex min-h-60 items-stretch justify-between gap-5 overflow-hidden bg-[var(--cv-accent)] text-white">
          <div className="flex min-w-0 flex-1 flex-col justify-center px-8 py-7 sm:px-10">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/75">
              {resumeCopy[data.resumeLanguage].curriculumVitae}
            </p>
            <h1 className="break-words text-3xl font-semibold leading-tight sm:text-4xl">
              {fullName}
            </h1>
            {data.personalInfo.jobTitle.trim() && (
              <p className="mt-2 text-xs font-medium text-white/85">
                {data.personalInfo.jobTitle}
              </p>
            )}
          </div>
          {data.photoShape === "circle" ? (
            <div className="flex w-[35%] shrink-0 items-center justify-center p-5 ">
              <Portrait
                data={data}
                size="large"
                sizeMultiplier={1.3}
                className="bg-white/15"
                borderTone="light"
              />
            </div>
          ) : (
            <Portrait
              data={data}
              className="bg-white/15"
              fillSection
              borderTone="light"
            />
          )}
        </header>
      ) : (
        <header className="bg-[var(--cv-accent)] px-8 py-4 text-white sm:px-10">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/75">
            {resumeCopy[data.resumeLanguage].continued}
          </p>
        </header>
      )}
      <div className="grid grid-cols-[1.55fr_0.85fr] gap-6 px-8 py-8 sm:gap-8 sm:px-10">
        <main className="space-y-5">
          {isFirstPage && <Summary data={data} />}
          {visibleSections.has("experience") && (
            <Experience data={data} range={entryRanges.experience} />
          )}
          {visibleSections.has("education") && (
            <Education data={data} range={entryRanges.education} />
          )}
          {visibleSections.has("courses") && (
            <Courses data={data} range={entryRanges.courses} />
          )}
          {visibleSections.has("projects") && (
            <Projects data={data} range={entryRanges.projects} />
          )}
        </main>
        <aside className="space-y-5 border-l border-stone-200 pl-5 sm:pl-6">
          {isFirstPage && <ContactList data={data} />}
          {visibleSections.has("skills") && (
            <Skills data={data} range={entryRanges.skills} />
          )}
          {visibleSections.has("languages") && (
            <Languages data={data} range={entryRanges.languages} />
          )}
          {visibleSections.has("interests") && (
            <PersonalInterests data={data} range={entryRanges.interests} />
          )}
        </aside>
      </div>
    </article>
  );
}

function ClassicTemplate({
  data,
  visibleSections,
  entryRanges,
  isFirstPage,
}: {
  data: CVData;
  visibleSections: Set<CVSectionId>;
  entryRanges: CVSectionRanges;
  isFirstPage: boolean;
}) {
  return (
    <article
      className="flex-1 bg-white px-8 py-10 text-stone-900 sm:px-12 sm:py-12"
      style={{ fontFamily: "var(--cv-font-family)" }}
    >
      {isFirstPage ? (
        <header
          className={`flex flex-col items-center gap-5 border-b-2 border-[var(--cv-accent)] pb-5 text-center ${
            data.profileImage ? "sm:flex-row sm:text-left" : ""
          }`}
        >
          <Portrait
            data={data}
            className="border border-stone-300 bg-stone-100 text-lg font-semibold text-stone-600"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold leading-tight">
              {getFullName(data)}
            </h1>
            {data.personalInfo.jobTitle.trim() && (
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-600">
                {data.personalInfo.jobTitle}
              </p>
            )}
            <p className="mt-4 text-[9px] leading-5 text-stone-600">
              {getContactDetails(data).map((item, index) => (
                <span key={item.label}>
                  {index > 0 ? "  |  " : ""}
                  {item.href ? (
                    <a href={item.href}>{item.value}</a>
                  ) : (
                    item.value
                  )}
                </span>
              ))}
            </p>
          </div>
        </header>
      ) : (
        <header className="border-b-2 border-[var(--cv-accent)] pb-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--cv-accent)]">
            {resumeCopy[data.resumeLanguage].continued}
          </p>
        </header>
      )}
      <div className="mt-6 space-y-5">
        {isFirstPage && <Summary data={data} />}
        {visibleSections.has("experience") && (
          <Experience data={data} range={entryRanges.experience} />
        )}
        {visibleSections.has("education") && (
          <Education data={data} range={entryRanges.education} />
        )}
        {visibleSections.has("courses") && (
          <Courses data={data} range={entryRanges.courses} />
        )}
        {(visibleSections.has("skills") ||
          visibleSections.has("languages")) && (
          <div className="grid auto-rows-fr items-stretch gap-5 sm:grid-cols-2">
            {visibleSections.has("skills") && (
              <Skills
                data={data}
                range={entryRanges.skills}
                className="h-full"
              />
            )}
            {visibleSections.has("languages") && (
              <Languages
                data={data}
                range={entryRanges.languages}
                className="h-full"
              />
            )}
          </div>
        )}
        {visibleSections.has("projects") && (
          <Projects data={data} range={entryRanges.projects} />
        )}
        {visibleSections.has("interests") && (
          <PersonalInterests data={data} range={entryRanges.interests} />
        )}
      </div>
    </article>
  );
}

function SidebarTemplate({
  data,
  visibleSections,
  entryRanges,
  isFirstPage,
  sidebarInset,
}: {
  data: CVData;
  visibleSections: Set<CVSectionId>;
  entryRanges: CVSectionRanges;
  isFirstPage: boolean;
  sidebarInset: boolean;
}) {
  return (
    <article
      className={`grid flex-1 ${
        sidebarInset ? "grid-cols-[0.92fr_1.36fr]" : "grid-cols-[0.78fr_1.5fr]"
      } bg-white text-stone-900`}
      style={{ fontFamily: "var(--cv-font-family)" }}
    >
      {isFirstPage && (
        <aside
          className={`self-start space-y-5 ${
            sidebarInset ? "m-4 rounded-xl" : "rounded-br-xl"
          } bg-[var(--cv-accent)] px-5 pt-8 pb-10 text-white sm:px-7`}
        >
          <Portrait
            data={data}
            size="large"
            className="mx-auto bg-white/15"
            borderTone="light"
          />
          <ContactList data={data} dark />
          {visibleSections.has("skills") && (
            <Skills data={data} dark range={entryRanges.skills} />
          )}
          {visibleSections.has("languages") && (
            <Languages data={data} dark range={entryRanges.languages} />
          )}
          {visibleSections.has("interests") && (
            <PersonalInterests data={data} dark range={entryRanges.interests} />
          )}
        </aside>
      )}
      <main
        className={`min-w-0 py-9 sm:py-11 ${
          !isFirstPage
            ? "col-span-2 px-6 sm:px-9"
            : sidebarInset
              ? "pl-2 pr-6 sm:pl-3 sm:pr-9"
              : "px-6 sm:px-9"
        }`}
      >
        {isFirstPage ? (
          <header className="mb-6 flex items-center justify-between gap-5 border-b border-stone-300 pb-5">
            <div className="min-w-0">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--cv-accent)]">
                {resumeCopy[data.resumeLanguage].curriculumVitae}
              </p>
              <h1 className="break-words text-3xl font-semibold leading-tight">
                {getFullName(data)}
              </h1>
              {data.personalInfo.jobTitle.trim() && (
                <p className="mt-2 text-xs text-stone-600">
                  {data.personalInfo.jobTitle}
                </p>
              )}
            </div>
          </header>
        ) : (
          <header className="mb-6 border-b border-stone-300 pb-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--cv-accent)]">
              {resumeCopy[data.resumeLanguage].continued}
            </p>
          </header>
        )}
        <div className="space-y-5">
          {isFirstPage && <Summary data={data} />}
          {!isFirstPage && visibleSections.has("skills") && (
            <Skills data={data} range={entryRanges.skills} />
          )}
          {!isFirstPage && visibleSections.has("languages") && (
            <Languages data={data} range={entryRanges.languages} />
          )}
          {visibleSections.has("experience") && (
            <Experience data={data} range={entryRanges.experience} />
          )}
          {visibleSections.has("education") && (
            <Education data={data} range={entryRanges.education} />
          )}
          {visibleSections.has("courses") && (
            <Courses data={data} range={entryRanges.courses} />
          )}
          {visibleSections.has("projects") && (
            <Projects data={data} range={entryRanges.projects} />
          )}
          {!isFirstPage && visibleSections.has("interests") && (
            <PersonalInterests data={data} range={entryRanges.interests} />
          )}
        </div>
      </main>
    </article>
  );
}

function A4Page() {
  const {
    isEditorCollapsed,
    personalInfo,
    profileImage,
    photoShape,
    template,
    setTemplate,
    resumeLanguage,
    fontSize,
    sidebarInset,
    setSidebarInset,
    photoSize,
    showPhotoBorder,
    colorway,
    setColorway,
    customColor,
    hasCustomColor,
    setCustomColor,
    fontStyle,
    setFontStyle,
    summary,
    workExperience,
    education,
    skills,
    languages,
    projects,
    courses,
    interests,
    hobbies,
    dataProcessingConsent,
  } = useCVStore();

  // PDF export — hooks live inside the component now
  const printRootRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const handleExportPdf = useReactToPrint({
    contentRef: printRootRef,
    documentTitle: appStrings[resumeLanguage].appTitle,
    onBeforePrint: async () => {
      setIsExporting(true);
    },
    onAfterPrint: () => {
      setIsExporting(false);
    },
  });
  //Ende

  const [pages, setPages] = useState<CVSectionId[][]>([sectionOrder]);
  const [sectionRanges, setSectionRanges] = useState<CVSectionRanges[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const movedEntryIds = useRef(new Set<string>());
  const previousPaginationInputs = useRef<unknown[] | null>(null);
  const templateSectionOrder =
    template === "sidebar" ? sidebarSectionOrder : sectionOrder;

  const data: CVData = {
    personalInfo,
    profileImage,
    photoShape,
    template,
    resumeLanguage,
    fontStyle,
    fontSize,
    sidebarInset,
    photoSize,
    showPhotoBorder,
    colorway,
    customColor,
    hasCustomColor,
    summary,
    workExperience,
    education,
    skills,
    languages,
    projects,
    courses,
    interests,
    hobbies,
    dataProcessingConsent,
  };
  useLayoutEffect(() => {
    const paginationInputs = [
      template,
      resumeLanguage,
      fontSize,
      sidebarInset,
      personalInfo,
      profileImage,
      photoShape,
      photoSize,
      showPhotoBorder,
      summary,
      workExperience,
      education,
      skills,
      languages,
      projects,
      courses,
      interests,
      hobbies,
      dataProcessingConsent,
    ];
    const previousInputs = previousPaginationInputs.current;
    const inputsChanged =
      !previousInputs ||
      paginationInputs.some((input, index) => input !== previousInputs[index]);
    previousPaginationInputs.current = paginationInputs;

    if (inputsChanged) {
      movedEntryIds.current.clear();
      setCurrentPage(0);
      setPages([templateSectionOrder]);
      setSectionRanges([]);
      return;
    }

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      const pageElement = pageRefs.current[pageIndex];
      if (!pageElement) continue;

      const pageBounds = pageElement.getBoundingClientRect();
      const clauseElement =
        pageElement.querySelector<HTMLElement>("[data-cv-clause]");
      const contentBottom = Math.min(
        pageBounds.top + pageBounds.height * 0.97,
        clauseElement?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
      );
      const overflowingEntry = Array.from(
        pageElement.querySelectorAll<HTMLElement>("[data-cv-entry]"),
      ).find((element) => {
        const sectionId =
          element.closest<HTMLElement>("[data-cv-section]")?.dataset.cvSection;
        const entryIndex = element.dataset.cvEntry;
        return (
          element.getBoundingClientRect().bottom > contentBottom &&
          !movedEntryIds.current.has(`${sectionId}:${entryIndex}`)
        );
      });
      if (!overflowingEntry) continue;

      const sectionElement =
        overflowingEntry.closest<HTMLElement>("[data-cv-section]");
      if (!sectionElement) continue;

      const sectionId = sectionElement.dataset.cvSection as CVSectionId;
      const sectionIndex = pages[pageIndex].indexOf(sectionId);
      if (sectionIndex === -1) continue;

      const entryIndex = Number(overflowingEntry.dataset.cvEntry);
      if (!Number.isInteger(entryIndex)) continue;

      const currentRange = sectionRanges[pageIndex]?.[sectionId] ?? {
        start: 0,
      };
      if (
        entryIndex < currentRange.start ||
        (currentRange.end !== undefined && entryIndex >= currentRange.end)
      ) {
        continue;
      }

      const moveWholeSection =
        template === "classic" &&
        (sectionId === "skills" || sectionId === "languages");
      if (moveWholeSection) {
        sectionElement
          .querySelectorAll<HTMLElement>("[data-cv-entry]")
          .forEach((entry) => {
            movedEntryIds.current.add(`${sectionId}:${entry.dataset.cvEntry}`);
          });
      } else {
        movedEntryIds.current.add(`${sectionId}:${entryIndex}`);
      }
      const keepSectionOnCurrentPage =
        !moveWholeSection && entryIndex > currentRange.start;
      const dependentSectionIds: CVSectionId[] =
        template === "classic" && moveWholeSection
          ? pages[pageIndex].slice(sectionIndex + 1)
          : template === "classic" &&
              sectionId === "projects" &&
              pages[pageIndex].includes("interests")
            ? ["interests"]
            : [];
      const sectionsToMove = new Set([sectionId, ...dependentSectionIds]);
      setPages((currentPages) => {
        const nextPages = currentPages.map((pageSections) => [...pageSections]);
        nextPages[pageIndex] = moveWholeSection
          ? nextPages[pageIndex].filter(
              (currentSectionId) => !sectionsToMove.has(currentSectionId),
            )
          : keepSectionOnCurrentPage
            ? nextPages[pageIndex].filter(
                (currentSectionId) =>
                  !dependentSectionIds.includes(currentSectionId),
              )
            : nextPages[pageIndex].filter(
                (currentSectionId) => !sectionsToMove.has(currentSectionId),
              );
        const nextPageSectionIds = new Set([
          ...(nextPages[pageIndex + 1] ?? []),
          ...sectionsToMove,
        ]);
        nextPages[pageIndex + 1] = templateSectionOrder.filter((currentId) =>
          nextPageSectionIds.has(currentId),
        );
        return nextPages;
      });
      setSectionRanges((currentRanges) => {
        const nextRanges = currentRanges.map((pageRanges) => ({
          ...pageRanges,
        }));
        while (nextRanges.length <= pageIndex + 1) nextRanges.push({});

        const currentPageRanges = { ...nextRanges[pageIndex] };
        const nextPageRanges = { ...nextRanges[pageIndex + 1] };
        if (moveWholeSection) {
          for (const sectionToMove of sectionsToMove) {
            const nextSectionRange = nextPageRanges[sectionToMove];
            delete currentPageRanges[sectionToMove];
            nextPageRanges[sectionToMove] = {
              start: 0,
              ...(nextSectionRange?.end !== undefined
                ? { end: nextSectionRange.end }
                : {}),
            };
          }
        } else {
          const nextSectionRange = nextPageRanges[sectionId];
          if (keepSectionOnCurrentPage) {
            currentPageRanges[sectionId] = {
              ...currentRange,
              end: entryIndex,
            };
          } else {
            delete currentPageRanges[sectionId];
          }

          nextPageRanges[sectionId] = {
            start: entryIndex,
            ...(nextSectionRange?.end !== undefined
              ? { end: nextSectionRange.end }
              : {}),
          };
          for (const dependentSectionId of dependentSectionIds) {
            const currentDependentRange = currentPageRanges[
              dependentSectionId
            ] ?? { start: 0 };
            const nextDependentRange = nextPageRanges[dependentSectionId];
            delete currentPageRanges[dependentSectionId];
            nextPageRanges[dependentSectionId] = {
              start: Math.min(
                currentDependentRange.start,
                nextDependentRange?.start ?? currentDependentRange.start,
              ),
              ...(nextDependentRange?.end !== undefined
                ? { end: nextDependentRange.end }
                : {}),
            };
          }
        }
        nextRanges[pageIndex] = currentPageRanges;
        nextRanges[pageIndex + 1] = nextPageRanges;
        return nextRanges;
      });
      setCurrentPage((activePage) => Math.min(activePage, pageIndex + 1));
      return;
    }
  }, [
    pages,
    sectionRanges,
    templateSectionOrder,
    template,
    resumeLanguage,
    fontSize,
    sidebarInset,
    personalInfo,
    profileImage,
    photoShape,
    photoSize,
    showPhotoBorder,
    summary,
    workExperience,
    education,
    skills,
    languages,
    projects,
    courses,
    interests,
    hobbies,
    dataProcessingConsent,
  ]);

  const text = appStrings[resumeLanguage];
  const selectedColorway =
    colorway === "custom"
      ? {
          id: "custom",
          label: text.colorNames.custom,
          accent: customColor,
          soft: `color-mix(in srgb, ${customColor} 12%, white)`,
        }
      : (() => {
          const option =
            colorways.find((colorOption) => colorOption.id === colorway) ??
            colorways[1];
          return {
            ...option,
            label: text.colorNames[option.id],
          };
        })();
  const selectedFont =
    fontStyles.find((option) => option.id === fontStyle) ?? fontStyles[0];
  const previewPositionClassName = isEditorCollapsed
    ? "left-[1.375rem] max-sm:left-6"
    : "left-[min(35vw,30rem)] max-sm:left-6";

  //Our A4 Page and Selection return
  return (
    <div
      data-cv-print-root
      ref={printRootRef}
      className={`pointer-events-none h-screen fixed inset-y-0 right-0 z-20 flex flex-col items-center justify-start overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 py-8 sm:px-8 ${previewPositionClassName}`}
      style={
        {
          "--cv-accent": selectedColorway.accent,
          "--cv-soft": selectedColorway.soft,
          "--cv-font-family": selectedFont.fontFamily,
        } as CSSProperties
      }
    >
      <button
        type="button"
        data-cv-print-hide
        onClick={handleExportPdf}
        disabled={isExporting}
        className="pointer-events-auto fixed right-4 top-4 z-100 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md bg-[var(--cv-accent)] px-4 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-accent)] disabled:cursor-wait disabled:opacity-60"
      >
        {isExporting ? text.preview.preparing : text.preview.exportPdf}
      </button>
      <div
        className="pointer-events-auto my-auto flex w-full max-w-[940px] flex-col gap-5"
        style={{ zoom: 0.95 }}
      >
        <header
          data-cv-print-hide
          className="flex flex-col gap-4 border-b border-stone-300 pb-4 2xl:flex-row 2xl:items-end 2xl:justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cv-accent)]">
                {text.preview.liveDocument}
              </p>
              <h2 className="mb-1 font-serif text-2xl font-semibold text-stone-900">
                {text.preview.cvPreview}
              </h2>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-3 2xl:items-end">
            <div className="flex min-w-0 max-w-full flex-nowrap items-center gap-3">
              <span className="shrink-0 whitespace-nowrap text-xs font-medium text-stone-600">
                {text.preview.colorway}
              </span>
              <div
                role="group"
                aria-label={text.preview.cvColorway}
                className="flex flex-nowrap items-center gap-2"
              >
                {colorways.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-label={`${text.colorNames[option.id]} ${text.preview.colorway}`}
                    aria-pressed={colorway === option.id}
                    title={text.colorNames[option.id]}
                    onClick={() => setColorway(option.id)}
                    className={`h-6 w-6 shrink-0 appearance-none overflow-hidden rounded-full border border-black/10 p-0 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-accent)] ${
                      colorway === option.id ? "ring-2 ring-offset-2" : ""
                    }`}
                    style={{ backgroundColor: option.accent }}
                  />
                ))}
                <label
                  title={text.preview.chooseCustomColor}
                  onClick={() => setColorway("custom")}
                  className={`relative inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--cv-accent)] ${
                    colorway === "custom" ? "ring-2 ring-offset-2" : ""
                  }`}
                  style={{
                    backgroundColor: hasCustomColor ? customColor : "#ffffff",
                  }}
                >
                  <input
                    type="color"
                    aria-label={text.preview.chooseCustomCvColor}
                    value={customColor}
                    onChange={(event) => {
                      setCustomColor(event.target.value);
                      setColorway("custom");
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
              {template === "sidebar" && (
                <div
                  role="group"
                  aria-label={text.editor.sidebarInset}
                  className="grid shrink-0 grid-cols-2 ml-2 rounded-md border border-stone-300 bg-white p-1"
                >
                  <button
                    type="button"
                    aria-label={`${text.editor.sidebarInset} 1`}
                    aria-pressed={!sidebarInset}
                    title={`${text.editor.sidebarInset} 1`}
                    onClick={() => setSidebarInset(false)}
                    className={`h-8 w-8 rounded-sm text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                      !sidebarInset
                        ? "bg-stone-200 text-stone-900"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                    }`}
                  >
                    1
                  </button>
                  <button
                    type="button"
                    aria-label={`${text.editor.sidebarInset} 2`}
                    aria-pressed={sidebarInset}
                    title={`${text.editor.sidebarInset} 2`}
                    onClick={() => setSidebarInset(true)}
                    className={`h-8 w-8 rounded-sm text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                      sidebarInset
                        ? "bg-[var(--cv-accent)] text-white"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                    }`}
                  >
                    2
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-stone-600">
                  {text.preview.font}
                </span>
                <div
                  role="group"
                  aria-label={text.preview.cvFont}
                  className="flex items-center gap-1"
                >
                  {fontStyles.map((fontOption) => (
                    <button
                      key={fontOption.id}
                      type="button"
                      aria-label={text.preview.fontName.replace(
                        "{font}",
                        text.fontNames[fontOption.id],
                      )}
                      aria-pressed={fontStyle === fontOption.id}
                      title={text.preview.fontName.replace(
                        "{font}",
                        text.fontNames[fontOption.id],
                      )}
                      onClick={() => setFontStyle(fontOption.id)}
                      className={`flex min-h-9 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-accent)] ${
                        fontStyle === fontOption.id
                          ? "border-[var(--cv-accent)] bg-white text-[var(--cv-accent)]"
                          : "border-stone-300 bg-white text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      <span
                        className="text-sm font-semibold"
                        style={{ fontFamily: fontOption.fontFamily }}
                      >
                        Aa
                      </span>
                      {text.fontNames[fontOption.id]}
                    </button>
                  ))}
                </div>
              </div>
              <div
                role="tablist"
                aria-label={text.preview.templates}
                className="grid grid-cols-3 rounded-md border border-stone-300 bg-white p-1"
              >
                {templates.map((templateOption) => (
                  <button
                    key={templateOption.id}
                    type="button"
                    role="tab"
                    aria-selected={template === templateOption.id}
                    title={text.templateNotes[templateOption.id]}
                    onClick={() => setTemplate(templateOption.id)}
                    className={`rounded-sm px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-accent)] ${
                      template === templateOption.id
                        ? "bg-[var(--cv-accent)] text-white"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                    }`}
                  >
                    {text.templateNames[templateOption.id]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div
          data-cv-print-pages
          className="flex items-start justify-center gap-[0.2rem] pb-10"
        >
          <div
            data-cv-print-frame
            className="relative mr-4 aspect-[210/297] w-full min-w-0 max-w-[794px] flex-1"
          >
            {pages.map((pageSections, pageIndex) => {
              const visibleSections = new Set(pageSections);
              const entryRanges = sectionRanges[pageIndex] ?? {};
              const isFirstPage = pageIndex === 0;

              return (
                <div
                  key={pageIndex}
                  ref={(element) => {
                    pageRefs.current[pageIndex] = element;
                  }}
                  data-cv-page={pageIndex}
                  aria-hidden={pageIndex !== currentPage}
                  style={
                    {
                      "--cv-font-scale": fontSize / 100,
                    } as CSSProperties
                  }
                  className={`absolute inset-0 flex h-full w-full flex-col overflow-hidden bg-white shadow-xl shadow-stone-900/10 ring-1 ring-stone-300 ${
                    pageIndex === currentPage ? "" : "invisible"
                  }`}
                >
                  {template === "modern" && (
                    <ModernTemplate
                      data={data}
                      visibleSections={visibleSections}
                      entryRanges={entryRanges}
                      isFirstPage={isFirstPage}
                    />
                  )}
                  {template === "classic" && (
                    <ClassicTemplate
                      data={data}
                      visibleSections={visibleSections}
                      entryRanges={entryRanges}
                      isFirstPage={isFirstPage}
                    />
                  )}
                  {template === "sidebar" && (
                    <SidebarTemplate
                      data={data}
                      visibleSections={visibleSections}
                      entryRanges={entryRanges}
                      isFirstPage={isFirstPage}
                      sidebarInset={sidebarInset}
                    />
                  )}
                  {pageIndex === pages.length - 1 &&
                    data.dataProcessingConsent.trim() && (
                      <p
                        data-cv-clause
                        className="absolute inset-x-0 bottom-0 px-4 py-4 text-center text-[8px] leading-[1.5] text-stone-700 opacity-75"
                      >
                        {data.dataProcessingConsent}
                      </p>
                    )}
                </div>
              );
            })}
          </div>
          <nav
            data-cv-print-hide
            aria-label={text.preview.cvPages}
            className="flex shrink-0 flex-col items-center gap-1 pt-1"
          >
            <span
              aria-live="polite"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--cv-accent)] bg-transparent text-[11px] font-semibold text-[var(--cv-accent)]"
            >
              {currentPage + 1}/{pages.length}
            </span>
            <button
              type="button"
              aria-label={text.preview.previousCvPage}
              title={text.preview.previousPage}
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[var(--cv-accent)] bg-transparent p-1 text-[var(--cv-accent)] transition hover:bg-[var(--cv-soft)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span
                aria-hidden="true"
                className="h-4 w-4 rotate-180 bg-[var(--cv-accent)]"
                style={{
                  maskImage: `url("${arrowIcon}")`,
                  maskPosition: "center",
                  maskRepeat: "no-repeat",
                  maskSize: "contain",
                  WebkitMaskImage: `url("${arrowIcon}")`,
                  WebkitMaskPosition: "center",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskSize: "contain",
                }}
              />
            </button>
            <button
              type="button"
              aria-label={text.preview.nextCvPage}
              title={text.preview.nextPage}
              disabled={currentPage >= pages.length - 1}
              onClick={() =>
                setCurrentPage((page) => Math.min(pages.length - 1, page + 1))
              }
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[var(--cv-accent)] bg-transparent p-1 text-[var(--cv-accent)] transition hover:bg-[var(--cv-soft)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span
                aria-hidden="true"
                className="h-4 w-4 bg-[var(--cv-accent)]"
                style={{
                  maskImage: `url("${arrowIcon}")`,
                  maskPosition: "center",
                  maskRepeat: "no-repeat",
                  maskSize: "contain",
                  WebkitMaskImage: `url("${arrowIcon}")`,
                  WebkitMaskPosition: "center",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskSize: "contain",
                }}
              />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default A4Page;
