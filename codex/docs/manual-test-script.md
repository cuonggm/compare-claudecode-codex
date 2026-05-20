# Kịch Bản Kiểm Thử Thủ Công

Dùng file này khi chưa chạy được E2E bằng trình duyệt tự động.

## Khởi Động

```bash
npm run db:seed
npm run dev
```

Mở http://127.0.0.1:5173.

## Luồng Kỹ Thuật Viên

1. Chọn `Tuan - kỹ thuật viên` trong dropdown `Đăng nhập giả lập`.
2. Mở `Danh sách chờ`.
3. Kiểm tra bảng có nhiều chủ món, cone/kiểu nung, trạng thái và lý do chặn.
4. Lọc theo:
   - Cone `6`
   - Kiểu nung `oxy hóa`
   - Lý do chặn `Men chưa rõ`
5. Mở `Lập mẻ nung`.
6. Chọn:
   - Lò nung: `Skutt 1027`
   - Cone mục tiêu: `6`
   - Kiểu nung: `oxy hóa`
7. Bấm `Chạy lập mẻ`.
8. Kiểm tra:
   - Một mẻ nung nháp được tạo.
   - Có danh sách món được chọn.
   - Món bị loại hiển thị lý do rõ ràng như `Chưa đủ khô`, `Men chưa rõ`, `Vượt chiều cao kệ`, `Vượt tải trọng`, hoặc sai cone/kiểu nung.
   - Sơ đồ kệ có các món được đặt.

## Luồng Quản Lý

1. Chọn `Mira - quản lý`.
2. Mở `Lịch nung`.
3. Chọn mẻ nháp vừa được tạo bởi planner.
4. Bấm `Duyệt`.
5. Kiểm tra trạng thái đổi thành `đã duyệt` và phiên bản tăng.
6. Chọn thời điểm bắt đầu/kết thúc.
7. Bấm `Lên lịch`.
8. Kiểm tra trạng thái đổi thành `đã lên lịch` và phiên bản tăng.

## Luồng Nhập Cảm Biến

1. Ở lại trang chi tiết mẻ nung.
2. Giữ hoặc dán CSV này:

```csv
timestamp,tempC,targetTempC,note
2026-05-19T09:00:00Z,24,24,bắt đầu
2026-05-19T10:00:00Z,240,100,quá nóng và tăng quá nhanh
2026-05-19T11:00:00Z,430,250,vẫn tăng nhanh
```

3. Bấm `Nhập CSV cảm biến`.
4. Kiểm tra:
   - Biểu đồ xuất hiện với đường nhiệt thực tế và mục tiêu.
   - Cảnh báo có `Lệch nhiệt` và `Tăng nhiệt quá nhanh`.

## Kiểm Tra Xung Đột

1. Mở cùng một mẻ nung ở hai tab trình duyệt.
2. Ở tab A, thêm ghi chú kỹ thuật hoặc duyệt/lên lịch mẻ.
3. Ở tab B, thực hiện thao tác với phiên bản cũ đang hiển thị.
4. Kiểm tra UI hiển thị thông báo xung đột và yêu cầu làm mới/thử lại.
