## Главы

Однострочный маркер **chapter**:

```md
::: chapter Глава 1 | Прибытие
```

Рендер:

```html
<div class="chapter">
  <div class="chapter__subtitle">Глава 1</div>
  <div class="chapter__title">Прибытие</div>
</div>
```

Если `|` нет:

```md
::: chapter Вступление
```

→ будет только `<div class="chapter__title">Вступление</div>`.

---