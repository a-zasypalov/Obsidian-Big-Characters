# Obsidian Hanzi Pinyin

An Obsidian plugin that renders Hanzi inside `<span class="hanzi-pinyin">...</span>` as ruby text with automatic pinyin.

For example, `<span class="hanzi-pinyin">要</span>` renders as 要 with `yào` above it in both Reading View and Live Preview. The Markdown remains unchanged, and the marker can contain normal inline Markdown such as `<span class="hanzi-pinyin">**要** *学习*</span>`. Use the `Hanzi Pinyin: Wrap selection as Hanzi pinyin` command to insert the marker.

## Development

```sh
npm install
npm run check
npm run build
```

`main.js`, `manifest.json`, and `styles.css` are the files Obsidian loads. After a build, copy those three files into your vault's `.obsidian/plugins/ruby-highlights/` folder, then reload Obsidian.
