import {
  App,
  MarkdownView,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  type MarkdownPostProcessorContext
} from "obsidian";
import { BoundedStringCache } from "./bounded-cache";
import {
  CODE_BLOCK_LANGUAGES,
  PRONUNCIATION_CODE_BLOCK_SELECTOR,
  codeBlockClass
} from "./chinese-code-block";
import {
  CHINESE_MARKER_CLASS,
  type GuideMarkerClass,
  GUIDE_MARKER_CLASSES,
  GUIDE_MARKER_SELECTOR,
  CHINESE_PINYIN_MARKER_CLASS,
  CHINESE_PINYIN_MARKER_SELECTOR,
  KOREAN_MARKER_CLASS,
  KOREAN_ROM_MARKER_CLASS,
  KOREAN_ROM_MARKER_SELECTOR,
  SPAN_CLOSING,
  extractMarkerContents,
  markerSpanOpening,
  pronunciationKind,
  type PronunciationKind
} from "./marker";
import { collectContiguousHanziRuns, type HanziTextSegment } from "./hanzi-runs";
import { unwrapCompleteMarker, wrapSelection } from "./selection";
import { createPinyinEngine } from "virtual:pinyin-engine";
import { createKoreanEngine } from "virtual:korean-engine";

const HANZI_PATTERN = /\p{Script=Han}+/gu;
const HANGUL_PATTERN = /[\uAC00-\uD7A3]+/gu;
const PINYIN_CACHE_CAPACITY = 256;
const SETTINGS_SAVE_DELAY = 250;

type PinyinFunction = (text: string, options: { toneType: "symbol" }) => string;
type PinyinConverter = (text: string) => string;
type KoreanConverter = (text: string) => string;
type PinyinAnnotations = Map<Text, Map<number, string>>;

interface BigCharactersSettings {
  showPinyinInLivePreview: boolean;
  showPinyinInReadingView: boolean;
  characterSize: number;
  characterBottomSpacing: number;
  characterFont: string;
  pinyinSize: number;
  rubyTopSpacing: number;
  pinyinFont: string;
}

const DEFAULT_SETTINGS: BigCharactersSettings = {
  showPinyinInLivePreview: true,
  showPinyinInReadingView: true,
  characterSize: 2.5,
  characterBottomSpacing: 0.3,
  characterFont: '"Kaiti SC", "STKaiti", "KaiTi", serif',
  pinyinSize: 0.35,
  rubyTopSpacing: 0.1,
  pinyinFont: 'sans-serif'
};

function markerSelector(scope: string): string {
  return [
    `${scope} ${CHINESE_PINYIN_MARKER_SELECTOR}`,
    `${scope} ${KOREAN_ROM_MARKER_SELECTOR}`,
    `${scope} .bc-code-block.${CHINESE_PINYIN_MARKER_CLASS}`,
    `${scope} .bc-code-block.${KOREAN_ROM_MARKER_CLASS}`
  ].join(", ");
}

function hasHanzi(text: string): boolean {
  return /\p{Script=Han}/u.test(text);
}

function hasHangul(text: string): boolean {
  return /[\uAC00-\uD7A3]/u.test(text);
}

function appendPinyinRubyText(
  parent: HTMLElement,
  text: string,
  toPinyin: PinyinConverter,
  annotations?: Map<number, string>
): void {
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  HANZI_PATTERN.lastIndex = 0;

  for (let match = HANZI_PATTERN.exec(text); match; match = HANZI_PATTERN.exec(text)) {
    if (match.index > lastIndex) {
      fragment.append(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const hanzi = match[0];
    const ruby = document.createElement("ruby");
    ruby.className = "bc-ruby";

    // One base+rt pair per character so native ruby centers each syllable over
    // its own character. Prefer the annotations calculated across adjacent
    // formatted text; otherwise convert this Hanzi run directly.
    const chars = [...hanzi];
    let offset = match.index;
    const contextualSyllables = chars.map((char) => {
      const syllable = annotations?.get(offset);
      offset += char.length;
      return syllable;
    });
    const hasContextualSyllables = contextualSyllables.every(
      (syllable): syllable is string => syllable !== undefined
    );
    const syllables = hasContextualSyllables
      ? contextualSyllables
      : toPinyin(hanzi).split(/\s+/u).filter(Boolean);
    const pairs = syllables.length === chars.length
      ? chars.map((char, index) => [char, syllables[index]] as const)
      : [[hanzi, syllables.join(" ")] as const];

    for (const [char, syllable] of pairs) {
      const base = document.createElement("span");
      base.className = "bc-base";
      base.textContent = char;

      const annotation = document.createElement("rt");
      annotation.textContent = syllable;

      ruby.append(base, annotation);
    }
    fragment.append(ruby);
    lastIndex = match.index + hanzi.length;
  }

  if (lastIndex < text.length) {
    fragment.append(document.createTextNode(text.slice(lastIndex)));
  }

  parent.append(fragment);
}

function appendKoreanRubyText(
  parent: HTMLElement,
  text: string,
  toRomanization: KoreanConverter
): void {
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  HANGUL_PATTERN.lastIndex = 0;

  for (let match = HANGUL_PATTERN.exec(text); match; match = HANGUL_PATTERN.exec(text)) {
    if (match.index > lastIndex) {
      fragment.append(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const ruby = document.createElement("ruby");
    ruby.className = "bc-ruby";

    const base = document.createElement("span");
    base.className = "bc-base";
    base.textContent = match[0];

    const annotation = document.createElement("rt");
    annotation.textContent = toRomanization(match[0]);

    ruby.append(base, annotation);
    fragment.append(ruby);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    fragment.append(document.createTextNode(text.slice(lastIndex)));
  }

  parent.append(fragment);
}

function contextualPinyinAnnotations(
  segments: readonly HanziTextSegment<Text>[],
  toPinyin: PinyinConverter
): PinyinAnnotations {
  const annotations: PinyinAnnotations = new Map();

  for (const run of collectContiguousHanziRuns(segments)) {
    const chars = [...run.text];
    const syllables = toPinyin(run.text).split(/\s+/u).filter(Boolean);
    if (syllables.length !== chars.length) continue;

    let syllableIndex = 0;
    for (const part of run.parts) {
      const nodeAnnotations = annotations.get(part.item) ?? new Map<number, string>();
      let offset = part.start;
      for (const char of part.text) {
        nodeAnnotations.set(offset, syllables[syllableIndex]);
        offset += char.length;
        syllableIndex += 1;
      }
      annotations.set(part.item, nodeAnnotations);
    }
  }

  return annotations;
}

function findEmphasisClosing(text: string, marker: string, from: number): number {
  let closing = text.indexOf(marker, from);
  while (closing !== -1 && !/\S/u.test(text[closing - 1] ?? "")) {
    closing = text.indexOf(marker, closing + marker.length);
  }
  return closing;
}

function appendLivePreviewEmphasis(parent: HTMLElement, text: string): void {
  const markerPattern = /\*{1,3}(?=\S)/g;
  let cursor = 0;

  while (cursor < text.length) {
    markerPattern.lastIndex = cursor;
    const opening = markerPattern.exec(text);
    if (!opening) {
      parent.append(document.createTextNode(text.slice(cursor)));
      return;
    }

    const marker = opening[0];
    const contentStart = opening.index + marker.length;
    const closing = findEmphasisClosing(text, marker, contentStart);
    if (closing === -1) {
      parent.append(document.createTextNode(text.slice(cursor)));
      return;
    }

    if (opening.index > cursor) {
      parent.append(document.createTextNode(text.slice(cursor, opening.index)));
    }

    const content = text.slice(contentStart, closing);
    if (marker === "*") {
      const italic = document.createElement("em");
      appendLivePreviewEmphasis(italic, content);
      parent.append(italic);
    } else if (marker === "**") {
      const bold = document.createElement("strong");
      appendLivePreviewEmphasis(bold, content);
      parent.append(bold);
    } else {
      const bold = document.createElement("strong");
      const italic = document.createElement("em");
      appendLivePreviewEmphasis(italic, content);
      bold.append(italic);
      parent.append(bold);
    }

    cursor = closing + marker.length;
  }
}

function renderLivePreviewEmphasis(element: HTMLElement): void {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (
        !/[\*]{1,3}/u.test(node.textContent ?? "") ||
        parent?.closest("code, pre, rt, ruby, script, style")
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    textNodes.push(node as Text);
  }

  for (const textNode of textNodes) {
    const wrapper = document.createElement("span");
    appendLivePreviewEmphasis(wrapper, textNode.textContent ?? "");
    textNode.replaceWith(...Array.from(wrapper.childNodes));
  }
}

async function renderPronunciation(
  element: HTMLElement,
  kind: PronunciationKind,
  getConverter: () => Promise<PinyinConverter | KoreanConverter>,
  shouldRender: () => boolean
): Promise<void> {
  if (
    element.dataset.bcPronunciationProcessed === kind ||
    element.dataset.bcPronunciationLoading === kind ||
    !shouldRender() ||
    !(kind === "pinyin" ? hasHanzi(element.textContent ?? "") : hasHangul(element.textContent ?? ""))
  ) {
    return;
  }

  element.dataset.bcPronunciationLoading = kind;
  try {
    const converter = await getConverter();
    // Note: don't bail on !element.isConnected here. Reading View post-processes
    // sections while still detached; once the engine is cached getConverter resolves
    // before attach, and skipping would leave scroll-loaded sections without ruby.
    if (!shouldRender()) return;
    renderLivePreviewEmphasis(element);

    const textNodes: Text[] = [];
    const segments: HanziTextSegment<Text>[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const textNode = node as Text;
      const text = textNode.textContent ?? "";
      const eligible =
        Boolean(text) &&
        (kind === "pinyin" ? hasHanzi(text) : hasHangul(text)) &&
        !textNode.parentElement?.closest("rt, code, pre, script, style");
      if (kind === "pinyin") segments.push({ item: textNode, text, eligible });
      if (eligible) textNodes.push(textNode);
    }
    const annotations = kind === "pinyin"
      ? contextualPinyinAnnotations(segments, converter as PinyinConverter)
      : undefined;

    for (const textNode of textNodes) {
      const wrapper = document.createElement("span");
      if (kind === "pinyin") {
        appendPinyinRubyText(
          wrapper,
          textNode.textContent ?? "",
          converter as PinyinConverter,
          annotations?.get(textNode)
        );
      } else {
        appendKoreanRubyText(wrapper, textNode.textContent ?? "", converter as KoreanConverter);
      }
      textNode.replaceWith(...Array.from(wrapper.childNodes));
    }

    element.dataset.bcPronunciationProcessed = kind;
  } catch {
    // The original text remains readable if the local engine cannot load.
  } finally {
    delete element.dataset.bcPronunciationLoading;
  }
}

function removePronunciation(element: HTMLElement): void {
  for (const ruby of element.querySelectorAll<HTMLElement>("ruby.bc-ruby")) {
    const bases = Array.from(ruby.children).filter((child) =>
      child.classList.contains("bc-base")
    );
    ruby.replaceWith(...bases.flatMap((base) => Array.from(base.childNodes)));
  }
  delete element.dataset.bcPronunciationProcessed;
  delete element.dataset.bcPronunciationLoading;
  delete element.dataset.bcPinyinProcessed;
  delete element.dataset.bcPinyinLoading;
}

export default class BigCharactersPlugin extends Plugin {
  settings: BigCharactersSettings = DEFAULT_SETTINGS;
  private readonly pronunciationCache = new BoundedStringCache(PINYIN_CACHE_CAPACITY);
  private pinyinEnginePromise: Promise<PinyinFunction> | null = null;
  private pinyinLoadFailed = false;
  private koreanEnginePromise: Promise<KoreanConverter> | null = null;
  private koreanLoadFailed = false;
  private settingsSaveTimer: number | null = null;
  private readonly livePreviewObservers = new Map<HTMLElement, MutationObserver>();
  private readonly livePreviewRenderTimers = new Map<HTMLElement, number>();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.applySettings();
    this.addSettingTab(new BigCharactersSettingTab(this.app, this));
    this.register(() => {
      this.clearSettingsStyle();
      this.disconnectLivePreviewObservers();
      this.flushSettingsSave();
    });

    this.addCommand({
      id: "wrap-selection-as-chinese-pinyin",
      name: "Toggle selection as Chinese pinyin",
      editorCallback: (editor) => this.toggleSelection(editor, CHINESE_PINYIN_MARKER_CLASS)
    });
    this.addCommand({
      id: "wrap-selection-as-chinese",
      name: "Toggle selection as Chinese",
      editorCallback: (editor) => this.toggleSelection(editor, CHINESE_MARKER_CLASS)
    });
    this.addCommand({
      id: "wrap-selection-as-korean-romanization",
      name: "Toggle selection as Korean romanization",
      editorCallback: (editor) => this.toggleSelection(editor, KOREAN_ROM_MARKER_CLASS)
    });
    this.addCommand({
      id: "wrap-selection-as-korean",
      name: "Toggle selection as Korean",
      editorCallback: (editor) => this.toggleSelection(editor, KOREAN_MARKER_CLASS)
    });

    this.registerMarkdownPostProcessor((element, context) => {
      void this.processReadingSection(element, context);
    });
    for (const language of CODE_BLOCK_LANGUAGES) {
      this.registerMarkdownCodeBlockProcessor(language, (source, element) =>
        this.renderCodeBlock(element, source, codeBlockClass(language))
      );
    }

    this.app.workspace.onLayoutReady(() => {
      this.refreshLivePreviewObservers();
      this.registerEvent(
        this.app.workspace.on("layout-change", () => this.refreshLivePreviewObservers())
      );
      this.refreshRenderedPronunciation();
    });
  }

  updateSettings(settings: Partial<BigCharactersSettings>): void {
    const visibilityChanged =
      (settings.showPinyinInLivePreview !== undefined &&
        settings.showPinyinInLivePreview !== this.settings.showPinyinInLivePreview) ||
      (settings.showPinyinInReadingView !== undefined &&
        settings.showPinyinInReadingView !== this.settings.showPinyinInReadingView);

    this.settings = { ...this.settings, ...settings };
    this.applySettings();
    this.scheduleSettingsSave();
    if (visibilityChanged) this.refreshRenderedPronunciation();
  }

  private async loadSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.loadData())
    };
  }

  private applySettings(): void {
    const style = document.documentElement.style;
    style.setProperty("--bc-character-size", `${this.settings.characterSize}em`);
    style.setProperty("--bc-character-bottom-spacing", `${this.settings.characterBottomSpacing}em`);
    style.setProperty("--bc-character-font", this.settings.characterFont);
    style.setProperty("--bc-annotation-size", `${this.settings.pinyinSize}em`);
    style.setProperty("--bc-ruby-top-spacing", `${this.settings.rubyTopSpacing}em`);
    style.setProperty("--bc-annotation-font", this.settings.pinyinFont);
  }

  private clearSettingsStyle(): void {
    const style = document.documentElement.style;
    style.removeProperty("--bc-character-size");
    style.removeProperty("--bc-character-bottom-spacing");
    style.removeProperty("--bc-character-font");
    style.removeProperty("--bc-annotation-size");
    style.removeProperty("--bc-ruby-top-spacing");
    style.removeProperty("--bc-annotation-font");
  }

  private scheduleSettingsSave(): void {
    if (this.settingsSaveTimer !== null) window.clearTimeout(this.settingsSaveTimer);
    this.settingsSaveTimer = window.setTimeout(() => {
      this.settingsSaveTimer = null;
      void this.saveData(this.settings);
    }, SETTINGS_SAVE_DELAY);
  }

  private flushSettingsSave(): void {
    if (this.settingsSaveTimer === null) return;
    window.clearTimeout(this.settingsSaveTimer);
    this.settingsSaveTimer = null;
    void this.saveData(this.settings);
  }

  private async getPinyinConverter(): Promise<PinyinConverter> {
    const pinyin = await this.loadPinyinEngine();
    return (text) => {
      const cacheKey = `pinyin:${text}`;
      const cached = this.pronunciationCache.get(cacheKey);
      if (cached !== undefined) return cached;

      const pronunciation = pinyin(text, { toneType: "symbol" });
      this.pronunciationCache.set(cacheKey, pronunciation);
      return pronunciation;
    };
  }

  private async getKoreanConverter(): Promise<KoreanConverter> {
    const romanize = await this.loadKoreanEngine();
    return (text) => {
      const cacheKey = `rom:${text}`;
      const cached = this.pronunciationCache.get(cacheKey);
      if (cached !== undefined) return cached;

      const pronunciation = romanize(text);
      this.pronunciationCache.set(cacheKey, pronunciation);
      return pronunciation;
    };
  }

  private loadPinyinEngine(): Promise<PinyinFunction> {
    if (this.pinyinLoadFailed) {
      return Promise.reject(new Error("The local pinyin engine could not be loaded."));
    }
    if (this.pinyinEnginePromise) return this.pinyinEnginePromise;

    this.pinyinEnginePromise = Promise.resolve()
      .then(() => createPinyinEngine())
      .catch((error: unknown) => {
      this.pinyinLoadFailed = true;
      this.pinyinEnginePromise = null;
      new Notice("Big Characters could not start its local pinyin engine.");
      throw error;
      });

    return this.pinyinEnginePromise;
  }

  private loadKoreanEngine(): Promise<KoreanConverter> {
    if (this.koreanLoadFailed) {
      return Promise.reject(new Error("The local Korean romanization engine could not be loaded."));
    }
    if (this.koreanEnginePromise) return this.koreanEnginePromise;

    this.koreanEnginePromise = Promise.resolve()
      .then(() => createKoreanEngine())
      .catch((error: unknown) => {
        this.koreanLoadFailed = true;
        this.koreanEnginePromise = null;
        new Notice("Big Characters could not start its local Korean romanization engine.");
        throw error;
      });

    return this.koreanEnginePromise;
  }

  private toggleSelection(
    editor: {
      getCursor(which?: "from" | "to"): { line: number; ch: number };
      getLine(line: number): string;
      getSelection(): string;
      replaceRange(
        replacement: string,
        from: { line: number; ch: number },
        to?: { line: number; ch: number }
      ): void;
      replaceSelection(replacement: string): void;
    },
    markerClass: GuideMarkerClass
  ): void {
    const selection = editor.getSelection();
    if (!selection) {
      new Notice("Select text first.");
      return;
    }

    const unwrappedSelection = unwrapCompleteMarker(selection, markerClass);
    if (unwrappedSelection !== null) {
      editor.replaceSelection(unwrappedSelection);
      return;
    }

    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    if (from.line === to.line) {
      const line = editor.getLine(from.line);
      const before = line.slice(0, from.ch);
      const after = line.slice(to.ch);
      const opening = markerSpanOpening(markerClass);
      if (before.endsWith(opening) && after.startsWith(SPAN_CLOSING)) {
        editor.replaceRange(
          selection,
          { line: from.line, ch: from.ch - opening.length },
          { line: to.line, ch: to.ch + SPAN_CLOSING.length }
        );
        return;
      }
    }

    editor.replaceSelection(wrapSelection(selection, markerClass));
  }

  private processReadingSection(
    element: HTMLElement,
    context: MarkdownPostProcessorContext
  ): void {
    const markers = this.guideMarkers(element);
    if (!markers.length) return;

    // Reading View renders the marker's inner Markdown through its own parser,
    // which mangles emphasis next to CJK (e.g. `**荷兰***要*`). Re-render each
    // marker from the original source with the same parser Live Preview uses.
    // getSectionInfo().text is the whole note; slice out this section's lines.
    const section = context.getSectionInfo(element);
    const sources = section
      ? extractMarkerContents(
          section.text.split("\n").slice(section.lineStart, section.lineEnd + 1).join("\n")
        )
      : [];
    const bySource = sources.length === markers.length;

    markers.forEach((marker, index) => {
      const markerClass = GUIDE_MARKER_CLASSES.find((className) => marker.classList.contains(className));
      if (!markerClass) return;
      // Prefer the original source; fall back to the marker's existing content
      // when the source can't be recovered (e.g. getSectionInfo unavailable).
      const source = bySource && sources[index].markerClass === markerClass ? sources[index] : null;
      this.renderReadingMarker(marker, source?.content ?? null, pronunciationKind(markerClass));
    });
  }

  private renderReadingMarker(
    marker: HTMLElement,
    content: string | null,
    kind: PronunciationKind | null
  ): void {
    if (content !== null) {
      const wrapper = document.createElement("span");
      appendLivePreviewEmphasis(wrapper, content);
      delete marker.dataset.bcPronunciationProcessed;
      delete marker.dataset.bcPinyinProcessed;
      marker.replaceChildren(...Array.from(wrapper.childNodes));
    } else {
      renderLivePreviewEmphasis(marker);
    }
    if (kind && this.settings.showPinyinInReadingView) {
      void this.renderMarker(marker, kind, () => this.settings.showPinyinInReadingView);
    }
  }

  private renderCodeBlock(
    element: HTMLElement,
    source: string,
    markerClass: GuideMarkerClass
  ): void {
    element.classList.add("bc-code-block", markerClass);
    element.replaceChildren(document.createTextNode(source));
    const kind = pronunciationKind(markerClass);
    if (kind && this.settings.showPinyinInReadingView) {
      void this.renderMarker(element, kind, () => this.settings.showPinyinInReadingView);
    }
  }

  private guideMarkers(element: HTMLElement): HTMLElement[] {
    return [
      ...(element.matches(GUIDE_MARKER_SELECTOR) ? [element] : []),
      ...element.querySelectorAll<HTMLElement>(GUIDE_MARKER_SELECTOR)
    ];
  }

  private renderMarker(
    element: HTMLElement,
    kind: PronunciationKind,
    shouldRender: () => boolean
  ): Promise<void> {
    return renderPronunciation(
      element,
      kind,
      kind === "pinyin" ? () => this.getPinyinConverter() : () => this.getKoreanConverter(),
      shouldRender
    );
  }

  private refreshRenderedPronunciation(): void {
    for (const marker of document.querySelectorAll<HTMLElement>(
      `${markerSelector(".markdown-preview-view")}, ${markerSelector(".markdown-reading-view")}`
    )) {
      const markerClass = GUIDE_MARKER_CLASSES.find((className) => marker.classList.contains(className));
      if (!markerClass) continue;
      const kind = pronunciationKind(markerClass);
      if (!kind) continue;
      if (this.settings.showPinyinInReadingView) {
        void this.renderMarker(marker, kind, () => this.settings.showPinyinInReadingView);
      } else {
        removePronunciation(marker);
      }
    }

    for (const root of this.livePreviewObservers.keys()) {
      this.scheduleLivePreviewRender(root);
    }
  }

  private refreshLivePreviewObservers(): void {
    const roots = new Set<HTMLElement>();
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (!(leaf.view instanceof MarkdownView) || leaf.view.getMode() !== "source") continue;
      const root = this.findLivePreviewRoot(leaf.view);
      if (!root) continue;

      roots.add(root);
      if (this.livePreviewObservers.has(root)) continue;

      const observer = new MutationObserver((records) => {
        if (this.mutationMayAffectMarker(records)) this.scheduleLivePreviewRender(root);
      });
      observer.observe(root, {
        attributes: true,
        attributeFilter: ["class"],
        characterData: true,
        childList: true,
        subtree: true
      });
      this.livePreviewObservers.set(root, observer);
      this.scheduleLivePreviewRender(root);
    }

    for (const [root, observer] of this.livePreviewObservers) {
      if (roots.has(root)) continue;
      observer.disconnect();
      this.livePreviewObservers.delete(root);
      const timer = this.livePreviewRenderTimers.get(root);
      if (timer !== undefined) window.clearTimeout(timer);
      this.livePreviewRenderTimers.delete(root);
    }
  }

  private findLivePreviewRoot(view: MarkdownView): HTMLElement | null {
    if (view.containerEl.matches(".markdown-source-view.mod-cm6")) return view.containerEl;
    return view.containerEl.querySelector<HTMLElement>(".markdown-source-view.mod-cm6");
  }

  private mutationMayAffectMarker(records: MutationRecord[]): boolean {
    return records.some((record) => {
      if (this.nodeMayContainMarker(record.target)) return true;
      return Array.from(record.addedNodes).some((node) => this.nodeMayContainMarker(node));
    });
  }

  private nodeMayContainMarker(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.parentElement ? this.nodeMayContainMarker(node.parentElement) : false;
    }
    if (!(node instanceof Element)) return false;

    const line = node.closest(".cm-line");
    if (line) {
      return (
        line.matches(GUIDE_MARKER_SELECTOR) ||
        line.querySelector(GUIDE_MARKER_SELECTOR) !== null ||
        GUIDE_MARKER_CLASSES.some((className) => line.textContent?.includes(className) === true)
      );
    }

    return (
      node.matches(GUIDE_MARKER_SELECTOR) ||
      node.closest(GUIDE_MARKER_SELECTOR) !== null
    );
  }

  private scheduleLivePreviewRender(root: HTMLElement): void {
    if (!this.livePreviewObservers.has(root) || this.livePreviewRenderTimers.has(root)) return;

    const timer = window.setTimeout(() => {
      this.livePreviewRenderTimers.delete(root);
      if (!this.livePreviewObservers.has(root)) return;
      this.renderLivePreviewRoot(root);
    }, 0);
    this.livePreviewRenderTimers.set(root, timer);
  }

  private renderLivePreviewRoot(root: HTMLElement): void {
    for (const marker of root.querySelectorAll<HTMLElement>(
      `${GUIDE_MARKER_SELECTOR}, ${PRONUNCIATION_CODE_BLOCK_SELECTOR}`
    )) {
      const isActiveLine = marker.closest(".cm-activeLine") !== null;
      const markerClass = GUIDE_MARKER_CLASSES.find((className) => marker.classList.contains(className));
      const kind = markerClass ? pronunciationKind(markerClass) : null;
      if (!kind) {
        if (!isActiveLine) renderLivePreviewEmphasis(marker);
      } else if (!this.settings.showPinyinInLivePreview || isActiveLine) {
        removePronunciation(marker);
      } else {
        void this.renderMarker(marker, kind, () => this.settings.showPinyinInLivePreview);
      }
    }
  }

  private disconnectLivePreviewObservers(): void {
    for (const observer of this.livePreviewObservers.values()) observer.disconnect();
    for (const timer of this.livePreviewRenderTimers.values()) window.clearTimeout(timer);
    this.livePreviewObservers.clear();
    this.livePreviewRenderTimers.clear();
  }
}

class BigCharactersSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: BigCharactersPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Show pronunciations in Live Preview")
      .setDesc("Show ruby pronunciations on rendered lines. The active line stays editable.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showPinyinInLivePreview)
          .onChange((value) => this.plugin.updateSettings({ showPinyinInLivePreview: value }))
      );

    new Setting(containerEl)
      .setName("Show pronunciations in Reading View")
      .setDesc("Show ruby pronunciations in Reading View.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showPinyinInReadingView)
          .onChange((value) => this.plugin.updateSettings({ showPinyinInReadingView: value }))
      );

    new Setting(containerEl)
      .setName("Character size")
      .setDesc("Size of marked characters, relative to the surrounding text.")
      .addSlider((slider) =>
        slider
          .setLimits(1, 5, 0.1)
          .setValue(this.plugin.settings.characterSize)
          .setDynamicTooltip()
          .onChange((value) => this.plugin.updateSettings({ characterSize: value }))
      );

    new Setting(containerEl)
      .setName("Character bottom spacing")
      .setDesc("Extra space below large characters, relative to their size.")
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.05)
          .setValue(this.plugin.settings.characterBottomSpacing)
          .setDynamicTooltip()
          .onChange((value) => this.plugin.updateSettings({ characterBottomSpacing: value }))
      );

    new Setting(containerEl)
      .setName("Character font")
      .setDesc("A font name or CSS font stack. Default: Kaiti SC.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.characterFont)
          .onChange((value) =>
            this.plugin.updateSettings({
              characterFont: value.trim() || DEFAULT_SETTINGS.characterFont
            })
          )
      );

    new Setting(containerEl)
      .setName("Pronunciation size")
      .setDesc("Size of pronunciations, relative to marked characters.")
      .addSlider((slider) =>
        slider
          .setLimits(0.15, 0.75, 0.05)
          .setValue(this.plugin.settings.pinyinSize)
          .setDynamicTooltip()
          .onChange((value) => this.plugin.updateSettings({ pinyinSize: value }))
      );

    new Setting(containerEl)
      .setName("Pronunciation top spacing")
      .setDesc("Extra space above pronunciations, relative to the character size.")
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.05)
          .setValue(this.plugin.settings.rubyTopSpacing)
          .setDynamicTooltip()
          .onChange((value) => this.plugin.updateSettings({ rubyTopSpacing: value }))
      );

    new Setting(containerEl)
      .setName("Pronunciation font")
      .setDesc("A font name or CSS font stack for pronunciation annotations.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.pinyinFont)
          .onChange((value) =>
            this.plugin.updateSettings({
              pinyinFont: value.trim() || DEFAULT_SETTINGS.pinyinFont
            })
          )
      );

    new Setting(containerEl)
      .setName("Restore default font settings")
      .setDesc("Restore the default character and pronunciation fonts and sizes.")
      .addButton((button) =>
        button.setButtonText("Restore defaults").onClick(() => {
          this.plugin.updateSettings({
            characterSize: DEFAULT_SETTINGS.characterSize,
            characterFont: DEFAULT_SETTINGS.characterFont,
            pinyinSize: DEFAULT_SETTINGS.pinyinSize,
            pinyinFont: DEFAULT_SETTINGS.pinyinFont
          });
          this.display();
        })
      );

    new Setting(containerEl)
      .setName("Set hotkeys to toggle selected text to large characters")
      .setDesc(
        "Assign shortcuts in Obsidian Settings → Hotkeys to toggle large characters and/or pronunciations."
      );
  }
}
