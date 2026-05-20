import { getPieceBlockReasons, type PieceStatus } from "../../shared/domain.js";
import { openDatabase, migrate, nowIso, type Db } from "./sqlite.js";

type SeedPiece = {
  ownerName: string;
  name: string;
  clayBody: string;
  glazeFamily: string;
  targetCone: string;
  firingType: string;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  weightKg: number;
  drynessPercent: number;
  dueDate: string;
  notes: string;
  createdAt: string;
  status?: PieceStatus;
};

export function seedDatabase(db: Db, options: { reset?: boolean } = {}): void {
  if (options.reset) {
    db.exec(`
      DELETE FROM alerts;
      DELETE FROM sensor_readings;
      DELETE FROM audit_notes;
      DELETE FROM load_exclusions;
      DELETE FROM load_pieces;
      DELETE FROM loads;
      DELETE FROM pieces;
      DELETE FROM kilns;
      DELETE FROM users;
      DELETE FROM sqlite_sequence WHERE name IN ('alerts','sensor_readings','audit_notes','load_exclusions','loads','pieces','kilns','users');
    `);
  }

  const existing = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  if (existing.count > 0) return;

  const insertUser = db.prepare("INSERT INTO users (name, role) VALUES (?, ?)");
  [
    ["Mira", "manager"],
    ["Tuan", "technician"],
    ["An", "member"],
    ["Linh", "member"],
    ["Guest", "observer"]
  ].forEach(([name, role]) => insertUser.run(name, role));

  const insertKiln = db.prepare(`
    INSERT INTO kilns (name, shelf_width_cm, shelf_depth_cm, shelf_count, max_weight_kg, max_height_per_shelf_cm)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertKiln.run("Skutt 1027", 55, 55, 4, 75, 18);
  insertKiln.run("Mini Raku", 32, 32, 2, 20, 14);

  const ownerIds = new Map<string, number>();
  for (const row of db.prepare("SELECT id, name FROM users").all() as Array<{ id: number; name: string }>) {
    ownerIds.set(row.name, row.id);
  }

  const seedPieces: SeedPiece[] = [
    {
      ownerName: "An",
      name: "Tô ăn sáng men xanh",
      clayBody: "stoneware",
      glazeFamily: "celadon",
      targetCone: "6",
      firingType: "oxidation",
      widthCm: 13,
      depthCm: 13,
      heightCm: 7,
      weightKg: 0.8,
      drynessPercent: 96,
      dueDate: "2026-05-23",
      notes: "Món gấp cho phiên chợ cộng đồng.",
      createdAt: "2026-05-10T08:30:00.000Z"
    },
    {
      ownerName: "Linh",
      name: "Đĩa phục vụ lớn",
      clayBody: "stoneware",
      glazeFamily: "soda-sensitive",
      targetCone: "6",
      firingType: "oxidation",
      widthCm: 48,
      depthCm: 30,
      heightCm: 6,
      weightKg: 4.2,
      drynessPercent: 91,
      dueDate: "2026-05-24",
      notes: "Để xa các thử nghiệm soda-flash.",
      createdAt: "2026-05-07T11:00:00.000Z"
    },
    {
      ownerName: "An",
      name: "Cốc còn đang khô",
      clayBody: "stoneware",
      glazeFamily: "clear",
      targetCone: "6",
      firingType: "oxidation",
      widthCm: 8,
      depthCm: 8,
      heightCm: 9,
      weightKg: 0.4,
      drynessPercent: 55,
      dueDate: "2026-05-25",
      notes: "Tay cầm dày hơn dự kiến.",
      createdAt: "2026-05-14T13:20:00.000Z"
    },
    {
      ownerName: "Linh",
      name: "Đĩa men chưa rõ",
      clayBody: "stoneware",
      glazeFamily: "unknown",
      targetCone: "6",
      firingType: "oxidation",
      widthCm: 20,
      depthCm: 20,
      heightCm: 3,
      weightKg: 0.9,
      drynessPercent: 98,
      dueDate: "2026-05-29",
      notes: "Cần kỹ thuật viên kiểm tra men.",
      createdAt: "2026-05-11T09:00:00.000Z"
    },
    {
      ownerName: "Linh",
      name: "Bình quá cao",
      clayBody: "porcelain",
      glazeFamily: "clear",
      targetCone: "6",
      firingType: "oxidation",
      widthCm: 16,
      depthCm: 16,
      heightCm: 23,
      weightKg: 2.4,
      drynessPercent: 95,
      dueDate: "2026-06-01",
      notes: "Cần xếp kệ đặc biệt.",
      createdAt: "2026-05-08T15:45:00.000Z"
    },
    {
      ownerName: "An",
      name: "Tượng vườn nặng",
      clayBody: "stoneware",
      glazeFamily: "crawl",
      targetCone: "6",
      firingType: "oxidation",
      widthCm: 25,
      depthCm: 25,
      heightCm: 16,
      weightKg: 80,
      drynessPercent: 92,
      dueDate: "2026-06-03",
      notes: "Riêng món này đã vượt tải trọng Skutt.",
      createdAt: "2026-05-12T16:10:00.000Z"
    },
    {
      ownerName: "An",
      name: "Hũ trà cone 10",
      clayBody: "stoneware",
      glazeFamily: "shino",
      targetCone: "10",
      firingType: "reduction",
      widthCm: 18,
      depthCm: 18,
      heightCm: 15,
      weightKg: 1.8,
      drynessPercent: 94,
      dueDate: "2026-06-04",
      notes: "Ứng viên cho kệ nung khử.",
      createdAt: "2026-05-09T10:05:00.000Z"
    },
    {
      ownerName: "Linh",
      name: "Chậu sai cone",
      clayBody: "stoneware",
      glazeFamily: "clear",
      targetCone: "10",
      firingType: "oxidation",
      widthCm: 22,
      depthCm: 22,
      heightCm: 14,
      weightKg: 2.9,
      drynessPercent: 90,
      dueDate: "2026-06-02",
      notes: "Không nên xuất hiện trong mẻ cone 6.",
      createdAt: "2026-05-13T09:30:00.000Z"
    },
    {
      ownerName: "An",
      name: "Cốc raku horsehair",
      clayBody: "earthenware",
      glazeFamily: "clear",
      targetCone: "04",
      firingType: "raku",
      widthCm: 9,
      depthCm: 9,
      heightCm: 10,
      weightKg: 0.5,
      drynessPercent: 97,
      dueDate: "2026-05-27",
      notes: "Tương thích raku.",
      createdAt: "2026-05-06T12:00:00.000Z"
    },
    {
      ownerName: "Linh",
      name: "Mẫu thử raku porcelain",
      clayBody: "porcelain",
      glazeFamily: "clear",
      targetCone: "04",
      firingType: "raku",
      widthCm: 7,
      depthCm: 7,
      heightCm: 6,
      weightKg: 0.3,
      drynessPercent: 94,
      dueDate: "2026-05-28",
      notes: "Bị chặn bởi quy tắc đất cho raku.",
      createdAt: "2026-05-14T08:45:00.000Z"
    },
    {
      ownerName: "An",
      name: "Gạch earthenware cone 10",
      clayBody: "earthenware",
      glazeFamily: "clear",
      targetCone: "10",
      firingType: "reduction",
      widthCm: 12,
      depthCm: 12,
      heightCm: 2,
      weightKg: 0.4,
      drynessPercent: 96,
      dueDate: "2026-06-05",
      notes: "Bị chặn cho cone 10.",
      createdAt: "2026-05-15T07:55:00.000Z"
    },
    {
      ownerName: "Linh",
      name: "Mẫu đất tự nhiên",
      clayBody: "wild-clay",
      glazeFamily: "clear",
      targetCone: "6",
      firingType: "oxidation",
      widthCm: 10,
      depthCm: 10,
      heightCm: 6,
      weightKg: 0.6,
      drynessPercent: 86,
      dueDate: "2026-06-06",
      notes: "Kỹ thuật viên muốn tăng nhiệt chậm.",
      createdAt: "2026-05-16T14:00:00.000Z"
    },
    {
      ownerName: "An",
      name: "Lô cốc nung mộc",
      clayBody: "stoneware",
      glazeFamily: "clear",
      targetCone: "04",
      firingType: "bisque",
      widthCm: 24,
      depthCm: 18,
      heightCm: 10,
      weightKg: 3.1,
      drynessPercent: 89,
      dueDate: "2026-05-30",
      notes: "Dữ liệu mẫu trong mẻ nung mộc đã lên lịch.",
      createdAt: "2026-05-05T09:15:00.000Z",
      status: "planned"
    }
  ];

  const insertPiece = db.prepare(`
    INSERT INTO pieces (
      owner_id, name, clay_body, glaze_family, target_cone, firing_type,
      width_cm, depth_cm, height_cm, weight_kg, dryness_percent, due_date,
      notes, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const piece of seedPieces) {
    const ownerId = ownerIds.get(piece.ownerName);
    if (!ownerId) throw new Error(`Missing owner ${piece.ownerName}`);
    const status = piece.status ?? inferPieceStatus(piece);
    insertPiece.run(
      ownerId,
      piece.name,
      piece.clayBody,
      piece.glazeFamily,
      piece.targetCone,
      piece.firingType,
      piece.widthCm,
      piece.depthCm,
      piece.heightCm,
      piece.weightKg,
      piece.drynessPercent,
      piece.dueDate,
      piece.notes,
      status,
      piece.createdAt,
      piece.createdAt
    );
  }

  const tuanId = ownerIds.get("Tuan");
  const miraId = ownerIds.get("Mira");
  if (!tuanId || !miraId) throw new Error("Seed users Mira and Tuan are required.");
  const skuttId = (db.prepare("SELECT id FROM kilns WHERE name = ?").get("Skutt 1027") as { id: number }).id;
  const bisquePieceId = (db.prepare("SELECT id FROM pieces WHERE name = ?").get("Lô cốc nung mộc") as { id: number }).id;
  const createdAt = "2026-05-18T09:00:00.000Z";

  db.prepare(`
    INSERT INTO loads (kiln_id, target_cone, firing_type, status, version, scheduled_start, scheduled_end, created_by, approved_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(skuttId, "04", "bisque", "scheduled", 2, "2026-05-21T09:00:00.000Z", "2026-05-21T17:00:00.000Z", tuanId, miraId, createdAt, createdAt);

  const loadId = Number((db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number }).id);
  db.prepare(`
    INSERT INTO load_pieces (load_id, piece_id, shelf_index, x_cm, y_cm, width_cm, depth_cm)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(loadId, bisquePieceId, 0, 0, 0, 24, 18);

  db.prepare(`
    INSERT INTO audit_notes (load_id, user_id, note, created_at)
    VALUES (?, ?, ?, ?)
  `).run(loadId, tuanId, "Mẻ nung mộc mẫu đã được lên lịch để kiểm thử thủ công.", createdAt);

  db.prepare(`
    INSERT INTO alerts (load_id, piece_id, type, severity, message, created_at)
    VALUES (?, NULL, ?, ?, ?, ?)
  `).run(loadId, "SCHEDULE_REVIEW", "info", "Mẻ nung mộc mẫu đã được lên lịch vào sáng mai.", nowIso());
}

function inferPieceStatus(piece: SeedPiece): PieceStatus {
  const reasons = getPieceBlockReasons({
    drynessPercent: piece.drynessPercent,
    glazeFamily: piece.glazeFamily,
    targetCone: piece.targetCone,
    firingType: piece.firingType,
    clayBody: piece.clayBody,
    heightCm: piece.heightCm
  } as Parameters<typeof getPieceBlockReasons>[0]);

  return reasons.length > 0 ? "blocked" : "ready";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = openDatabase();
  migrate(db);
  seedDatabase(db, { reset: true });
  db.close();
  console.log("Đã seed database KilnFlow Ops.");
}
