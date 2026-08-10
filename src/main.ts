import { Plugin } from "obsidian";
import { pinyin } from "pinyin-pro";
import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType
} from "@codemirror/view";

const HIGHLIGHT_PATTERN = /==([^=\n]+?)==/g;

function toPinyin(text: string): string {
  return pinyin(text.trim(), { toneType: "symbol" });
}

class RubyWidget extends WidgetType {
  constructor(
    private readonly text: string,
    private readonly pronunciation: string
  ) {
    super();
  }

  eq(other: RubyWidget): boolean {
    return this.text === other.text && this.pronunciation === other.pronunciation;
  }

  toDOM(): HTMLElement {
    const ruby = document.createElement("ruby");
    ruby.className = "ruby-highlights-ruby";

    const base = document.createElement("span");
    base.className = "ruby-highlights-base";
    base.textContent = this.text;

    const annotation = document.createElement("rt");
    annotation.textContent = this.pronunciation;

    ruby.append(base, annotation);
    return ruby;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function selectionTouches(view: EditorView, from: number, to: number): boolean {
  return view.state.selection.ranges.some((range) => range.from <= to && range.to >= from);
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  for (const visibleRange of view.visibleRanges) {
    const source = view.state.doc.sliceString(visibleRange.from, visibleRange.to);
    HIGHLIGHT_PATTERN.lastIndex = 0;

    for (let match = HIGHLIGHT_PATTERN.exec(source); match; match = HIGHLIGHT_PATTERN.exec(source)) {
      const fullText = match[0];
      const highlightedText = match[1].trim();
      const from = visibleRange.from + match.index;
      const to = from + fullText.length;

      // Keep the original Markdown visible while the user is editing this highlight.
      if (!highlightedText || selectionTouches(view, from, to)) continue;

      builder.add(
        from,
        to,
        Decoration.replace({
          widget: new RubyWidget(highlightedText, toPinyin(highlightedText))
        })
      );
    }
  }

  return builder.finish();
}

const rubyHighlightExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate): void {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        update.focusChanged
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (value) => value.decorations
  }
);

export default class RubyHighlightsPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerMarkdownPostProcessor((element) => {
      for (const mark of element.querySelectorAll<HTMLElement>("mark")) {
        if (mark.parentElement?.matches("ruby.ruby-highlights-ruby")) continue;

        const text = mark.textContent?.trim() ?? "";
        if (!text) continue;

        const ruby = document.createElement("ruby");
        ruby.className = "ruby-highlights-ruby";
        mark.replaceWith(ruby);
        ruby.append(mark);

        const annotation = document.createElement("rt");
        annotation.textContent = toPinyin(text);
        ruby.append(annotation);
      }
    });

    this.registerEditorExtension(rubyHighlightExtension);
  }
}
