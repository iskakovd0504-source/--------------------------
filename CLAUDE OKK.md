# CLAUDE.md — okk-ui (ОККМ)

Инструкция для агента/разработчика, впервые открывающего этот репозиторий.
Читается вместе с `HANDOFF.md` (текущее состояние работ) — **`HANDOFF.md` читать первым в начале каждой сессии**.

---

## 1. Что это

B2B SaaS «ОККМ» — контроль качества клиентских коммуникаций.
Бейджи-диктофоны **AB-400** пишут `.wav` → файлы попадают в S3 (раньше SFTP) →
backend их забирает, шлёт **целиком в мультимодальный LLM одним вызовом**
(транскрипт + чек-лист + сводка + оценка за один запрос) → результат в Postgres →
админка показывает дашборд, диалоги, сотрудников, настройки ИИ-аудитора.

Два живых тенанта (organizations): `azs` (АЗС, ~48 аудио) и `pharmacy`
(«Халык Арзан Фарм», 262 аудио).

**Ключевая особенность домена:** транскрипции нет как отдельного шага. Нет Whisper,
нет STT-сервиса. Аудио уходит в Gemini, обратно приходит готовый структурированный
JSON по схеме `AuditAnalysis`. Всё качество продукта = качество промпта + чек-листа.

---

## 2. Быстрый старт

```bash
cd /home/karmanov/aitomaton/okk-ui
cp .env.example .env          # заполнить секреты (см. §8)
docker compose up -d --build
```

**Реальные порты (в README указаны неверные — не верь README):**

| Что | URL |
|---|---|
| Админка (nginx + `app/`) | <http://localhost:8089/> |
| Backend напрямую | <http://localhost:18081/api/health> |
| API через nginx-прокси | <http://localhost:8089/api/health> |
| Swagger | <http://localhost:18081/docs> |

Логин по умолчанию: `admin@demo.local` / `demo` (см. §8 про ловушку с
`SEED_ADMIN_EMAIL`).

**Python — только через venv проекта:**
```bash
okk-ui-backend/.venv/bin/python --version   # → Python 3.12.7
```
Никогда не запускать код проекта системным интерпретатором.

**Тесты:**
```bash
cd okk-ui-backend && .venv/bin/python -m pytest tests/ -q
```

---

## 3. Карта репозитория

```
okk-ui/
├── okk-ui-backend/        # FastAPI + SQLAlchemy(async) + Alembic — ЕДИНСТВЕННЫЙ сервис
│   ├── src/
│   │   ├── main.py              # FastAPI app, lifespan запускает воркеры, prod-safety guard
│   │   ├── config.py            # ВСЕ настройки (pydantic-settings), единственный источник env
│   │   ├── deps.py              # CurrentUser / CurrentOrg / DbSession
│   │   ├── security.py          # JWT (access+refresh) + bcrypt
│   │   ├── analysis_schema.py   # AuditAnalysis — КОНТРАКТ с LLM
│   │   ├── filename_parser.py   # разбор имени AB-400 .wav
│   │   ├── ready.py             # «файл дописан?» (mtime_grace)
│   │   ├── api/                 # auth, dialogs, employees, analytics, settings, sync
│   │   ├── clients/             # openrouter.py, gemini_file_api.py + base/factory
│   │   ├── services/            # pipeline.py (ядро), ingest.py, scheduler.py,
│   │   │                        # audio_cache.py, audio_chunker.py
│   │   ├── storage/             # s3_adapter, sftp_adapter, filesystem_adapter
│   │   └── scripts/             # seed, ingest_once, pipeline_step, integration_test_*, gc
│   ├── alembic/versions/  # 4 миграции (0001..0004)
│   └── .venv/             # Python 3.12.7
├── app/                   # ⭐ РАБОЧАЯ АДМИНКА: index.html (1372 строки) + favicon.svg
├── landing/               # маркетинговый сайт + demo.html (мок нового дизайна, см. §6)
├── deploy/                # nginx-конфиг прода (okk.depa-team.com)
├── scripts/               # разовые пайплайн-скрипты (S3-заливка, конверт) + multi_dialog_eval/
├── docs/                  # PDF-инструкция к AB-400
├── pharmacy_archive/      # 262 .wav аптеки, 8kHz/mono (gitignored, только локально)
├── garbage/               # мусор на удаление (gitignored)
├── docker-compose.yml     # postgres + backend + nginx-фронт
├── nginx-okk-ui.conf      # конфиг nginx для локального docker-фронта
└── HANDOFF.md             # ⭐ текущее состояние работ — ЧИТАТЬ ПЕРВЫМ
```

---

## 4. Ветки — здесь легко потеряться

| Ветка | Что в ней |
|---|---|
| `master` | Полное приложение после реорганизации: backend + `app/index.html` + `landing/`. **Основная линия разработки.** `origin/master` существует и является предком локальной — push идёт fast-forward. |
| `feat/multi-dialog-split` | Ветка эксперимента multi-dialog, коммит в коммит = `master`. |
| `origin/main` (**default на remote!**) | Лендинг Дмитрия в корне + `demo.html` в корне + backend (отстаёт от `master` на 9 коммитов) + **легаси-дашборд `app.html` на 660 строк**. Реорганизованных `app/`/`landing/`/`deploy/`/`docs/` там нет. |
| `feat/llm-prompt-metrics-2026-07-03` | **Это то, что реально крутится на проде.** `master` опережает её на 45 коммитов. |
| `fix/gemini-thinking-budget*`, `design-dmitry` | Точечные/исторические ветки. |

⚠️ **Главная ловушка:** фикс `GEMINI_THINKING_BUDGET` (см. §11, п. 1) есть **только** в
прод-ветке `feat/llm-prompt-metrics-2026-07-03` и в `fix/gemini-thinking-budget*`.
В `master` и в текущей рабочей ветке его **нет**. Перед любой работой с
`gemini_file_api` проверь `grep thinking_budget okk-ui-backend/src/config.py`.

⚠️ `origin/main` — дефолтная ветка на remote, но она **до реорганизации репозитория**:
дашборд там — легаси `app.html` (660 строк, без pause/resume, без `reanalyze-failed`,
без живой матрицы пайплайна), а не `app/index.html`. Фронтовую работу вести там нельзя —
получится порт на вдвое устаревший дашборд плюс ручной мерж структуры каталогов.

Правила: `git status` перед любым изменением, `git add` по именам файлов (никогда
`git add -A`), `git push` — только после явного подтверждения пользователя.

---

## 5. Backend: как это работает

### 5.1 Поток данных

```
S3 (или SFTP/FS)
   │  ingest_loop (каждые INGEST_INTERVAL_SECONDS=30с, все орги подряд)
   │  ├─ list .wav → фильтр «файл дописан» (ready.py, mtime_grace 600с)
   │  ├─ parse_audio_filename() → метаданные; не распарсилось → rejected, строки в БД нет
   │  └─ upsert Employee + upsert Audio (status=new)
   ▼
audios (Postgres)
   │  stage workers (пулы, SELECT … FOR UPDATE SKIP LOCKED)
   │  ├─ download  (конкурентность STAGE_DOWNLOAD_CONCURRENCY=2)
   │  │     → скачать в AUDIO_CACHE_DIR/<org_id>/<object_key>, wave-проба
   │  │       (длительность/частота/каналы) → status=downloaded
   │  └─ process   (конкурентность STAGE_PROCESS_CONCURRENCY=3)
   │        → выбрать backend по AuditProfile → при необходимости нарезать чанки
   │        → analyze_audio() → _normalize_analysis() → (merge) → status=done
   ▼
transcripts (1:1 к audio) + analyses (1:N — история переанализов)
   ▼
/api/* → app/index.html
```

### 5.2 Стейт-машина `Audio.status`

```
new → downloading → downloaded → processing → done
                         ↑            │
                         └────────────┘  (ошибка: откат на предыдущий стабильный,
                                          status_attempts += 1)
                    после MAX_ATTEMPTS=5 → failed
```

- `downloading` / `processing` — транзиентные. При старте процесса
  `reset_transient_states()` откатывает их обратно (краш-recovery).
- Легаси-статусы `transcribing` / `transcribed` / `analyzing` остались в
  `AudioStatus` для совместимости со старыми строками — **новые строки с ними не пишутся**.
- `Organization.processing_paused=true` — оргу не делают ни ingest, ни process
  (`_claim_one` исключает такие орги через `notin_`).

### 5.3 Выбор LLM-бэкенда (важно: настройка в БД, а не в env)

В `_do_process`:
```python
backend = profile.analysis_backend or settings.analysis_backend   # 'openrouter' | 'gemini_file_api'
model   = profile.openrouter_model
if backend == "gemini_file_api":
    model = profile.gemini_model or settings.gemini_model
```
То есть `audit_profiles.analysis_backend` / `.openrouter_model` / `.gemini_model`
в БД **перебивают** env. Если поведение не совпадает с `.env` — смотри строку в БД.
При этом API `/api/settings/active` эти три поля **не отдаёт и не редактирует** —
менять только SQL'ем.

Пороги нарезки на чанки тоже зависят от бэкенда:

| Бэкенд | Порог | Размер чанка | Почему |
|---|---|---|---|
| `openrouter` | 600 с | 300 с | inline-аудио у Gemini через OpenRouter ≲10 МБ |
| `gemini_file_api` | 7200 с | 1800 с | File API тянет многочасовое аудио одним вызовом |

Аптечные файлы (max ~17 мин) при `gemini_file_api` **не чанкуются** — это важно,
потому что merge чанков имеет баг (§11, п. 6).

### 5.4 Контракт с LLM — `AuditAnalysis` (`src/analysis_schema.py`)

Единственный контракт между моделью и системой. Используется дважды: как
`response_format.json_schema` для OpenRouter (и `response_schema` для Gemini) **и**
как валидатор ответа.

```python
language: "ru"|"kk"|"en"|"unknown"
transcript: list[str]          # ["Спикер 1: …", …]; каждая строка с префиксом [MM:SS]
is_valid_dialog: bool          # False = тишина/шум/не деловой диалог
invalid_reason: str            # непусто только при is_valid_dialog=False
summary: str
quality_score: float           # 0..10
script_compliance_pct: int     # 0..100
tone: "neutral"|"warm"|"cold"|"aggressive"|"unclear"
checklist: list[ChecklistResult]   # {id, label, passed, evidence, comment}
issues: str                    # ПЛОСКИЙ ТЕКСТ, не список
```

**Инварианты, которые чинит `_normalize_analysis()` в `pipeline.py` (не в клиенте!):**
1. `len(checklist)` строго == числу пунктов активного `audit_profile.checklist_items`,
   id совпадают 1:1, без дублей → иначе `RuntimeError` и ретрай стадии.
2. Порядок чек-листа принудительно переупорядочивается под входной.
3. `script_compliance_pct` **пересчитывается детерминированно** =
   `round(100 * passed / total)`. Что вернула модель — игнорируется.
4. При `is_valid_dialog=False`: `transcript=[]`, `quality_score=0`,
   `script_compliance_pct=0`, `tone="unclear"`, все `passed=False`, `issues=""`,
   а `summary` в БД пишется как `"[<invalid_reason>] <summary>"`.

Если добавляешь новый бэкенд анализа — полная спека и шаблон лежат в конце
`HANDOFF.md` («Alternative AnalysisClient Implementation Spec»).

### 5.5 Формат имени файла AB-400

```
{user_id}_{office?}_{profile?}_{YYYYMMDD}_{HHMMSS}_{имя сотрудника}_{beydzh[N]?}_{N?}_{tail?}.wav
```
Пример аптеки: `00000001__20260702_214200_FarmacevtA_beydzh_1.wav`

- `user_id` — RFID-метка сотрудника, ключ для `employees.ab400_user_id`.
- Всё, кроме `user_id`/даты/времени, опционально; имя может быть составным.
- **Старый формат (`Test` / числовой профиль без алфавитного имени) отвергается** —
  `parse_audio_filename()` вернёт `None`, файл в БД не попадёт, только
  `stats.rejected_unparseable++`. Тихая потеря данных — если файлы «не появляются»,
  смотри сюда в первую очередь.
- Тесты формата: `okk-ui-backend/tests/test_filename_parser.py`.

---

## 6. Frontend — отвечая на вопрос «а новый фронт существует?»

### Коротко

**Работающий фронт — один: `app/index.html`.**
**«Новый фронт» существует только как статический мок-дизайн: `landing/demo.html`.
Это не приложение — там ноль запросов к API.**

### 6.1 `app/index.html` — то, что реально работает

- **1372 строки, один файл.** Vanilla JS, никакого фреймворка.
  **Vue здесь нет** (в `HANDOFF.md` написано «Vue admin frontend» — это неверно).
- Ни npm, ни сборки, ни бандлера. Правишь файл — обновляешь страницу. Всё.
- Единственная внешняя зависимость — шрифт Inter с Google Fonts.
- Роутинг: `location.hash` (`#/overview`, `#/dialogs`, `#/dialogs/<uuid>`).
- Авторизация: JWT в `localStorage` (`okk_access` / `okk_refresh`), автоматический
  refresh при 401 в обёртке `api()`.
- 4 вкладки: `📊 Обзор` (живая матрица пайплайна с поллингом), `💬 Диалоги`,
  `👥 Сотрудники`, `⚙️ Настройки ИИ`.
- Отдаётся nginx'ом из корня; `<base href="/">` в `<head>` — не ломай его,
  иначе поедут якоря на `/admin/#/...`.

### 6.2 `landing/demo.html` — мок нового дизайна

- **7088 строк, 457 КБ.** `landing/demo_okkm.html` — **побайтово идентичный дубликат**
  (≈900 КБ мёртвого веса в репозитории; при рефакторинге один из двух надо убить).
- **0 вызовов `fetch`.** Все данные генерируются в JS прямо на странице:
  30 аптек «Halyk Arzan Pharm», 30 сотрудников, 60 диалогов, захардкоженные транскрипты.
- Разделы: `📊 Обзор`, `💬 Чат`, `👥 Команда`, `📦 Оборудование` (скрыт
  `display:none`), `⚙️ ИИ`, плюс экраны деталей диалога и сотрудника.
- Автор — Дмитрий; ветка `design-dmitry` / `origin/main`.
- Публикуется как часть лендинга (ссылка `href="demo.html"` с главной), в лендинге
  есть тег Vercel Analytics.

### 6.3 Задача «обновить фронт» = порт дизайна `demo.html` на реальный API

Оценка из `HANDOFF.md`: **6–10 часов**. Ничего из этого ещё не начато.
Суть работы — взять вёрстку/CSS из `demo.html` и подключить к ней слой `api()`
из `app/index.html`, выкинув генератор моков.

**Разрыв между моком и реальным бэкендом (проверено по коду):**

| Экран в `demo.html` | Есть ли backend |
|---|---|
| Обзор / метрики | ✅ `GET /api/analytics/summary` |
| Графики по дням | ✅ `GET /api/analytics/timeseries` — **эндпоинт есть, но текущая админка его не использует** |
| Статистика по пунктам чек-листа | ✅ `GET /api/analytics/checklist-stats` — **тоже готов и не используется** |
| Список диалогов + деталь + аудио | ✅ `GET /api/dialogs`, `/{id}`, `/{id}/audio` |
| Список сотрудников | ✅ `GET /api/employees` |
| **Карточка сотрудника (деталь)** | ❌ отдельного `GET /api/employees/{id}` нет — только список с агрегатами |
| Настройки ИИ (промпт, чек-лист) | ✅ `GET/PUT /api/settings/active` |
| **📦 Оборудование / станции** | ❌ backend'а нет вообще (в моке и так скрыт) |
| **ИИ-коуч, генерация сценариев** | ❌ backend'а нет |
| **Сводный ИИ-отчёт по сети** | ❌ backend'а нет |
| **Группировка по филиалам/аптекам** | ⚠️ `Audio.office` в БД есть, эндпоинта агрегации по office — нет |

Вывод для планирования: два неиспользуемых аналитических эндпоинта — бесплатный
выигрыш при портировании; четыре фичи мока требуют нового бэкенда и в оценку
6–10 ч не входят.

⚠️ И ещё: если Phase 2 задачи multi-dialog (§11, п. 2) поедет, форма ответа
`/api/dialogs` изменится (N диалогов на одно аудио). Порт фронта и Phase 2 лучше
не делать параллельно вслепую.

### 6.4 Решения, принятые для порта (2026-08-03)

Ветка работ — `feat/frontend-port` от `master`. Выбранный подход: **растим
`app/index.html`**, перенося в него CSS и разметку мока экран за экраном, а не
переписываем `demo.html`. Приложение остаётся рабочим на каждом шаге.

**Светофор чек-листа.** В моке три состояния (`green`/`amber`/`red`), в
`AuditAnalysis` — булев `passed`. Контракт с LLM **не трогаем** (иначе промпт +
миграция + переанализ 300+ файлов за деньги). Маппинг на фронте:

| Состояние UI | Условие |
|---|---|
| 🟢 green | `passed: true` |
| 🔴 red | `passed: false` при `is_valid_dialog=true` |
| 🟡 amber | анализа нет, либо `is_valid_dialog=false` (тишина/не диалог) — в БД это `summary`, начинающийся с `[<invalid_reason>]`, и все `passed=false` |

Янтарный, таким образом, означает «оценить не удалось», а не «частично выполнено».

---

## 7. API — полный список

Всё под `/api`, всё кроме `health`/`ready`/`login`/`refresh` требует
`Authorization: Bearer <access>`. Изоляция тенантов — везде по
`user.organization_id`; **другого механизма прав нет** (роль `admin` в БД есть,
но нигде не проверяется).

| Метод | Путь | Заметки |
|---|---|---|
| POST | `/api/auth/login` | ⚠️ ищет юзера **по email глобально**, без фильтра по орге (§11, п. 8) |
| POST | `/api/auth/refresh` | |
| GET | `/api/auth/me` | |
| GET | `/api/dialogs` | фильтры `employee_id`, `status`, `from`, `to`, `limit≤500`, `offset` |
| GET | `/api/dialogs/{id}` | + транскрипт, чек-лист, issues |
| GET | `/api/dialogs/{id}/audio` | 409 если ещё не скачано, 410 если кэш подчистили |
| POST | `/api/dialogs/{id}/reanalyze` | создаёт **новую** строку `analyses`, старая остаётся |
| POST | `/api/dialogs/reanalyze-failed` | массово по орге |
| POST | `/api/dialogs/reanalyze-all` | массово ВСЁ по орге — дорого, это N вызовов LLM |
| GET | `/api/employees` | с агрегатами `dialogs_total/done`, средние оценки |
| PUT | `/api/employees/rfid/{ab400_user_id}` | правит и `Employee.display_name`, и денормализованный `Audio.employee_name` |
| GET/PUT | `/api/settings/active` | активный `audit_profile`: `system_prompt`, `checklist_items`, `reference_scripts`. **Не отдаёт** `analysis_backend`/`*_model` |
| GET | `/api/analytics/summary` | `headline_conversion_rate_pct` считается по пунктам с `is_headline: true` в чек-листе |
| GET | `/api/analytics/timeseries` | `metric=script_compliance_pct\|quality_score`, `days≤30` |
| GET | `/api/analytics/checklist-stats` | % прохождения по каждому пункту |
| GET | `/api/sync/status` | счётчики по статусам + флаг `paused` |
| POST | `/api/sync/run` | ingest прямо сейчас, синхронно |
| POST | `/api/sync/pause` | `{paused: bool}` — стопает и ingest, и обработку для орги |
| GET | `/api/health` | liveness, всегда 200 |
| GET | `/api/ready` | readiness, 503 если PG недоступен |

**Повторяющийся паттерн «последний анализ для аудио»** (коррелированный подзапрос
`max(Analysis.created_at)`) продублирован в `analytics.py` (×3), `employees.py` и
`dialogs.py` (×3). Если меняешь семантику `analyses` — надо править все места.

---

## 8. Конфигурация и переменные окружения

Единственный источник истины — **`okk-ui-backend/src/config.py`**. Всё, чего нет
там, ни на что не влияет.

Два `.env.example` с расходящимся содержимым — не путай:
- **`.env.example` в корне** → копируется в `.env`, читается docker-compose.
  **Это основной.**
- **`okk-ui-backend/.env.example`** → только для запуска backend'а вне докера.

### ⚠️ Ловушки в env

1. **`SEED_ADMIN_EMAIL` не работает.** В корневом `.env.example` и в README она есть,
   но `config.py` читает **`SEED_DEMO_ADMIN_EMAIL`** (`seed_demo_admin_email`).
   Задашь `SEED_ADMIN_EMAIL` — молча получишь дефолт `admin@demo.local`.
   (`SEED_ADMIN_PASSWORD` — а вот эта совпадает и работает.)
2. **`TRANSCRIPTION_MODEL`** в корневом `.env.example` — мёртвая переменная, в
   `config.py` её нет (осталась от эпохи отдельного STT-шага).
3. Дефолт `OPENROUTER_MODEL` расходится: `.env.example` → `anthropic/claude-haiku-4-5`,
   `config.py` и compose → `google/gemini-3.1-flash-lite`. Побеждает `.env`.
4. `GOOGLE_API_KEY` для eval-харнесса берётся из **корневого** `.env`, не из
   `okk-ui-backend/.env`.
5. **`sftp_ab400_config.txt`** — gitignored, но docker-compose bind-mount'ит его как
   файл. Если файла нет, Docker создаст на его месте **директорию**, seed молча
   пропустит создание `sftp_config`, и ingest для орги будет тихо скипаться
   (`no sftp_config for org`). Симптом: «файлы не подтягиваются, ошибок нет».

### Значимые настройки

| Env | Дефолт | Смысл |
|---|---|---|
| `ENVIRONMENT` | `dev` | `production` включает fail-fast guard в `main.lifespan()` |
| `DATABASE_URL` | `postgresql+asyncpg://okk:okk@postgres:5432/okk` | |
| `JWT_SECRET` | `dev-secret-change-me` | в prod проверяется на «слабость», процесс не стартует |
| `STORAGE_BACKEND` | `s3` | `s3` \| `sftp` \| `filesystem` |
| `S3_*` | — | прод: endpoint `s3.aitomaton.online`, bucket `okk`, `S3_PREFIX` пустой |
| `ANALYSIS_BACKEND` | `openrouter` | перебивается полем в `audit_profiles` |
| `GEMINI_MODEL` | `gemini-3-flash-preview` | |
| `GEMINI_THINKING_BUDGET` | `0` | **только в прод-ветке**, см. §4 и §11 п.1 |
| `INGEST_INTERVAL_SECONDS` | `30` | |
| `STAGE_DOWNLOAD_CONCURRENCY` / `STAGE_PROCESS_CONCURRENCY` | `2` / `3` | process упирается в rate limit провайдера |
| `AUDIO_CACHE_DIR` | `/data/audio` | должен совпадать с mount'ом тома |
| `AUDIO_READY_MTIME_GRACE_SECONDS` | `600` | файл «готов», если 10 мин не менялся |
| `AUDIO_DOWNSAMPLE_ENABLED` | `false` | вкл. → ffmpeg жмёт в 8 кГц моно (~4× экономии диска) |
| `AUDIO_CACHE_GC_ENABLED` | `false` | защита от чистки кэша во время массовой заливки |
| `MIGRATE_ON_START` | `true` | в k8s ставить `false` (миграции — initContainer) |
| `CORS_ALLOW_ORIGINS` | `*` | в проде НЕ `*` |

**Prod-safety guard** (`_enforce_prod_safety`): при `ENVIRONMENT=production` процесс
падает на старте, если `JWT_SECRET` дефолтный, `OPENROUTER_API_KEY` пустой,
`DATABASE_URL` содержит `okk:okk@`, или при `STORAGE_BACKEND=s3` не заполнены S3-креды.

---

## 9. База данных

Схема (`src/db/models.py`), 4 миграции в `alembic/versions/`:

```
organizations ─┬─ users            (уник. org+email)
               ├─ sftp_configs     (1:1 с оргой; ⚠️ пароль в PLAIN TEXT)
               ├─ audit_profiles   (активный — is_active=true; чек-лист в JSONB)
               ├─ employees        (уник. org + ab400_user_id)
               └─ audios           (уник. org + object_key)
                     ├─ transcripts  (1:1)
                     └─ analyses     (1:N — история переанализов, свежий по created_at)
```

- `sftp_configs.directory` используется **и для S3** как саб-префикс орги:
  `pharmacy` → `/pharmacy`, `azs` → `/uploads`. Это единственный механизм
  изоляции данных орг в бакете.
- Новая организация заводится **только SQL'ем** — UI/API для этого нет.
- Alembic: `alembic upgrade head` из `okk-ui-backend/`; при старте контейнера
  это делает `entrypoint.sh` (если `MIGRATE_ON_START != false`), затем гоняет
  идемпотентный `python -m src.scripts.seed`.

---

## 10. Тесты и полезные команды

Покрытие: `tests/test_filename_parser.py` + `tests/test_audio_chunker.py` (чистые
юниты, 32 шт.) и `tests/test_api_smoke.py` (API поверх реального Postgres, 9 шт.).
Pipeline и LLM-клиенты по-прежнему не покрыты. Для новых бэкенд-фич — TDD.

**API-тестам нужен живой Postgres**: модели используют `JSONB` и
`UUID(as_uuid=True)` из диалекта postgresql, sqlite/aiosqlite не подойдёт.

```bash
# один раз за сессию поднять тестовую БД (профиль `test`, данные в tmpfs,
# порт 55432, обычный `docker compose up` её НЕ трогает)
docker compose --profile test up -d postgres-test

# все тесты
cd okk-ui-backend && .venv/bin/python -m pytest tests/ -q
# без поднятой postgres-test API-тесты не падают, а скипаются:
#   32 passed, 9 skipped

# переопределить адрес тестовой БД
TEST_DATABASE_URL=postgresql+asyncpg://okk:okk@localhost:55432/okk_test \
  .venv/bin/python -m pytest tests/ -q

# интеграционные (реальный вызов LLM, очередь backend'а не трогают)
docker compose run --rm --entrypoint python okk-ui-backend -m src.scripts.integration_test_short
docker compose run --rm --entrypoint python okk-ui-backend -m src.scripts.integration_test_long

# разовый ingest / один шаг пайплайна
docker compose run --rm --entrypoint python okk-ui-backend -m src.scripts.ingest_once
docker compose run --rm --entrypoint python okk-ui-backend -m src.scripts.pipeline_step

# проверка prod-safety guard локально
ENVIRONMENT=production docker compose up okk-ui-backend   # должен упасть с внятным списком

# статусы аудио в локальной БД
docker compose exec postgres psql -U okk -d okk \
  -c "SELECT status, count(*) FROM audios GROUP BY status;"
```

---

## 11. Известные баги и техдолг

| # | Проблема | Где | Статус |
|---|---|---|---|
| 1 | **Gemini «thinking» съедает весь `max_output_tokens`** и обрезает JSON посреди строки (замерено: 62910 из 65536). Лечится `ThinkingConfig(thinking_budget=0)` | `clients/gemini_file_api.py`, `config.py` | Исправлено, но **только в прод-ветке** `feat/llm-prompt-metrics-2026-07-03`; в `master` фикса НЕТ |
| 2 | **Много клиентов в одном файле.** Бейдж пишет непрерывно: один `.wav` = до 14 независимых диалогов, а вся система считает 1 аудио = 1 диалог | схема, pipeline, API, UI | Phase 1 (харнесс) сделан, Phase 2 не начат |
| 3 | Промпт частично захардкожен: `build_system_prompt`, `_JSON_SCHEMA_HINT`, инвариантная логика | `clients/openrouter.py` | Отложено. Из БД правятся только `system_prompt` и `checklist_items` |
| 4 | Пароли SFTP в БД открытым текстом | `sftp_configs.password` | Отложено. Фикс ≈ Fernet + 1 миграция |
| 5 | Нет UI/API для создания организаций | — | Только SQL |
| 6 | **OR-merge чек-листа**: при склейке чанков `passed=True`, если прошёл ХОТЬ ОДИН чанк | `_merge_analyses` в `pipeline.py` | Проявляется только на длинных (чанкуемых) файлах; аптека ≤17 мин — не задевает |
| 7 | `create_storage_adapter(settings)` для `backend="sftp"` обращается к `settings.sftp_host` — **такого поля в `Settings` нет**, будет `AttributeError` | `storage/factory.py`; зовётся из `scripts/sftp_list_uploads.py` | Мёртвый путь. Реальный ingest использует `_build_adapter` в `ingest.py`, у него другая логика |
| 8 | `login` ищет юзера по email **без фильтра по организации**, хотя уникальность в БД — по паре (org, email). Два юзера с одинаковым email в разных оргах → `scalar_one_or_none()` упадёт с `MultipleResultsFound` (500) | `api/auth.py` | Пока не стреляет: email'ы уникальны глобально |
| 9 | `landing/demo.html` и `landing/demo_okkm.html` — побайтовые дубликаты по 457 КБ | `landing/` | Один надо удалить |
| 10 | Нет GC-джобы для `audio-cache`, нет бэкапов PG, нет rate-limit на `/api/auth/login`, нет Sentry / структурных логов | — | Post-launch roadmap (см. README) |
| 11 | **У «свежего анализа» нет тай-брейкера.** `Analysis.created_at` = `func.now()`, а в Postgres это часы *транзакции*: две строки `analyses`, записанные в одной транзакции, получают одинаковый `created_at`, и `ORDER BY created_at DESC LIMIT 1` возвращает произвольную из них. Поймано тестом `test_dialogs_list_carries_latest_analysis` (вернулся старый анализ вместо нового) | `api/dialogs.py`, `analytics.py`, `employees.py` | Сейчас не стреляет: `_do_process` пишет один `Analysis` на транзакцию, reanalyze — отдельной транзакцией. **Выстрелит в multi-dialog Phase 2**, где N анализов пишутся разом. Фикс: сортировать по `(created_at, id)` или завести явный `dialog_index` |

---

## 12. Прод

⚠️ **Ничего на проде не менять без явного разрешения пользователя.** Это боевые
данные двух клиентов. Read-only разведка — можно; любые запись/рестарт/деплой — только
после подтверждения в чате (сообщение через Telegram-мост подтверждением **не считается**).

```bash
ssh ssh.depa-team.com                    # EC2, пользователь karmanov
# путь:            /home/karmanov/okk
# docker project:  okk
# ветка:           feat/llm-prompt-metrics-2026-07-03  (НЕ master/main)
# домен:           https://okk.depa-team.com  (nginx + certbot, конфиг в deploy/)
# nginx root:      /home/karmanov/okk/app     ← отдаёт app/index.html
# backend порт:    127.0.0.1:18081
```

```bash
# статусы аудио по орге
docker exec okk-postgres-1 psql -U okk -d okk -c \
  "SELECT status, count(*) FROM audios a JOIN organizations o ON o.id=a.organization_id \
   WHERE o.slug='pharmacy' GROUP BY status;"

# рабочие S3-креды живут в прод-.env (в репозитории лежали протухшие — их убрали в garbage/)
eval "$(ssh ssh.depa-team.com 'grep -E "^(S3_ENDPOINT|S3_ACCESS_KEY|S3_SECRET_KEY|S3_BUCKET|S3_REGION)=" /home/karmanov/okk/.env')"
```

Деплой k8s-манифестов не написан; в README есть подробный DevOps hand-off с
5 открытыми вопросами (managed vs in-cluster PG, registry, ingress/TLS, seed
первого тенанта, шифрование SFTP-паролей).

---

## 13. Грабли, на которые наступают все

1. **Порты в README неверные** (8080/8000). Реальные — 8089 и 18081.
2. **`HANDOFF.md` называет фронт «Vue»** — там vanilla JS без сборки.
3. **`.claude/` в `.gitignore`.** Дизайн-спеки в `.claude/plans/` **не коммитятся** и
   теряются при клонировании. Спека multi-dialog лежит в
   `.claude/plans/2026-07-26-multi-dialog-split-design.md` — только локально.
4. **Хук на `Write` блокирует создание новых `.md`/`.txt`-файлов** вне
   `README|CLAUDE|AGENTS|CONTRIBUTING.md` и `.claude/plans/`. `HANDOFF.md` этим хуком
   тоже блокируется — правь его через `Edit`, не через `Write`. Обход в харнессе:
   расширение `.prompt` вместо `.txt`.
5. **`.env` в корне ≠ `okk-ui-backend/.env`.** Docker-compose читает корневой.
6. **Gemini недетерминирован даже при `temperature=0`** — на одном и том же файле счёт
   диалогов заметно плавает между прогонами. Не делай выводов по одному запуску.
7. `reanalyze` не перезаписывает анализ, а **добавляет строку** в `analyses`.
   «Текущим» считается самый свежий по `created_at`. Отсюда же вылезет конфликт при
   Phase 2 multi-dialog: `list[Analysis]` уже занят под историю.
8. `reanalyze-all` — это N вызовов LLM и реальные деньги. На аптеке это 262 вызова.
9. **ffmpeg нужен в образе** (стоит в Dockerfile) для даунсемпла; локально вне докера
   без ffmpeg даунсемпл молча пропускается с warning'ом.
10. `Audio.start_time` — **naive** `DateTime` (без таймзоны), берётся из имени файла.
    Все остальные timestamp'ы — timezone-aware. Аналитика приводит границы через
    `_dt_to_naive()`.
11. Проверка «файл дописан» = «mtime не менялся 600 с». Свежий файл появится в UI
    минимум через 10 минут после конца записи. Это не баг.
12. `scripts/_s3_env.py` по умолчанию читает `s3-creds` из cwd, но этот файл переехал
    в `garbage/` и ключи в нём протухли. Нужен `--creds-path` или живые креды.

---

## 14. Правила работы в этом репозитории

- **Начало сессии:** прочитать `HANDOFF.md`, подтвердить текущую задачу и состояние.
- **Конец сессии / незавершённая задача:** обновить `HANDOFF.md` (через `Edit`) —
  цель, сделано, блокеры, пошаговые следующие шаги.
- **Перед любым изменением:** `git status`. Файлы в `git add` — только по именам.
- **Коммит:** одна строка, `type: короткое описание`, без тела и без `Co-Authored-By`.
  Не коммитить и не советовать коммитить, пока изменения не отревьюены и релевантные
  тесты реально не прошли; если не проверено — так и сказать и предложить `stash`.
- **`git push` — только после явного подтверждения.**
- **Прод (БД, сервер, S3): никаких записей без явного разрешения.**
- Код: SOLID, TDD для новых бэкенд-фич. Комментарии — строчными буквами и только
  для неочевидной логики.
- Python — исключительно `okk-ui-backend/.venv/bin/python`. `docker compose`, не `docker-compose`.
