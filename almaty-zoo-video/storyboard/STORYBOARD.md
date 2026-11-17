# Раскадровка — «Дети пошли в Алматинский зоопарк» / «Dzieci poszły do zoo w Ałmaty»

Формат **9:16**, холст 0 0 1080 1920 (SVG), мастер **4K 2160×3840 @ 60 fps**, проверочные стоп-кадры **32K 17280×30720**. Источник истины — `storyboard.json`; тайминги ниже посчитаны по реальной длительности озвучки (`scripts/timing.mjs`, ffprobe).

| Версия | Длительность |
|---|---|
| Қазақша | 32.4 с |
| Polski | 32.1 с |
| Билингва KZ → PL | 50.6 с |

**Персонажи.**
- **Айша / Ajsza** — girl, 8, coral hoodie, turquoise skirt, two dark braids with amber bands, white sneakers
- **Арман / Arman** — boy, 9, lime T-shirt with a snow-leopard print, blue shorts, amber cap backwards, backpack
- **Bober** — chubby brown beaver, big expressive eyes, two big front teeth, flat scaly tail

**Стиль.** Белая карточка сцены со скруглением и мягкой тенью, сверху фиксированная плашка «Алматы хайуанаттар бағында / W almatyńskim zoo». Лайн-арт: `stroke #182232`, `3.5`, `round`. Палитра: изумруд и лайм, ярко-голубое небо, янтарь, коралл, бирюза; cel-shading — один тон тени и один блик.

## 1. Вход в зоопарк — WS — общий план

| | |
|---|---|
| Таймкод (KZ) | 00:00.0 – 00:05.4 |
| Таймкод (билингва) | 00:00.0 – 00:09.4 |
| Камера | slow push-in 1.00 → 1.06, slight rise |
| Композиция | arch on the upper third, Alatau peaks behind, kids on the lower third (Aisha left, Arman right), path leads the eye to the gate |
| Анимация | arch flags flutter; clouds drift; kids wave (arm swing 2 Hz); blink every ~2.6 s; lip-sync on the speaker |
| UI | header @0 с; sign «Алматы хайуанаттар бағы / Zoo w Ałmaty» @0.4 с |
| Реплика KZ (Айша) | «Сәлем, Арман! Қарашы, біз Алматы хайуанаттар бағына келдік!» |
| Реплика PL (Ajsza) | «Cześć, Arman! Spójrz, przyszliśmy do almatyńskiego zoo!» |
| Звук | birds, music in |

## 2. Қар барысы мен арыстан — MS — средний план

| | |
|---|---|
| Таймкод (KZ) | 00:05.4 – 00:10.4 |
| Таймкод (билингва) | 00:09.4 – 00:18.3 |
| Камера | zoom 1.0 → 1.12 to the enclosures |
| Композиция | rocky enclosure top-left (snow leopard on a ledge), savanna bottom-right (lion), Arman in the lower-left corner pointing |
| Анимация | leopard tail sways; lion mane breathes, ears twitch; cards pop with spring, pointer lines draw (strokeDashoffset) |
| UI | card «Қар барысы / Pantera śnieżna» @0.6 с; card «Арыстан / Lew» @1.4 с |
| Реплика KZ (Арман) | «Керемет! Анау жерде қар барысы мен арыстан жүр!» |
| Реплика PL (Arman) | «Super! Tam spacerują pantera śnieżna i lew!» |
| Звук | soft roar, pop ×2 |

## 3. Керік пен піл — MCU/MS — крупный-средний, акцент на животных

| | |
|---|---|
| Таймкод (KZ) | 00:10.4 – 00:16.4 |
| Таймкод (билингва) | 00:18.3 – 00:26.9 |
| Камера | tilt up the giraffe's neck, then settle |
| Композиция | giraffe on the left reaching a tree crown at the top, elephant on the right raising the trunk, Aisha bottom-centre looking up |
| Анимация | giraffe neck reaches, chews; elephant trunk lifts and waves; ears flap; cards pop |
| UI | card «Керік / Żyrafa» @0.6 с; card «Піл / Słoń» @1.4 с |
| Реплика KZ (Айша) | «Ал мына керік сондай биік! Қасында үлкен піл тұр.» |
| Реплика PL (Ajsza) | «A ta żyrafa jest taka wysoka! Obok stoi wielki słoń.» |
| Звук | elephant toot, leaves rustle |

## 4. Құндыздың тоғаны — MS — средний план у водоёма

| | |
|---|---|
| Таймкод (KZ) | 00:16.4 – 00:23.4 |
| Таймкод (билингва) | 00:26.9 – 00:36.0 |
| Камера | gentle pan right to the pond, 1.0 → 1.08 |
| Композиция | pond fills the lower half, wooden dam on the right, beaver on a log at the centre, Arman on the bank bottom-left |
| Анимация | water ripples; beaver blinks, nose twitches, teeth shine; big call-out card with a long pointer |
| UI | card «Құндыз — «Bober» / Bóbr — «Bober»» @0.8 с |
| Реплика KZ (Арман) | «Ой, тоғанға қара! Бұл нағыз құндыз — Бобер!» |
| Реплика PL (Arman) | «Ojej, spójrz na staw! To prawdziwy bóbr — Bober!» |
| Звук | water, pop |

## 5. Бобер сәлем береді — CU — крупный план

| | |
|---|---|
| Таймкод (KZ) | 00:23.4 – 00:28.4 |
| Таймкод (билингва) | 00:36.0 – 00:44.7 |
| Камера | push-in on the beaver 1.05 → 1.15, small shake on the tail slap |
| Композиция | beaver large at the centre, kids laughing at the bottom corners, summary plate at the bottom |
| Анимация | beaver waves a paw; tail slaps the water, vector splash drops; kids laugh (bounce); summary plate slides up |
| UI | plate «Алматы хайуанаттар бағы / Zoo w Ałmaty» @1 с |
| Реплика KZ (Айша) | «Ол өте сүйкімді! Бүгінгі серуен өте қызықты өтті!» |
| Реплика PL (Ajsza) | «Jest taki uroczy! Dzisiejszy spacer był bardzo ciekawy!» |
| Звук | splash, kids laugh (music sting) |

## 6. Outro / CTA — Brand screen

| | |
|---|---|
| Таймкод (KZ) | 00:28.4 – 00:32.4 |
| Таймкод (билингва) | 00:44.7 – 00:50.6 |
| Камера | static, globe rotates |
| Композиция | title on top, snow-leopard cub mascot on a rotating stylised globe, flag clouds 🇰🇿 🇵🇱, books, a cup, Almaty mountains, glossy button at the bottom |
| Анимация | globe meridians rotate; mascot waves; clouds bob; CTA button pulses |
| UI | title «Тілдерді бірге үйренейік! / Uczmy się języków razem!» @0.2 с; cta «Жазыл! / Subskrybuj!» @0.8 с |
| Реплика KZ (Айша) | «Тілдерді бірге үйренейік!» |
| Реплика PL (Ajsza) | «Uczmy się języków razem!» |
| Звук | chime, music out |

## Озвучка

Запрошено edge-tts (kk-KZ-AigulNeural / kk-KZ-DauletNeural / pl-PL-ZofiaNeural / pl-PL-MarekNeural). В этом окружении сервер edge-tts закрыт сетевой политикой, поэтому сейчас звучат офлайн-голоса Piper:

- KZ · Айша — kk_KZ-raya-x_low, pitch ×1.06 (детский тембр, темп сохранён)
- KZ · Арман — kk_KZ-iseke-x_low, pitch ×1.22 (детский тембр, темп сохранён)
- PL · Ajsza — pl_PL-gosia-medium, pitch ×1.08 (детский тембр, темп сохранён)
- PL · Arman — pl_PL-darkman-medium, pitch ×1.25 (детский тембр, темп сохранён)

Переключение на edge-tts: `python3 scripts/tts.py --engine edge && npm run timing` (нужен доступ к speech.platform.bing.com).
