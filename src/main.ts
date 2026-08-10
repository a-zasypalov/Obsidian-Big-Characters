import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { pinyin } from "pinyin-pro";

const HANZI_PATTERN = /\p{Script=Han}+/gu;
const MARKER_CLASS = "characters-pronunciation-guide";
const MARKER_SELECTOR = `span.${MARKER_CLASS}`;
const SPAN_OPENING = `<span class="${MARKER_CLASS}">`;
const SPAN_CLOSING = "</span>";

function markerSelector(scope: string): string {
  return `${scope} ${MARKER_SELECTOR}`;
}

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

function toPinyin(text: string): string {
  return pinyin(text.trim(), { toneType: "symbol" });
}

function appendRubyText(parent: HTMLElement, text: string): void {
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  HANZI_PATTERN.lastIndex = 0;

  for (let match = HANZI_PATTERN.exec(text); match; match = HANZI_PATTERN.exec(text)) {
    if (match.index > lastIndex) {
      fragment.append(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const hanzi = match[0];
    const ruby = document.createElement("ruby");
    ruby.className = "hanzi-pinyin-ruby";

    const base = document.createElement("span");
    base.className = "hanzi-pinyin-base";
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

function findClosingMarker(text: string, marker: string, from: number): number {
  let closing = text.indexOf(marker, from);
  while (closing !== -1 && !/\S/.test(text[closing - 1] ?? "")) {
    closing = text.indexOf(marker, closing + marker.length);
  }
  return closing;
}

function appendInlineMarkdown(parent: HTMLElement, text: string): void {
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
    const closing = findClosingMarker(text, marker, contentStart);
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
      appendInlineMarkdown(italic, content);
      parent.append(italic);
    } else if (marker === "**") {
      const bold = document.createElement("strong");
      appendInlineMarkdown(bold, content);
      parent.append(bold);
    } else {
      const bold = document.createElement("strong");
      const italic = document.createElement("em");
      appendInlineMarkdown(italic, content);
      bold.append(italic);
      parent.append(bold);
    }

    cursor = closing + marker.length;
  }
}

function renderInlineMarkdown(element: HTMLElement): void {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (
        !/[\*]{1,3}/.test(node.textContent ?? "") ||
        parent?.closest("code, pre, script, style")
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
    appendInlineMarkdown(wrapper, textNode.textContent ?? "");
    textNode.replaceWith(...Array.from(wrapper.childNodes));
  }
}

function renderHanziPinyin(element: HTMLElement): void {
  if (element.dataset.hanziPinyinProcessed === "true") return;
  element.dataset.hanziPinyinProcessed = "true";

  renderInlineMarkdown(element);

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (
        !node.textContent ||
        !/\p{Script=Han}/u.test(node.textContent) ||
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
    appendRubyText(wrapper, textNode.textContent ?? "");
    textNode.replaceWith(...Array.from(wrapper.childNodes));
  }
}

function removeHanziPinyin(element: HTMLElement): void {
  for (const ruby of element.querySelectorAll<HTMLElement>("ruby.hanzi-pinyin-ruby")) {
    const base = Array.from(ruby.children).find(
      (child) => child.classList.contains("hanzi-pinyin-base")
    );
    if (base) ruby.replaceWith(...Array.from(base.childNodes));
  }
  delete element.dataset.hanziPinyinProcessed;
}

export default class HanziPinyinPlugin extends Plugin {
  settings: HanziPinyinSettings = DEFAULT_SETTINGS;
  private livePreviewObserver: MutationObserver | null = null;
  private livePreviewRenderTimer: number | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.applySettings();
    this.addSettingTab(new HanziPinyinSettingTab(this.app, this));
    this.register(() => this.clearSettingsStyle());

    this.addCommand({
      id: "wrap-selection-as-hanzi-pinyin",
      name: "Toggle selection as Hanzi pinyin",
      editorCallback: (editor) => this.toggleSelection(editor)
    });

    this.registerMarkdownPostProcessor((element) => {
      for (const zhElement of element.querySelectorAll<HTMLElement>(MARKER_SELECTOR)) {
        if (this.settings.showPinyinInReadingView) {
          renderHanziPinyin(zhElement);
        }
      }
    });

    this.app.workspace.onLayoutReady(() => {
      this.livePreviewObserver = new MutationObserver(() => {
        this.scheduleLivePreviewRender();
      });
      this.livePreviewObserver.observe(document.body, { childList: true, subtree: true });
      this.register(() => this.livePreviewObserver?.disconnect());
      this.register(() => {
        if (this.livePreviewRenderTimer !== null) {
          window.clearTimeout(this.livePreviewRenderTimer);
        }
      });
      this.refreshRenderedPinyin();
    });
  }

  async updateSettings(settings: Partial<HanziPinyinSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await this.saveData(this.settings);
    this.applySettings();
    this.refreshRenderedPinyin();
  }

  private async loadSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.loadData())
    };
  }

  private applySettings(): void {
    const style = document.documentElement.style;
    style.setProperty("--hanzi-pinyin-character-size", `${this.settings.characterSize}em`);
    style.setProperty("--hanzi-pinyin-character-font", this.settings.characterFont);
    style.setProperty("--hanzi-pinyin-annotation-size", `${this.settings.pinyinSize}em`);
    style.setProperty("--hanzi-pinyin-annotation-font", this.settings.pinyinFont);
  }

  private clearSettingsStyle(): void {
    const style = document.documentElement.style;
    style.removeProperty("--hanzi-pinyin-character-size");
    style.removeProperty("--hanzi-pinyin-character-font");
    style.removeProperty("--hanzi-pinyin-annotation-size");
    style.removeProperty("--hanzi-pinyin-annotation-font");
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

    const completeMarker = selection.match(
      /^<span class=["']characters-pronunciation-guide["']>([\s\S]*)<\/span>$/i
    );
    if (completeMarker) {
      editor.replaceSelection(completeMarker[1]);
      return;
    }

    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    if (from.line === to.line) {
      const line = editor.getLine(from.line);
      const before = line.slice(0, from.ch);
      const after = line.slice(to.ch);
      if (before.endsWith(SPAN_OPENING) && after.startsWith(SPAN_CLOSING)) {
        editor.replaceRange(
          selection,
          { line: from.line, ch: from.ch - SPAN_OPENING.length },
          { line: to.line, ch: to.ch + SPAN_CLOSING.length }
        );
        return;
      }
    }

    editor.replaceSelection(`${SPAN_OPENING}${selection}${SPAN_CLOSING}`);
  }

  private refreshRenderedPinyin(): void {
    for (const zhElement of document.querySelectorAll<HTMLElement>(
      `${markerSelector(".markdown-preview-view")}, ${markerSelector(".markdown-reading-view")}`
    )) {
      if (this.settings.showPinyinInReadingView) {
        renderHanziPinyin(zhElement);
      } else {
        removeHanziPinyin(zhElement);
      }
    }
    this.scheduleLivePreviewRender();
  }

  private scheduleLivePreviewRender(): void {
    if (this.livePreviewRenderTimer !== null) return;
    this.livePreviewRenderTimer = window.setTimeout(() => {
      this.livePreviewRenderTimer = null;
      for (const zhElement of document.querySelectorAll<HTMLElement>(
        markerSelector(".markdown-source-view.mod-cm6")
      )) {
        if (this.settings.showPinyinInLivePreview) {
          renderHanziPinyin(zhElement);
        } else {
          removeHanziPinyin(zhElement);
        }
      }
    }, 0);
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
