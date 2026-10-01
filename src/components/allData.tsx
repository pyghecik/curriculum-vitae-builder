import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  type AnimationEvent,
} from "react";
import Cropper, { type Area } from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { createPortal } from "react-dom";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import hideInfoIcon from "../assets/hideinfo.svg";
import importIcon from "../assets/import.svg";
import personImageIcon from "../assets/personimage.svg";
import refreshIcon from "../assets/refresh.svg";
import saveIcon from "../assets/save.svg";
import {
  initialCVData,
  useCVStore,
  type PersonalInfoData,
  type LanguageEntry,
  type ProjectEntry,
  type PhotoShape,
  type CVLanguage,
  ensureLanguageEntryIds,
  normalizeCVPhotoShape,
  normalizeCVLanguage,
  normalizeCVFontSize,
  normalizeCVColorway,
  saveCVDataToStorage,
  clearSavedCVData,
} from "../store/cvStore";
import { appStrings, type TranslationCatalog } from "../localization";

const inputClassName =
  "mt-2 w-full rounded-md border border-stone-300 bg-white px-3.5 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";

const labelClassName = "text-sm font-medium text-stone-700";
const photoShapeOptions: { value: PhotoShape; label: string }[] = [
  { value: "circle", label: "Circle" },
  { value: "rectangle", label: "Rectangle" },
  { value: "rounded", label: "Rounded" },
];
const resumeLanguageOptions: CVLanguage[] = ["en", "de", "pl", "fr"];

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date";
};

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: TextFieldProps) {
  return (
    <label className={labelClassName}>
      {label}
      <input
        className={inputClassName}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: TextAreaFieldProps) {
  return (
    <label className={labelClassName}>
      {label}
      <textarea
        className={`${inputClassName} min-h-24 resize-y`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function updateEntry<T extends object>(
  setEntries: Dispatch<SetStateAction<T[]>>,
  entryIndex: number,
  field: keyof T,
  value: string,
) {
  setEntries((entries) =>
    entries.map((entry, index) =>
      index === entryIndex ? { ...entry, [field]: value } : entry,
    ),
  );
}

function addEntry<T extends object>(
  setEntries: Dispatch<SetStateAction<T[]>>,
  newEntry: T,
) {
  setEntries((entries) => [...entries, { ...newEntry }]);
}

function removeEntry<T>(
  setEntries: Dispatch<SetStateAction<T[]>>,
  entryIndex: number,
) {
  setEntries((entries) => entries.filter((_, index) => index !== entryIndex));
}

function SortableLanguageEntry({
  entry,
  index,
  setLanguages,
  copy,
}: {
  entry: LanguageEntry;
  index: number;
  setLanguages: Dispatch<SetStateAction<LanguageEntry[]>>;
  copy: TranslationCatalog["editor"];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`space-y-4 rounded-md border border-stone-200 bg-white/60 p-4 ${
        isDragging ? "z-10 opacity-70 shadow-md" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-700">
          {copy.language} {index + 1}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => removeEntry(setLanguages, index)}
            className="text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-900"
          >
            Remove
          </button>
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={copy.reorderLanguage.replace(
              "{number}",
              String(index + 1),
            )}
            title={copy.dragToReorder}
            className="flex h-8 w-8 touch-none cursor-grab items-center justify-center rounded text-stone-500 hover:text-stone-900 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 20"
              className="h-4 w-4 fill-current"
            >
              <circle cx="5" cy="4" r="1.4" />
              <circle cx="11" cy="4" r="1.4" />
              <circle cx="5" cy="10" r="1.4" />
              <circle cx="11" cy="10" r="1.4" />
              <circle cx="5" cy="16" r="1.4" />
              <circle cx="11" cy="16" r="1.4" />
            </svg>
          </button>
        </div>
      </div>
      <TextField
        label={copy.language}
        value={entry.language}
        onChange={(value) =>
          updateEntry(setLanguages, index, "language", value)
        }
        placeholder={copy.languageExample}
      />
      <TextField
        label={copy.proficiency}
        value={entry.proficiency}
        onChange={(value) =>
          updateEntry(setLanguages, index, "proficiency", value)
        }
        placeholder={copy.proficiencyExample}
      />
    </div>
  );
}

function createCroppedPhoto(imageUrl: string, area: Area): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const outputScale = Math.min(1, 640 / Math.max(area.width, area.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(area.width * outputScale));
      canvas.height = Math.max(1, Math.round(area.height * outputScale));

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not prepare the cropped image."));
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        image,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not compress the cropped image."));
            return;
          }

          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () =>
            reject(new Error("Could not read the cropped image."));
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.82,
      );
    };
    image.onerror = () =>
      reject(new Error("Could not load the selected image."));
    image.src = imageUrl;
  });
}

function AllData() {
  const {
    isEditorCollapsed,
    setIsEditorCollapsed,
    personalInfo,
    setPersonalInfo,
    profileImage,
    setProfileImage,
    photoShape,
    setPhotoShape,
    template,
    resumeLanguage,
    setResumeLanguage,
    fontSize,
    setFontSize,
    photoSize,
    setPhotoSize,
    showPhotoBorder,
    setShowPhotoBorder,
    summary,
    setSummary,
    workExperience,
    setWorkExperience,
    education,
    setEducation,
    skills,
    setSkills,
    languages,
    setLanguages,
    projects,
    setProjects,
    courses,
    setCourses,
    interests,
    setInterests,
    dataProcessingConsent,
    setDataProcessingConsent,
  } = useCVStore();
  const text = appStrings[resumeLanguage];
  const copy = text.editor;
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [pendingStep, setPendingStep] = useState<1 | 2 | null>(null);
  const [imageError, setImageError] = useState("");
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const importFileRef = useRef<HTMLInputElement>(null);
  const photoFrameClassName =
    photoShape === "circle"
      ? "h-20 w-20 rounded-full"
      : photoShape === "rounded"
        ? "h-20 w-16 rounded-md"
        : "h-20 w-16 rounded-none";
  const availablePhotoShapeOptions =
    template === "modern"
      ? photoShapeOptions.filter((option) => option.value !== "rounded")
      : photoShapeOptions;
  const panelRef = useRef<HTMLElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.lang = resumeLanguage;
  }, resumeLanguage);

  useEffect(() => {
    if (!cropImageUrl) return;
    return () => URL.revokeObjectURL(cropImageUrl);
  }, [cropImageUrl]);

  useEffect(() => {
    const unsubscribe = useCVStore.subscribe((state) => {
      saveCVDataToStorage({
        personalInfo: state.personalInfo,
        profileImage: state.profileImage,
        photoShape: state.photoShape,
        template: state.template,
        resumeLanguage: state.resumeLanguage,
        fontSize: state.fontSize,
        sidebarInset: state.sidebarInset,
        fontStyle: state.fontStyle,
        colorway: state.colorway,
        customColor: state.customColor,
        hasCustomColor: state.hasCustomColor,
        photoSize: state.photoSize,
        showPhotoBorder: state.showPhotoBorder,
        summary: state.summary,
        workExperience: state.workExperience,
        education: state.education,
        skills: state.skills,
        languages: state.languages,
        projects: state.projects,
        courses: state.courses,
        interests: state.interests,
        hobbies: state.hobbies,
        dataProcessingConsent: state.dataProcessingConsent,
      });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isCropperOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isProcessingImage) {
        setIsCropperOpen(false);
        setCropImageUrl(null);
        setImageError("");
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isCropperOpen, isProcessingImage]);

  function updateField(field: keyof PersonalInfoData, value: string) {
    setPersonalInfo((currentInfo) => ({ ...currentInfo, [field]: value }));
  }

  async function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setImageError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError(copy.chooseJpgPngWebp);
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setImageError(copy.imageTooLarge);
      return;
    }

    setIsProcessingImage(true);
    try {
      const optimizedFile = await imageCompression(file, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
      });
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropImageUrl(URL.createObjectURL(optimizedFile));
      setIsCropperOpen(true);
    } catch {
      setImageError(copy.imagePreparationFailed);
    } finally {
      setIsProcessingImage(false);
    }
  }

  async function handleApplyCrop() {
    if (!cropImageUrl || !croppedAreaPixels) return;

    setIsProcessingImage(true);
    setImageError("");
    try {
      const croppedPhoto = await createCroppedPhoto(
        cropImageUrl,
        croppedAreaPixels,
      );
      setProfileImage(croppedPhoto);
      setIsCropperOpen(false);
      setCropImageUrl(null);
    } catch {
      setImageError(copy.cropSaveFailed);
    } finally {
      setIsProcessingImage(false);
    }
  }

  function closeCropper() {
    if (isProcessingImage) return;
    setIsCropperOpen(false);
    setCropImageUrl(null);
    setImageError("");
  }

  function transitionToStep(nextStep: 1 | 2) {
    if (pendingStep !== null || nextStep === currentStep) return;
    setPendingStep(nextStep);
  }

  function handleStepAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || pendingStep === null) return;

    setCurrentStep(pendingStep);
    setPendingStep(null);
    requestAnimationFrame(() =>
      panelRef.current?.scrollTo({ top: 0, behavior: "smooth" }),
    );
  }

  function handleNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    transitionToStep(2);
  }

  function handleBack() {
    transitionToStep(1);
  }

  function handleLanguageDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLanguages((entries) => {
      const entriesWithIds = ensureLanguageEntryIds(entries);
      const oldIndex = entriesWithIds.findIndex(
        (entry) => entry.id === active.id,
      );
      const newIndex = entriesWithIds.findIndex(
        (entry) => entry.id === over.id,
      );
      return oldIndex === -1 || newIndex === -1
        ? entriesWithIds
        : arrayMove(entriesWithIds, oldIndex, newIndex);
    });
  }

  function handleRestartData() {
    setIsResetting(true);
    useCVStore.setState((state) => ({
      ...state,
      ...initialCVData,
    }));
    clearSavedCVData();
    setCurrentStep(1);
    setPendingStep(null);

    window.setTimeout(() => {
      setIsResetting(false);
    }, 700);
  }

  async function handleSaveData() {
    const exportedState = useCVStore.getState();
    const serializableState = {
      personalInfo: exportedState.personalInfo,
      profileImage: exportedState.profileImage,
      photoShape: exportedState.photoShape,
      template: exportedState.template,
      resumeLanguage: exportedState.resumeLanguage,
      fontSize: exportedState.fontSize,
      sidebarInset: exportedState.sidebarInset,
      fontStyle: exportedState.fontStyle,
      colorway: exportedState.colorway,
      customColor: exportedState.customColor,
      hasCustomColor: exportedState.hasCustomColor,
      photoSize: exportedState.photoSize,
      showPhotoBorder: exportedState.showPhotoBorder,
      summary: exportedState.summary,
      workExperience: exportedState.workExperience,
      education: exportedState.education,
      skills: exportedState.skills,
      languages: exportedState.languages,
      projects: exportedState.projects,
      courses: exportedState.courses,
      interests: exportedState.interests,
      hobbies: exportedState.hobbies,
      dataProcessingConsent: exportedState.dataProcessingConsent,
    };

    const blob = new Blob([JSON.stringify(serializableState, null, 2)], {
      type: "application/json",
    });

    const suggestedName = [
      personalInfo.firstName,
      personalInfo.lastName,
      "cv-data",
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, "-")
      .toLowerCase();

    try {
      if ("showSaveFilePicker" in window) {
        const fileHandle = await (
          window as Window & {
            showSaveFilePicker?: (options?: {
              suggestedName?: string;
              types?: Array<{
                description: string;
                accept: Record<string, string[]>;
              }>;
            }) => Promise<{
              createWritable: () => Promise<{
                write: (data: Blob) => Promise<void>;
                close: () => Promise<void>;
              }>;
            }>;
          }
        ).showSaveFilePicker?.({
          suggestedName: `${suggestedName || "cv-data"}.json`,
          types: [
            {
              description: "CV data file",
              accept: { "application/json": [".json"] },
            },
          ],
        });

        if (fileHandle) {
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        }
      }
    } catch {
      // Fall back to the browser download prompt below if the picker is blocked.
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${suggestedName || "cv-data"}.json`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleImportData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);
      const currentState = useCVStore.getState();
      useCVStore.setState({
        ...currentState,
        ...importedData,
        template: importedData.template ?? currentState.template,
        resumeLanguage: normalizeCVLanguage(
          importedData.resumeLanguage ?? currentState.resumeLanguage,
        ),
        fontSize: normalizeCVFontSize(
          importedData.fontSize ?? currentState.fontSize,
        ),
        sidebarInset:
          typeof importedData.sidebarInset === "boolean"
            ? importedData.sidebarInset
            : currentState.sidebarInset,
        photoShape: normalizeCVPhotoShape(
          importedData.template ?? currentState.template,
          importedData.photoShape ?? currentState.photoShape,
        ),
        projects: Array.isArray(importedData.projects)
          ? importedData.projects
          : [],
        customColor:
          typeof importedData.customColor === "string"
            ? importedData.customColor
            : currentState.customColor,
        hasCustomColor:
          typeof importedData.hasCustomColor === "boolean"
            ? importedData.hasCustomColor
            : importedData.colorway === "custom" ||
              (typeof importedData.customColor === "string" &&
                importedData.customColor.toLowerCase() !== "#8058a2"),
        colorway: normalizeCVColorway(
          importedData.colorway ?? currentState.colorway,
        ),
        ...(Array.isArray(importedData.languages)
          ? { languages: ensureLanguageEntryIds(importedData.languages) }
          : {}),
      });
      const importedState = useCVStore.getState();
      saveCVDataToStorage({
        personalInfo: importedState.personalInfo,
        profileImage: importedState.profileImage,
        photoShape: importedState.photoShape,
        template: importedState.template,
        resumeLanguage: importedState.resumeLanguage,
        fontSize: importedState.fontSize,
        sidebarInset: importedState.sidebarInset,
        fontStyle: importedState.fontStyle,
        colorway: importedState.colorway,
        customColor: importedState.customColor,
        hasCustomColor: importedState.hasCustomColor,
        photoSize: importedState.photoSize,
        showPhotoBorder: importedState.showPhotoBorder,
        summary: importedState.summary,
        workExperience: importedState.workExperience,
        education: importedState.education,
        skills: importedState.skills,
        languages: importedState.languages,
        projects: importedState.projects,
        courses: importedState.courses,
        interests: importedState.interests,
        hobbies: importedState.hobbies,
        dataProcessingConsent: importedState.dataProcessingConsent,
      });
    } catch {
      setImageError(copy.invalidImport);
    }
  }

  return (
    <>
      <div
        className="fixed inset-y-0 left-0 z-40 w-[min(35vw,30rem)] text-stone-900 transition-transform duration-300 ease-in-out max-sm:w-[min(88vw,25rem)]"
        style={{
          transform: isEditorCollapsed
            ? "translateX(calc(-100% + 1.375rem))"
            : "translateX(0)",
        }}
      >
        <aside
          ref={panelRef}
          id="personal-details-panel"
          aria-label={
            currentStep === 1 ? copy.personalDetails : copy.additionalDetails
          }
          aria-hidden={isEditorCollapsed}
          inert={isEditorCollapsed}
          className="h-full overflow-y-auto [scrollbar-color:rgb(168_162_158)_transparent] scrollbar-thin [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-400/70 [&::-webkit-scrollbar-thumb:hover]:bg-stone-500 [&::-webkit-scrollbar-track]:bg-transparent border-r border-stone-300 bg-stone-100 px-5 py-6 shadow-sm sm:px-6 sm:py-8"
        >
          <header className="mb-7 border-b border-stone-300 pb-5">
            <div className="mb-2 flex flex-nowrap items-center justify-between gap-1">
              <p className="min-w-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-teal-800">
                {copy.builder} <span className="px-2 text-stone-400">/</span> 0
                {currentStep}
              </p>
              <div className="flex shrink-0 flex-nowrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestartData}
                  aria-label={copy.restartAria}
                  title={copy.restart}
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-transparent p-1 text-teal-700 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 "
                >
                  <img
                    src={refreshIcon}
                    alt=""
                    className={
                      isResetting ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"
                    }
                  />
                </button>
                <button
                  type="button"
                  onClick={handleSaveData}
                  aria-label={copy.save}
                  title={copy.save}
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-teal-700 bg-transparent text-teal-700 transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
                >
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 bg-current"
                    style={{
                      maskImage: `url("${saveIcon}")`,
                      maskPosition: "center",
                      maskRepeat: "no-repeat",
                      maskSize: "contain",
                      WebkitMaskImage: `url("${saveIcon}")`,
                      WebkitMaskPosition: "center",
                      WebkitMaskRepeat: "no-repeat",
                      WebkitMaskSize: "contain",
                    }}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => importFileRef.current?.click()}
                  aria-label={copy.import}
                  title={copy.import}
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-teal-700 bg-transparent text-teal-700 transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
                >
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 bg-current"
                    style={{
                      maskImage: `url("${importIcon}")`,
                      maskPosition: "center",
                      maskRepeat: "no-repeat",
                      maskSize: "contain",
                      WebkitMaskImage: `url("${importIcon}")`,
                      WebkitMaskPosition: "center",
                      WebkitMaskRepeat: "no-repeat",
                      WebkitMaskSize: "contain",
                    }}
                  />
                </button>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json,.txt"
                  onChange={handleImportData}
                  className="hidden"
                  aria-label={copy.importAria}
                />
              </div>
            </div>
            <h1 className="font-serif text-2xl font-medium tracking-tight">
              {currentStep === 1
                ? copy.personalDetails
                : copy.additionalDetails}
            </h1>
            <p className="mt-2 text-sm leading-5 text-stone-600">
              {currentStep === 1
                ? copy.personalDetailsIntro
                : copy.additionalDetailsIntro}
            </p>
            <label className="mt-4 flex items-center justify-between gap-3 text-xs font-medium text-stone-700">
              {copy.resumeLanguage}
              <select
                value={resumeLanguage}
                onChange={(event) =>
                  setResumeLanguage(event.target.value as CVLanguage)
                }
                className="min-h-9 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 "
              >
                {resumeLanguageOptions.map((language) => (
                  <option key={language} value={language}>
                    {text.languageNames[language]}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 flex items-center gap-3 text-xs font-medium text-stone-700">
              <span className="shrink-0">
                {copy.fontSize} <output>{fontSize}%</output>
              </span>
              <input
                type="range"
                min="80"
                max="130"
                step="5"
                value={fontSize}
                onChange={(event) => setFontSize(Number(event.target.value))}
                aria-label={copy.fontSize}
                className="min-w-0 flex-1 accent-teal-800"
              />
            </label>
          </header>

          <div
            aria-hidden={pendingStep !== null}
            inert={pendingStep !== null}
            onAnimationEnd={handleStepAnimationEnd}
            className={pendingStep !== null ? "slide-out-up" : ""}
          >
            {currentStep === 1 ? (
              <form onSubmit={handleNext} className="space-y-7">
                <details className="border-b border-stone-200 pb-6">
                  <summary
                    id="photo-heading"
                    className="cursor-pointer text-sm font-semibold"
                  >
                    {copy.photo}{" "}
                    <span className="font-normal text-stone-500">
                      {copy.optional}
                    </span>
                  </summary>
                  <div className="flex items-center gap-4 mt-5">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isProcessingImage}
                      aria-label={
                        profileImage ? copy.changePhoto : copy.addPhoto
                      }
                      className={`flex ${photoFrameClassName} shrink-0 items-center justify-center overflow-hidden border border-dashed border-stone-400 bg-white transition hover:border-teal-800 hover:bg-teal-50 disabled:cursor-wait disabled:opacity-60`}
                    >
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img
                          src={personImageIcon}
                          alt=""
                          className="h-8 w-8 opacity-60"
                        />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="mt-1 text-xs leading-5 text-stone-500">
                        {isProcessingImage
                          ? copy.optimizingImage
                          : copy.photoFormats}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={isProcessingImage}
                          className="text-sm font-semibold text-teal-800 underline decoration-teal-800/30 underline-offset-2 hover:text-teal-950 disabled:opacity-60"
                        >
                          {profileImage ? copy.changePhoto : copy.addPhoto}
                        </button>
                        {profileImage && (
                          <button
                            type="button"
                            onClick={() => setProfileImage(null)}
                            className="text-sm font-medium text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-900"
                          >
                            {copy.removePhoto}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <fieldset className="mt-4">
                    <legend className="text-xs font-medium text-stone-600">
                      {copy.photoShape}
                    </legend>
                    <div
                      role="group"
                      aria-label={copy.photoShape}
                      className="mt-2 inline-flex rounded-md border border-stone-300 bg-white p-1"
                    >
                      {availablePhotoShapeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={photoShape === option.value}
                          title={copy[option.value]}
                          onClick={() => setPhotoShape(option.value)}
                          className={`flex min-w-20 flex-col items-center justify-center gap-1 rounded-sm px-2.5 py-2 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:cursor-not-allowed ${
                            photoShape === option.value
                              ? "bg-teal-900 text-white"
                              : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`border-2 ${
                              option.value === "circle"
                                ? "h-4 w-4 rounded-full"
                                : option.value === "rounded"
                                  ? "h-5 w-4 rounded-sm"
                                  : "h-5 w-4"
                            } ${photoShape === option.value ? "border-current" : "border-current"}`}
                          />
                          {copy[option.value]}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="mt-4 space-y-3">
                    <label className="text-xs font-medium text-stone-600">
                      <span className="flex items-center justify-between gap-3">
                        {copy.photoSize} <output>{photoSize}%</output>
                      </span>
                      <input
                        type="range"
                        min="60"
                        max="150"
                        step="5"
                        value={photoSize}
                        onChange={(event) =>
                          setPhotoSize(Number(event.target.value))
                        }
                        className="mt-2 block w-full accent-teal-800"
                      />
                    </label>
                    <label className="flex min-h-10 items-center gap-2 text-xs font-medium text-stone-700">
                      <input
                        type="checkbox"
                        checked={showPhotoBorder}
                        onChange={(event) =>
                          setShowPhotoBorder(event.target.checked)
                        }
                        className="h-4 w-4 accent-teal-800"
                      />
                      {copy.border}
                    </label>
                  </div>
                  <input
                    ref={photoInputRef}
                    className="hidden"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelection}
                    aria-label={copy.choosePhoto}
                  />
                  {imageError && (
                    <p className="mt-3 text-sm text-red-700" role="alert">
                      {imageError}
                    </p>
                  )}
                </details>

                <details
                  aria-labelledby="identity-heading"
                  className="space-y-4"
                >
                  <summary className="cursor-pointer">
                    <span
                      id="identity-heading"
                      role="heading"
                      aria-level={2}
                      className="text-lg font-semibold"
                    >
                      Identity
                    </span>
                    <span className="ml-1 text-xs text-stone-500">
                      {copy.requiredFields}
                    </span>
                  </summary>
                  <div className="grid gap-y-5">
                    <label className={labelClassName}>
                      {copy.firstName} <span className="text-teal-800">*</span>
                      <input
                        className={inputClassName}
                        name="firstName"
                        autoComplete="given-name"
                        value={personalInfo.firstName}
                        onChange={(event) =>
                          updateField("firstName", event.target.value)
                        }
                        placeholder={copy.firstNameExample}
                        required
                      />
                    </label>
                    <label className={labelClassName}>
                      {copy.lastName} <span className="text-teal-800">*</span>
                      <input
                        className={inputClassName}
                        name="lastName"
                        autoComplete="family-name"
                        value={personalInfo.lastName}
                        onChange={(event) =>
                          updateField("lastName", event.target.value)
                        }
                        placeholder={copy.lastNameExample}
                        required
                      />
                    </label>
                    <label className={labelClassName}>
                      {copy.professionalTitle}
                      <input
                        className={inputClassName}
                        name="jobTitle"
                        autoComplete="organization-title"
                        value={personalInfo.jobTitle}
                        onChange={(event) =>
                          updateField("jobTitle", event.target.value)
                        }
                        placeholder={copy.professionalTitle}
                      />
                    </label>
                    <label className={labelClassName}>
                      {copy.dateOfBirth}
                      <input
                        className={inputClassName}
                        type="date"
                        name="dateOfBirth"
                        autoComplete="bday"
                        value={personalInfo.dateOfBirth}
                        onChange={(event) =>
                          updateField("dateOfBirth", event.target.value)
                        }
                      />
                    </label>
                  </div>
                </details>

                <details
                  aria-labelledby="contact-heading"
                  className="border-t border-stone-200 pt-7"
                >
                  <summary className="cursor-pointer">
                    <span
                      id="contact-heading"
                      role="heading"
                      aria-level={2}
                      className="mb-5 inline-block text-lg font-semibold"
                    >
                      {copy.contact}
                    </span>
                  </summary>
                  <div className="grid gap-y-5">
                    <label className={labelClassName}>
                      {copy.emailAddress}{" "}
                      <span className="text-teal-800">*</span>
                      <input
                        className={inputClassName}
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={personalInfo.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                        placeholder="alex@example.com"
                        required
                      />
                    </label>
                    <label className={labelClassName}>
                      {copy.phoneNumber}{" "}
                      <span className="text-teal-800">*</span>
                      <input
                        className={inputClassName}
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        value={personalInfo.phone}
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                        placeholder="+1 555 010 1234"
                        required
                      />
                    </label>
                  </div>
                </details>

                <details
                  aria-labelledby="location-heading"
                  className="border-t border-stone-200 pt-7"
                >
                  <summary className="cursor-pointer">
                    <span
                      id="location-heading"
                      role="heading"
                      aria-level={2}
                      className="mb-5 inline-block text-lg font-semibold"
                    >
                      {copy.location}
                    </span>
                  </summary>
                  <div className="grid gap-y-6">
                    <label className={`${labelClassName} sm:col-span-2`}>
                      {copy.streetAddress}
                      <input
                        className={inputClassName}
                        name="address"
                        autoComplete="street-address"
                        value={personalInfo.address}
                        onChange={(event) =>
                          updateField("address", event.target.value)
                        }
                        placeholder={copy.streetPlaceholder}
                      />
                    </label>
                    <label className={labelClassName}>
                      {copy.city}
                      <input
                        className={inputClassName}
                        name="city"
                        autoComplete="address-level2"
                        value={personalInfo.city}
                        onChange={(event) =>
                          updateField("city", event.target.value)
                        }
                        placeholder={copy.city}
                      />
                    </label>
                    <label className={labelClassName}>
                      {copy.postalCode}
                      <input
                        className={inputClassName}
                        name="postalCode"
                        autoComplete="postal-code"
                        value={personalInfo.postalCode}
                        onChange={(event) =>
                          updateField("postalCode", event.target.value)
                        }
                        placeholder={copy.postalCodeExample}
                      />
                    </label>
                    <label className={labelClassName}>
                      {copy.country}
                      <input
                        className={inputClassName}
                        name="country"
                        autoComplete="country-name"
                        value={personalInfo.country}
                        onChange={(event) =>
                          updateField("country", event.target.value)
                        }
                        placeholder={copy.countryExample}
                      />
                    </label>
                  </div>
                </details>

                <details
                  aria-labelledby="links-heading"
                  className="border-t border-stone-200 pt-7"
                >
                  <summary className="cursor-pointer">
                    <span
                      id="links-heading"
                      role="heading"
                      aria-level={2}
                      className="mb-5 inline-block text-lg font-semibold"
                    >
                      {copy.onlinePresence}{" "}
                      <span className="font-normal text-xs text-stone-500">
                        {copy.optional}
                      </span>
                    </span>
                  </summary>
                  <div className="grid gap-y-5">
                    <label className={labelClassName}>
                      {copy.linkedInProfile}
                      <input
                        className={inputClassName}
                        type="url"
                        name="linkedIn"
                        autoComplete="url"
                        value={personalInfo.linkedIn}
                        onChange={(event) =>
                          updateField("linkedIn", event.target.value)
                        }
                        placeholder="https://linkedin.com/in/you"
                      />
                    </label>
                    <label className={labelClassName}>
                      {copy.websitePortfolio}
                      <input
                        className={inputClassName}
                        type="url"
                        name="website"
                        value={personalInfo.website}
                        onChange={(event) =>
                          updateField("website", event.target.value)
                        }
                        placeholder="https://yourportfolio.com"
                      />
                    </label>
                  </div>
                </details>

                <footer className="flex flex-col gap-3 border-t border-stone-300 pt-5">
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal-800 px-5 text-sm font-semibold text-white transition hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
                  >
                    {copy.next}
                  </button>
                </footer>
              </form>
            ) : (
              <div className="space-y-8">
                <details
                  className="space-y-4"
                  aria-labelledby="summary-heading"
                >
                  <summary className="cursor-pointer">
                    <span
                      id="summary-heading"
                      role="heading"
                      aria-level={2}
                      className="text-lg font-semibold"
                    >
                      {copy.summary}
                    </span>
                  </summary>
                  <TextAreaField
                    label={copy.summaryLabel}
                    value={summary}
                    onChange={setSummary}
                    placeholder={copy.summaryPlaceholder}
                  />
                </details>

                <details
                  className="space-y-4 border-t border-stone-200 pt-6"
                  aria-labelledby="experience-heading"
                >
                  <summary className="cursor-pointer">
                    <span
                      id="experience-heading"
                      role="heading"
                      aria-level={2}
                      className="text-lg font-semibold"
                    >
                      {copy.workExperience}
                    </span>
                  </summary>
                  <p className="text-xs text-stone-500">{copy.sortedByDate}</p>
                  {workExperience.map((entry, index) => (
                    <div
                      key={index}
                      className="space-y-4 rounded-md border border-stone-200 bg-white/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-stone-700">
                          {copy.position.replace("{number}", String(index + 1))}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeEntry(setWorkExperience, index)}
                          className="text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-900"
                        >
                          {copy.remove}
                        </button>
                      </div>
                      <TextField
                        label={copy.jobTitle}
                        value={entry.jobTitle}
                        onChange={(value) =>
                          updateEntry(
                            setWorkExperience,
                            index,
                            "jobTitle",
                            value,
                          )
                        }
                        placeholder={copy.jobTitle}
                      />
                      <TextField
                        label={copy.employer}
                        value={entry.employer}
                        onChange={(value) =>
                          updateEntry(
                            setWorkExperience,
                            index,
                            "employer",
                            value,
                          )
                        }
                        placeholder={copy.employer}
                      />
                      <TextField
                        label={copy.city}
                        value={entry.city}
                        onChange={(value) =>
                          updateEntry(setWorkExperience, index, "city", value)
                        }
                        placeholder={copy.city}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          label={copy.startDate}
                          type="date"
                          value={entry.startDate}
                          onChange={(value) =>
                            updateEntry(
                              setWorkExperience,
                              index,
                              "startDate",
                              value,
                            )
                          }
                        />
                        <TextField
                          label={copy.endDate}
                          type="date"
                          value={entry.endDate}
                          onChange={(value) =>
                            updateEntry(
                              setWorkExperience,
                              index,
                              "endDate",
                              value,
                            )
                          }
                        />
                      </div>
                      <TextAreaField
                        label={copy.responsibilities}
                        value={entry.description}
                        onChange={(value) =>
                          updateEntry(
                            setWorkExperience,
                            index,
                            "description",
                            value,
                          )
                        }
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      addEntry(setWorkExperience, {
                        jobTitle: "",
                        employer: "",
                        city: "",
                        startDate: "",
                        endDate: "",
                        description: "",
                      })
                    }
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
                  >
                    {copy.addWorkExperience}
                  </button>
                </details>

                <details
                  className="space-y-4 border-t border-stone-200 pt-6"
                  aria-labelledby="education-heading"
                >
                  <summary className="cursor-pointer">
                    <span
                      id="education-heading"
                      role="heading"
                      aria-level={2}
                      className="text-lg font-semibold"
                    >
                      {copy.education}
                    </span>
                  </summary>
                  <p className="text-xs text-stone-500">{copy.sortedByDate}</p>
                  {education.map((entry, index) => (
                    <div
                      key={index}
                      className="space-y-4 rounded-md border border-stone-200 bg-white/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-stone-700">
                          {copy.educationEntry.replace(
                            "{number}",
                            String(index + 1),
                          )}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeEntry(setEducation, index)}
                          className="text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-900"
                        >
                          {copy.remove}
                        </button>
                      </div>
                      <TextField
                        label={copy.school}
                        value={entry.institution}
                        onChange={(value) =>
                          updateEntry(setEducation, index, "institution", value)
                        }
                      />
                      <TextField
                        label={copy.degree}
                        value={entry.qualification}
                        onChange={(value) =>
                          updateEntry(
                            setEducation,
                            index,
                            "qualification",
                            value,
                          )
                        }
                      />
                      <TextField
                        label={copy.fieldOfStudy}
                        value={entry.fieldOfStudy}
                        onChange={(value) =>
                          updateEntry(
                            setEducation,
                            index,
                            "fieldOfStudy",
                            value,
                          )
                        }
                      />
                      <TextField
                        label={copy.city}
                        value={entry.city}
                        onChange={(value) =>
                          updateEntry(setEducation, index, "city", value)
                        }
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          label={copy.startDate}
                          type="date"
                          value={entry.startDate}
                          onChange={(value) =>
                            updateEntry(setEducation, index, "startDate", value)
                          }
                        />
                        <TextField
                          label={copy.endDate}
                          type="date"
                          value={entry.endDate}
                          onChange={(value) =>
                            updateEntry(setEducation, index, "endDate", value)
                          }
                        />
                      </div>
                      <TextAreaField
                        label={copy.details}
                        value={entry.description}
                        onChange={(value) =>
                          updateEntry(setEducation, index, "description", value)
                        }
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      addEntry(setEducation, {
                        institution: "",
                        qualification: "",
                        fieldOfStudy: "",
                        city: "",
                        startDate: "",
                        endDate: "",
                        description: "",
                      })
                    }
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
                  >
                    {copy.addEducation}
                  </button>
                </details>

                <details
                  className="space-y-4 border-t border-stone-200 pt-6"
                  aria-labelledby="skills-heading"
                >
                  <summary className="cursor-pointer">
                    <span
                      id="skills-heading"
                      role="heading"
                      aria-level={2}
                      className="text-lg font-semibold"
                    >
                      {copy.skills}
                    </span>
                  </summary>
                  <TextAreaField
                    label={copy.skills}
                    value={skills}
                    onChange={setSkills}
                    placeholder={copy.skillsPlaceholder}
                  />
                </details>

                <details
                  className="space-y-4 border-t border-stone-200 pt-6"
                  aria-labelledby="languages-heading"
                >
                  <summary className="cursor-pointer">
                    <span
                      id="languages-heading"
                      role="heading"
                      aria-level={2}
                      className="text-lg font-semibold"
                    >
                      {copy.languages}
                    </span>
                  </summary>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleLanguageDragEnd}
                  >
                    <SortableContext
                      items={languages.map((entry) => entry.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {languages.map((entry, index) => (
                          <SortableLanguageEntry
                            key={entry.id}
                            entry={entry}
                            index={index}
                            setLanguages={setLanguages}
                            copy={copy}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <button
                    type="button"
                    onClick={() =>
                      addEntry<LanguageEntry>(setLanguages, {
                        id: crypto.randomUUID(),
                        language: "",
                        proficiency: "",
                      })
                    }
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
                  >
                    {copy.addLanguage}
                  </button>
                </details>

                <details
                  className="space-y-4 border-t border-stone-200 pt-6"
                  aria-labelledby="projects-heading"
                >
                  <summary className="cursor-pointer">
                    <span
                      id="projects-heading"
                      role="heading"
                      aria-level={2}
                      className="text-lg font-semibold"
                    >
                      {copy.projects}
                    </span>
                  </summary>
                  <p className="text-xs text-stone-500">{copy.sortedByDate}</p>
                  {projects.map((entry, index) => (
                    <div
                      key={index}
                      className="space-y-4 rounded-md border border-stone-200 bg-white/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-stone-700">
                          {copy.project.replace("{number}", String(index + 1))}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeEntry(setProjects, index)}
                          className="text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-900"
                        >
                          {copy.remove}
                        </button>
                      </div>
                      <TextField
                        label={copy.projectName}
                        value={entry.name}
                        onChange={(value) =>
                          updateEntry(setProjects, index, "name", value)
                        }
                      />
                      <TextField
                        label={copy.yourRole}
                        value={entry.role}
                        onChange={(value) =>
                          updateEntry(setProjects, index, "role", value)
                        }
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          label={copy.startDate}
                          type="date"
                          value={entry.startDate}
                          onChange={(value) =>
                            updateEntry(setProjects, index, "startDate", value)
                          }
                        />
                        <TextField
                          label={copy.endDate}
                          type="date"
                          value={entry.endDate}
                          onChange={(value) =>
                            updateEntry(setProjects, index, "endDate", value)
                          }
                        />
                      </div>
                      <TextField
                        label={copy.projectUrl}
                        value={entry.url}
                        onChange={(value) =>
                          updateEntry(setProjects, index, "url", value)
                        }
                        placeholder="https://example.com"
                      />
                      <TextAreaField
                        label={copy.shortDescription}
                        value={entry.description}
                        onChange={(value) =>
                          updateEntry(setProjects, index, "description", value)
                        }
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      addEntry<ProjectEntry>(setProjects, {
                        name: "",
                        role: "",
                        startDate: "",
                        endDate: "",
                        url: "",
                        description: "",
                      })
                    }
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
                  >
                    {copy.addProject}
                  </button>
                </details>

                <details
                  className="space-y-4 border-t border-stone-200 pt-6"
                  aria-labelledby="courses-heading"
                >
                  <summary className="cursor-pointer">
                    <span
                      id="courses-heading"
                      role="heading"
                      aria-level={2}
                      className="text-lg font-semibold"
                    >
                      {copy.courses}
                    </span>
                  </summary>
                  <p className="text-xs text-stone-500">{copy.sortedByDate}</p>
                  {courses.map((entry, index) => (
                    <div
                      key={index}
                      className="space-y-4 rounded-md border border-stone-200 bg-white/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-stone-700">
                          {copy.course.replace("{number}", String(index + 1))}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeEntry(setCourses, index)}
                          className="text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-900"
                        >
                          {copy.remove}
                        </button>
                      </div>
                      <TextField
                        label={copy.courseName}
                        value={entry.name}
                        onChange={(value) =>
                          updateEntry(setCourses, index, "name", value)
                        }
                      />
                      <TextField
                        label={copy.provider}
                        value={entry.provider}
                        onChange={(value) =>
                          updateEntry(setCourses, index, "provider", value)
                        }
                      />
                      <TextField
                        label={copy.completionDate}
                        type="date"
                        value={entry.completionDate}
                        onChange={(value) =>
                          updateEntry(
                            setCourses,
                            index,
                            "completionDate",
                            value,
                          )
                        }
                      />
                      <TextAreaField
                        label={copy.shortDescription}
                        value={entry.description}
                        onChange={(value) =>
                          updateEntry(setCourses, index, "description", value)
                        }
                        placeholder={copy.coursePlaceholder}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      addEntry(setCourses, {
                        name: "",
                        provider: "",
                        completionDate: "",
                        description: "",
                      })
                    }
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
                  >
                    {copy.addCourse}
                  </button>
                </details>

                <details
                  className="space-y-4 border-t border-stone-200 pt-6"
                  aria-labelledby="interests-heading"
                >
                  <summary className="cursor-pointer">
                    <span
                      id="interests-heading"
                      role="heading"
                      aria-level={2}
                      className="text-lg font-semibold"
                    >
                      {copy.interests}
                    </span>
                  </summary>
                  <TextAreaField
                    label={copy.interests}
                    value={interests}
                    onChange={setInterests}
                    placeholder={copy.interestsPlaceholder}
                  />
                </details>

                <details
                  className="space-y-4 border-t border-stone-200 pt-6"
                  aria-labelledby="consent-heading"
                >
                  <summary className="cursor-pointer">
                    <span
                      id="consent-heading"
                      role="heading"
                      aria-level={2}
                      className="text-lg font-semibold"
                    >
                      {copy.consent}
                    </span>
                  </summary>
                  <p className="text-sm text-stone-600">
                    {copy.consentDescription}
                  </p>
                  <TextAreaField
                    label={copy.consentStatement}
                    value={dataProcessingConsent}
                    onChange={setDataProcessingConsent}
                    placeholder={copy.consentPlaceholder}
                  />
                </details>

                <footer className="flex justify-end border-t border-stone-300 pt-5">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-5 text-sm font-semibold text-stone-700 transition hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
                  >
                    {copy.back}
                  </button>
                </footer>
              </div>
            )}
          </div>
        </aside>
        <button
          type="button"
          aria-label={
            isEditorCollapsed
              ? "Show personal details form"
              : "Hide personal details form"
          }
          aria-expanded={!isEditorCollapsed}
          aria-controls="personal-details-panel"
          title={
            isEditorCollapsed
              ? "Show personal details"
              : "Hide personal details"
          }
          onClick={() => setIsEditorCollapsed(!isEditorCollapsed)}
          className="absolute right-0 top-1/2 z-10 flex h-14 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-r-md border border-stone-300 bg-white text-2xl leading-none text-teal-900 shadow-md transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
        >
          <img
            src={hideInfoIcon}
            alt=""
            aria-hidden="true"
            className={`h-6 w-6 object-contain opacity-70 transition-transform duration-300 ${
              isEditorCollapsed ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>
      </div>
      {isCropperOpen && cropImageUrl
        ? createPortal(
            <div
              className="fixed inset-0 z-100 flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-md"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeCropper();
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="crop-dialog-title"
                className="w-full max-w-xl rounded-md bg-white p-5 shadow-2xl sm:p-6"
              >
                <header className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2
                      id="crop-dialog-title"
                      className="text-xl font-semibold text-stone-900"
                    >
                      {copy.cropTitle}
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">
                      {copy.cropInstructions}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCropper}
                    disabled={isProcessingImage}
                    aria-label={copy.closeCrop}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"
                  >
                    ×
                  </button>
                </header>

                <div className="relative h-[min(58vh,26rem)] min-h-64 w-full overflow-hidden rounded-md bg-stone-950">
                  <Cropper
                    image={cropImageUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={photoShape === "circle" ? 1 : 4 / 5}
                    cropShape={photoShape === "circle" ? "round" : "rect"}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_, areaPixels) =>
                      setCroppedAreaPixels(areaPixels)
                    }
                  />
                </div>

                <label className="mt-5 block text-sm font-medium text-stone-700">
                  {copy.zoom}
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    className="mt-3 block w-full accent-teal-800"
                  />
                </label>

                {imageError && (
                  <p className="mt-3 text-sm text-red-700" role="alert">
                    {imageError}
                  </p>
                )}

                <footer className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeCropper}
                    disabled={isProcessingImage}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
                  >
                    {copy.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    disabled={!croppedAreaPixels || isProcessingImage}
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal-800 px-5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isProcessingImage ? copy.processing : copy.usePhoto}
                  </button>
                </footer>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default AllData;
