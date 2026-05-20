# Kế hoạch test thủ công — KilnFlow Ops

Tài liệu này hướng dẫn bạn (người test) chạy thủ công toàn bộ app KilnFlow Ops để kiểm chứng các tính năng đã build. Mỗi mục có ID test case (TC-XX), các bước thực hiện, kết quả mong đợi, và ô trống để bạn đánh dấu kết quả.

> Nếu bạn muốn bản walkthrough chi tiết hơn theo flow user-story, xem thêm [docs/manual-test-script.md](docs/manual-test-script.md). Tài liệu này là phiên bản checklist ngắn gọn dùng cho mỗi lần regression test.

---

## 0. Chuẩn bị môi trường

```bash
# Từ thư mục packages/claude (chính là repo này)
npm install                       # cài deps (lần đầu)
rm -f packages/backend/data/kilnflow.sqlite   # reset DB nếu cần test sạch
npm run seed                      # tạo SQLite + seed data
npm run dev                       # chạy backend (4000) + frontend (5173)
```

- Backend phải log: `[kilnflow] backend listening on http://localhost:4000`
- Mở <http://localhost:5173> trên Chrome/Firefox/Safari.
- Khuyến nghị mở DevTools (Network tab) để quan sát request/response khi test RBAC và 409.

| Pre-check | OK? |
|---|---|
| `npm run verify` xanh trước khi bắt đầu test thủ công | ☐ |
| Backend lắng nghe port 4000 | ☐ |
| Frontend chạy ở port 5173 | ☐ |
| DB SQLite có file `packages/backend/data/kilnflow.sqlite` | ☐ |

---

## 1. Đăng nhập mock (LoginPage)

| ID | Bước | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-01 | Mở `/` lần đầu (chưa có session) | Hiển thị LoginPage liệt kê 5 user (Mira, Tuan, An, Linh, Guest) | ☐ |
| TC-02 | Click chọn **Tuan (technician)** | Top bar hiện "Tuan · technician"; nav có Dashboard / Backlog / Intake / Planner / Loads | ☐ |
| TC-03 | Refresh trang sau khi đăng nhập | Vẫn giữ session (đọc `localStorage.kilnflow.userId`) | ☐ |
| TC-04 | Sign out → đăng nhập **Guest (observer)** | Nav **không** có mục Planner (RBAC ẩn) | ☐ |

---

## 2. Dashboard (mọi role)

| ID | Bước | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-10 | Đăng nhập bất kỳ role, mở `/` | 3 KPI card: Waiting, Eligible, Blocked — với seed data thì Waiting > 0 và Eligible > 0 | ☐ |
| TC-11 | Xem "Upcoming kiln loads" | Trống khi seed mới (chưa có load nào được schedule) | ☐ |
| TC-12 | Xem "Recent alerts" | Trống khi seed mới (chưa import CSV) | ☐ |
| TC-13 | Xem "Kiln capacity" | Liệt kê Skutt 1027 (55×55, 4 shelf, 75kg, h≤18cm) và Mini Raku (32×32, 2 shelf, 20kg, h≤14cm) | ☐ |

---

## 3. Backlog — Filter & Search

Đăng nhập **Tuan (technician)** → vào `/backlog`.

| ID | Bước | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-20 | Mở Backlog (chưa filter) | Thấy đủ 12 pieces seed | ☐ |
| TC-21 | Filter Owner = `An` | Chỉ hiển thị các piece của An (Celadon teacup, Shino vase, Mystery wood-ash, Garden planter, Porcelain raku, Commission plate) | ☐ |
| TC-22 | Reset → Filter Cone = `10` | Hiển thị Crawl-glazed mug + Earthenware cone 10 | ☐ |
| TC-23 | Reset → Filter Blocked reason = `unknown-glaze` | Chỉ còn "Mystery wood-ash test" | ☐ |
| TC-24 | Reset → Search "raku" | Hiển thị Raku-ready vase + Porcelain (raku-incompatible) | ☐ |
| TC-25 | Reset → Filter Due date trước ngày mai | Hiển thị "Commission plate" (urgent, due +1d) | ☐ |

---

## 4. Intake — Member tự quản lý piece

Đăng nhập **An (member)**.

| ID | Bước | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-30 | Mở `/intake`, submit với width = 0 | Form chặn submit, hiển thị "Width must be greater than 0." với `aria-describedby` liên kết tới field | ☐ |
| TC-31 | Submit với weight = 0 | Lỗi "Weight must be greater than 0." | ☐ |
| TC-32 | Submit với drynessPercent = 150 | Lỗi "Dryness must be between 0 and 100." | ☐ |
| TC-33 | Submit với dueDate sai format | Lỗi "Due date is invalid." | ☐ |
| TC-34 | Điền hợp lệ tất cả field (owner = An, glaze = clear, cone = 6, oxidation, 90% dry, weight 2kg, …) → Save | Redirect về Backlog, piece mới xuất hiện | ☐ |
| TC-35 | Mở chỉnh sửa 1 piece của **An** từ Backlog (icon edit) → đổi tên, save | Lưu thành công, Backlog cập nhật tên mới | ☐ |
| TC-36 | Mở URL trực tiếp `/intake/<id-của-piece-Linh>` rồi save | Hiển thị banner lỗi "Members can only edit their own pieces." (backend trả 403) | ☐ |
| TC-37 | Submit piece với `glazeFamily = unknown` | Vẫn lưu được; piece này sau đó sẽ bị planner loại với reason `unknown-glaze` | ☐ |

---

## 5. Planner — Constraint & Exclusion reasons

Đăng nhập **Tuan (technician)** → vào `/planner`.

### 5.1 Skutt 1027 / Cone 6 / Oxidation

| ID | Bước | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-40 | Chọn Skutt 1027, cone 6, oxidation → Preview plan | **Selected** chứa: Commission plate (urgent xếp đầu), Celadon teacup, Shino vase, Soda-sensitive cup | ☐ |
| TC-41 | Kiểm tra **Excluded** list | Crawl-glazed mug → `wrong-cone`; Fresh bowl → `under-dry`; Mystery wood-ash → `unknown-glaze`; Tall jug → `too-tall`; Garden planter → `over-weight`; Raku-ready vase / Porcelain raku → `wrong-firing-type`; Earthenware cone 10 → `wrong-cone` | ☐ |
| TC-42 | Quan sát thứ tự reason | Piece vừa under-dry vừa wrong-cone vẫn báo `under-dry` (dryness được check trước cone) | ☐ |
| TC-43 | Capacity usage trên plan | Hiển thị % volume, footprint, weight; weight không vượt 90% × 75kg = 67.5kg | ☐ |
| TC-44 | Click **Create draft load** | Điều hướng tới `/loads/<id>`, status `draft`, version v1 | ☐ |

### 5.2 Mini Raku / Cone 04 / Raku

| ID | Bước | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-45 | Preview Mini Raku, cone 04, raku | Selected: Raku-ready vase; Excluded: Porcelain (raku-incompatible) → `raku-incompatible-clay` | ☐ |

### 5.3 Skutt 1027 / Cone 10 / Reduction

| ID | Bước | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-46 | Preview Skutt 1027, cone 10, reduction | Earthenware cone 10 piece → reason `cone10-earthenware-blocked`; Crawl-glazed mug (cone 10, reduction, stoneware) → có thể được chọn | ☐ |

### 5.4 RBAC

| ID | Bước | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-47 | Sign out → đăng nhập **An (member)** → mở `/planner` | Hiển thị thông báo không có quyền (nav cũng ẩn mục Planner) | ☐ |

---

## 6. Load detail — State machine & RBAC

Mở draft load đã tạo ở TC-44.

| ID | Bước | Role | Kết quả mong đợi | OK? |
|---|---|---|---|---|
| TC-50 | Click **Regenerate plan** | Tuan | Version v1 → v2 | ☐ |
| TC-51 | Thêm technical note "starting test" | Tuan | Note xuất hiện trong audit list, author = "Tuan (technician)" | ☐ |
| TC-52 | Kiểm tra nút Approve | Tuan | **Không** hiển thị (RBAC ẩn) | ☐ |
| TC-53 | Sign out → đăng nhập **Mira (manager)** → mở cùng load | Mira | Hiển thị nút Approve, Schedule, Cancel | ☐ |
| TC-54 | Click **Approve** | Mira | Status → `approved`, version → v3 | ☐ |
| TC-55 | Chọn ngày tương lai trong input Schedule, click **Schedule** | Mira | Status → `scheduled`, hiển thị timestamp đã chọn, version tăng | ☐ |
| TC-56 | Click **Cancel load** | Mira | Status → `cancelled`, version tăng | ☐ |

---

## 7. Optimistic concurrency — 409 Conflict

| ID | Bước | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-60 | Tạo thêm 1 draft load mới (Tuan), mở trong 2 tab browser bằng Mira | Cả 2 tab cùng version | ☐ |
| TC-61 | Tab A: click **Cancel load** | Thành công, version bump | ☐ |
| TC-62 | Tab B (vẫn ở version cũ): click **Approve** hoặc **Schedule** | Banner conflict hiện ra, hiển thị server version hiện tại và nút Refresh | ☐ |
| TC-63 | Click Refresh trong banner | Tab B đồng bộ lại với state mới nhất | ☐ |

---

## 8. Sensor CSV import & Alerts

Đăng nhập **Tuan** hoặc **Mira**, mở 1 load `draft` hoặc `scheduled`.

| ID | Bước | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-70 | Paste CSV dưới đây vào textarea Import → click Import | Backend parse + lưu readings, chart render 2 đường (solid = actual, dashed = target) | ☐ |
| TC-71 | Section Alerts sau khi import | Có ít nhất 1 `RAMP_TOO_FAST` (giữa 10:00 → 10:30 ramp = 360°C/h > 180) và 1+ `TEMP_DEVIATION` severity `critical` (300 vs 180 = 120°C ≥ 100) | ☐ |
| TC-72 | Quay lại Dashboard | "Recent alerts" liệt kê các alert vừa tạo, link về đúng load | ☐ |
| TC-73 | Thử nhập CSV cố tình bẩn (cột thiếu, ký tự lạ) | Backend trả lỗi 400, UI báo lỗi parse, **không** crash, không eval code | ☐ |

```csv
timestamp,tempC,targetTempC,note
2026-05-19T09:00:00Z,24,24,start
2026-05-19T10:00:00Z,120,100,ramp ok
2026-05-19T10:30:00Z,300,180,ramp faster
2026-05-19T11:00:00Z,310,180,deviation persists
```

### 8.1 (Optional) UNEXPECTED_COOLDOWN

| ID | Bước | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-74 | Set status load = `firing` thủ công trong DB (`sqlite3 packages/backend/data/kilnflow.sqlite "UPDATE kiln_loads SET status='firing' WHERE id='<id>'"`), rồi import CSV với temp tụt > 180°C/h | Tạo alert `UNEXPECTED_COOLDOWN` severity `critical` | ☐ |

---

## 9. Observer — Read-only

Đăng nhập **Guest (observer)**.

| ID | Bước | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-80 | Dashboard, Loads list, Backlog | Đọc được nội dung | ☐ |
| TC-81 | Mở `/planner` | Hiển thị thông báo không có quyền (nav cũng ẩn) | ☐ |
| TC-82 | Mở `/intake` rồi save | Backend trả 403, UI hiển thị banner lỗi | ☐ |
| TC-83 | Mở 1 load detail | Không thấy nút Regenerate / Approve / Schedule / Cancel / Add note / Import CSV | ☐ |

---

## 10. API regression bằng curl (smoke test nhanh)

Lấy `<loadId>` từ `curl -s localhost:4000/api/loads | jq -r '.[0].id'`.

| ID | Lệnh | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-90 | `curl -s localhost:4000/api/health` | `{"status":"ok"}` (hoặc tương đương) | ☐ |
| TC-91 | Member approve load: `curl -s -X POST localhost:4000/api/loads/<id>/approve -H 'Content-Type: application/json' -H 'X-User-Id: user-an' -d '{"expectedVersion":1}'` | HTTP 403 | ☐ |
| TC-92 | Stale version: `curl -i -X POST localhost:4000/api/loads/<id>/cancel -H 'Content-Type: application/json' -H 'X-User-Id: user-mira' -d '{"expectedVersion":1}'` (sau khi đã có update) | HTTP 409, body `{"error":"...","current":{...}}` | ☐ |
| TC-93 | Thiếu header `X-User-Id` trên endpoint cần auth | HTTP 401 | ☐ |
| TC-94 | Gửi payload Zod-invalid (vd `width=-1`) | HTTP 400 với message rõ ràng | ☐ |

---

## 11. Accessibility & Responsive (spot-check)

| ID | Bước | Kết quả mong đợi | OK? |
|---|---|---|---|
| TC-100 | Tab qua tất cả input/button trên IntakePage chỉ bằng bàn phím | Mọi control đều focus được, focus ring rõ ràng | ☐ |
| TC-101 | Mỗi `<input>` có `<label>` liên kết qua `for/id` hoặc bao bọc | ✓ | ☐ |
| TC-102 | Resize cửa sổ xuống ~375px (mobile) | Layout không vỡ, nav chuyển sang dạng compact, bảng có scroll ngang nếu cần | ☐ |
| TC-103 | Alert hiển thị thông tin không chỉ qua màu (có icon hoặc text severity) | ✓ | ☐ |
| TC-104 | Heading hierarchy hợp lý (h1 → h2 → h3, không skip level) | ✓ (kiểm bằng axe DevTools hoặc HeadingsMap) | ☐ |

---

## 12. Sign-off cuối

| Mục | OK? |
|---|---|
| `npm run verify` chạy xanh (typecheck + test + build) | ☐ |
| Toàn bộ test case TC-XX ở trên đều pass | ☐ |
| Không phát sinh log lỗi nghiêm trọng ở backend khi chạy các flow trên | ☐ |
| Không có warning React không mong đợi trong DevTools console | ☐ |
| Đã reset DB và chạy lại được seed thành công | ☐ |

**Người test:** ____________________ **Ngày:** __________ **Kết quả tổng thể:** ☐ Pass ☐ Fail

---

## Phụ lục: Bug report template

Khi gặp lỗi, ghi lại như sau:

```
- TC ID:
- Role / Tab:
- Bước tái hiện:
- Kết quả thực tế:
- Kết quả mong đợi:
- Log backend / Network response liên quan:
- Screenshot (nếu UI):
```
