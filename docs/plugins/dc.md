отлично, вот компактная спецификация плагина для «DC-тегов» в инлайн-коде.

# Плагин: inline DC codes

## Назначение

                       Короткая разметка для проверок/бросков прямо в тексте.
                                                      Любой инлайн-код, который **начинается с `@`**, преобразуется в `<code class="dc">…</code>` c метаданными.

## Синтаксис автора

   Пишем **внутри бэктиков**:

```
`@Nature 12`
`@STR 15`
`@Investigation`
```

* Обрабатываются **только** инлайн-коды (не тройные ``` блоки).
* Первую `@` убираем из отображаемого текста.
* Всё остальное остаётся как есть (пробелы, регистр, доп. текст).

## Что генерится

Базово:

```html
<code class="dc">Nature 12</code>
```

Если «голова» совпала со словарём (см. ниже), будут добавлены дата-атрибуты:

```html
<code class="dc"
data-key="nature"
data-type="skill"
data-value="12">Nature 12</code>
```

### Поля

* `class="dc"` — маркер оформительского кода DC.
* `data-key` — канонический ключ из словаря (нижний регистр, латиница).
* `data-type` — один из: **`ability` | `skill` | `save`**.
* `data-value` — строка после ключа (всё, что правее первого пробела). Если числа нет — отсутствует/пусто.

> Если ключ не найден в словаре — атрибуты `data-*` не ставятся; остаётся только `class="dc"`.

## Как определяется ключ/type

                         Берётся **первое «слово» после `@`** (до первого пробела), без учёта регистра и диакритики.
                                                                                    Оно ищется в словаре (пример ниже). Словарь решает, к какому `data-type` относится запись.

### Примеры соответствий

    * `` `@Nature 12` `` → `data-key="nature"`, `data-type="skill"`, `data-value="12"`.
* `` `@STR 15` `` → `data-key="str"`, `data-type="ability"`, `data-value="15"`.
* `` `@STR-save 15` `` → `data-key="str-save"`, `data-type="save"`, `data-value="15"`.

* (Один токен, дефис — часть ключа; удобно для сейвов. Если захочешь вариант типа `@Save STR 15`, это уже расширение с «двумя токенами» — можно добавить позже.)

## Совместимость

* **`markdown-it-attrs`**: атрибуты после кода сохраняются; класс `dc` **добавляется** к существующим:

```
`@Nature 12`{.muted}  →  <code class="muted dc" …>Nature 12</code>
                                                             ```
* Другие плагины Markdown-It не ломаются: это рендер-хук только для `code_inline`.

## Словарь (идея структуры)

Храним отдельно (TS/JSON), case-insensitive:

```ts
// src/dicts/dc.ts
   export const DC_DICTIONARY = {
// abilities
'str': { type: 'ability' },
'dex': { type: 'ability' },
'con': { type: 'ability' },
'int': { type: 'ability' },
'wis': { type: 'ability' },
'cha': { type: 'ability' },

// skills (5e пример)
'acrobatics':   { type: 'skill' },
'animal-handling': { type: 'skill' },
'arcana':       { type: 'skill' },
'athletics':    { type: 'skill' },
'deception':    { type: 'skill' },
'history':      { type: 'skill' },
'insight':      { type: 'skill' },
'intimidation': { type: 'skill' },
'investigation':{ type: 'skill' },
'medicine':     { type: 'skill' },
'nature':       { type: 'skill' },
'perception':   { type: 'skill' },
'performance':  { type: 'skill' },
'persuasion':   { type: 'skill' },
'religion':     { type: 'skill' },
'sleight-of-hand': { type: 'skill' },
'stealth':      { type: 'skill' },
'survival':     { type: 'skill' },

// saves (вариант с дефисом в одном токене)
'str-save': { type: 'save' },
'dex-save': { type: 'save' },
// ...
} as const
```

> При желании можно добавить **алиасы** (например, `athl`, `ste`), маппя их на те же записи, или сделать второй объект `ALIASES = { 'athl':'athletics', 'ste':'stealth' }`.
                                                                                                                                                                          > Локализация (ru/en и т.п.) откладывается: видимый текст пока не трогаем, перевод можно будет сделать позднее по `data-key` и текущему `lang`.

## Кейсы и ограничения

   * Начинать текст **надо с `@`**: `` ` @Nature 12` `` (с пробелом перед @) — **не сработает**.
* Внутри допускается кириллица, но для словаря лучше использовать **латиницу** в ключах.
Вариант с кириллицей тоже возможен, если добавить такие ключи в словарь.
* «Двойная собака» `@@` как экранирование сейчас **не поддерживается** (по твоему желанию). Если понадобится — добавим.
* Плагин **не** меняет видимый текст (никакой автоперевод), только добавляет `class="dc"` и `data-*`.

## CSS-подсказки (минимум)

```css
code.dc {
    font-variant-numeric: tabular-nums;
    padding: 0 .25em;
    border-radius: .2em;
    background: var(--dc-bg, rgba(0,0,0,.06));
}
code.dc[data-type="skill"]   { /* цвет/иконка для навыков */ }
code.dc[data-type="ability"] { /* цвет/иконка для характеристик */ }
code.dc[data-type="save"]    { /* цвет/иконка для сейвов */ }
```

## Примеры

   * ``Проверка `@Nature 12` в лесу``
→ `<code class="dc" data-key="nature" data-type="skill" data-value="12">Nature 12</code>`
* `` Спасбросок `@STR-save 15` ``
→ `<code class="dc" data-key="str-save" data-type="save" data-value="15">STR-save 15</code>`
* `` Сила `@STR` ``
→ `<code class="dc" data-key="str" data-type="ability">STR</code>`

Если такой контракт ок — дальше наброшу реализацию плагина под markdown-it и минимальный словарь.
