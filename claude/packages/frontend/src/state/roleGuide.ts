// Centralized workflow and role capability copy. Server-side RBAC remains the
// source of truth; this file only guides new users through the UI.

import type { Role } from '@kilnflow/shared';

export type WorkflowStage = 'intake' | 'planner' | 'operate';

export interface WorkflowStep {
  stage: WorkflowStage;
  num: number;
  label: string;
  to: string;
  description: string;
}

// Core studio workflow steps shared by navigation and onboarding surfaces.
export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    stage: 'intake',
    num: 1,
    label: 'Tiếp nhận',
    to: '/intake',
    description: 'Đăng ký pieces vào hàng đợi.',
  },
  {
    stage: 'planner',
    num: 2,
    label: 'Lập kế hoạch',
    to: '/planner',
    description: 'Auto-planner ghép pieces vào lò theo cone & firing-type.',
  },
  {
    stage: 'operate',
    num: 3,
    label: 'Vận hành',
    to: '/loads',
    description: 'Duyệt, lên lịch, giám sát đợt nung.',
  },
];

export interface RoleNextStep {
  num: number;
  title: string;
  body: string;
  cta?: { label: string; to: string };
}

export interface RoleGuide {
  // Short tagline displayed on the welcome card.
  tagline: string;
  // Three to four steps in the ideal user workflow order.
  nextSteps: RoleNextStep[];
  // User-facing role capabilities displayed in page hint panels.
  can: string[];
  // Restricted actions and who to contact when the user needs help.
  cannot?: { items: string[]; askFor: string };
}

const memberGuide: RoleGuide = {
  tagline: 'Đăng ký món gốm của bạn và theo dõi tiến độ nung.',
  nextSteps: [
    {
      num: 1,
      title: 'Tiếp nhận món mới',
      body: 'Khai báo kích thước, men, cone mục tiêu và hạn nung. Planner sẽ kiểm tra món có đủ điều kiện không.',
      cta: { label: 'Đăng ký món', to: '/intake' },
    },
    {
      num: 2,
      title: 'Theo dõi hàng đợi',
      body: 'Xem món của bạn đang “sẵn sàng”, “chưa đủ khô” hay “men không xác định” để bổ sung kịp thời.',
      cta: { label: 'Xem hàng đợi', to: '/backlog' },
    },
    {
      num: 3,
      title: 'Xem đợt nung sắp tới',
      body: 'Theo dõi khi món của bạn được ghép vào đợt và lên lịch nung.',
      cta: { label: 'Đợt nung', to: '/loads' },
    },
  ],
  can: [
    'Đăng ký món mới và sửa món của chính bạn',
    'Xem hàng đợi, đợt nung và cảnh báo',
  ],
  cannot: {
    items: [
      'Chạy auto-planner / tạo đợt nung',
      'Duyệt, lên lịch, hủy đợt nung',
      'Đổi chủ sở hữu hoặc trạng thái món',
    ],
    askFor: 'Liên hệ kỹ thuật viên hoặc quản lý.',
  },
};

const technicianGuide: RoleGuide = {
  tagline: 'Lập kế hoạch nung, nhập dữ liệu cảm biến và ghi chú kỹ thuật.',
  nextSteps: [
    {
      num: 1,
      title: 'Kiểm tra hàng đợi',
      body: 'Xem món nào đã sẵn sàng, món nào bị chặn để liên hệ chủ sở hữu xử lý sớm.',
      cta: { label: 'Mở hàng đợi', to: '/backlog' },
    },
    {
      num: 2,
      title: 'Chạy auto-planner',
      body: 'Chọn lò, cone, kiểu nung — xem trước bố trí kệ và điểm số trước khi tạo bản nháp đợt.',
      cta: { label: 'Lập kế hoạch', to: '/planner' },
    },
    {
      num: 3,
      title: 'Giám sát đợt đang nung',
      body: 'Nhập CSV cảm biến, thêm ghi chú kỹ thuật. Khi vượt ngưỡng, hệ thống tự phát cảnh báo.',
      cta: { label: 'Đợt nung', to: '/loads' },
    },
  ],
  can: [
    'Sửa mọi piece (kể cả của thành viên khác)',
    'Chạy auto-planner và tạo bản nháp đợt nung',
    'Tạo lại kế hoạch cho draft',
    'Nhập CSV cảm biến và thêm ghi chú kỹ thuật',
  ],
  cannot: {
    items: ['Duyệt / lên lịch / hủy đợt nung'],
    askFor: 'Quản lý sẽ thực hiện các bước phê duyệt.',
  },
};

const managerGuide: RoleGuide = {
  tagline: 'Duyệt đợt nung, lên lịch lò và đóng vòng chất lượng.',
  nextSteps: [
    {
      num: 1,
      title: 'Duyệt các bản nháp',
      body: 'Kiểm tra bố trí kệ, danh sách loại trừ và điểm số do planner đề xuất, rồi duyệt.',
      cta: { label: 'Xem đợt nháp', to: '/loads' },
    },
    {
      num: 2,
      title: 'Lên lịch nung',
      body: 'Sau khi duyệt, gắn thời điểm vào lò để cả studio biết khi nào lò bận.',
      cta: { label: 'Xem đợt đã duyệt', to: '/loads' },
    },
    {
      num: 3,
      title: 'Theo dõi cảnh báo & ghi chú',
      body: 'Xem cảnh báo sensor, thêm ghi chú kiểm toán, hoặc hủy đợt nếu cần.',
      cta: { label: 'Bảng điều khiển', to: '/' },
    },
  ],
  can: [
    'Toàn quyền với pieces, kể cả chuyển chủ sở hữu',
    'Chạy auto-planner và tạo lại bản nháp',
    'Duyệt / lên lịch / hủy đợt nung',
    'Nhập CSV cảm biến và ghi chú kỹ thuật',
  ],
};

const observerGuide: RoleGuide = {
  tagline: 'Chế độ chỉ đọc — quan sát mọi hoạt động studio mà không tác động.',
  nextSteps: [
    {
      num: 1,
      title: 'Xem bảng điều khiển',
      body: 'Theo dõi số pieces đang chờ, đợt nung sắp tới và cảnh báo gần đây.',
      cta: { label: 'Mở bảng điều khiển', to: '/' },
    },
    {
      num: 2,
      title: 'Khám phá hàng đợi',
      body: 'Lọc pieces theo cone, kiểu nung, chủ sở hữu để hiểu khối lượng công việc.',
      cta: { label: 'Mở hàng đợi', to: '/backlog' },
    },
    {
      num: 3,
      title: 'Theo dõi đợt nung',
      body: 'Mở đợt nung bất kỳ để xem bố trí kệ, sensor, cảnh báo và ghi chú.',
      cta: { label: 'Danh sách đợt nung', to: '/loads' },
    },
  ],
  can: ['Xem mọi dữ liệu chỉ đọc'],
  cannot: {
    items: [
      'Đăng ký / sửa pieces',
      'Chạy planner, duyệt, lên lịch, hủy đợt',
      'Nhập CSV cảm biến hoặc thêm ghi chú',
    ],
    askFor: 'Yêu cầu nâng quyền nếu cần thao tác.',
  },
};

export const ROLE_GUIDE: Record<Role, RoleGuide> = {
  member: memberGuide,
  technician: technicianGuide,
  manager: managerGuide,
  observer: observerGuide,
};

// Page-level capability hints for the current role.
export interface PageCapability {
  pageId: 'dashboard' | 'backlog' | 'intake' | 'planner' | 'loads' | 'load-detail';
  forRole: Partial<Record<Role, string[]>>;
}

export const PAGE_CAPABILITY: Record<PageCapability['pageId'], Partial<Record<Role, string[]>>> = {
  dashboard: {
    member: ['Xem hàng đợi tổng quan', 'Mở các đợt nung liên quan'],
    technician: ['Theo dõi cảnh báo sensor', 'Đi tới planner để tạo bản nháp'],
    manager: ['Phê duyệt nhanh', 'Lên lịch đợt nung'],
    observer: ['Chỉ xem'],
  },
  backlog: {
    member: ['Sửa món của chính bạn', 'Lọc và tìm kiếm'],
    technician: ['Sửa mọi piece', 'Đổi trạng thái'],
    manager: ['Sửa mọi piece, đổi chủ sở hữu, đổi trạng thái'],
    observer: ['Chỉ xem'],
  },
  intake: {
    member: ['Tự đăng ký món mới hoặc sửa món của mình'],
    technician: ['Đăng ký thay thành viên khác, đổi chủ sở hữu'],
    manager: ['Toàn quyền với piece, kể cả trạng thái'],
    observer: ['Không vào được trang này'],
  },
  planner: {
    technician: ['Chạy preview, tạo bản nháp đợt nung'],
    manager: ['Chạy preview, tạo bản nháp, sẽ tự duyệt ở trang Load Detail'],
    member: ['Không có quyền chạy planner'],
    observer: ['Không có quyền chạy planner'],
  },
  loads: {
    member: ['Mở đợt nung để xem chi tiết'],
    technician: ['Tạo bản nháp mới', 'Mở đợt để nhập sensor / ghi chú'],
    manager: ['Toàn quyền: duyệt, lên lịch, hủy đợt'],
    observer: ['Chỉ xem danh sách'],
  },
  'load-detail': {
    member: ['Xem chi tiết, theo dõi tiến độ'],
    technician: ['Tạo lại kế hoạch (draft)', 'Nhập CSV sensor', 'Thêm ghi chú'],
    manager: ['Mọi thao tác: duyệt, lên lịch, hủy, ghi chú, nhập sensor'],
    observer: ['Chỉ xem'],
  },
};
