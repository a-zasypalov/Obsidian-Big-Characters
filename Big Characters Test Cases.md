# Big Characters — Manual Test Cases

This note exercises every supported language/mode in both inline spans and fenced blocks. Chinese is tested in both Simplified and Traditional form. Formatting probes include bold, italic, bold italic, nested emphasis, adjacent emphasis, and formatting inside a word.

## How to test

1. Reload the optimized plugin before testing. If this file is inside `.obsidian/plugins/big-characters/`, copy it into a normal vault folder first: Obsidian does not list notes inside `.obsidian`.
2. Inspect the entire note in **Reading View**, then **Live Preview**. Scroll to later sections as well as checking the initially visible ones.
3. In Live Preview, put the cursor inside each example, edit a character, then move the cursor away. The active line should remain editable; rendering should return on inactive lines without duplication or missing characters.
4. For formatting cases, look for bold/italic characters, correctly placed pronunciation, and no visible Markdown asterisks. Record discrepancies instead of assuming every probe already works.
5. Compare each plain example with its formatted versions. In Chinese, formatting should preserve phrase context; in Japanese, annotations should stay aligned across formatted token boundaries.

### Common checks

- [ ] All seven modes work in Reading View.
- [ ] All seven modes work in Live Preview.
- [ ] Both Simplified and Traditional Chinese work.
- [ ] Inline spans and fenced blocks retain the text and punctuation.
- [ ] Plain modes have no pronunciation annotations.
- [ ] Annotated modes place pronunciation above the correct characters.
- [ ] Bold, italic, combined, nested, and adjacent formatting remain visible.
- [ ] Moving the cursor, editing, scrolling, and switching views do not duplicate ruby.
- [ ] Multiline blocks preserve blank lines and indentation.
- [ ] Shared size/font/spacing settings apply without overlapping nearby lines.

## Unmarked control text

These lines should remain ordinary note text, without plugin annotations:

你好，世界！媽媽回來了。

안녕하세요. 같이 먹어요! 백마 한글

日本語を勉強します。ひらがな カタカナ

Ordinary Markdown formatting: **bold**, *italic*, ***bold italic***.

## Chinese — Simplified

### Large characters without pinyin

Mode: `bc-zh-cn` / `zh-cn`. No pronunciation annotations.

#### Inline spans

Full sentence: <span class="bc-zh-cn">你好，世界！妈妈回来了。</span>

Plain: <span class="bc-zh-cn">你好 世界 妈妈</span>

All bold: <span class="bc-zh-cn">**你好 世界 妈妈**</span>

All italic: <span class="bc-zh-cn">*你好 世界 妈妈*</span>

All bold italic: <span class="bc-zh-cn">***你好 世界 妈妈***</span>

Plain → bold → italic → bold italic: <span class="bc-zh-cn">你好 **世界** *妈妈* ***回来*** 了</span>

Bold containing italic: <span class="bc-zh-cn">**你好 *世界* 妈妈**</span>

Italic containing bold: <span class="bc-zh-cn">*你好 **世界** 妈妈*</span>

Adjacent bold → italic, no spaces: <span class="bc-zh-cn">**你好***世界*</span>

Adjacent italic → bold, no spaces: <span class="bc-zh-cn">*你好***世界**</span>

Adjacent bold italic → plain: <span class="bc-zh-cn">***你好***世界</span>

Punctuation around formatting: <span class="bc-zh-cn">「**你好**」、『*世界*』！(***妈妈***)</span>

Adjacent bold and italic regression: <span class="bc-zh-cn">**荷兰***要*</span>

Phrase split across formatting: <span class="bc-zh-cn">妈妈回来**了**。</span>

Contextual reading across formatting: <span class="bc-zh-cn">一个转**盘**</span>

Mixed scripts and punctuation: <span class="bc-zh-cn">你好，Obsidian 123！中文 / English 🙂</span>

Single character: <span class="bc-zh-cn">你</span>

#### Fenced block — same formatting cases

The lines below follow the same order as the labeled inline cases above.

```zh-cn
你好，世界！妈妈回来了。
你好 世界 妈妈
**你好 世界 妈妈**
*你好 世界 妈妈*
***你好 世界 妈妈***
你好 **世界** *妈妈* ***回来*** 了
**你好 *世界* 妈妈**
*你好 **世界** 妈妈*
**你好***世界*
*你好***世界**
***你好***世界
「**你好**」、『*世界*』！(***妈妈***)
**荷兰***要*
妈妈回来**了**。
一个转**盘**
你好，Obsidian 123！中文 / English 🙂
你
```

#### Multiline and blank-line spacing

Normal text before the block.

```zh-cn
你好 世界
**妈妈** *回来*

  ***了***
你好，世界！妈妈回来了。
```

Normal text after the block.

### Large characters with pinyin

Mode: `bc-zh-cn-pinyin` / `zh-cn-pinyin`. Pinyin above Hanzi. 妈妈回来了 → mā ma huí lái le; 一个转盘 → yí gè zhuàn pán.

#### Inline spans

Full sentence: <span class="bc-zh-cn-pinyin">你好，世界！妈妈回来了。</span>

Plain: <span class="bc-zh-cn-pinyin">你好 世界 妈妈</span>

All bold: <span class="bc-zh-cn-pinyin">**你好 世界 妈妈**</span>

All italic: <span class="bc-zh-cn-pinyin">*你好 世界 妈妈*</span>

All bold italic: <span class="bc-zh-cn-pinyin">***你好 世界 妈妈***</span>

Plain → bold → italic → bold italic: <span class="bc-zh-cn-pinyin">你好 **世界** *妈妈* ***回来*** 了</span>

Bold containing italic: <span class="bc-zh-cn-pinyin">**你好 *世界* 妈妈**</span>

Italic containing bold: <span class="bc-zh-cn-pinyin">*你好 **世界** 妈妈*</span>

Adjacent bold → italic, no spaces: <span class="bc-zh-cn-pinyin">**你好***世界*</span>

Adjacent italic → bold, no spaces: <span class="bc-zh-cn-pinyin">*你好***世界**</span>

Adjacent bold italic → plain: <span class="bc-zh-cn-pinyin">***你好***世界</span>

Punctuation around formatting: <span class="bc-zh-cn-pinyin">「**你好**」、『*世界*』！(***妈妈***)</span>

Adjacent bold and italic regression: <span class="bc-zh-cn-pinyin">**荷兰***要*</span>

Phrase split across formatting: <span class="bc-zh-cn-pinyin">妈妈回来**了**。</span>

Contextual reading across formatting: <span class="bc-zh-cn-pinyin">一个转**盘**</span>

Mixed scripts and punctuation: <span class="bc-zh-cn-pinyin">你好，Obsidian 123！中文 / English 🙂</span>

Single character: <span class="bc-zh-cn-pinyin">你</span>

#### Fenced block — same formatting cases

The lines below follow the same order as the labeled inline cases above.

```zh-cn-pinyin
你好，世界！妈妈回来了。
你好 世界 妈妈
**你好 世界 妈妈**
*你好 世界 妈妈*
***你好 世界 妈妈***
你好 **世界** *妈妈* ***回来*** 了
**你好 *世界* 妈妈**
*你好 **世界** 妈妈*
**你好***世界*
*你好***世界**
***你好***世界
「**你好**」、『*世界*』！(***妈妈***)
**荷兰***要*
妈妈回来**了**。
一个转**盘**
你好，Obsidian 123！中文 / English 🙂
你
```

#### Multiline and blank-line spacing

Normal text before the block.

```zh-cn-pinyin
你好 世界
**妈妈** *回来*

  ***了***
你好，世界！妈妈回来了。
```

Normal text after the block.

## Chinese — Traditional

### Large characters without pinyin

Mode: `bc-zh-cn` / `zh-cn`. No pronunciation annotations.

#### Inline spans

Full sentence: <span class="bc-zh-cn">你好，世界！媽媽回來了。</span>

Plain: <span class="bc-zh-cn">你好 世界 媽媽</span>

All bold: <span class="bc-zh-cn">**你好 世界 媽媽**</span>

All italic: <span class="bc-zh-cn">*你好 世界 媽媽*</span>

All bold italic: <span class="bc-zh-cn">***你好 世界 媽媽***</span>

Plain → bold → italic → bold italic: <span class="bc-zh-cn">你好 **世界** *媽媽* ***回來*** 了</span>

Bold containing italic: <span class="bc-zh-cn">**你好 *世界* 媽媽**</span>

Italic containing bold: <span class="bc-zh-cn">*你好 **世界** 媽媽*</span>

Adjacent bold → italic, no spaces: <span class="bc-zh-cn">**你好***世界*</span>

Adjacent italic → bold, no spaces: <span class="bc-zh-cn">*你好***世界**</span>

Adjacent bold italic → plain: <span class="bc-zh-cn">***你好***世界</span>

Punctuation around formatting: <span class="bc-zh-cn">「**你好**」、『*世界*』！(***媽媽***)</span>

Adjacent bold and italic regression: <span class="bc-zh-cn">**荷蘭***要*</span>

Phrase split across formatting: <span class="bc-zh-cn">媽媽回來**了**。</span>

Contextual reading across formatting: <span class="bc-zh-cn">一個轉**盤**</span>

Mixed scripts and punctuation: <span class="bc-zh-cn">你好，Obsidian 123！繁體中文 / English 🙂</span>

Single character: <span class="bc-zh-cn">你</span>

#### Fenced block — same formatting cases

The lines below follow the same order as the labeled inline cases above.

```zh-cn
你好，世界！媽媽回來了。
你好 世界 媽媽
**你好 世界 媽媽**
*你好 世界 媽媽*
***你好 世界 媽媽***
你好 **世界** *媽媽* ***回來*** 了
**你好 *世界* 媽媽**
*你好 **世界** 媽媽*
**你好***世界*
*你好***世界**
***你好***世界
「**你好**」、『*世界*』！(***媽媽***)
**荷蘭***要*
媽媽回來**了**。
一個轉**盤**
你好，Obsidian 123！繁體中文 / English 🙂
你
```

#### Multiline and blank-line spacing

Normal text before the block.

```zh-cn
你好 世界
**媽媽** *回來*

  ***了***
你好，世界！媽媽回來了。
```

Normal text after the block.

### Large characters with pinyin

Mode: `bc-zh-cn-pinyin` / `zh-cn-pinyin`. Pinyin above Traditional Hanzi. 一個轉盤 → yí gè zhuàn pán; formatting should preserve the phrase context.

#### Inline spans

Full sentence: <span class="bc-zh-cn-pinyin">你好，世界！媽媽回來了。</span>

Plain: <span class="bc-zh-cn-pinyin">你好 世界 媽媽</span>

All bold: <span class="bc-zh-cn-pinyin">**你好 世界 媽媽**</span>

All italic: <span class="bc-zh-cn-pinyin">*你好 世界 媽媽*</span>

All bold italic: <span class="bc-zh-cn-pinyin">***你好 世界 媽媽***</span>

Plain → bold → italic → bold italic: <span class="bc-zh-cn-pinyin">你好 **世界** *媽媽* ***回來*** 了</span>

Bold containing italic: <span class="bc-zh-cn-pinyin">**你好 *世界* 媽媽**</span>

Italic containing bold: <span class="bc-zh-cn-pinyin">*你好 **世界** 媽媽*</span>

Adjacent bold → italic, no spaces: <span class="bc-zh-cn-pinyin">**你好***世界*</span>

Adjacent italic → bold, no spaces: <span class="bc-zh-cn-pinyin">*你好***世界**</span>

Adjacent bold italic → plain: <span class="bc-zh-cn-pinyin">***你好***世界</span>

Punctuation around formatting: <span class="bc-zh-cn-pinyin">「**你好**」、『*世界*』！(***媽媽***)</span>

Adjacent bold and italic regression: <span class="bc-zh-cn-pinyin">**荷蘭***要*</span>

Phrase split across formatting: <span class="bc-zh-cn-pinyin">媽媽回來**了**。</span>

Contextual reading across formatting: <span class="bc-zh-cn-pinyin">一個轉**盤**</span>

Mixed scripts and punctuation: <span class="bc-zh-cn-pinyin">你好，Obsidian 123！繁體中文 / English 🙂</span>

Single character: <span class="bc-zh-cn-pinyin">你</span>

#### Fenced block — same formatting cases

The lines below follow the same order as the labeled inline cases above.

```zh-cn-pinyin
你好，世界！媽媽回來了。
你好 世界 媽媽
**你好 世界 媽媽**
*你好 世界 媽媽*
***你好 世界 媽媽***
你好 **世界** *媽媽* ***回來*** 了
**你好 *世界* 媽媽**
*你好 **世界** 媽媽*
**你好***世界*
*你好***世界**
***你好***世界
「**你好**」、『*世界*』！(***媽媽***)
**荷蘭***要*
媽媽回來**了**。
一個轉**盤**
你好，Obsidian 123！繁體中文 / English 🙂
你
```

#### Multiline and blank-line spacing

Normal text before the block.

```zh-cn-pinyin
你好 世界
**媽媽** *回來*

  ***了***
你好，世界！媽媽回來了。
```

Normal text after the block.

## Korean

### Large characters without romanization

Mode: `bc-ko-kr` / `ko-kr`. No pronunciation annotations.

#### Inline spans

Full sentence: <span class="bc-ko-kr">안녕하세요. 같이 먹어요! 백마 한글</span>

Plain: <span class="bc-ko-kr">안녕하세요 같이 백마</span>

All bold: <span class="bc-ko-kr">**안녕하세요 같이 백마**</span>

All italic: <span class="bc-ko-kr">*안녕하세요 같이 백마*</span>

All bold italic: <span class="bc-ko-kr">***안녕하세요 같이 백마***</span>

Plain → bold → italic → bold italic: <span class="bc-ko-kr">안녕하세요 **같이** *백마* ***한글*** 먹어요</span>

Bold containing italic: <span class="bc-ko-kr">**안녕하세요 *같이* 백마**</span>

Italic containing bold: <span class="bc-ko-kr">*안녕하세요 **같이** 백마*</span>

Adjacent bold → italic, no spaces: <span class="bc-ko-kr">**안녕하세요***같이*</span>

Adjacent italic → bold, no spaces: <span class="bc-ko-kr">*안녕하세요***같이**</span>

Adjacent bold italic → plain: <span class="bc-ko-kr">***안녕하세요***같이</span>

Punctuation around formatting: <span class="bc-ko-kr">「**안녕하세요**」、『*같이*』！(***백마***)</span>

Adjacent bold and italic: <span class="bc-ko-kr">**같이***먹어요*</span>

Word split across formatting: <span class="bc-ko-kr">같**이** 백*마*</span>

Pronunciation rules: <span class="bc-ko-kr">같이 백마 한글</span>

Mixed scripts and punctuation: <span class="bc-ko-kr">안녕, Obsidian 123! 한국어 / English 🙂</span>

Single syllable: <span class="bc-ko-kr">한</span>

#### Fenced block — same formatting cases

The lines below follow the same order as the labeled inline cases above.

```ko-kr
안녕하세요. 같이 먹어요! 백마 한글
안녕하세요 같이 백마
**안녕하세요 같이 백마**
*안녕하세요 같이 백마*
***안녕하세요 같이 백마***
안녕하세요 **같이** *백마* ***한글*** 먹어요
**안녕하세요 *같이* 백마**
*안녕하세요 **같이** 백마*
**안녕하세요***같이*
*안녕하세요***같이**
***안녕하세요***같이
「**안녕하세요**」、『*같이*』！(***백마***)
**같이***먹어요*
같**이** 백*마*
같이 백마 한글
안녕, Obsidian 123! 한국어 / English 🙂
한
```

#### Multiline and blank-line spacing

Normal text before the block.

```ko-kr
안녕하세요 같이
**백마** *한글*

  ***먹어요***
안녕하세요. 같이 먹어요! 백마 한글
```

Normal text after the block.

### Large characters with romanization

Mode: `bc-ko-kr-rom` / `ko-kr-rom`. Romanization above Hangul. 같이 → gachi; 백마 → baengma; 한글 → hangeul.

#### Inline spans

Full sentence: <span class="bc-ko-kr-rom">안녕하세요. 같이 먹어요! 백마 한글</span>

Plain: <span class="bc-ko-kr-rom">안녕하세요 같이 백마</span>

All bold: <span class="bc-ko-kr-rom">**안녕하세요 같이 백마**</span>

All italic: <span class="bc-ko-kr-rom">*안녕하세요 같이 백마*</span>

All bold italic: <span class="bc-ko-kr-rom">***안녕하세요 같이 백마***</span>

Plain → bold → italic → bold italic: <span class="bc-ko-kr-rom">안녕하세요 **같이** *백마* ***한글*** 먹어요</span>

Bold containing italic: <span class="bc-ko-kr-rom">**안녕하세요 *같이* 백마**</span>

Italic containing bold: <span class="bc-ko-kr-rom">*안녕하세요 **같이** 백마*</span>

Adjacent bold → italic, no spaces: <span class="bc-ko-kr-rom">**안녕하세요***같이*</span>

Adjacent italic → bold, no spaces: <span class="bc-ko-kr-rom">*안녕하세요***같이**</span>

Adjacent bold italic → plain: <span class="bc-ko-kr-rom">***안녕하세요***같이</span>

Punctuation around formatting: <span class="bc-ko-kr-rom">「**안녕하세요**」、『*같이*』！(***백마***)</span>

Adjacent bold and italic: <span class="bc-ko-kr-rom">**같이***먹어요*</span>

Word split across formatting: <span class="bc-ko-kr-rom">같**이** 백*마*</span>

Pronunciation rules: <span class="bc-ko-kr-rom">같이 백마 한글</span>

Mixed scripts and punctuation: <span class="bc-ko-kr-rom">안녕, Obsidian 123! 한국어 / English 🙂</span>

Single syllable: <span class="bc-ko-kr-rom">한</span>

#### Fenced block — same formatting cases

The lines below follow the same order as the labeled inline cases above.

```ko-kr-rom
안녕하세요. 같이 먹어요! 백마 한글
안녕하세요 같이 백마
**안녕하세요 같이 백마**
*안녕하세요 같이 백마*
***안녕하세요 같이 백마***
안녕하세요 **같이** *백마* ***한글*** 먹어요
**안녕하세요 *같이* 백마**
*안녕하세요 **같이** 백마*
**안녕하세요***같이*
*안녕하세요***같이**
***안녕하세요***같이
「**안녕하세요**」、『*같이*』！(***백마***)
**같이***먹어요*
같**이** 백*마*
같이 백마 한글
안녕, Obsidian 123! 한국어 / English 🙂
한
```

#### Multiline and blank-line spacing

Normal text before the block.

```ko-kr-rom
안녕하세요 같이
**백마** *한글*

  ***먹어요***
안녕하세요. 같이 먹어요! 백마 한글
```

Normal text after the block.

## Japanese

### Large characters without pronunciation

Mode: `bc-ja-jp` / `ja-jp`. No pronunciation annotations.

#### Inline spans

Full sentence: <span class="bc-ja-jp">日本語を勉強します。座ってください。食べる</span>

Plain: <span class="bc-ja-jp">日本語 勉強 座って</span>

All bold: <span class="bc-ja-jp">**日本語 勉強 座って**</span>

All italic: <span class="bc-ja-jp">*日本語 勉強 座って*</span>

All bold italic: <span class="bc-ja-jp">***日本語 勉強 座って***</span>

Plain → bold → italic → bold italic: <span class="bc-ja-jp">日本語 **勉強** *座って* ***食べる*** 今日</span>

Bold containing italic: <span class="bc-ja-jp">**日本語 *勉強* 座って**</span>

Italic containing bold: <span class="bc-ja-jp">*日本語 **勉強** 座って*</span>

Adjacent bold → italic, no spaces: <span class="bc-ja-jp">**日本語***勉強*</span>

Adjacent italic → bold, no spaces: <span class="bc-ja-jp">*日本語***勉強**</span>

Adjacent bold italic → plain: <span class="bc-ja-jp">***日本語***勉強</span>

Punctuation around formatting: <span class="bc-ja-jp">「**日本語**」、『*勉強*』！(***座って***)</span>

Adjacent bold and italic: <span class="bc-ja-jp">**日本語***勉強*</span>

One token split across formatting: <span class="bc-ja-jp">日**本***語*</span>

Small tsu and word ending split across formatting: <span class="bc-ja-jp">**座***って*</span>

Kanji and okurigana split across formatting: <span class="bc-ja-jp">**食***べる* 取**り**戻*す*</span>

Hiragana only: <span class="bc-ja-jp">ひらがな</span>

Katakana only: <span class="bc-ja-jp">カタカナ</span>

Mixed kana and kanji: <span class="bc-ja-jp">今日、日本語を勉強します。</span>

Mixed scripts and punctuation: <span class="bc-ja-jp">日本語、Obsidian 123！ひらがな / カタカナ 🙂</span>

Unknown character and following known word: <span class="bc-ja-jp">𠮷食べる</span>

Single kanji: <span class="bc-ja-jp">日</span>

#### Fenced block — same formatting cases

The lines below follow the same order as the labeled inline cases above.

```ja-jp
日本語を勉強します。座ってください。食べる
日本語 勉強 座って
**日本語 勉強 座って**
*日本語 勉強 座って*
***日本語 勉強 座って***
日本語 **勉強** *座って* ***食べる*** 今日
**日本語 *勉強* 座って**
*日本語 **勉強** 座って*
**日本語***勉強*
*日本語***勉強**
***日本語***勉強
「**日本語**」、『*勉強*』！(***座って***)
**日本語***勉強*
日**本***語*
**座***って*
**食***べる* 取**り**戻*す*
ひらがな
カタカナ
今日、日本語を勉強します。
日本語、Obsidian 123！ひらがな / カタカナ 🙂
𠮷食べる
日
```

#### Multiline and blank-line spacing

Normal text before the block.

```ja-jp
日本語 勉強
**座って** *食べる*

  ***今日***
日本語を勉強します。座ってください。食べる
```

Normal text after the block.

### Large characters with romaji

Mode: `bc-ja-jp-romaji` / `ja-jp-romaji`. Hepburn romaji above Japanese tokens, including kana. 座って → suwatte; ひらがな → hiragana; カタカナ → katakana.

#### Inline spans

Full sentence: <span class="bc-ja-jp-romaji">日本語を勉強します。座ってください。食べる</span>

Plain: <span class="bc-ja-jp-romaji">日本語 勉強 座って</span>

All bold: <span class="bc-ja-jp-romaji">**日本語 勉強 座って**</span>

All italic: <span class="bc-ja-jp-romaji">*日本語 勉強 座って*</span>

All bold italic: <span class="bc-ja-jp-romaji">***日本語 勉強 座って***</span>

Plain → bold → italic → bold italic: <span class="bc-ja-jp-romaji">日本語 **勉強** *座って* ***食べる*** 今日</span>

Bold containing italic: <span class="bc-ja-jp-romaji">**日本語 *勉強* 座って**</span>

Italic containing bold: <span class="bc-ja-jp-romaji">*日本語 **勉強** 座って*</span>

Adjacent bold → italic, no spaces: <span class="bc-ja-jp-romaji">**日本語***勉強*</span>

Adjacent italic → bold, no spaces: <span class="bc-ja-jp-romaji">*日本語***勉強**</span>

Adjacent bold italic → plain: <span class="bc-ja-jp-romaji">***日本語***勉強</span>

Punctuation around formatting: <span class="bc-ja-jp-romaji">「**日本語**」、『*勉強*』！(***座って***)</span>

Adjacent bold and italic: <span class="bc-ja-jp-romaji">**日本語***勉強*</span>

One token split across formatting: <span class="bc-ja-jp-romaji">日**本***語*</span>

Small tsu and word ending split across formatting: <span class="bc-ja-jp-romaji">**座***って*</span>

Kanji and okurigana split across formatting: <span class="bc-ja-jp-romaji">**食***べる* 取**り**戻*す*</span>

Hiragana only: <span class="bc-ja-jp-romaji">ひらがな</span>

Katakana only: <span class="bc-ja-jp-romaji">カタカナ</span>

Mixed kana and kanji: <span class="bc-ja-jp-romaji">今日、日本語を勉強します。</span>

Mixed scripts and punctuation: <span class="bc-ja-jp-romaji">日本語、Obsidian 123！ひらがな / カタカナ 🙂</span>

Unknown character and following known word: <span class="bc-ja-jp-romaji">𠮷食べる</span>

Single kanji: <span class="bc-ja-jp-romaji">日</span>

#### Fenced block — same formatting cases

The lines below follow the same order as the labeled inline cases above.

```ja-jp-romaji
日本語を勉強します。座ってください。食べる
日本語 勉強 座って
**日本語 勉強 座って**
*日本語 勉強 座って*
***日本語 勉強 座って***
日本語 **勉強** *座って* ***食べる*** 今日
**日本語 *勉強* 座って**
*日本語 **勉強** 座って*
**日本語***勉強*
*日本語***勉強**
***日本語***勉強
「**日本語**」、『*勉強*』！(***座って***)
**日本語***勉強*
日**本***語*
**座***って*
**食***べる* 取**り**戻*す*
ひらがな
カタカナ
今日、日本語を勉強します。
日本語、Obsidian 123！ひらがな / カタカナ 🙂
𠮷食べる
日
```

#### Multiline and blank-line spacing

Normal text before the block.

```ja-jp-romaji
日本語 勉強
**座って** *食べる*

  ***今日***
日本語を勉強します。座ってください。食べる
```

Normal text after the block.

### Large characters with furigana

Mode: `bc-ja-jp-furigana` / `ja-jp-furigana`. Hiragana above kanji only. 食べる: 食 gets た, べる has no ruby; 今日 gets きょう; 取り戻す: 取 gets と, 戻 gets もど. Kana-only text has no furigana.

#### Inline spans

Full sentence: <span class="bc-ja-jp-furigana">日本語を勉強します。座ってください。食べる</span>

Plain: <span class="bc-ja-jp-furigana">日本語 勉強 座って</span>

All bold: <span class="bc-ja-jp-furigana">**日本語 勉強 座って**</span>

All italic: <span class="bc-ja-jp-furigana">*日本語 勉強 座って*</span>

All bold italic: <span class="bc-ja-jp-furigana">***日本語 勉強 座って***</span>

Plain → bold → italic → bold italic: <span class="bc-ja-jp-furigana">日本語 **勉強** *座って* ***食べる*** 今日</span>

Bold containing italic: <span class="bc-ja-jp-furigana">**日本語 *勉強* 座って**</span>

Italic containing bold: <span class="bc-ja-jp-furigana">*日本語 **勉強** 座って*</span>

Adjacent bold → italic, no spaces: <span class="bc-ja-jp-furigana">**日本語***勉強*</span>

Adjacent italic → bold, no spaces: <span class="bc-ja-jp-furigana">*日本語***勉強**</span>

Adjacent bold italic → plain: <span class="bc-ja-jp-furigana">***日本語***勉強</span>

Punctuation around formatting: <span class="bc-ja-jp-furigana">「**日本語**」、『*勉強*』！(***座って***)</span>

Adjacent bold and italic: <span class="bc-ja-jp-furigana">**日本語***勉強*</span>

One token split across formatting: <span class="bc-ja-jp-furigana">日**本***語*</span>

Small tsu and word ending split across formatting: <span class="bc-ja-jp-furigana">**座***って*</span>

Kanji and okurigana split across formatting: <span class="bc-ja-jp-furigana">**食***べる* 取**り**戻*す*</span>

Hiragana only: <span class="bc-ja-jp-furigana">ひらがな</span>

Katakana only: <span class="bc-ja-jp-furigana">カタカナ</span>

Mixed kana and kanji: <span class="bc-ja-jp-furigana">今日、日本語を勉強します。</span>

Mixed scripts and punctuation: <span class="bc-ja-jp-furigana">日本語、Obsidian 123！ひらがな / カタカナ 🙂</span>

Unknown character and following known word: <span class="bc-ja-jp-furigana">𠮷食べる</span>

Single kanji: <span class="bc-ja-jp-furigana">日</span>

#### Fenced block — same formatting cases

The lines below follow the same order as the labeled inline cases above.

```ja-jp-furigana
日本語を勉強します。座ってください。食べる
日本語 勉強 座って
**日本語 勉強 座って**
*日本語 勉強 座って*
***日本語 勉強 座って***
日本語 **勉強** *座って* ***食べる*** 今日
**日本語 *勉強* 座って**
*日本語 **勉強** 座って*
**日本語***勉強*
*日本語***勉強**
***日本語***勉強
「**日本語**」、『*勉強*』！(***座って***)
**日本語***勉強*
日**本***語*
**座***って*
**食***べる* 取**り**戻*す*
ひらがな
カタカナ
今日、日本語を勉強します。
日本語、Obsidian 123！ひらがな / カタカナ 🙂
𠮷食べる
日
```

#### Multiline and blank-line spacing

Normal text before the block.

```ja-jp-furigana
日本語 勉強
**座って** *食べる*

  ***今日***
日本語を勉強します。座ってください。食べる
```

Normal text after the block.

## Mixed languages and modes on one line

Without pronunciation: <span class="bc-zh-cn">你好</span> / <span class="bc-ko-kr">안녕</span> / <span class="bc-ja-jp">日本語</span>.

With pronunciation: <span class="bc-zh-cn-pinyin">**妈妈**回来*了*。</span> / <span class="bc-ko-kr-rom">**같이** *백마*</span> / <span class="bc-ja-jp-romaji">**座***って*</span> / <span class="bc-ja-jp-furigana">**食***べる*</span>.

Adjacent separate markers: <span class="bc-zh-cn-pinyin">你好</span><span class="bc-ko-kr-rom">한글</span><span class="bc-ja-jp-furigana">今日</span>.

## Surrounding layout

### List items

- Chinese: <span class="bc-zh-cn-pinyin">妈妈回来**了**。</span> followed by ordinary text.
- Traditional Chinese: <span class="bc-zh-cn-pinyin">一個轉**盤**</span> followed by ordinary text.
- Korean: <span class="bc-ko-kr-rom">**같이** *백마*</span> followed by ordinary text.
- Japanese romaji: <span class="bc-ja-jp-romaji">**座***って*</span> followed by ordinary text.
- Japanese furigana: <span class="bc-ja-jp-furigana">**食***べる*</span> followed by ordinary text.

### Blockquote

> <span class="bc-zh-cn-pinyin">**你好**，*世界*！</span>
>
> <span class="bc-ko-kr-rom">**같이** *먹어요*</span>
>
> <span class="bc-ja-jp-furigana">**今日**、*日本語*を勉強します。</span>

### Table

| Mode | Example |
| --- | --- |
| Chinese plain | <span class="bc-zh-cn">**你好**</span> |
| Chinese pinyin | <span class="bc-zh-cn-pinyin">**妈妈**回来了。</span> |
| Korean plain | <span class="bc-ko-kr">*한글*</span> |
| Korean romanization | <span class="bc-ko-kr-rom">***같이***</span> |
| Japanese plain | <span class="bc-ja-jp">**日本語**</span> |
| Japanese romaji | <span class="bc-ja-jp-romaji">***座って***</span> |
| Japanese furigana | <span class="bc-ja-jp-furigana">**食***べる*</span> |

## Additional formatting and input probes

These check boundaries beyond the asterisk emphasis used in the main matrix. Record what happens; they are not a claim that every Markdown or HTML construct is supported.

Underscore emphasis, Chinese: <span class="bc-zh-cn-pinyin">__你好__ _世界_ ___妈妈___</span>.

Underscore emphasis, Korean: <span class="bc-ko-kr-rom">__같이__ _백마_ ___한글___</span>.

Underscore emphasis, Japanese: <span class="bc-ja-jp-furigana">__今日__ _食べる_ ___日本語___</span>.

HTML emphasis: <span class="bc-ja-jp-furigana"><strong>今日</strong> <em>食べる</em></span>.

Latin-only input in annotated modes: <span class="bc-zh-cn-pinyin">English 123 🙂</span> / <span class="bc-ko-kr-rom">English 123 🙂</span> / <span class="bc-ja-jp-romaji">English 123 🙂</span> / <span class="bc-ja-jp-furigana">English 123 🙂</span>. These should not gain pronunciation annotations.

Empty markers: <span class="bc-zh-cn-pinyin"></span><span class="bc-ko-kr-rom"></span><span class="bc-ja-jp-romaji"></span><span class="bc-ja-jp-furigana"></span>. These should not produce errors or visible annotations.

## Settings, commands, and loading

### Pronunciation settings

- [ ] Disable pronunciations in Reading View: annotations disappear, characters and emphasis stay readable.
- [ ] Enable them again: annotations return once.
- [ ] Repeat using the independent Live Preview setting.
- [ ] Try a larger character size, a different character font, and annotation size/font changes.
- [ ] Adjust top/bottom spacing: check inline text, tables, and multiline blocks for clipping or overlap.
- [ ] Restore defaults and check the note again.

### Selection commands

Use the ordinary control text above as scratch text. Test each of the seven “Toggle selection as …” commands: Chinese, Chinese pinyin, Korean, Korean romanization, Japanese, Japanese romaji, and Japanese furigana.

- [ ] Applying a command adds its marker and displays the selected mode.
- [ ] Applying it again removes the marker without changing the selected text.
- [ ] A multiline selection gets the corresponding fenced block and toggles back correctly.
- [ ] Applying a command with no selection shows the “Select text first.” notice.

### Japanese loading and startup

Opening this complete note loads Japanese dictionaries because it contains romaji and furigana examples. For a startup comparison, start Obsidian with a different note containing only ordinary text or unannotated Japanese.

- [ ] Obsidian startup uses the smaller plugin script; no Japanese dictionary is needed for an unannotated `ja-jp` example.
- [ ] Open this note: Japanese romaji and furigana appear after the first local dictionary load.
- [ ] Switch views and reopen the note: annotations remain correct and are not duplicated.
- [ ] Disconnect from the internet, reload the plugin, and open this note: pronunciation still works.
- [ ] Repeat on another device after copying/syncing the entire plugin, including `japanese-dictionary/`.

## Findings

Record the heading/case, Reading View or Live Preview, expected result, and observed result here.

- 
