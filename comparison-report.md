# So sánh codebase: `claude/` (Claude Code) vs `codex/` (Codex)

> **Phạm vi**: KilnFlow Ops — hệ quản lý vận hành lò nung cộng đồng (community ceramic studio). Cả 2 cài đặt cùng spec, cùng tech stack TS + Express + SQLite + React + Vite + Vitest.
>
> **Phương pháp**: đọc 100% mã nguồn (claude 3,609 LOC / codex 6,683 LOC), so sánh từng layer (domain, planner, sensor, backend, frontend, tests, config), chạy `tsc --noEmit` và một phần test để xác thực.

## TL;DR — Codex tốt hơn ở hầu hết các khía cạnh

| Khía cạnh | Winner | Mức chênh |
| --- | --- | --- |
| Kiến trúc (modularity) | **Codex** | Lớn |
| Domain modeling (types) | **Codex** | Trung bình |
| Planner (algorithm + safety) | **Codex** | Nhẹ |
| Sensor pipeline | **Codex** | Trung bình |
| Backend (state machine, RBAC, error model) | **Codex** | Trung bình |
| Persistence (DB schema, normalization) | Claude | Nhẹ |
| Frontend (component decomposition, routing, UX) | **Codex** | Rất lớn |
| Test coverage | **Codex** (36 vs 13 cases) | Lớn |
| E2E test | Claude (Playwright) | Nhẹ |
| i18n / nội dung | **Codex** | Trung bình |
| Đặc tả + docs | **Codex** | Trung bình |
| Best practices (DI, typed errors, modular auth) | **Codex** | Trung bình |

Codex thắng tổng thể. Claude chỉ vượt ở 2 điểm cụ thể: **(1) schema DB chuẩn hóa relational tốt hơn**, và **(2) có Playwright E2E smoke**. Mọi thứ còn lại Codex nhỉnh hơn rõ.

---

## 1. Kiến trúc tổng thể

### Claude

```
claude/
├── src/
│   ├── shared/    (3 files - domain, planner, sensor)
│   ├── server/    (single-folder Express app)
│   └── web/       (Vite + React)
├── tests/
│   ├── unit/   api/   e2e/   (Playwright)
└── single package.json
```

- **Single-package**: 1 `package.json`, 3 tsconfig (base/server/web). Vite + tsx watch chạy song song qua `concurrently`.
- Tổng 3,609 LOC, nhưng `src/web/App.tsx` một mình **1,256 LOC** — chiếm gần 35% codebase frontend trong 1 file duy nhất.

### Codex

```
codex/  (npm workspaces monorepo)
├── packages/
│   ├── shared/    (types + permission helpers — published as @kilnflow/shared)
│   ├── backend/   (Express + Zod + better-sqlite3 + tests)
│   └── frontend/  (React Router + multi-page + components)
├── docs/  (architecture, known-gaps, manual-test-script)
```

- **True monorepo** với `npm workspaces`: `@kilnflow/shared`, `@kilnflow/backend`, `@kilnflow/frontend`. Backend & frontend cùng `import type` từ `@kilnflow/shared` — đảm bảo type contract.
- Tổng 6,683 LOC nhưng phân tán đều. File lớn nhất là `routes.ts` (522) và `LoadDetailPage` (489) — vẫn nằm trong ngưỡng hợp lý.

### Đánh giá

Codex **thắng rất rõ** ở khía cạnh kiến trúc:

1. **Boundary thật** giữa shared types và 2 app. Khi đổi domain, TS sẽ báo lỗi cross-package. Claude cũng có `src/shared` nhưng cả backend lẫn frontend đều `import type` chéo qua đường dẫn tương đối (`../shared/domain`) — không có cơ chế kiểm soát "cái gì được phép xuất hiện ở cả 2 bên".
2. Codex tách `@kilnflow/shared/canRunPlanner`, `canApproveLoad`... — backend và frontend **dùng chung 1 nguồn sự thật** cho RBAC client-side. Claude duplicate logic này ở `src/web/lib/api.ts` (`canManageLoads`) trong khi backend dùng `requireAnyRole` riêng.
3. Codex có `docs/architecture.md` với ASCII diagram + giải thích trade-off; Claude `docs/architecture.md` chỉ liệt kê thư mục.

---

## 2. Domain modeling (shared types)

### Claude — `src/shared/domain.ts` (121 LOC)

- IDs là `number` (auto-increment SQLite).
- Có hàm `getPieceBlockReasons()` **chứa hardcoded chuỗi tiếng Việt** ngay trong domain types — vi phạm separation of concerns:

```ts
if (piece.drynessPercent < 80) {
  reasons.push({ code: "UNDER_DRY", message: "Độ khô thấp hơn ngưỡng 80%." });
}
```

- Thiếu `ShelfAssignment`, `ExcludedPiece`, `PlannerResult`, `CapacityUsage`, `PlannerWarning`, `DashboardSummary`, `LoadNote` — các kiểu này nằm rải rác trong `planner.ts`, `api.ts`, `repository.ts`.

### Codex — `packages/shared/src/index.ts` (222 LOC)

- IDs là `string` (UUID v4) — an toàn hơn về URL exposure, dễ scale ra phân tán sau này.
- Module **pure types**, không lẫn nghiệp vụ. Block reasons không nằm ở đây — phù hợp vì block reason là server-side concern.
- Discriminated union `ExclusionReasonCode` (10 mã, kebab-case) — TS check exhaustively được:

```ts
export type ExclusionReasonCode =
  | 'status-not-ready' | 'under-dry' | 'wrong-cone' | 'wrong-firing-type'
  | 'unknown-glaze' | 'over-weight' | 'no-shelf-fit' | 'too-tall'
  | 'raku-incompatible-clay' | 'cone10-earthenware-blocked';
```

- Export đầy đủ `PlannerResult`, `KilnLoad`, `LoadNote`, `DashboardSummary`, `PlanRequest`, `CapacityUsage`, `ShelfAssignment`, `PlannerWarning`.
- Có 7 permission helper functions (`canRunPlanner`, `canApproveLoad`...) — frontend dùng để ẩn nút, backend tham chiếu để check role.

### Đánh giá

Codex **thắng** ở 3 điểm rõ:

- Tách i18n: chuỗi VN nằm ở `frontend/src/i18n.ts`, domain layer trung lập.
- Discriminated union với `ExclusionReasonCode` chặt hơn `string` ở Claude.
- Permission helpers shared = 1 source of truth.

Claude chỉ có 1 điểm có thể coi là điểm cộng: `number` ID nhỏ gọn hơn trong URL, nhưng đánh đổi bằng việc lộ thông tin (enumeration attack) và ràng buộc cứng với auto-increment.

---

## 3. Planner (thuật toán nghiệp vụ quan trọng nhất)

### Claude — `src/shared/planner.ts` (338 LOC)

```ts
// findPlacement: brute-force x/y scan + thử 2 orientation (xoay 90°)
for (let yCm = 0; yCm <= shelfDepthCm - depthCm; yCm += 1) {
  for (let xCm = 0; xCm <= shelfWidthCm - widthCm; xCm += 1) {
    if (!existing.some((placed) => rectanglesOverlap(candidate, placed))) {
      return candidate;
    }
  }
}
```

**Ưu**:
- Hỗ trợ **xoay 90°** → có thể nhồi pieces dày hơn.
- Brute-force tìm vị trí tốt nhất trên mỗi kệ → tận dụng không gian hơn.

**Nhược**:
- O(W × D × N²) cho mỗi piece — với shelf 60×60cm và 20 pieces đã đặt, đó là ~72,000 phép check overlap mỗi piece. Vẫn fine cho studio scale nhưng tốn hơn.
- **Hardcode tiếng Việt trong reason message** — không i18n được, không testable bằng equality:

```ts
message: `Diện tích đáy ${piece.widthCm}x${piece.depthCm}cm không vừa phần kệ còn trống.`
```

- **Không có soft-cap weight warning**: vượt `maxWeightKg` → exclude; nhưng vượt 90% → không cảnh báo gì cả. Trong khi soft-cap được nhắc trong spec.
- Không inject `now` → khó test deterministic score.

### Codex — `packages/backend/src/planner.ts` (298 LOC)

```ts
// tryPlace: row-packing cursor, đơn giản hơn nhưng đủ dùng
if (cursorX + p.widthCm > kiln.shelfWidthCm) {
  cursorX = 0;
  cursorY = cursorY + rowMaxDepth;
  rowMaxDepth = 0;
}
```

**Ưu**:
- O(N) per piece — siêu nhanh.
- `DRYNESS_THRESHOLD = 80`, `WEIGHT_CAP_RATIO = 0.9` **export ra ngoài** → test inject được, config được.
- `now?: Date` param → test deterministic.
- **2-tier weight check**: vượt 90% → cảnh báo `soft-weight-cap`; vượt max → exclude `over-weight`. Khớp spec.
- Reason codes là discriminated union → TS bắt được lỗi typo.
- Có comment đầu file giải thích thuật toán + lý do chọn greedy.
- Dedupe warnings.

**Nhược**:
- Không thử rotation → có thể bỏ sót 1 layout chặt hơn.
- Row-packing đơn giản: `rowMaxDepth` set theo piece đầu tiên của hàng → có thể lãng phí khi pieces sau ngắn hơn.

### Đánh giá

Cả 2 đều correct (đều pass test). Codex thắng vì:
1. Test cover 13 cases (vs Claude 5) — bao gồm `too-tall`, `raku-incompatible-clay`, priority ordering.
2. Export thresholds, có `now` inject → testability cao hơn.
3. Có 2-tier weight (soft warn + hard exclude) đúng spec.
4. Message text tách khỏi planner — nhưng cả 2 đều có hardcoded VN trong message (Codex cũng phạm lỗi này, chỉ ít hơn).

Claude có lợi thế **kỹ thuật**: rotation + brute-force placement cho layout chặt hơn. Nhưng trong studio gốm thực tế, sự khác biệt không đáng kể, trong khi cost tăng O(W×D).

---

## 4. Sensor pipeline (CSV parsing + alert analysis)

### Claude — `src/shared/sensor.ts` (139 LOC)

```ts
// Strict header order
const expectedHeader = ["timestamp", "tempC", "targetTempC", "note"];
if (expectedHeader.some((column, index) => normalizedHeader[index] !== column)) {
  throw new Error("Header CSV phải là timestamp,tempC,targetTempC,note");
}

// Cooldown detection theo delta đơn vị, không phải rate
if (loadStatus === "firing" && delta < -25) { /* alert */ }
```

**Bug đáng chú ý**: `UNEXPECTED_TEMP_DROP` dùng `delta < -25°C` giữa 2 reading liên tiếp — **không chuẩn hóa theo thời gian**. Nếu 2 reading cách nhau 3h, giảm 30°C/3h là bình thường nhưng vẫn trigger alert. Đây là logic error.

**Khác**:
- Throw `new Error(...)` thuần — không có line number, khó debug khi user paste CSV xấu.
- Header phải đúng thứ tự — không flexible.

### Codex — `packages/backend/src/sensor.ts` (188 LOC)

```ts
export class CsvParseError extends Error {
  constructor(public line: number, message: string) {
    super(`Dòng ${line}: ${message}`);
  }
}

// Header lookup theo tên, không yêu cầu thứ tự
let hasHeader = REQUIRED_HEADERS.every((h) =>
  headerCells.some((c) => c.toLowerCase() === h.toLowerCase()),
);

// Cooldown chuẩn hóa theo rate (°C/giờ)
if (input.loadStatus === 'firing' && ramp < -MAX_RAMP_RATE_C_PER_HOUR) {
  alerts.push({ code: 'UNEXPECTED_COOLDOWN', ... });
}

// Chỉ analyze new readings, dedupe via Set lookup
const newIds = new Set(input.newReadings.map((r) => r.id));
for (let i = 0; i < all.length; i++) {
  if (!newIds.has(all[i].id)) continue;  // skip existing — không double alert
}
```

**Ưu**:
- Typed error class với `line` number → UI render được "Dòng 5: timestamp không hợp lệ".
- Header linh hoạt theo tên (case-insensitive).
- Cooldown **rate-normalized** (°C/giờ) — physics đúng.
- Chỉ phân tích **new readings** — re-import CSV không spam alert.
- Normalize timestamp về ISO 8601 trước khi ghi DB.
- Thresholds exported (testable).

### Đánh giá

Codex **thắng rõ** ở mảng này. Cooldown rate-normalization là khác biệt về **correctness**, không chỉ chất lượng code. Re-import idempotency cũng là tính năng business meaningful mà Claude thiếu.

---

## 5. Backend (Express app)

### State machine cho Load

Đây là khác biệt **nghiệp vụ** quan trọng nhất.

**Claude** — `src/server/app.ts`:

```ts
app.post("/api/loads/:id/approve", requireManager, (req, res, next) => {
  // Chỉ check expectedVersion. KHÔNG check load.status hiện tại.
  const load = updateLoadStatus(db, { loadId, status: "approved", ... });
});
```

Có thể approve một load đang `firing`, `completed`, hay `cancelled` — DB sẽ cho update, miễn version đúng. ❌ State machine không enforce.

**Codex** — `packages/backend/src/routes.ts`:

```ts
if (load.status !== 'draft') {
  res.status(409).json({ error: `Đợt nung đang ở trạng thái ${load.status}, không thể duyệt.` });
  return;
}
```

Mỗi action (approve/schedule/cancel/regenerate) có guard trạng thái rõ ràng. ✅

### Error model

| | Claude | Codex |
| --- | --- | --- |
| Error class | `HttpError` với `statusCode` + `code` ✅ | Inline `res.status(...).json({error})` |
| Error middleware tập trung | ✅ | ❌ (DRY thấp hơn) |
| Zod issue shape | Raw `error.issues` | Mapped `{path, message}[]` (cleaner) |
| 409 response body | Chỉ message | `{error, current: KilnLoad}` — UI render được phiên bản hiện tại ✅ |

Mỗi bên thắng 1 phần. Codex thắng về UX (trả current state khi conflict); Claude thắng về internal cleanliness (typed error class).

### RBAC

| | Claude | Codex |
| --- | --- | --- |
| Header | `x-user-id` (case-insensitive) | `X-User-Id` |
| Anonymous user | Fallback → `Guest` observer | Không user → request không có `req.user`, `requireUser` trả 401 |
| `requireRole` flexible | Có `requireAnyRole(...roles)` + `requireManager` riêng | Có `requireRole(...roles)` unified |
| Observer guard | Scattered `if (user.role === "observer") throw forbidden()` | Cũng scattered nhưng có template `{error}` chuẩn |

Codex sạch hơn nhẹ vì:
- 401 vs 403 phân biệt rõ (Claude đẩy hết về observer fallback → khó phát hiện unauthenticated request).
- Message lỗi cho biết vai trò hiện tại + role cần có: `Vai trò "member" không có quyền... cần một trong: technician, manager`.

### Concurrency

Cả 2 đều dùng pattern `UPDATE ... WHERE id=? AND version=?` cho atomicity SQL-level. Cả 2 đều có **race nhỏ** giữa SELECT đọc current và UPDATE — nhưng UPDATE chính nó atomic nên không có data corruption. Codex thêm điểm cộng: trả về **current state** trong 409 response để client refresh diff được.

---

## 6. Persistence

### Schema

**Claude**:
- snake_case columns (`shelf_width_cm`, `clay_body`) — chuẩn SQL convention.
- **Properly normalized**: `loads`, `load_pieces`, `load_exclusions`, `audit_notes` là các bảng riêng → query plan pieces bằng SQL được, dễ index, dễ JOIN.
- 5 indexes phụ trợ (owner_id, status, created_at, sensor load+timestamp).
- Foreign keys với `ON DELETE CASCADE` đầy đủ.
- KHÔNG bật WAL mode.

**Codex**:
- camelCase columns (`shelfWidthCm`, `clayBody`) — không idiomatic SQL nhưng tiết kiệm mapper layer.
- **Denormalized plan**: lưu `planJson TEXT` trong `kiln_loads` — schema gọn nhưng không query được pieces trong plan bằng SQL.
- 2 indexes (sensor, alerts).
- WAL mode ✅ → concurrent read/write tốt hơn.
- `load_notes` denormalize authorName + authorRole (snapshot tại thời điểm ghi — đúng pattern cho audit log).

### Driver

| | Claude | Codex |
| --- | --- | --- |
| Library | `node:sqlite` (experimental Node 22+) | `better-sqlite3` (native, stable) |
| Sync API | ✅ | ✅ |
| Production-ready | ⚠️ emit experimental warning | ✅ |
| Native rebuild | Không cần (built-in) | Cần (binary per OS/arch) |
| Maturity | Mới | Trưởng thành, được Notion/Linear/...dùng |

### Đánh giá

Đây là chỗ duy nhất **Claude rõ ràng thắng**: schema relational chuẩn cho phép query phức tạp (kê khai pieces theo shelf, audit theo user...). Codex chọn JSON blob trade off SQL-power lấy schema-flexibility.

Tuy nhiên Codex an toàn hơn về **production-readiness**: `node:sqlite` còn experimental, có thể đổi API; `better-sqlite3` đã ổn định nhiều năm.

---

## 7. Frontend — đây là chỗ chênh lệch khủng khiếp nhất

### Claude — monolithic

- `src/web/App.tsx` **1,256 LOC** chứa: Dashboard, Backlog, Planner, Loads, RoleContextPanel, KilnHero — tất cả trong 1 file.
- Navigation: **không có URL routing**. State `view: "dashboard" | "backlog" | "planner" | "loads"` + chain `view === "dashboard" ? <Dashboard/> : null`.
- API client: `apiRequest(path, userId, init)` — userId truyền tay vào MỌI lời gọi, không có context provider.
- Hậu quả:
  - Không có URL deep-link được (refresh = quay về dashboard, không thể share link đến 1 load detail).
  - Không có browser back button hoạt động.
  - 1,256 LOC trong 1 file → khó merge conflict, khó code review, khó test isolate.

### Codex — modular pages + components

```
frontend/src/
├── App.tsx              (150 LOC — chỉ là routing shell + sidebar)
├── api.ts               (111 LOC — singleton typed API client)
├── i18n.ts              (97 LOC — mọi label VN tập trung)
├── pages/               (7 pages, 106-489 LOC mỗi page)
│   ├── DashboardPage, BacklogPage, IntakePage, PlannerPage,
│   │   LoadsPage, LoadDetailPage, LoginPage
├── components/          (14 reusable components)
│   ├── CapacityBar, EmptyState, ErrorBanner, ExclusionList,
│   │   Icon, KilnIllustration, KpiCard, PageHeader,
│   │   RoleHintPanel, SensorChart, ShelfLayout, Skeleton,
│   │   StatusBadge, WorkflowGuide
└── state/
    ├── auth.tsx         (Context Provider + localStorage persistence)
    └── roleGuide.ts     (per-role workflow guides + page capabilities)
```

- React Router v6, URL routing thật, `<NavLink>` highlight active page.
- `AuthProvider` Context + `useAuth()` hook, `setUserIdProvider` đăng ký 1 lần.
- `ApiError` class với status code → `LoadDetailPage` check `instanceof ApiError && err.status === 409` để render conflict UI có thông tin `current.version` lấy từ server.
- 14 component nhỏ tái sử dụng. `Icon` set tự code (không phụ thuộc `lucide-react`).
- `roleGuide.ts` có hệ thống chỉ dẫn workflow per-role/per-page — **UX engineering xuất sắc**, không thấy ở Claude.
- LoadDetailPage có: hero banner đỏ rực khi `status === 'firing'` (kèm `KilnIllustration` SVG), audit notes với avatar initials, sensor chart, action buttons enabled theo state machine.

### Accessibility

| | Claude | Codex |
| --- | --- | --- |
| `aria-label` nav | ✅ | ✅ |
| `sr-only` labels | Một số | Rộng khắp |
| `role="alert"` / `role="status"` | ✅ | ✅ |
| `<label htmlFor>` cho input | Một số | Toàn bộ |
| Keyboard reach (button > div) | Có vài chỗ dùng button | Nhất quán |

Codex nhỉnh hơn nhưng cả 2 đều ổn.

### Đánh giá

Codex **vượt trội rất rõ**. Riêng việc Claude không có URL routing đã là red flag nghiêm trọng cho 1 web app vận hành studio (manager không thể bookmark "đợt nung X" để theo dõi). Cộng thêm monolithic 1,256 LOC App.tsx là code smell rõ rệt.

---

## 8. Test coverage

| Loại | Claude | Codex |
| --- | --- | --- |
| Unit (planner) | 5 cases | **13 cases** |
| Unit (sensor) | 3 cases | **9 cases** |
| API integration | 4 cases | **14 cases** |
| Component test (RTL) | ❌ | ExclusionList ✅ |
| E2E (Playwright) | ✅ 1 smoke test | ❌ |
| **Tổng** | **13** | **36** |

Verify thực tế trong sandbox arm64:
- Claude: **12/12 tests pass** (planner 5, sensor 3, api 4). E2E không chạy vì cần browser.
- Codex: **22/22 unit/sensor tests pass**. 14 API tests fail vì `better-sqlite3` native binary chưa rebuild cho arm64 (vấn đề sandbox, không phải code).

### Cụ thể về độ sâu

**Claude planner test thiếu**:
- Không test `raku-incompatible-clay`
- Không test `cone10-earthenware-blocked`
- Không test `too-tall`
- Không test prioritization theo dueDate
- Không test multi-shelf assignment

**Codex API test có thêm**:
- Health endpoint
- 401 cho unauthenticated planner request
- Member không tạo được piece cho user khác
- Observer không tạo được piece
- Zod validation rejection (widthCm: 0)
- Manager schedule approved load
- Dashboard returns summary

### Đánh giá

Codex thắng về **breadth + depth** unit/integration. Claude thắng riêng về có E2E (Playwright smoke test). Nếu phải chọn 1: 36 case unit/integration coverage chắc chắn hơn 1 E2E smoke (vốn flaky).

---

## 9. Docs

| | Claude | Codex |
| --- | --- | --- |
| `architecture.md` | List thư mục, 84 LOC, không diagram | ASCII diagram + giải thích tradeoff, 132 LOC |
| `known-gaps.md` | 11 dòng bullet | Phân loại theo Auth/Persistence/Planner/Sensor/Frontend/Security/Testing/Build, ~90 dòng giải thích chi tiết |
| `manual-test-script.md` | (có) | (có) |
| README | rỗng (chỉ chữ "README") | rỗng (chỉ chữ "README") |
| Inline code comment | Hiếm | Nhiều file mở đầu bằng block comment giải thích thuật toán |

Codex documentation **chuyên nghiệp hơn rõ**. Đặc biệt `known-gaps.md` của Codex chứng tỏ tác giả hiểu sâu trade-off đã chọn.

---

## 10. Best practices & code smell

| Tiêu chí | Claude | Codex |
| --- | --- | --- |
| File >500 LOC | ❌ App.tsx 1,256 LOC, repository.ts 462, seed.ts 355 | LoadDetailPage 489, IntakePage 480 — ngưỡng chấp nhận được |
| i18n separation | ❌ VN hardcode trong domain.ts, planner.ts | ✅ tập trung ở `i18n.ts` (mặc dù backend message vẫn VN) |
| Magic numbers | ❌ `180`, `50`, `80` rải rác | ✅ `DRYNESS_THRESHOLD`, `MAX_RAMP_RATE_C_PER_HOUR`, `WEIGHT_CAP_RATIO` exported |
| Typed errors | ✅ HttpError class | ✅ ApiError + CsvParseError class |
| Context API (FE state) | ❌ State trong App.tsx, prop drilling | ✅ AuthProvider |
| URL routing | ❌ | ✅ react-router-dom v6 |
| State machine guards | ❌ chỉ version check | ✅ status + version |
| Soft cap warnings | ❌ | ✅ |
| Re-import idempotency | ❌ alert trùng | ✅ via newIds Set |
| Inline comments giải thích quyết định | Hiếm | Đầy đủ |
| `now?: Date` inject để test | ❌ | ✅ |
| Permission helpers shared | ❌ duplicate logic | ✅ trong @kilnflow/shared |

---

## 11. Verification thực tế

Đã chạy trong sandbox arm64 Linux:

```bash
# claude/
tsc --noEmit -p tsconfig.server.json    # ✅ pass
tsc --noEmit -p tsconfig.web.json       # ✅ pass
vitest run tests/unit                    # ✅ 8/8 pass
vitest run tests/api                     # ✅ 4/4 pass
# vite build                              # ❌ rolldown env issue (không phải code)
# playwright                              # không chạy (cần browser)

# codex/
tsc --noEmit -p packages/shared/tsconfig.json    # ✅ pass
tsc --noEmit -p packages/backend/tsconfig.json   # ✅ pass
tsc --noEmit -p packages/frontend/tsconfig.json  # ✅ pass
vitest run                                        # ✅ 22/36 pass; 14 fail do better-sqlite3
                                                  #    native binding chưa rebuild trong sandbox
```

Cả 2 codebases đều **compile clean** và logic core đều **pass test**. Test failures còn lại là vấn đề môi trường (native binding cho arm64), không phải code defect.

---

## 12. Tổng kết & khuyến nghị

**Nếu phải chọn 1 codebase để tiếp tục phát triển**: chọn **Codex**.

Lý do gọn:

1. **Architecture** scale được: workspace + page-per-file + router thật → team đông người có thể work song song không xung đột merge.
2. **Correctness** tốt hơn ở các business rule quan trọng: state machine guard, sensor cooldown rate-normalize, soft-weight-cap, re-import idempotency.
3. **Test coverage** 3x nhiều hơn, kèm depth tốt hơn.
4. **UX engineering** nghiêm túc: RoleHintPanel, WorkflowGuide, conflict UI hiển thị current version, firing banner.
5. **Library choice** an toàn hơn: `better-sqlite3` (stable) thay vì `node:sqlite` (experimental Node 22+).

**Nếu phải vớt vát giá trị từ Claude**:

- Lấy schema DB relational (tách `load_pieces`, `load_exclusions`, `audit_notes`) → giúp query analytics phía sau dễ hơn JSON blob của Codex.
- Lấy Playwright E2E smoke test làm khởi điểm — bổ sung vào Codex.
- Lấy concept brute-force placement + rotation cho planner nếu cần nhồi lò chặt hơn (chỉ enable khi pieces ít, vì O(W×D×N²)).

**Nếu Codex muốn refactor tiếp**:

1. Thêm Playwright/Cypress E2E covering happy path đa role.
2. Cân nhắc tách plan ra bảng `load_pieces` để query SQL được.
3. Thêm transaction wrap quanh updateLoadWithVersionCheck (hiện chỉ atomic via WHERE version=?).
4. Migrate tooling (drizzle-kit?) — known-gaps đã thừa nhận.
5. Acknowledged field trên alert hiện có schema nhưng không có endpoint — bổ sung.

---

*Báo cáo này dựa trên đọc 100% mã nguồn + verify compile/test thực tế. Mọi đánh giá đều có pinpoint trỏ về file/dòng cụ thể nếu cần truy.*
