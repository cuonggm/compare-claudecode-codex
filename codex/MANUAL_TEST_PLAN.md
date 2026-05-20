# Kế Hoạch Test Thủ Công KilnFlow Ops

## Mục Tiêu

Xác minh các luồng chính của KilnFlow Ops sau khi chạy local:

- Dashboard vận hành.
- Nhận món gốm và backlog filter.
- Phân quyền theo vai trò.
- Auto-planner và chi tiết mẻ nung.
- Optimistic concurreLên kế hoạch test cho user làm thủ công vào 1 file .md đặt ở thư mục rootncy.
- Import CSV cảm biến và cảnh báo.
- Responsive/accessibility cơ bản.

## Chuẩn Bị

```bash
npm install
npm run db:seed
npm run dev
```

Mở app tại:

```text
http://127.0.0.1:5173
```

Tài khoản test trong dropdown `Đăng nhập giả lập`:

- `Mira - quản lý`
- `Tuan - kỹ thuật viên`
- `An - thành viên`
- `Linh - thành viên`
- `Guest - quan sát`

## Quy Ước Ghi Kết Quả

Ghi kết quả sau mỗi test case:

```text
Kết quả: Pass / Fail
Ghi chú:
```

## 1. Dashboard

### TC-01: Dashboard hiển thị dữ liệu tổng quan

1. Đăng nhập `Mira - quản lý`.
2. Mở `Tổng quan`.
3. Kiểm tra có các số liệu:
   - Món đang chờ.
   - Đủ điều kiện nung.
   - Món đang bị chặn.
   - Lý do chặn phổ biến.
   - Mẻ nung sắp tới.
   - Ảnh chụp công suất lò.
   - Cảnh báo gần đây.

Kỳ vọng:

- Không có vùng trắng bất thường.
- Các card không bị tràn chữ.
- Lý do chặn hiển thị bằng tiếng Việt.

Kết quả:

### TC-02: Observer chỉ xem được dashboard và lịch nung

1. Đăng nhập `Guest - quan sát`.
2. Kiểm tra `Danh sách chờ` và `Lập mẻ nung` bị disable hoặc không truy cập được.
3. Mở `Tổng quan`.
4. Mở `Lịch nung`.

Kỳ vọng:

- Observer xem được dashboard và lịch nung.
- Observer không thao tác intake/planner.

Kết quả:

## 2. Backlog Và Intake

### TC-03: Kỹ thuật viên xem backlog và filter

1. Đăng nhập `Tuan - kỹ thuật viên`.
2. Mở `Danh sách chờ`.
3. Lọc lần lượt:
   - Chủ món: `An`.
   - Cone: `6`.
   - Kiểu nung: `oxy hóa`.
   - Lý do chặn: `Men chưa rõ`.
   - Trạng thái: `đang chặn`.

Kỳ vọng:

- Bảng cập nhật theo filter.
- Cột lý do chặn hiển thị label tiếng Việt.
- Không mất quyền xem nhiều chủ món.

Kết quả:

### TC-04: Thành viên chỉ thấy món của mình

1. Đăng nhập `An - thành viên`.
2. Mở `Danh sách chờ`.
3. Kiểm tra danh sách chỉ có món của `An`.
4. Kiểm tra filter chủ món bị khóa hoặc không cho đổi sang người khác.

Kỳ vọng:

- Không thấy món của `Linh`.
- Không tạo/sửa món thay người khác qua UI.

Kết quả:

### TC-05: Tạo món hợp lệ

1. Đăng nhập `An - thành viên`.
2. Mở `Danh sách chờ`.
3. Điền form `Nhận món mới`:
   - Tên món: `Bát test thủ công`.
   - Loại đất: `đất stoneware`.
   - Nhóm men: `men trong`.
   - Cone mục tiêu: `6`.
   - Kiểu nung: `oxy hóa`.
   - Rộng/Sâu/Cao: `10`, `10`, `8`.
   - Trọng lượng: `0.7`.
   - Độ khô: `90`.
   - Hạn cần xong: chọn ngày hợp lệ.
4. Bấm `Tạo phiếu nhận`.

Kỳ vọng:

- Hiển thị thông báo tạo món thành công.
- Món mới xuất hiện trong backlog.
- Trạng thái là `sẵn sàng`.

Kết quả:

### TC-06: Tạo món men chưa rõ bị block planner

1. Đăng nhập `An - thành viên`.
2. Tạo món mới với `Nhóm men = chưa rõ`, độ khô `95`.
3. Mở backlog và tìm món vừa tạo.

Kỳ vọng:

- Món được lưu.
- Có lý do chặn `Men chưa rõ`.
- Planner không chọn món này.

Kết quả:

## 3. Auto-Planner

### TC-07: Kỹ thuật viên chạy auto-plan

1. Đăng nhập `Tuan - kỹ thuật viên`.
2. Mở `Lập mẻ nung`.
3. Chọn:
   - Lò nung: `Skutt 1027`.
   - Cone mục tiêu: `6`.
   - Kiểu nung: `oxy hóa`.
4. Bấm `Chạy lập mẻ`.

Kỳ vọng:

- Tạo mẻ nung nháp.
- Có món được chọn.
- Có danh sách món bị loại.
- Sơ đồ kệ hiển thị vị trí món.
- Có chỉ số điểm, trọng lượng, diện tích đáy.

Kết quả:

### TC-08: Planner loại đúng các case seed

Sau TC-07, kiểm tra danh sách `Bị loại`.

Kỳ vọng thấy các lý do phù hợp nếu dữ liệu seed còn nguyên:

- `Chưa đủ khô`.
- `Men chưa rõ`.
- `Sai cone`.
- `Sai kiểu nung`.
- `Vượt chiều cao kệ`.
- `Vượt tải trọng`.
- `Earthenware không hợp cone 10`.
- `Đất không hợp raku`.

Kết quả:

### TC-09: Member không chạy planner

1. Đăng nhập `An - thành viên`.
2. Kiểm tra nav `Lập mẻ nung`.

Kỳ vọng:

- Không truy cập được planner hoặc nút bị disable.

Kết quả:

## 4. Chi Tiết Mẻ Nung Và Phân Quyền

### TC-10: Kỹ thuật viên thêm ghi chú kỹ thuật

1. Đăng nhập `Tuan - kỹ thuật viên`.
2. Mở `Lịch nung`.
3. Chọn một mẻ nháp.
4. Nhập ghi chú: `Kiểm tra khoảng cách giữa các bát trước khi nung.`
5. Bấm `Thêm ghi chú`.

Kỳ vọng:

- Ghi chú xuất hiện trong `Nhật ký quyết định`.
- Phiên bản mẻ tăng.

Kết quả:

### TC-11: Manager duyệt và lên lịch mẻ

1. Đăng nhập `Mira - quản lý`.
2. Mở `Lịch nung`.
3. Chọn mẻ nháp vừa tạo.
4. Bấm `Duyệt`.
5. Kiểm tra trạng thái `đã duyệt`.
6. Chọn thời điểm bắt đầu/kết thúc.
7. Bấm `Lên lịch`.

Kỳ vọng:

- Trạng thái đổi sang `đã lên lịch`.
- Phiên bản tăng sau mỗi thao tác.
- Nhật ký ghi lại thay đổi.

Kết quả:

### TC-12: Member không duyệt được mẻ

1. Đăng nhập `An - thành viên`.
2. Mở `Lịch nung`.
3. Chọn một mẻ.
4. Kiểm tra các nút `Duyệt`, `Lên lịch`, `Hủy`.

Kỳ vọng:

- Các nút bị disable hoặc thao tác bị từ chối.
- Không đổi trạng thái mẻ.

Kết quả:

## 5. Optimistic Concurrency

### TC-13: Xung đột phiên bản khi thao tác stale

1. Mở app trong hai tab trình duyệt.
2. Cả hai tab đăng nhập `Mira - quản lý`.
3. Ở cả hai tab mở cùng một mẻ nháp.
4. Tab A bấm `Duyệt`.
5. Tab B không refresh, bấm `Duyệt` hoặc `Lên lịch`.

Kỳ vọng:

- Tab B hiển thị thông báo xung đột.
- Server trả conflict, không ghi đè dữ liệu mới.
- Sau khi refresh, tab B thấy phiên bản mới.

Kết quả:

## 6. Sensor CSV Và Alerts

### TC-14: Import CSV cảm biến tạo readings và alerts

1. Đăng nhập `Tuan - kỹ thuật viên` hoặc `Mira - quản lý`.
2. Mở `Lịch nung`, chọn một mẻ.
3. Dán CSV:

```csv
timestamp,tempC,targetTempC,note
2026-05-19T09:00:00Z,24,24,bắt đầu
2026-05-19T10:00:00Z,240,100,quá nóng và tăng quá nhanh
2026-05-19T11:00:00Z,430,250,vẫn tăng nhanh
```

4. Bấm `Nhập CSV cảm biến`.

Kỳ vọng:

- Số bản ghi tăng.
- Biểu đồ nhiệt hiển thị.
- Cảnh báo có `Lệch nhiệt`.
- Cảnh báo có `Tăng nhiệt quá nhanh`.

Kết quả:

### TC-15: CSV sai header bị từ chối

1. Dán CSV sai header:

```csv
time,temp,target,note
2026-05-19T09:00:00Z,24,24,bắt đầu
```

2. Bấm `Nhập CSV cảm biến`.

Kỳ vọng:

- Hiển thị lỗi validation/API.
- Không tạo readings mới.

Kết quả:

## 7. Responsive Và Accessibility Cơ Bản

### TC-16: Mobile layout

1. Mở DevTools responsive hoặc thu hẹp browser còn khoảng 390px.
2. Mở lần lượt:
   - `Tổng quan`
   - `Danh sách chờ`
   - `Lập mẻ nung`
   - `Lịch nung`

Kỳ vọng:

- Không có text/controls tràn ngang.
- Nav, card, form, bảng vẫn dùng được.
- Button không bị che hoặc đè lên nội dung khác.

Kết quả:

### TC-17: Keyboard navigation

1. Dùng phím `Tab` từ đầu trang.
2. Đi qua nav, dropdown login, filter, form, button.
3. Dùng `Enter` hoặc `Space` trên button.

Kỳ vọng:

- Focus state nhìn rõ.
- Có thể thao tác các control chính bằng bàn phím.
- Không bị kẹt focus.

Kết quả:

### TC-18: Alerts không chỉ dựa vào màu sắc

1. Tạo alert bằng TC-14.
2. Xem phần `Cảnh báo gần đây`.

Kỳ vọng:

- Alert có icon, tiêu đề và nội dung text.
- Không cần phân biệt màu vẫn hiểu cảnh báo.

Kết quả:

## 8. Smoke Regression Cuối

### TC-19: Chạy verify local

```bash
npm run verify
```

Kỳ vọng:

- Typecheck pass.
- Unit/API tests pass.
- Build pass.

Kết quả:

### TC-20: Chạy E2E nếu có browser Playwright

```bash
npx playwright install chromium
npm run test:e2e
```

Kỳ vọng:

- E2E smoke pass.

Kết quả:
