# Point of No Return: Eclipse 3D

Хоррор от первого лица на Three.js. Закат переходит в ночь, из леса выходит Вендиго. Найдите 10 записок, не попавшись монстру, и доберитесь до полицейской машины.

Весь звук и все текстуры генерируются процедурно (WebAudio и canvas): во всём проекте нет ни одного внешнего ассета.

## Запуск

```bash
npm install
npm run dev       # разработка, http://localhost:5173
npm run build     # сборка в dist/
npm run preview   # проверка собранной версии
```

Нужен Node.js 18+. Сборка статическая и использует относительные пути (`base: './'`), поэтому `dist/` можно выложить в любую папку или на GitHub Pages.

## Управление

| Клавиша | Действие |
|---|---|
| `W A S D` | движение |
| `Shift` | спринт (шумит, монстр слышит) |
| `Пробел` | прыжок |
| `E` | взять записку / включить рубильник / сесть в машину |
| `F` | фонарик (монстр видит луч) |
| `R` | фотовспышка, ослепляет Вендиго на 4 с (перезарядка 22 с) |
| `Q` | импульс ЭМП-детектора, показывает направление к цели |
| `P` / `Esc` | пауза и настройки |

Настройки (слабые ПК, bloom, чувствительность мыши, громкость) сохраняются в `localStorage`.

## Структура

```
src/
├── main.js            точка входа
├── config.js          все игровые константы и тексты записок
├── state.js           общее состояние (ctx, game, ai, world)
├── styles.css
├── core/              движок: renderer, input, audio, textures, collision, settings, look
├── shaders/           bodycam-шейдер (аберрация, скан-линии, виньетка)
├── world/             terrain, city, forest, sky, pois, notes, lighting
├── entities/          monster, monsterAI, jumpscare, phantom, hands, empDetector, policeCar
├── game/              loop, session, player, gadgets, interactions
└── ui/                hud, menu
```

## Как играет ИИ монстра

Конечный автомат: `PATROL → INVESTIGATE_SOUND / INVESTIGATE_LIGHT → AMBUSH → CHASE`.
Зрение: луч с проверкой препятствий, дальность 39 м с фонариком и 17 м без. Слух: шаги 20 м, спринт 55 м, хруст ветки 75 м. Пятно света фонарика на земле тоже привлекает монстра. Движение и обход препятствий делает [Yuka](https://github.com/Mugen87/yuka).

## Зависимости

`three@0.128.0`, `yuka`, `simplex-noise`, сборка на `vite`.
