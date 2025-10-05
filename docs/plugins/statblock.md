# DFM — `statblock` (v1)

## Назначение

Карточка существа: шапка с основными полями, специальные «базовые пары» (часть до/после `abilityscores`), затем тело с секциями (traits/actions/…) и любым Markdown.

---

## Синтаксис

```
::: statblock [k=v ...]          ← опционально: k=v на строке открытия
k=v …                             ← «зона шапки»: одна или несколько строк k=v
                                   (заканчивается первой пустой строкой)
<пустая строка>
…тело (обычный Markdown, контейнеры)… 
:::
```

### Зона шапки

* Состоит из хвоста открывающей строки и следующих **непустых** строк, содержащих только `k=v` токены и/или комментарии `# …`.
* Заканчивается **первой пустой строкой**.
* Токены разделяются пробелами/переносами; **последнее присваивание побеждает**; ключи **без учета регистра**.
* Значения с пробелами — в кавычках.

---

## Поддерживаемые ключи (шапка)

### Общее

* `name` — имя (строка). **Обязателен для заголовка карточки.**
* `size` — размер (строка).
* `type` — тип (строка).
* `alignment` — мировоззрение (строка).
* `pb` — proficiency bonus (целое). Наследуется вложенными блоками (например, `abilityscores`).
* (зарезервировано на будущее: `lang` — код локали.)

### Базовые пары (показываются в `<dl>`):

* **ПРЕ-блок (всегда ДО `abilityscores`):**
  `ac`, `hp`, `speed`, `initiative` (алиас `init`)
* **ПОСТ-блок (ПОСЛЕ первого `abilityscores`):**
  `cr`, `languages` (алиас `langs`), `senses`
  *(список можно расширить в будущих версиях)*

> Если в теле **нет** `abilityscores`, то ПОСТ-блок выводится **сразу после** ПРЕ-блока (то есть вся «база» идёт подряд в шапке).

---

## Тело `statblock`

* Обычный Markdown и/или контейнеры DFM.
* Разрешённые «секционные» контейнеры (v1), каждый добавляет свой заголовок:

    * `::: traits … :::`
    * `::: actions … :::`
    * `::: bonus-actions … :::`
    * `::: reactions … :::`
    * `::: legendary-actions … :::`
    * `::: lair-actions … :::`
    * `::: mythic-actions … :::`
* Внутри — параграфы/списки/выделения как обычно.
* Можно использовать: `::: abilityscores … :::`, `::: wide … :::`, `::: columnbreak`, `::: columnreset`, `::: pagebreak`.

---

## Рендер (обязательный HTML-скелет)

```html
<article class="dfm-statblock" role="note" aria-label="{name}">
  <header class="sb-head">
    <h3 class="sb-title">{name}</h3>
    <!-- если есть size/type/alignment — компактной строкой -->
    <p class="sb-sub">{size} {type}, {alignment}</p>

    <!-- ПРЕ-блок: только из ac/hp/speed/init, в заданном порядке -->
    <dl class="sb-basics sb-basics--pre">
      <!-- пример: рендерим только присутствующие ключи -->
      <div><dt>AC</dt><dd>14 (Chain Shirt)</dd></div>
      <div><dt>HP</dt><dd>25 (4d8 + 4)</dd></div>
      <div><dt>Speed</dt><dd>30 ft.</dd></div>
      <div><dt>Init</dt><dd>+0 (10)</dd></div>
    </dl>
  </header>

  <section class="sb-body">
    <!-- тело до первого abilityscores -->
    …HTML…

    <!-- тут рендерится ПЕРВЫЙ abilityscores (как в своём плагине) -->

    <!-- ПОСЛЕ него — ПОСТ-блок с остальными парами -->
    <dl class="sb-basics sb-basics--post">
      <div><dt>CR</dt><dd>1/4</dd></div>
      <div><dt>Languages</dt><dd>Common</dd></div>
      <div><dt>Senses</dt><dd>Passive Perception 12</dd></div>
    </dl>

    <!-- дальше — остальной HTML тела -->
    …HTML…
  </section>
</article>
```

**Правила вставки ПОСТ-блока:**

* Находим **первый** `abilityscores` в токенах тела.
* Вставляем `sb-basics--post` **сразу после него**.
* Если `abilityscores` нет — `sb-basics--post` вставляется **сразу за `sb-basics--pre`**.

---

## Семантика/окружение

* В момент открытия `statblock` движок пушит в `env.dfm.statblockStack` объект с `pb` (для наследования внутрь).
  При закрытии — поп. Вложенные `statblock` **не допускаются** (в dev — варнинг).
* Неизвестные ключи шапки игнорируются (в dev — варнинг).
* Дубликаты ключей: **последнее** значение побеждает.

---

## Пример

```md
::: statblock
name="Imperial Guard" size="Medium" type="Humanoid" alignment="Lawful Neutral"
ac="14 (Chain Shirt)" hp="25 (4d8 + 4)" speed="30 ft." init="+0 (10)"
cr="1/4" pb=2 languages="Common" senses="Passive Perception 12"

::: abilityscores
str=13 dex=12 con=12 int=10 wis=11 cha=10
saves="STR,CON"
:::

::: traits
* **Pack Tactics.** …
:::

::: actions
* **Longsword.** _Melee Weapon Attack:_ +4 to hit, reach 5 ft. _Hit:_ 7 (1d8+2) slashing.
:::
:::
```

**Порядок в итоговом HTML:**
заголовок → подзаголовок → ПРЕ-блок (AC/HP/Speed/Init) → `abilityscores` → ПОСТ-блок (CR/Languages/Senses) → секции/остальной контент.
