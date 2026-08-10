# Obsidian Characters Guide

An Obsidian plugin for styling Chinese characters, with optional automatic ruby pinyin annotations.

Use `<span class="cg-zh">...</span>` for Chinese characters without pinyin, such as a flashcard prompt. Use `<span class="cg-zh-pinyin">...</span>` when pinyin should be shown according to the plugin’s Reading View and Live Preview settings. Both markers support bold and italic text.

Use the `Characters Guide: Toggle selection as Chinese pinyin` command to add or remove the `cg-zh-pinyin` marker around selected text. Its command ID is unchanged, so an existing hotkey continues to work. You can assign or change the shortcut in Obsidian Settings → Hotkeys.

## Settings

The plugin’s settings page lets you independently toggle pinyin in Live Preview and Reading View, and change the character size/font and pinyin size/font. The defaults match the original appearance: 2.5em Kaiti-style Hanzi with 0.35em system-font pinyin.

## Development

```sh
npm install
npm run check
npm run build
```

`main.js`, `manifest.json`, and `styles.css` are the files Obsidian loads. After a build, copy those three files into your vault's `.obsidian/plugins/characters-guide/` folder, then reload Obsidian. The pinyin engine is bundled into `main.js` but is initialized only on first use, keeping it fully offline and compatible with the Community Plugins installer.
