# QazaqVerse Voice — бэкенд аудио-движка

Два независимых контура: **оценка произношения** (STT) и **голоса персонажей** (TTS).

```
микрофон 16 кГц → VAD (silero) → +0,3 с тишины → STT → нормализация (числа словами) → взвешенный Левенштейн → 0–100 %
```

## 1. Оценка произношения

```
Score = (1 − WLev(H, T) / max(|H|w, |T|w)) × Confidence
```

`WLev` — расстояние Левенштейна по графемам, где ошибка на одной из девяти казахских букв (Ә І Ң Ғ Ү Ұ Қ Ө Һ)
стоит 1,5 вместо 1. Обратная связь называет конкретные буквы, которые не прозвучали. Алгоритм один и тот же
в `qv_audio/scoring.py` и в игре (`web/score-core.js`): 20 общих тестовых векторов сходятся до десятой процента.

### Запуск сервера

```bash
pip install -r requirements.txt

# модель из спецификации (нужны torch + transformers, желательно GPU)
python3 server.py --engine hf                       # shyngys879/kazakh-whisper-large-v3-turbo

# ноутбук без GPU: Whisper Turbo INT8 через sherpa-onnx
python3 server.py --engine whisper-onnx --model models/sherpa-onnx-whisper-turbo --vad models/silero_vad.onnx

# слабое железо: Omnilingual CTC (350 МБ) или Dolphin (100 МБ)
python3 server.py --engine omnilingual --model models/sherpa-onnx-omnilingual-asr-1600-languages-300M-ctc-int8-2025-11-12
```

ONNX-модели: `https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/<имя>.tar.bz2`, VAD — `silero_vad.onnx` там же.
В игре: профиль → «Дауыс» → адрес вида `http://192.168.1.10:8765` → «Проверить сервер».

API: `GET /health`, `POST /assess?target=<фраза>` (тело — WAV 16 бит). Только стандартная библиотека, CORS открыт
(игра работает с `file://`), размер тела и длина фразы ограничены, наружу не уходит ни один traceback.

### Замер на фразах игры

`tools/eval_stt.py` прогоняет весь конвейер на 150 фразах из игры (синтезированный голос, CPU 4 ядра):

| Движок | Средний балл | Медиана | Зачёт ≥ 70 % | Идеально | Задержка |
|---|---|---|---|---|---|
| Omnilingual CTC 300M (INT8) | 69,5 | 79,5 | 61 % | 17 % | 0,2 с |
| Whisper Turbo, стоковый (INT8) | 66,1 | 69,3 | 50 % | 16 % | 1,0 с |
| Dolphin base CTC (INT8) | 54,8 | 59,2 | 31 % | 1 % | 0,06 с |

Что из этого следует:

- **Стоковые модели казахский на коротких фразах распознают слабо** — даже чистый синтезированный голос.
  Дообученный `shyngys879/kazakh-whisper-large-v3-turbo` из спецификации должен быть заметно лучше, но
  **здесь он не проверен**: Hugging Face был недоступен из среды разработки. Код движка `hf` написан по
  документированному API Transformers и не запускался.
- Две находки замера уже встроены в конвейер: рамка тишины 0,3 с вокруг речи (Whisper: 35 → 56 баллов)
  и запись чисел словами («730» → «жеті жүз отыз»).
- Детский голос распознаётся хуже взрослого синтезированного, поэтому в игре голосовые задания
  **никогда не штрафуют**: неудачная попытка не отнимает сердечко, всегда есть «пропустить».

## 2. Голоса персонажей (k2-fsa/OmniVoice, без дообучения)

`qv_audio/voices.py` — матрица из 27 голосов (K1–K3, G1–G3, T1–T6, M1–M6, W1–W3, E1–E6).
`qv_audio/tts.py` — два этапа: дизайн голоса → банк эталонов, затем zero-shot клонирование реплик.

```bash
pip install torch torchaudio omnivoice soundfile
python3 tools/build_voice_bank.py --out voice_bank                        # этап 1: по 3 варианта на категорию
node ../tools/collect-phrases.js > phrases.json
python3 ../tools/make-audio.py phrases.json --engine omnivoice --bank voice_bank   # этап 2: озвучка игры
```

Расхождения с исходным брифом, проверенные по исходникам пакета `omnivoice` 0.2.1:

- Дизайн голоса принимает **только фиксированный словарь**: пол, возраст (`child / teenager / young adult /
  middle-aged / elderly`), высоту (`very low … very high pitch`), `whisper`, акценты. Описания вроде
  «energetic, bright resonance» модель не понимает, поэтому они хранятся как бриф для отбора дублей, а в
  модель идёт допустимая строка (`male, child, high pitch`).
- Отдельного «speaker_embedding.pt» нет: переиспользуемый отпечаток голоса — это `VoiceClonePrompt`
  (`create_voice_clone_prompt(...).save("M1.kk.pt")`).
- Дизайн обучен на китайском и английском; для казахского он может быть нестабилен, а клонирование с
  эталона на другом языке даёт акцент. Поэтому эталоны пишутся отдельно для `kk` и `ru`.
- Синтез «на лету на телефоне» нереален (диффузионная языковая модель, нужен GPU): реплики рендерятся
  заранее и кладутся в `web/audio/`.

**В APK сейчас** звучит Piper (`kk_KZ-issai-high`, ISSAI, CC BY 4.0): диктор и «дублёры» персонажей —
шесть дикторов модели плюс сдвиг высоты и темпа. Ключи файлов те же, так что рендер OmniVoice просто
заменит их без правки игры. Сам OmniVoice здесь **не запускался** — веса лежат на Hugging Face.

## Тесты

```bash
python3 -m unittest discover -s tests      # 12 тестов: формула, общие векторы, HTTP-контракт сервера
```
