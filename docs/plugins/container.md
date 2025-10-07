# Документация: универсальные боксы

## Назначение

Любой контейнер `:{N} <имя> … :{N}`, для которого нет спец-плагина, автоматически рендерится как **оформительский блок** — «бокс». Это удобно для простых примечаний, сайдбаров, вставок и т.п., не требующих особой логики.

## Синтаксис

```md
::: footnote {variant="small" align="center"}
Приключение на 3–4 игроков 1–3 уровня  
ver 4.0.0
:::
```

* Минимум 3 двоеточия. Для вложенности — внутренние контейнеры пишите **с бОльшим** числом `:` (наши общие правила).
* Атрибуты в `{…}` → становятся `data-*` на корневом элементе (ключи приводятся к `kebab-case`).

## Что генерится

```html
<div class="dfm-box dfm-footnote footnote"
     data-kind="footnote" data-variant="small" data-align="center">
  <div class="dfm-box__body">
    …ваш HTML-контент…
  </div>
</div>
```

* Классы:

    * `dfm-box` — общий для всех универсальных блоков;
    * `dfm-<name>` — без изменений регистра/дефиса в нижнем (например, `dfm-footnote`);
    * `<name>` — как «произвольный» алиас для тем (например, `footnote`).
* `data-kind="<name>"` добавляется всегда, плюс любые `data-*` из `{…}`.

## Зарезервированные имена

Чтобы не конфликтовать с «умными» блоками, следующие имена **не** обрабатываются generic-плагином (ими занимаются их плагины):
`page`, `pagebreak`, `columnbreak`, `columnreset`,
`statblock`/`stat-block`, `abilityscores`, `wide`,
`traits`, `actions`, `bonus-actions`, `reactions`, `legendary-actions`, `lair-actions`, `mythic-actions`.

## CSS-паттерн

Минимальная базовая стилизация (пример):

```css
.dfm-box { break-inside: avoid; }
.dfm-box .dfm-box__body {
  padding: .5rem .75rem;
  background: var(--box-bg, #f7f7f7);
  border: 1px solid var(--box-border, #ddd);
  border-radius: 6px;
}

/* Конкретный вид — footnote */
.dfm-footnote { font-size: .9em; opacity: .9; }

/* Варианты и выравнивание через data-* */
.dfm-footnote[data-variant="small"] { font-size: .85em; }
.dfm-footnote[data-align="center"]  { text-align: center; }

/* Если бокс внутри блока с собственными колонками и должен тянуться на всю ширину: */
.stat-block[data-layout="wide"] .dfm-box[data-span="all"] { column-span: all; }
```

## Примеры

**Простая сноска:**

```md
::: footnote
Это демо-версия модуля. Для финальной игры используйте обновлённые статы.
:::
```

**Варианты оформления:**

```md
::: tip {variant="positive" icon="lightbulb"}
Используйте d20 и складывайте модификатор навыка.
:::

::: warning {variant="caution"}
Эта комната *смертельно опасна* для низких уровней.
:::
```

**Внутри stat-block с широким лэйаутом и двумя колонками:**

```md
::: stat-block {layout="wide" name="Vault Guardian"}
name="Vault Guardian" size=Large type=Construct alignment=LE
ac=18 hp="127 (15d10+45)" speed="30 ft." pb=3

:::: abilityscores
str=20 dex=10 con=16 int=6 wis=12 cha=8
::::

::: actions
* **Slam.** …
:::

::: footnote {span="all" align="center"}
Иллюстрация: «Хранилище Короля», стр. 12.
:::
:::
```

---

## Итоги

* Любой новый блок — просто напиши `::: имя {…}` → получишь «бокс».
* Темы цепляются по `.dfm-<имя>` и `data-*`.
* Спец-блоки не затрагиваем; generic регистрируем **последним**.
