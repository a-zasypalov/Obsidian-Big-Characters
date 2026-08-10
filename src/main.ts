import {
  App,
  MarkdownRenderChild,
  MarkdownRenderer,
  MarkdownView,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  type MarkdownPostProcessorContext
} from "obsidian";
import { BoundedStringCache } from "./bounded-cache";
import {
  CHINESE_MARKER_CLASS,
  GUIDE_MARKER_SELECTOR,
  PINYIN_MARKER_CLASS,
  PINYIN_MARKER_SELECTOR,
  SPAN_CLOSING,
  PINYIN_SPAN_OPENING,
  protectGuideEmphasis,
  restoreMarkerSpans,
  transformMarkerSource
} from "./marker";
import { unwrapCompleteMarker, wrapSelection } from "./selection";
import { createPinyinEngine } from "virtual:pinyin-engine";

const HANZI_PATTERN = /\p{Script=Han}+/gu;
const PINYIN_CACHE_CAPACITY = 256;
const SETTINGS_SAVE_DELAY = 250;

type PinyinFunction = (text: string, options: { toneType: "symbol" }) => string;
type PinyinConverter = (text: string) => string;

interface HanziPinyinSettings {
  showPinyinInLivePreview: boolean;
  showPinyinInReadingView: boolean;
  characterSize: number;
  characterFont: string;
  pinyinSize: number;
  pinyinFont: string;
}

const DEFAULT_SETTINGS: HanziPinyinSettings = {
  showPinyinInLivePreview: true,
  showPinyinInReadingView: true,
  characterSize: 2.5,
  characterFont: '"Kaiti SC", "STKaiti", "KaiTi", serif',
  pinyinSize: 0.35,
  pinyinFont: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif'
};

function markerSelector(scope: string): string {
  return `${scope} ${PINYIN_MARKER_SELECTOR}`;
}

function hasHanzi(text: string): boolean {
  return /\p{Script=Han}/u.test(text);
}

function appendRubyText(parent: HTMLElement, text: string, toPinyin: PinyinConverter): void {
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  HANZI_PATTERN.lastIndex = 0;

  for (let match = HANZI_PATTERN.exec(text); match; match = HANZI_PATTERN.exec(text)) {
    if (match.index > lastIndex) {
      fragment.append(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const hanzi = match[0];
    const ruby = document.createElement("ruby");
    ruby.className = "cg-ruby";

    const base = document.createElement("span");
    base.className = "cg-base";
    base.textContent = hanzi;

    const annotation = document.createElement("rt");
    annotation.textContent = toPinyin(hanzi);

    ruby.append(base, annotation);
    fragment.append(ruby);
    lastIndex = match.index + hanzi.length;
  }

  if (lastIndex < text.length) {
    fragment.append(document.createTextNode(text.slice(lastIndex)));
  }

  parent.append(fragment);
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

async function renderHanziPinyin(
  element: HTMLElement,
  getPinyin: () => Promise<PinyinConverter>,
  shouldRender: () => boolean
): Promise<void> {
  if (
    element.dataset.cgPinyinProcessed === "true" ||
    element.dataset.cgPinyinLoading === "true" ||
    !shouldRender() ||
    !hasHanzi(element.textContent ?? "")
  ) {
    return;
  }

  element.dataset.cgPinyinLoading = "true";
  try {
    const toPinyin = await getPinyin();
    if (!element.isConnected || !shouldRender()) return;
    if (element.closest(".markdown-source-view.mod-cm6")) renderLivePreviewEmphasis(element);

    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (
          !node.textContent ||
          !hasHanzi(node.textContent) ||
          parent?.closest("rt, code, pre, script, style")
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
      appendRubyText(wrapper, textNode.textContent ?? "", toPinyin);
      textNode.replaceWith(...Array.from(wrapper.childNodes));
    }

    element.dataset.cgPinyinProcessed = "true";
  } catch {
    // The original Hanzi remains readable if the local engine cannot load.
  } finally {
    delete element.dataset.cgPinyinLoading;
  }
}

function removeHanziPinyin(element: HTMLElement): void {
  for (const ruby of element.querySelectorAll<HTMLElement>("ruby.cg-ruby")) {
    const base = Array.from(ruby.children).find((child) =>
      child.classList.contains("cg-base")
    );
    if (base) ruby.replaceWith(...Array.from(base.childNodes));
  }
  delete element.dataset.cgPinyinProcessed;
  delete element.dataset.cgPinyinLoading;
}

export default class HanziPinyinPlugin extends Plugin {
  settings: HanziPinyinSettings = DEFAULT_SETTINGS;
  private readonly pinyinCache = new BoundedStringCache(PINYIN_CACHE_CAPACITY);
  private pinyinEnginePromise: Promise<PinyinFunction> | null = null;
  private pinyinLoadFailed = false;
  private settingsSaveTimer: number | null = null;
  private readonly livePreviewObservers = new Map<HTMLElement, MutationObserver>();
  private readonly livePreviewRenderTimers = new Map<HTMLElement, number>();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.applySettings();
    this.addSettingTab(new HanziPinyinSettingTab(this.app, this));
    this.register(() => {
      this.clearSettingsStyle();
      this.disconnectLivePreviewObservers();
      this.flushSettingsSave();
    });

    this.addCommand({
      id: "wrap-selection-as-hanzi-pinyin",
      name: "Toggle selection as Chinese pinyin",
      editorCallback: (editor) => this.toggleSelection(editor)
    });

    this.registerMarkdownPostProcessor((element, context) => {
      void this.processReadingSection(element, context);
    });

    this.app.workspace.onLayoutReady(() => {
      this.refreshLivePreviewObservers();
      this.registerEvent(
        this.app.workspace.on("layout-change", () => this.refreshLivePreviewObservers())
      );
      this.refreshRenderedPinyin();
    });
  }

  updateSettings(settings: Partial<HanziPinyinSettings>): void {
    const visibilityChanged =
      (settings.showPinyinInLivePreview !== undefined &&
        settings.showPinyinInLivePreview !== this.settings.showPinyinInLivePreview) ||
      (settings.showPinyinInReadingView !== undefined &&
        settings.showPinyinInReadingView !== this.settings.showPinyinInReadingView);

    this.settings = { ...this.settings, ...settings };
    this.applySettings();
    this.scheduleSettingsSave();
    if (visibilityChanged) this.refreshRenderedPinyin();
  }

  private async loadSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.loadData())
    };
  }

  private applySettings(): void {
    const style = document.documentElement.style;
    style.setProperty("--cg-character-size", `${this.settings.characterSize}em`);
    style.setProperty("--cg-character-font", this.settings.characterFont);
    style.setProperty("--cg-annotation-size", `${this.settings.pinyinSize}em`);
    style.setProperty("--cg-annotation-font", this.settings.pinyinFont);
  }

  private clearSettingsStyle(): void {
    const style = document.documentElement.style;
    style.removeProperty("--cg-character-size");
    style.removeProperty("--cg-character-font");
    style.removeProperty("--cg-annotation-size");
    style.removeProperty("--cg-annotation-font");
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
      const cached = this.pinyinCache.get(text);
      if (cached !== undefined) return cached;

      const pronunciation = pinyin(text, { toneType: "symbol" });
      this.pinyinCache.set(text, pronunciation);
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
      new Notice("Characters Guide could not start its local pinyin engine.");
      throw error;
      });

    return this.pinyinEnginePromise;
  }

  private toggleSelection(editor: {
    getCursor(which?: "from" | "to"): { line: number; ch: number };
    getLine(line: number): string;
    getSelection(): string;
    replaceRange(
      replacement: string,
      from: { line: number; ch: number },
      to?: { line: number; ch: number }
    ): void;
    replaceSelection(replacement: string): void;
  }): void {
    const selection = editor.getSelection();
    if (!selection) {
      new Notice("Select Chinese text first.");
      return;
    }

    const unwrappedSelection = unwrapCompleteMarker(selection);
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
      if (before.endsWith(PINYIN_SPAN_OPENING) && after.startsWith(SPAN_CLOSING)) {
        editor.replaceRange(
          selection,
          { line: from.line, ch: from.ch - PINYIN_SPAN_OPENING.length },
          { line: to.line, ch: to.ch + SPAN_CLOSING.length }
        );
        return;
      }
    }

    editor.replaceSelection(wrapSelection(selection));
  }

  private processReadingSection(
    element: HTMLElement,
    context: MarkdownPostProcessorContext
  ): void {
    if (element.closest("[data-cg-safe-render]")) return;

    const section = context.getSectionInfo(element);
    const safeMarkdown = section ? protectGuideEmphasis(section.text) : null;
    if (section && safeMarkdown && safeMarkdown !== section.text) {
      void this.renderProtectedReadingSection(element, context, safeMarkdown);
      return;
    }

    const transform = section ? transformMarkerSource(section.text) : null;
    if (section && transform?.requiresMarkdownRender) {
      void this.renderSafeReadingSection(element, context, transform);
      return;
    }

    this.renderReadingMarkers(element);
  }

  private async renderSafeReadingSection(
    element: HTMLElement,
    context: MarkdownPostProcessorContext,
    transform: ReturnType<typeof transformMarkerSource>
  ): Promise<void> {
    const temporaryElement = document.createElement("div");
    temporaryElement.dataset.cgSafeRender = "true";
    const renderChild = new MarkdownRenderChild(element);
    context.addChild(renderChild);

    await MarkdownRenderer.render(
      this.app,
      transform.markdown,
      temporaryElement,
      context.sourcePath,
      renderChild
    );

    const markerElements = restoreMarkerSpans(temporaryElement, transform);
    if (markerElements.length === 0) return;

    this.replaceReadingSection(element, temporaryElement);

    for (const marker of markerElements) {
      if (marker.classList.contains(PINYIN_MARKER_CLASS)) {
        void this.renderMarker(marker, () => this.settings.showPinyinInReadingView);
      }
    }
  }

  private async renderProtectedReadingSection(
    element: HTMLElement,
    context: MarkdownPostProcessorContext,
    markdown: string
  ): Promise<void> {
    const temporaryElement = document.createElement("div");
    temporaryElement.dataset.cgSafeRender = "true";
    const renderChild = new MarkdownRenderChild(element);
    context.addChild(renderChild);

    await MarkdownRenderer.render(
      this.app,
      markdown,
      temporaryElement,
      context.sourcePath,
      renderChild
    );

    const markerElements = Array.from(
      temporaryElement.querySelectorAll<HTMLElement>(GUIDE_MARKER_SELECTOR)
    );
    if (markerElements.length === 0) return;

    this.replaceReadingSection(element, temporaryElement);

    for (const marker of markerElements) {
      if (marker.classList.contains(PINYIN_MARKER_CLASS)) {
        void this.renderMarker(marker, () => this.settings.showPinyinInReadingView);
      }
    }
  }

  private replaceReadingSection(element: HTMLElement, temporaryElement: HTMLElement): void {
    const renderedParagraph = temporaryElement.firstElementChild;
    if (
      element.tagName === "P" &&
      renderedParagraph instanceof HTMLParagraphElement &&
      temporaryElement.children.length === 1
    ) {
      element.replaceChildren(...Array.from(renderedParagraph.childNodes));
    } else if (element.tagName === "P") {
      element.replaceWith(...Array.from(temporaryElement.childNodes));
    } else {
      element.replaceChildren(...Array.from(temporaryElement.childNodes));
    }
  }

  private renderReadingMarkers(element: HTMLElement): void {
    if (!this.settings.showPinyinInReadingView) return;
    for (const marker of element.querySelectorAll<HTMLElement>(PINYIN_MARKER_SELECTOR)) {
      void this.renderMarker(marker, () => this.settings.showPinyinInReadingView);
    }
  }

  private renderMarker(element: HTMLElement, shouldRender: () => boolean): Promise<void> {
    return renderHanziPinyin(element, () => this.getPinyinConverter(), shouldRender);
  }

  private refreshRenderedPinyin(): void {
    for (const marker of document.querySelectorAll<HTMLElement>(
      `${markerSelector(".markdown-preview-view")}, ${markerSelector(".markdown-reading-view")}`
    )) {
      if (this.settings.showPinyinInReadingView) {
        void this.renderMarker(marker, () => this.settings.showPinyinInReadingView);
      } else {
        removeHanziPinyin(marker);
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
        line.textContent?.includes(CHINESE_MARKER_CLASS) === true
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
    for (const marker of root.querySelectorAll<HTMLElement>(GUIDE_MARKER_SELECTOR)) {
      const isActiveLine = marker.closest(".cm-activeLine") !== null;
      if (!marker.classList.contains(PINYIN_MARKER_CLASS)) {
        if (!isActiveLine) renderLivePreviewEmphasis(marker);
      } else if (!this.settings.showPinyinInLivePreview || isActiveLine) {
        removeHanziPinyin(marker);
      } else {
        void this.renderMarker(marker, () => this.settings.showPinyinInLivePreview);
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

class HanziPinyinSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: HanziPinyinPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Show pinyin in Live Preview")
      .setDesc("Show ruby pinyin on rendered lines. The active line stays editable.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showPinyinInLivePreview)
          .onChange((value) => this.plugin.updateSettings({ showPinyinInLivePreview: value }))
      );

    new Setting(containerEl)
      .setName("Show pinyin in Reading View")
      .setDesc("Show ruby pinyin in Reading View.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showPinyinInReadingView)
          .onChange((value) => this.plugin.updateSettings({ showPinyinInReadingView: value }))
      );

    new Setting(containerEl)
      .setName("Character size")
      .setDesc("Size of Hanzi, relative to the surrounding text.")
      .addSlider((slider) =>
        slider
          .setLimits(1, 5, 0.1)
          .setValue(this.plugin.settings.characterSize)
          .setDynamicTooltip()
          .onChange((value) => this.plugin.updateSettings({ characterSize: value }))
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
      .setName("Pinyin size")
      .setDesc("Size of pinyin, relative to the Hanzi.")
      .addSlider((slider) =>
        slider
          .setLimits(0.15, 0.75, 0.05)
          .setValue(this.plugin.settings.pinyinSize)
          .setDynamicTooltip()
          .onChange((value) => this.plugin.updateSettings({ pinyinSize: value }))
      );

    new Setting(containerEl)
      .setName("Pinyin font")
      .setDesc("A font name or CSS font stack for the pinyin annotation.")
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
      .setName("Toggle selected text")
      .setDesc(
        "Use the ‘Toggle selection as Hanzi pinyin’ command. Assign or change its shortcut in Obsidian Settings → Hotkeys."
      );
  }
}
