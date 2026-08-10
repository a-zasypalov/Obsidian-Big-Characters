# Obsidian Hanzi Pinyin

An Obsidian plugin that renders text marked with `==double equals==` as ruby text with automatic pinyin.

For example, `==要==` renders as 要 with `yào` above it. The Markdown remains unchanged.

## Development

```sh
npm install
npm run check
npm run build
```

`main.js`, `manifest.json`, and `styles.css` are the files Obsidian loads. After a build, copy those three files into your vault's `.obsidian/plugins/ruby-highlights/` folder, then reload Obsidian.
