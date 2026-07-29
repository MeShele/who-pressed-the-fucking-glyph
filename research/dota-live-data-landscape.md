# Дипресерч: откуда легально взять «кто нажал глиф» в Dota 2

> Сведение четырёх параллельных ресерчей (2026-07-29): GSI-поля, console.log/-condebug,
> реплей/комбатлог, Overwolf + остальной легальный ландшафт. Все утверждения — с источниками
> и уровнем уверенности. Финальная верификация — эмпирический бот-матч (см. CLAUDE.md).

## TL;DR — вердикт

| Канал | Лайв? | «Кто нажал» (атрибуция)? | Ban-safe? | Статус |
|---|---|---|---|---|
| GSI (playing) | ✅ реалтайм | ❌ по дизайну (клиент не получает) | ✅ | Факт «глиф потрачен командой» — ВОЗМОЖНО через `generic_event` → проверить матчем |
| GSI (spectating) | ~2 мин задержка | ❌ (тоже команда) | ✅ | Богаче (все 10 игроков), но свой матч так не посмотришь |
| console.log (`-condebug`) | ⚠️ флаш при выходе | ❌ (движковый спам, геймплей не пишется) | ✅ | Почти пустышка; дешёвый тест всё равно делаем |
| Overwolf GEP | ✅ | ❌ (это GSI под капотом) | ✅ | Ничего не добавляет к данным |
| Реплей (.dem) | ❌ пост-гейм | ✅ **ТОЧНАЯ** (unit orders 24/31) | ✅ | Подтверждено кодом; наша дифференциация |
| Чтение памяти / инжект | ✅ | ✅ | ❌ **БАН** | Не рассматриваем (Valve: 40k+ банов, февраль 2023) |

**Главный вывод:** лайв-атрибуция «кто нажал» невозможна легально в принципе — Valve не доставляет
эти данные клиенту (фича-реквест закрыт как "not planned":
[Dota2-Gameplay#12759](https://github.com/ValveSoftware/Dota2-Gameplay/issues/12759)).
Продукт = **гибрид**: лайв-слой (факт глифа/кд-таймеры, если тест пройдёт) + пост-гейм слой
с точной атрибуцией глифа И скана из реплея — точнее и шире, чем у обоих конкурентов.

## 1. GSI — что реально отдаёт (реверс из живых библиотек)

Официальной доки Valve на Dota 2 GSI нет — всё реверсится из пейлоадов. Самый свежий источник:
[dotabod/backend](https://github.com/dotabod/backend/blob/master/packages/dota/src/types.ts)
(Twitch-оверлей на тысячах стримеров, обновлён 2026-07-28).

- Полей `glyph_cooldown` / скан-кд **не существует ни в одном режиме** (проверено отсутствие
  во всех 4 библиотеках; `glyph_cooldown` есть только в API для AI-ботов `CMsgBotWorldState`, это не GSI).
- Блок `events[]` в playing-режиме: `roshan_killed`, `aegis_picked_up`, `aegis_denied`, `tip`,
  `bounty_rune_pickup` + **с осени 2025 новое**: `chat_message` (живой чат с `player_id`) и
  `generic_event` — GSI теперь форвардит внутренние чат-события игры (`CDOTAUserMsg_ChatEvent`).
  Подтверждено живьём для `CHAT_MESSAGE_SMOKE_ACTIVATED`
  ([handler](https://github.com/dotabod/backend/blob/master/packages/dota/src/dota/events/gsi-events/event.generic_event.ts)).
- **Ключевая гипотеза для пробы:** приходит ли `generic_event` с `CHAT_MESSAGE_GLYPH_USED` (=12)
  при нажатии глифа. Если да — лайв-таймер кд вражеского глифа (никто не даёт) реализуем.
  Даже если придёт — там команда, не игрок
  ([odota processExpand.mjs](https://github.com/odota/parser/blob/master/processors/processExpand.mjs): "player1 = team that used glyph").
- Playing vs spectating: играя — только свой герой/предметы/**свои постройки** (инференс глифа
  по вражеским вышкам невозможен); спектатором — все 10 игроков (`team2`/`team3`),
  плюс `roshan_state`, вард-кд обеих команд.
- В cfg должны быть включены компоненты: без `"events" "1"` решающий блок вообще не POST-ится.
  Полный список компонентов: auth, provider, map, player, hero, abilities, items, events,
  buildings, league, draft, wearables, minimap, roshan, couriers, neutralitems
  ([Dota2GSIFile.cs](https://github.com/antonpup/Dota2GSI/blob/master/Dota2GSI/Dota2GSIFile.cs)).

## 2. console.log (`-condebug`) — почти пустышка

- Реальный лог = движковый спам (ассеты, шейдеры, звук) + переходы стейтов + `PR:SetSelectedHero`
  со SteamID на пике. Чата, килфида, комбатлога, абилок — нет
  ([пример лога](https://gist.github.com/joehakimrahme/7d51d9668c6941aafe35)).
- Известный баг: лог **флашится на диск только при выходе из клиента**, `tail -f` в игре мёртв
  ([Dota-2#1634](https://github.com/ValveSoftware/Dota-2/issues/1634), открыт с 2019).
- `dota_combatlog_file` (комбатлог в файл лайв!) — **только для спектаторов/бродкастеров**, не в своей игре.
- Февраль 2023: Valve отключила `record` и массу интроспекции в матчмейкинге — целенаправленно
  против сторонних тулз ([патчноут](https://www.dota2.com/newsentry/3659774959178253450)).
- Бонус: `server_log.txt` пишется лайв при принятии матча — match id + SteamID всех 10 игроков.
  Легально, пригодится для пост-гейм джойна.

## 3. Реплей — точная атрибуция подтверждена кодом

- Чат-события: `CHAT_MESSAGE_GLYPH_USED = 12`, `CHAT_MESSAGE_SCAN_USED = 100`
  ([dota_usermessages.proto](https://github.com/SteamDatabase/GameTracking-Dota2/blob/master/Protobufs/dota_usermessages.proto)) — **несут команду, не игрока**.
- **Но в реплее записан каждый приказ каждого игрока**: `DOTA_UNIT_ORDER_GLYPH = 24`,
  `DOTA_UNIT_ORDER_RADAR = 31` с игроком и таймстампом
  ([order_types.json](https://github.com/odota/dotaconstants/blob/master/json/order_types.json),
  odota/parser эмитит их как `{type:"actions", slot, key, time}`).
  Точный ответ «кто и когда» — парсить .dem самим (clarity/manta), джойнить orders с чат-событиями.
- OpenDota API отдаёт только счётчики (`players[].actions["24"]`), без таймстампов.
  Проверено на живом матче 8918785800.
- Реплеи живут у Valve ~2 недели; OpenDota умеет parse-on-request (`POST /api/request/{match_id}`).
- Комбатлог: глифа нет вообще; скан только как `DOTA_COMBATLOG_SUCCESSFUL_SCAN = 36` (успешные).

## 4. Overwolf и остальной ландшафт

- Overwolf GEP для доты = **обёртка над GSI** (официально требуют `-gamestateintegration`).
  В их фичах ноль упоминаний glyph/scan/roshan. Локальный игрок only.
- Valve НЕ партнёр Overwolf; терпимость односторонняя. Февраль 2023: 40k+ банов за читы,
  формулировка Valve: «любое приложение, читающее данные из клиента доты во время игры, = бан»
  ([kotaku](https://kotaku.com/valve-steam-dota-2-cheating-honeypot-ban-client-patch-1850149606)).
  GSI — данные, которые Valve сама шлёт наружу, это другая категория.
- Существующие лайв-оверлеи (Dota Coach, DotaPlus, RoshTrack) — таймеры, считаемые клиентски;
  «кто нажал глиф» лайв не показывает никто.
- Electron поверх доты: ок на DX11 (дефолт Windows), ломается на Vulkan/macOS
  ([electron#8530](https://github.com/electron/electron/issues/8530)). Для контент-сценария
  проще OBS browser-source. Overwolf-стор = ревью + монетизация только через них.

## 5. Конкуренты (пост-гейм, оба — только глиф)

| | [s3rbug/whousedglyph](https://github.com/s3rbug/whousedglyph) | [who-pressed-the-glyph.vercel.app](https://who-pressed-the-glyph.vercel.app/) |
|---|---|---|
| Метод | свой Go-бэкенд, парсит реплей | STRATZ chatEvents + эвристика по счётчикам OpenDota |
| Атрибуция | точная (из реплея) | **эвристика** — путается, если 2+ тиммейта жали глиф |
| Скан | ❌ | ❌ |
| Лайв | ❌ | ❌ |

Ниша лайв — пуста. Ниша «скан» — пуста даже в пост-гейме. Нейминг near-collision со вторым — учесть в бренде.

## 6. Что это значит для продукта

1. **Лайв-слой (ядро, GSI):** факт «глиф потрачен командой X» + кд-таймер 5:00 (если `generic_event`
   пройдёт тест), рошан/аегис/баунти-события (подтверждены в playing-режиме), смоук-алерт своей
   команды (подтверждён), живой чат. Всё — реалтайм, всё ban-safe.
2. **Пост-гейм слой (дифференциация):** точная атрибуция глифа И скана из реплея через unit orders —
   лучше обоих конкурентов по точности и охвату.
3. **Мем-фича «кто слил глиф» живёт в связке:** лайв ловит момент → пост-гейм называет имя.
   Кнопка "матч закончился → через N минут пуш «глиф в 32:41 слил Techies»".

## 7. Что проверяет бот-матч (эмпирика, финальный шаг)

- [ ] Приходит ли `events[]` / `generic_event` с `CHAT_MESSAGE_GLYPH_USED` при своём глифе? При вражеском (боты)?
- [ ] То же для скана (`CHAT_MESSAGE_SCAN_USED`) — свой/вражеский.
- [ ] Что вообще лежит в `events[]` за матч (`events.jsonl`).
- [ ] Меняется ли что-то glyph/scan-именованное в пейлоаде (`glyph-scan.jsonl` — ожидаем: ничего).
- [ ] console.log после выхода: grep glyph/scan/chat (ожидаем: пусто) + жив ли `server_log.txt` с 10 SteamID.
- Оговорка: бот-матч ≠ лобби; чистое подтверждение — лобби со вторым аккаунтом.
