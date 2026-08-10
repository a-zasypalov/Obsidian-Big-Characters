# Obsidian Hanzi Pinyin

An Obsidian plugin that renders marked characters as ruby text with automatic pronunciation annotations.

For example, `<span class="cpg-zh">要</span>` renders as 要 with `yào` above it in both Reading View and Live Preview. The Markdown remains unchanged, and the marker supports bold and italic text: `<span class="cpg-zh">**要** *学习*</span>`.

Use the `Hanzi Pinyin: Toggle selection as Hanzi pinyin` command to add or remove the marker around selected text. Its command ID is unchanged, so an existing hotkey continues to work. You can assign or change the shortcut in Obsidian Settings → Hotkeys.

## Settings

The plugin’s settings page lets you independently toggle pinyin in Live Preview and Reading View, and change the character size/font and pinyin size/font. The defaults match the original appearance: 2.5em Kaiti-style Hanzi with 0.35em system-font pinyin.

## Development

```sh
npm install
npm run check
npm run build
```

`main.js`, `manifest.json`, and `styles.css` are the files Obsidian loads. After a build, copy those three files into your vault's `.obsidian/plugins/characters-pronunciation-guide/` folder, then reload Obsidian. The pinyin engine is bundled into `main.js` but is initialized only on first use, keeping it fully offline and compatible with the Community Plugins installer.
