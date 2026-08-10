import { Notice, Plugin } from "obsidian";
import { pinyin } from "pinyin-pro";

const HANZI_PATTERN = /\p{Script=Han}+/gu;

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

function renderHanziPinyin(element: HTMLElement): void {
  if (element.dataset.hanziPinyinProcessed === "true") return;
  element.dataset.hanziPinyinProcessed = "true";

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

export default class HanziPinyinPlugin extends Plugin {
  private livePreviewObserver: MutationObserver | null = null;
  private livePreviewRenderTimer: number | null = null;

  async onload(): Promise<void> {
    this.addCommand({
      id: "wrap-selection-as-hanzi-pinyin",
      name: "Wrap selection as Hanzi pinyin",
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (!selection) {
          new Notice("Select Chinese text first.");
          return;
        }
        editor.replaceSelection(`<span class="hanzi-pinyin">${selection}</span>`);
      }
    });

    this.registerMarkdownPostProcessor((element) => {
      for (const zhElement of element.querySelectorAll<HTMLElement>("span.hanzi-pinyin")) {
        renderHanziPinyin(zhElement);
      }
    });

    this.app.workspace.onLayoutReady(() => {
      this.livePreviewObserver = new MutationObserver(() => {
        this.scheduleLivePreviewRender();
      });
      this.livePreviewObserver.observe(document.body, { childList: true, subtree: true });
      this.register(() => this.livePreviewObserver?.disconnect());
      this.scheduleLivePreviewRender();
    });
  }

  private scheduleLivePreviewRender(): void {
    if (this.livePreviewRenderTimer !== null) return;
    this.livePreviewRenderTimer = window.setTimeout(() => {
      this.livePreviewRenderTimer = null;
      for (const zhElement of document.querySelectorAll<HTMLElement>(
        ".markdown-source-view.mod-cm6 span.hanzi-pinyin"
      )) {
        renderHanziPinyin(zhElement);
      }
    }, 0);
  }
}
