// shortcut: parse asterisk emphasis only; use the full Markdown renderer if other syntax is needed.
export function appendEmphasis(parent: HTMLElement, text: string): void {
  const stack: { element: HTMLElement; marker: Text; width: number }[] = [];
  let current = parent;

  for (const match of text.matchAll(/\*+|[^*]+/gu)) {
    const token = match[0];
    if (!token.startsWith("*")) {
      current.append(document.createTextNode(token));
      continue;
    }

    let remaining = token.length;
    const start = match.index;
    const canClose = /\S/u.test(text[start - 1] ?? "");
    const canOpen = /\S/u.test(text[start + token.length] ?? "");
    // At an adjacent boundary, close the current emphasis before opening the next.
    while (canClose && stack.length && remaining >= stack[stack.length - 1].width) {
      const closing = stack.pop()!;
      remaining -= closing.width;
      closing.marker.remove();
      current = closing.element.parentElement!;
    }

    if (canOpen) {
      while (remaining > 0) {
        const width = remaining >= 2 ? 2 : 1;
        const marker = document.createTextNode("*".repeat(width));
        const element = document.createElement(width === 2 ? "strong" : "em");
        current.append(marker, element);
        stack.push({ element, marker, width });
        current = element;
        remaining -= width;
      }
    } else if (remaining) {
      current.append(document.createTextNode("*".repeat(remaining)));
    }
  }

  // Keep unmatched delimiters readable rather than styling the remaining text.
  for (const { element } of stack.reverse()) element.replaceWith(...Array.from(element.childNodes));
}

export function renderEmphasis(element: HTMLElement): void {
  if (element.matches("code, pre, rt, ruby, script, style")) return;
  element.normalize();
  let nodes: Node[] = [];
  let source = "";
  const flush = () => {
    const text = nodes.map((node) => node.textContent).join("");
    if (text.includes("*")) {
      const wrapper = document.createElement("span");
      appendEmphasis(wrapper, source);
      if (wrapper.textContent !== text) {
        element.insertBefore(wrapper, nodes[0]);
        wrapper.replaceWith(...Array.from(wrapper.childNodes));
        for (const node of nodes) element.removeChild(node);
      }
    }
    nodes = [];
    source = "";
  };
  for (const node of Array.from(element.childNodes)) {
    const part = emphasisSource(node);
    if (part !== null) {
      nodes.push(node);
      source += part;
    } else {
      flush();
      if (node.nodeType === node.ELEMENT_NODE) renderEmphasis(node as HTMLElement);
    }
  }
  flush();
}

function emphasisSource(node: Node): string | null {
  if (node.nodeType === node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== node.ELEMENT_NODE) return null;
  const element = node as HTMLElement;
  if (!element.matches("strong, em") || element.attributes.length) return null;
  const parts = Array.from(element.childNodes, emphasisSource);
  if (parts.includes(null)) return null;
  // Export has no raw source: restore delimiters across Obsidian's partial emphasis DOM.
  const delimiter = element.tagName === "STRONG" ? "**" : "*";
  return delimiter + parts.join("") + delimiter;
}
