import type { JapaneseAnnotation } from "./japanese-engine";

interface TextPart {
  node: Text;
  start: number;
  end: number;
}

interface TextPassage {
  text: string;
  parts: TextPart[];
}

const EXCLUDED_SELECTOR = "code, pre, ruby, script, style";

function collectPassages(root: HTMLElement): TextPassage[] {
  const passages: TextPassage[] = [];
  let passage: TextPassage | null = null;

  const flush = () => {
    if (passage?.text) passages.push(passage);
    passage = null;
  };
  const visit = (node: Node) => {
    if (node instanceof Element && node.matches(EXCLUDED_SELECTOR)) {
      flush();
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (!text) return;
      passage ??= { text: "", parts: [] };
      const start = passage.text.length;
      passage.text += text;
      passage.parts.push({ node: node as Text, start, end: start + text.length });
      return;
    }
    for (const child of Array.from(node.childNodes)) visit(child);
  };

  for (const child of Array.from(root.childNodes)) visit(child);
  flush();
  return passages;
}

function setStart(range: Range, part: TextPart, offset: number, root: HTMLElement): void {
  if (offset !== 0) {
    range.setStart(part.node, offset);
    return;
  }

  let boundary: Node = part.node;
  while (
    boundary.parentNode &&
    boundary.parentNode !== root &&
    boundary.parentNode.firstChild === boundary
  ) {
    boundary = boundary.parentNode;
  }
  range.setStartBefore(boundary);
}

function setEnd(range: Range, part: TextPart, offset: number, root: HTMLElement): void {
  if (offset !== part.node.data.length) {
    range.setEnd(part.node, offset);
    return;
  }

  let boundary: Node = part.node;
  while (
    boundary.parentNode &&
    boundary.parentNode !== root &&
    boundary.parentNode.lastChild === boundary
  ) {
    boundary = boundary.parentNode;
  }
  range.setEndAfter(boundary);
}

function applyAnnotation(
  root: HTMLElement,
  passage: TextPassage,
  annotation: JapaneseAnnotation
): void {
  const startPart = passage.parts.find(
    (part) => annotation.start >= part.start && annotation.start < part.end
  );
  const endPart = passage.parts.find(
    (part) => annotation.end > part.start && annotation.end <= part.end
  );
  if (!startPart || !endPart || annotation.start >= annotation.end || !annotation.annotation) return;

  const range = document.createRange();
  setStart(range, startPart, annotation.start - startPart.start, root);
  setEnd(range, endPart, annotation.end - endPart.start, root);

  const base = document.createElement("span");
  base.className = "bc-base";
  base.append(range.extractContents());

  const reading = document.createElement("rt");
  reading.textContent = annotation.annotation;

  const ruby = document.createElement("ruby");
  ruby.className = "bc-ruby";
  ruby.append(base, reading);
  range.insertNode(ruby);
}

export function applyJapaneseRuby(
  root: HTMLElement,
  annotate: (text: string) => readonly JapaneseAnnotation[]
): void {
  for (const passage of collectPassages(root)) {
    const annotations = [...annotate(passage.text)].sort((left, right) => right.start - left.start);
    for (const annotation of annotations) applyAnnotation(root, passage, annotation);
  }
}

export function removeRubyAnnotations(root: HTMLElement): void {
  for (const ruby of root.querySelectorAll<HTMLElement>("ruby.bc-ruby")) {
    const bases = Array.from(ruby.children).filter((child) => child.classList.contains("bc-base"));
    ruby.replaceWith(...bases.flatMap((base) => Array.from(base.childNodes)));
  }
}
