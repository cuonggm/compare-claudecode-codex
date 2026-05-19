# Đề bài test Codex vs Claude Code: **KilnFlow Ops** — bản local, 1 prompt duy nhất

> Mục tiêu: dùng **một prompt duy nhất** cho mỗi nền tảng để agent tự chạy từ repo local đến thành phẩm cuối cùng.  
> Không dùng luồng “plan trước rồi approve sau”. Agent có thể tự lập kế hoạch ngắn trong quá trình làm, nhưng **không được dừng lại để xin approve plan**.  
> Ngày soạn: 2026-05-19.  
> Chủ đề được chọn cố tình tránh các bài phổ biến kiểu todo app, clone Trello, ecommerce, weather app, chat app, booking app, CRM mini, dashboard crypto.

---

## 1. Tóm tắt nghiên cứu nền tảng

### OpenAI Codex — điểm mạnh nên khai thác trong bài test

- Codex là coding agent có thể đọc, sửa và chạy code trong repo; bản cloud có thể chạy task nền/parallel và tạo pull request.
- Codex hợp với task có **Goal / Context / Constraints / Done when** rõ ràng; tài liệu chính thức khuyến nghị dùng cấu trúc prompt có mục tiêu, bối cảnh, ràng buộc, tiêu chí hoàn tất và lệnh xác minh.
- `AGENTS.md` là kênh quan trọng để lưu quy ước repo, lệnh build/test/lint, constraint, “done means” và expectation khi review.
- Codex có sandbox/approval/network controls. Với bài test chạy local, vẫn nên tránh API ngoài, secret thật và side effect ngoài repo.
- Codex mạnh ở long-horizon agentic coding khi spec có checkpoint, validation, diff scope và vòng sửa lỗi.

### OpenAI Codex — điểm yếu/rủi ro cần test

- Dễ mất chất lượng nếu prompt mơ hồ, thiếu “done when”, thiếu lệnh verify, hoặc repo setup không rõ.
- Network/install dependency có thể bị chặn hoặc lỗi; bài test nên cho phép fallback và không dùng API trả phí.
- Agent có thể “pass cho xong” nếu acceptance criteria không chống fake tests, skipped tests, hardcoded data hoặc bypass logic.
- Nếu spec quá mở, Codex có thể mở rộng scope quá mức; cần buộc giữ scope và self-review diff.

### Claude Code — điểm mạnh nên khai thác trong bài test

- Claude Code là agentic coding tool chạy trong terminal/IDE/web, đọc codebase, sửa file, chạy lệnh, dùng CLI tools và tích hợp workflow.
- Claude Code có workflow plan → implement → test → review, hỗ trợ memory qua `CLAUDE.md`, và thường mạnh ở codebase navigation, multi-file edit, debugging, frontend/UI reasoning, TDD và xử lý edge case.
- Các best practices của Anthropic nhấn mạnh: cho Claude cách tự verify bằng tests/screenshot/expected outputs, quản lý context, dùng subagents hoặc bước investigation khi cần.

### Claude Code — điểm yếu/rủi ro cần test

- Context window có thể đầy; khi context đầy agent dễ quên instruction hoặc mắc lỗi. Bài test cần ép tạo docs ngắn gọn, self-review và final report trung thực.
- Nếu thiếu success criteria, Claude có thể tạo app trông đúng nhưng logic/backend/test không thật sự chạy.
- Permission prompts/approval modes có thể làm gián đoạn; prompt local cần yêu cầu không xin approve plan, chỉ xin quyền khi môi trường bắt buộc hoặc command có rủi ro.
- Opus/long-running reasoning có thể tốn chi phí/latency; bài test cần có scope đủ khó nhưng có minimum viable slice rõ ràng.

### Nguồn tham khảo chính

1. OpenAI Codex Best Practices — https://developers.openai.com/codex/learn/best-practices
2. OpenAI Codex CLI — https://developers.openai.com/codex/cli
3. OpenAI Codex Web — https://developers.openai.com/codex/cloud
4. OpenAI Codex Agent approvals & security — https://developers.openai.com/codex/agent-approvals-security
5. OpenAI “Run long horizon tasks with Codex” — https://developers.openai.com/blog/run-long-horizon-tasks-with-codex
6. Anthropic Claude Code Overview — https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview
7. Anthropic Claude Code Best Practices — https://www.anthropic.com/engineering/claude-code-best-practices
8. Anthropic Claude Code Memory — https://docs.anthropic.com/en/docs/claude-code/memory
9. Anthropic Claude Code Common Workflows — https://docs.anthropic.com/en/docs/claude-code/common-workflows
10. Anthropic “Harness design for long-running application development” — https://www.anthropic.com/engineering/harness-design-long-running-apps

---

## 2. Vì sao đề bài này test tốt cả Codex và Claude Code

Bài test **KilnFlow Ops** là một web app quản lý lò nung gốm cho studio cộng đồng. Domain này đủ lạ để agent không thể copy pattern YouTube phổ biến, nhưng vẫn đủ thực tế để xây thành web app full-stack.

Bài này test:

| Khía cạnh | Tín hiệu đánh giá |
|---|---|
| Product sense | Agent có biến domain lạ thành UX dễ hiểu không? |
| Autonomy | Với 1 prompt duy nhất, agent có tự đi từ repo trống đến app chạy được không? |
| Planning | Có tự chia milestone, rủi ro, validation và data model rõ không dù không dừng ở plan? |
| Frontend | Responsive, accessible, state handling, form UX, dashboard, data visualization |
| Backend | API, database, migrations/seed, validation, RBAC, conflict handling |
| Algorithm | Auto-plan một kiln load bằng constraint + scoring + explainability |
| Testing | Unit, API integration, E2E/manual smoke, không fake/skipped tests |
| Security | Input validation, SQL parameterization, safe CSV import, no secrets, role checks |
| Reliability | `npm run verify` hoặc command tương đương chạy được local |
| Docs | README, architecture notes, runbook, agent instruction files |
| Long-horizon autonomy | Agent phải tự sửa lỗi build/test và tự review diff sau khi code |

---

## 3. Cách chạy bài test local

Chạy mỗi nền tảng trong **một repo riêng** để so sánh công bằng.

```bash
mkdir kilnflow-codex && cd kilnflow-codex
git init
# mở Codex CLI/app trong repo này
# paste prompt duy nhất ở mục 9
```

```bash
mkdir kilnflow-claude && cd kilnflow-claude
git init
# mở Claude Code trong repo này
# paste prompt duy nhất ở mục 9
```

Điều kiện local nên giống nhau nhất có thể:

- cùng OS hoặc cùng devcontainer;
- cùng phiên bản Node/npm nếu có thể;
- cùng quyền ghi file trong repo;
- cùng khả năng cài package từ npm registry;
- không chuẩn bị sẵn code mẫu;
- không can thiệp trong lúc agent chạy, trừ khi tool bắt buộc xác nhận permission.

---

## 4. Đề bài chính: KilnFlow Ops

### 4.1 Bối cảnh

Một studio gốm cộng đồng có nhiều thành viên gửi đồ vào lò nung. Studio cần một ứng dụng nội bộ để:

- nhận đăng ký món gốm từ thành viên;
- kiểm tra món nào đủ điều kiện nung;
- tự động đề xuất cách xếp món vào lò;
- lập lịch firing;
- theo dõi sensor CSV giả lập;
- cảnh báo rủi ro như nhiệt tăng quá nhanh, món chưa đủ khô, sai cone, vượt tải;
- ghi lại quyết định của technician/manager.

### 4.2 Persona và role

App phải có mock auth, không cần OAuth thật.

| Role | Quyền |
|---|---|
| `member` | tạo/sửa món của chính mình, xem trạng thái món của mình |
| `technician` | xem backlog, chạy auto-planner, tạo draft load, import sensor CSV, ghi chú kỹ thuật |
| `manager` | tất cả quyền technician + approve/schedule/cancel firing load |
| `observer` | chỉ xem dashboard và firing timeline |

Có thể dùng mock login bằng dropdown hoặc route login local. Không dùng secret thật.

### 4.3 Stack khuyến nghị để so sánh công bằng

Agent có thể điều chỉnh nếu repo hiện tại đã có stack khác, nhưng nếu repo trống thì ưu tiên:

- TypeScript monorepo.
- Frontend: React + Vite.
- Backend: Node.js + Fastify hoặc Express.
- Database: SQLite với migration/seed.
- Validation: Zod hoặc validation tương đương.
- Tests: Vitest/Jest cho unit + API integration; Playwright/Cypress cho E2E nếu khả thi.
- Không dùng API ngoài, không dùng paid service.
- Có thể dùng chart library open-source hoặc tự render SVG/canvas.
- Có `npm run dev`, `npm run test`, `npm run verify`.

Nếu package install/network bị chặn, agent phải tạo fallback hợp lý và ghi rõ trong README/final report.

---

## 5. Feature requirements

### 5.1 Dashboard

Dashboard phải hiển thị tối thiểu:

- số món đang chờ;
- số món đủ điều kiện nung;
- số món bị chặn và lý do phổ biến;
- kiln loads sắp tới;
- cảnh báo gần đây;
- capacity snapshot của từng kiln.

### 5.2 Intake món gốm

Form tạo món gốm cần các field:

- owner/member;
- tên món;
- clay body: `stoneware`, `porcelain`, `earthenware`, `wild-clay`;
- glaze family: `clear`, `celadon`, `shino`, `crawl`, `soda-sensitive`, `unknown`;
- target cone: `04`, `6`, `10`;
- firing type: `bisque`, `oxidation`, `reduction`, `raku`;
- width/depth/height cm;
- weight kg;
- dryness percent;
- due date;
- notes.

Validation bắt buộc:

- dimensions > 0;
- weight > 0;
- dryness từ 0 đến 100;
- due date hợp lệ;
- nếu glaze `unknown` thì món vẫn được lưu nhưng bị block khỏi auto-plan cho đến khi technician review.

### 5.3 Kiln load auto-planner

Đây là phần cốt lõi để test thuật toán.

Agent phải implement một planner nhận input:

- kiln;
- target cone;
- firing type;
- candidate pieces;
- blocked glaze/clay/firing rules;
- optional due date priority.

Planner output:

- danh sách món được chọn;
- danh sách món bị loại kèm **reason cụ thể**;
- shelf assignment;
- vị trí x/y gần đúng trên shelf hoặc layout grid;
- capacity usage: volume %, footprint %, weight %;
- score;
- warnings.

Constraint tối thiểu:

1. Chỉ chọn món `status = ready`.
2. Exclude nếu `drynessPercent < 80`.
3. Exclude nếu `targetCone` không khớp.
4. Exclude nếu `firingType` không khớp.
5. Exclude nếu `glazeFamily = unknown`.
6. Exclude nếu vượt max kiln weight.
7. Exclude nếu footprint không fit vào shelf.
8. Exclude nếu height vượt shelf clearance.
9. Với `raku`, chỉ cho `earthenware` hoặc `stoneware`.
10. Với `cone 10`, không cho `earthenware`.

Scoring gợi ý:

- ưu tiên due date gần;
- ưu tiên món đã chờ lâu;
- ưu tiên fill capacity tốt nhưng không vượt 90% max weight;
- penalty nếu có glaze risk như `crawl` hoặc `soda-sensitive`.

Planner không cần tối ưu NP-hard hoàn hảo. Greedy có giải thích tốt được chấp nhận, nhưng phải có tests chứng minh các constraint.

### 5.4 Load detail và manual adjustment

Mỗi load detail cần:

- metadata: kiln, cone, firing type, status, version;
- selected pieces;
- excluded pieces/reasons;
- shelf layout;
- audit notes;
- actions theo role:
  - technician: regenerate draft, add technical note;
  - manager: approve/schedule/cancel;
  - member/observer: read-only.

### 5.5 Concurrency/version conflict

Backend phải có optimistic concurrency:

- mỗi `load` có `version`;
- update load cần gửi `expectedVersion`;
- nếu version mismatch, API trả `409 Conflict`;
- UI hiển thị thông báo dễ hiểu và cho refresh.

Yêu cầu này test khả năng backend thật, không chỉ UI mock.

### 5.6 Sensor CSV import và firing monitor

Cho phép technician/manager import CSV giả lập:

```csv
timestamp,tempC,targetTempC,note
2026-05-19T09:00:00Z,24,24,start
2026-05-19T10:00:00Z,120,100,ramp faster than plan
```

App phải:

- parse CSV an toàn;
- lưu readings;
- hiển thị chart hoặc timeline nhiệt độ;
- tạo alert nếu:
  - `abs(tempC - targetTempC) >= 50`;
  - ramp rate giữa 2 readings > 180°C/hour;
  - temp giảm bất thường khi load đang `firing`.

### 5.7 Search/filter

Backlog cần filter theo:

- owner;
- cone;
- firing type;
- blocked reason;
- due date;
- status.

### 5.8 Accessibility/responsive

Tối thiểu:

- keyboard navigable;
- form labels rõ;
- focus states;
- không chỉ dùng màu để truyền đạt alert;
- responsive mobile/tablet/desktop;
- semantic headings;
- ARIA cho chart/layout nếu cần.

### 5.9 Security/data safety

Tối thiểu:

- no real secrets;
- `.env.example`;
- parameterized queries hoặc ORM safe;
- server-side validation;
- role-based access checks ở API, không chỉ frontend;
- safe CSV parsing, không eval;
- sanitize/render text safely, không dangerously set raw HTML;
- document risk assumptions trong README.

### 5.10 Documentation

Phải có:

- `README.md` với setup, run, seed, test, verify;
- `docs/architecture.md`;
- `docs/known-gaps.md`;
- `docs/manual-test-script.md`;
- `AGENTS.md` cho Codex conventions;
- `CLAUDE.md` cho Claude, có thể import `AGENTS.md` bằng `@AGENTS.md`.

---

## 6. Data seed bắt buộc

Seed database với tối thiểu:

### Users

- Mira — `manager`
- Tuan — `technician`
- An — `member`
- Linh — `member`
- Guest — `observer`

### Kilns

- `Skutt 1027` — shelf 55x55cm, 4 shelves, max weight 75kg, max height per shelf 18cm.
- `Mini Raku` — shelf 32x32cm, 2 shelves, max weight 20kg, max height per shelf 14cm.

### Pieces

Tạo ít nhất 12 pieces sao cho có cả:

- đủ điều kiện cone 6 oxidation;
- sai cone;
- chưa đủ khô;
- glaze unknown;
- quá cao;
- quá nặng;
- raku-compatible;
- cone 10 earthenware bị block;
- due date gấp;
- nhiều owner khác nhau.

---

## 7. Required tests

Agent phải tạo tests thật, không được chỉ mock shallow.

### Unit tests

- planner excludes under-dry piece.
- planner excludes wrong cone/firing type.
- planner excludes unknown glaze.
- planner respects max weight.
- planner returns explicit exclusion reasons.
- sensor analyzer flags large temperature deviation.
- sensor analyzer flags excessive ramp rate.

### API integration tests

- member không approve được load.
- manager approve được load.
- update load với stale version trả `409`.
- CSV import tạo readings và alerts.

### E2E smoke test

Ít nhất một flow:

1. login as technician;
2. tạo hoặc xem backlog;
3. chạy auto-plan cho `Skutt 1027`, cone 6, oxidation;
4. thấy selected + excluded reasons;
5. login as manager;
6. approve/schedule load;
7. import sensor CSV;
8. thấy alert.

Nếu Playwright/Cypress không chạy được trong môi trường, agent phải tạo manual test script chi tiết và vẫn giữ unit/API tests chạy được.

### Verification command

Phải có một command tổng:

```bash
npm run verify
```

hoặc tương đương, chạy:

- typecheck;
- lint nếu có;
- unit tests;
- API tests;
- build.

---

## 8. Anti-gaming rules

Agent không được:

- hardcode output planner chỉ để pass seed data;
- skip test bằng `.skip`, `.only`, hoặc fake assertion;
- sửa test để né requirement;
- báo “tests pass” nếu chưa chạy;
- implement auth chỉ ở frontend mà API không check role;
- để tất cả dữ liệu trong localStorage nếu spec đã yêu cầu backend/database;
- dùng real external service/API;
- xóa file không liên quan nếu repo không trống;
- tạo massive unrelated boilerplate hoặc UI đẹp nhưng thiếu logic;
- dừng lại sau khi đưa plan;
- yêu cầu user approve plan trước khi code.

---

## 9. Prompt duy nhất bằng tiếng Việt cho Codex hoặc Claude Code — chạy local đến thành phẩm

Copy toàn bộ block dưới đây vào Codex hoặc Claude Code khi đang đứng trong repo local. Không bật chế độ chỉ lập kế hoạch. Nếu tool hiện permission prompt cho command/file access, bạn có thể approve theo nhu cầu an toàn, nhưng **không gửi prompt thứ hai để approve plan**.

```text
Bạn đang chạy trên máy local của tôi, bên trong một git repository có quyền ghi. Đây là prompt sản phẩm duy nhất tôi sẽ đưa cho bạn. Nhiệm vụ của bạn là xây dựng ứng dụng hoàn chỉnh từ đầu đến cuối, không chỉ đưa ra kế hoạch.

QUY TẮC THỰC THI QUAN TRỌNG
- Không vào chế độ chỉ lập kế hoạch.
- Không dừng lại sau khi lập kế hoạch và không yêu cầu tôi approve kế hoạch.
- Trước tiên hãy kiểm tra repository hiện tại, tự lập một kế hoạch triển khai ngắn gọn cho chính bạn, rồi triển khai ngay.
- Hãy làm việc tự chủ cho đến khi sản phẩm được xây dựng, kiểm thử, viết tài liệu và xác minh trong phạm vi môi trường local cho phép.
- Chỉ hỏi tôi nếu một lệnh cần credentials, dịch vụ trả phí, thao tác phá hủy bên ngoài repository này, hoặc thao tác không thể đảo ngược. Không hỏi lại để làm rõ yêu cầu sản phẩm; hãy tự đưa ra giả định hợp lý và ghi lại giả định đó trong tài liệu.
- Bạn có thể tạo, sửa và xóa file bên trong repository này khi cần. Không xóa file sẵn có không liên quan nếu repository không trống.
- Bạn có thể cài npm packages và chạy shell commands local. Ưu tiên npm, trừ khi repository hiện tại rõ ràng đang dùng package manager khác.
- Không phụ thuộc vào paid APIs, secrets thật, external runtime services, hoặc hosted databases. Dùng local persistence, ưu tiên SQLite.
- Chỉ dùng network cho việc cài dependency. Nếu cài dependency hoặc network bị lỗi, hãy tạo fallback hợp lý và ghi rõ trong tài liệu.
- Không chạy dev server vô hạn ở foreground. Để verify, dùng build/test commands hoặc start server bằng background process/timeout rồi dọn dẹp sau khi xong.

MỤC TIÊU BUILD
Xây dựng một full-stack web app tên là "KilnFlow Ops" cho một studio gốm cộng đồng. Ứng dụng phải quản lý việc nhận món gốm, lập kế hoạch xếp lò, lên lịch firing, import sensor CSV, tạo alerts, mock role-based access, optimistic concurrency, tests và tài liệu.

GỢI Ý STACK
- Nếu repository đang trống, ưu tiên TypeScript monorepo với:
  - Frontend: React + Vite
  - Backend: Node.js + Fastify hoặc Express
  - Database: SQLite với migration/seed
  - Validation: Zod hoặc tương đương
  - Tests: Vitest/Jest cho unit + API integration
  - E2E: Playwright/Cypress chỉ khi khả thi trong môi trường local này
- Nếu repository đã có stack, hãy thích nghi với stack đó và không xóa file không liên quan.
- Cung cấp các command: npm run dev, npm run test, npm run verify hoặc command tương đương.

BỐI CẢNH DOMAIN
Một studio gốm cộng đồng có nhiều thành viên gửi món gốm để nung. Studio cần một ứng dụng nội bộ để:
- nhận đăng ký món gốm từ thành viên;
- xác định món nào đủ điều kiện nung;
- tự động đề xuất cách xếp món vào lò;
- lên lịch firing loads;
- import sensor CSV giả lập;
- cảnh báo rủi ro firing như nhiệt tăng/giảm bất thường, món chưa đủ khô, sai cone và vượt tải;
- ghi lại quyết định của technician/manager.

ROLES VÀ MOCK AUTH
Implement mock auth; không cần OAuth thật.
- member: tạo/sửa món của chính mình và xem trạng thái món của mình.
- technician: xem backlog, chạy auto-planner, tạo draft load, import sensor CSV, thêm ghi chú kỹ thuật.
- manager: có toàn bộ quyền technician, cộng thêm approve, schedule và cancel firing loads.
- observer: chỉ được xem dashboard và firing timeline.
Dùng local mock login dropdown hoặc local login route. Phải enforce permissions ở backend API, không chỉ ở frontend.

YÊU CẦU TÍNH NĂNG

1. Dashboard
Hiển thị tối thiểu:
- số món đang chờ;
- số món đủ điều kiện nung;
- số món bị block và các lý do block phổ biến;
- kiln loads sắp tới;
- alerts gần đây;
- capacity snapshot của từng kiln.

2. Intake món gốm
Tạo form với các field sau:
- owner/member;
- tên món;
- clay body: stoneware, porcelain, earthenware, wild-clay;
- glaze family: clear, celadon, shino, crawl, soda-sensitive, unknown;
- target cone: 04, 6, 10;
- firing type: bisque, oxidation, reduction, raku;
- width/depth/height cm;
- weight kg;
- dryness percent;
- due date;
- notes.
Validation:
- dimensions > 0;
- weight > 0;
- dryness từ 0 đến 100;
- due date hợp lệ;
- glaze unknown vẫn được lưu nhưng phải bị block khỏi auto-planning cho đến khi technician review.

3. Kiln load auto-planner
Implement một planner function thật. Planner nhận input:
- kiln;
- target cone;
- firing type;
- candidate pieces;
- blocked glaze/clay/firing rules;
- optional due date priority.
Planner trả về:
- selected pieces;
- excluded pieces với reason code/message cụ thể, rõ ràng;
- shelf assignment;
- vị trí x/y gần đúng trên shelf hoặc layout grid;
- capacity usage: volume %, footprint %, weight %;
- score;
- warnings.
Phải enforce các constraint sau:
- chỉ chọn pieces có status = ready;
- exclude nếu drynessPercent < 80;
- exclude nếu targetCone không khớp;
- exclude nếu firingType không khớp;
- exclude nếu glazeFamily = unknown;
- exclude nếu tổng selection sẽ vượt max kiln weight;
- exclude nếu footprint không fit vào shelf;
- exclude nếu height vượt shelf clearance;
- với raku, chỉ cho earthenware hoặc stoneware;
- với cone 10, block earthenware.
Gợi ý scoring:
- ưu tiên due date sớm hơn;
- ưu tiên pieces đã chờ lâu hơn;
- thưởng cho capacity fill tốt nhưng không vượt 90% max weight;
- phạt glaze risks như crawl hoặc soda-sensitive.
Planner không cần tối ưu NP-hard hoàn hảo. Greedy algorithm được chấp nhận nếu giải thích tốt và được test tốt. Không hardcode kết quả chỉ cho seed data.

4. Load detail và manual actions
Mỗi trang load detail cần có:
- metadata: kiln, cone, firing type, status, version;
- selected pieces;
- excluded pieces/reasons;
- shelf layout;
- audit notes;
- actions theo role:
  - technician: regenerate draft và thêm technical note;
  - manager: approve, schedule, cancel;
  - member/observer: read-only.

5. Optimistic concurrency
Backend phải implement optimistic concurrency thật:
- mỗi load có version;
- load updates cần gửi expectedVersion;
- update với stale version phải trả HTTP 409 Conflict;
- UI hiển thị conflict message dễ hiểu và cho refresh/retry.

6. Sensor CSV import và firing monitor
Cho phép technician/manager import CSV giả lập:
timestamp,tempC,targetTempC,note
2026-05-19T09:00:00Z,24,24,start
2026-05-19T10:00:00Z,120,100,ramp faster than plan
Ứng dụng phải:
- parse CSV an toàn, không dùng eval;
- persist readings;
- hiển thị temperature chart hoặc timeline;
- tạo alerts khi:
  - abs(tempC - targetTempC) >= 50;
  - ramp rate giữa hai readings liên tiếp > 180°C/hour;
  - nhiệt độ giảm bất thường khi load status là firing.

7. Backlog search/filter
Backlog phải filter được theo:
- owner;
- cone;
- firing type;
- blocked reason;
- due date;
- status.

8. Accessibility và responsive UI
Yêu cầu tối thiểu:
- keyboard navigable;
- form labels rõ ràng;
- visible focus states;
- alerts không chỉ được truyền đạt bằng màu sắc;
- layout responsive cho mobile/tablet/desktop;
- semantic headings;
- ARIA labels/descriptions cho chart hoặc kiln layout khi cần.

9. Security/data safety
Yêu cầu tối thiểu:
- không dùng secrets thật;
- có .env.example;
- dùng parameterized queries hoặc ORM-safe queries;
- có server-side validation;
- có role-based API checks;
- parse CSV an toàn;
- không render raw HTML nguy hiểm;
- document risk assumptions trong README hoặc docs.

10. Documentation
Tạo các file:
- README.md với setup, run, seed, test, verify, troubleshooting;
- docs/architecture.md;
- docs/known-gaps.md;
- docs/manual-test-script.md;
- AGENTS.md cho Codex conventions;
- CLAUDE.md cho Claude Code conventions, có thể import hoặc reference AGENTS.md nếu hữu ích.

DỮ LIỆU SEED
Tạo local seed data với tối thiểu:

Users:
- Mira — manager
- Tuan — technician
- An — member
- Linh — member
- Guest — observer

Kilns:
- Skutt 1027 — shelf 55x55cm, 4 shelves, max weight 75kg, max height per shelf 18cm.
- Mini Raku — shelf 32x32cm, 2 shelves, max weight 20kg, max height per shelf 14cm.

Pieces:
Ít nhất 12 pieces bao phủ các case:
- eligible cone 6 oxidation;
- wrong cone;
- under-dry;
- unknown glaze;
- too tall;
- too heavy;
- raku-compatible;
- cone 10 earthenware blocked;
- urgent due date;
- multiple owners.

TESTS BẮT BUỘC
Tạo tests thật. Không dùng shallow fake tests.

Unit tests:
- planner excludes under-dry piece;
- planner excludes wrong cone/firing type;
- planner excludes unknown glaze;
- planner respects max weight;
- planner returns explicit exclusion reasons;
- sensor analyzer flags large temperature deviation;
- sensor analyzer flags excessive ramp rate.

API integration tests:
- member không approve được load;
- manager approve được load;
- stale version update trả 409;
- CSV import tạo readings và alerts.

E2E smoke test nếu khả thi:
- login as technician;
- tạo hoặc xem backlog;
- chạy auto-plan cho Skutt 1027, cone 6, oxidation;
- thấy selected pieces và excluded reasons;
- login as manager;
- approve/schedule load;
- import sensor CSV;
- thấy alert.
Nếu Playwright/Cypress không chạy được trong môi trường này, hãy tạo docs/manual-test-script.md với các bước chi tiết và vẫn giữ unit/API tests chạy được.

VERIFY
Thêm một command:
npm run verify
hoặc command tương đương chạy:
- typecheck;
- lint nếu có;
- unit tests;
- API tests;
- build.
Chạy command này ở cuối. Sửa các lỗi nằm trong scope. Nếu blocker từ môi trường local khiến không thể hoàn tất, hãy document chính xác blocker, tóm tắt command output và fallback đã dùng.

QUY TẮC CHỐNG LÁCH
Không được:
- hardcode planner output chỉ cho seed data;
- dùng .skip, .only, fake assertions, hoặc tests pass mà không kiểm tra behavior thật;
- sửa tests chỉ để che giấu behavior đang fail;
- nói tests passed nếu bạn chưa thật sự chạy;
- implement auth chỉ ở frontend;
- lưu toàn bộ dữ liệu chỉ trong localStorage khi yêu cầu backend/database;
- dùng real external services/APIs;
- xóa file không liên quan trong repo;
- tạo quá nhiều boilerplate không liên quan trong khi thiếu core logic.

QUY TRÌNH KỲ VỌNG
1. Inspect repo và package/tooling hiện có.
2. Tạo một internal implementation plan ngắn gọn.
3. Scaffold hoặc điều chỉnh project structure.
4. Implement data model, persistence, seed, backend APIs, validation, RBAC, planner và sensor analyzer.
5. Implement frontend pages/components với UX responsive và accessible.
6. Implement docs và agent instruction files.
7. Implement unit và API tests. Thêm E2E hoặc manual smoke script.
8. Chạy tests/build/verify nhiều lần và sửa failures.
9. Tự review lần cuối theo requirements và anti-gaming rules.

YÊU CẦU CHO PHẢN HỒI CUỐI
Khi hoàn tất, hãy reply bằng tiếng Việt với:
1. Đã build những gì.
2. Tóm tắt files changed.
3. Các commands đã thật sự chạy, kèm kết quả pass/fail. Không bịa kết quả pass.
4. Known gaps hoặc environment blockers nếu có.
5. Cách chạy app local.
6. Cách chạy tests và verification.
```
---

## 10. Rubric chấm điểm 100

| Hạng mục | Điểm |
|---|---:|
| Tự chủ với 1 prompt, không dừng xin approve plan | 8 |
| Architecture/data model/API có thể mở rộng | 10 |
| UX/product coherence cho domain lạ | 10 |
| Frontend responsive + accessible | 10 |
| Backend persistence + RBAC + validation | 12 |
| Planner algorithm + explainability | 15 |
| Sensor import/alert logic | 8 |
| Concurrency/version conflict thật | 6 |
| Testing thật và command verify chạy được | 12 |
| Docs/devex/README/manual test | 5 |
| Self-review, known gaps trung thực | 4 |

Trừ điểm nặng nếu:

- không chạy được app;
- agent dừng ở plan hoặc yêu cầu approve plan;
- không có backend/database thật;
- tests bị fake/skipped;
- thiếu planner algorithm;
- thiếu role checks ở API;
- final report nói sai về tests.

---

## 11. Checklist review thủ công

- App có chạy được local không?
- Dashboard có data seed thật không?
- Auto-planner có chọn/exclude hợp lý và giải thích lý do không?
- API có chặn member approve load không?
- Stale version có trả 409 thật không?
- CSV import có tạo readings và alerts không?
- UI có responsive và keyboard usable không?
- Tests có chạy thật không?
- Docs có đủ để người khác run app không?
- Final response của agent có trung thực với log command không?
- Agent có tự hoàn thành sau 1 prompt, hay dừng lại để hỏi approve plan?

### Các dấu hiệu agent làm tốt

- Tự tạo plan ngắn rồi code luôn, không cần prompt thứ hai.
- Data model đơn giản nhưng đủ dùng.
- Planner được tách thành pure function có unit tests.
- API validation và RBAC nằm server-side.
- UI không chỉ đẹp mà xử lý empty/error/loading state.
- `npm run verify` chạy được.
- README có setup nhanh và troubleshooting.
- Agent tự phát hiện/fix lỗi build/test thay vì báo hoàn thành sớm.
- Final summary nêu đúng command đã chạy và lỗi còn lại nếu có.

### Các dấu hiệu agent yếu

- Dừng ở plan và yêu cầu user approve.
- App chỉ là frontend mock.
- Planner hardcode seed data.
- “Auth” chỉ là dropdown frontend, API vẫn cho mọi role.
- Không có database hoặc migration/seed.
- Không có 409 conflict thật.
- Tests thiếu assertions hoặc bị skip.
- CSV parser nguy hiểm hoặc không validate.
- Không chạy được command verify.
- Final summary nói “all tests passed” nhưng không có log hoặc command fail.

---

## 12. Biến thể tăng độ khó nếu muốn chạy vòng 2

Sau khi chấm vòng 1, có thể dùng cùng app và prompt thêm một vòng nhỏ để test maintainability:

```text
Hãy thêm tính năng "kiln incident postmortem". Khi một firing có từ 3 alerts trở lên, manager có thể tạo bản nháp postmortem gồm timeline, likely causes, affected pieces và prevention checklist. Giữ toàn bộ tests hiện có tiếp tục pass và thêm tests cho tính năng mới.
```

Biến thể này test khả năng agent hiểu codebase do chính nó tạo và thêm feature mà không phá cấu trúc.
