// Seed data for KilnFlow Ops. The seed covers every planner branch so the
// frontend has interesting state on first boot.

import type { Kiln, Piece, User } from '@kilnflow/shared';
import type { DB } from './db.js';
import { getDb } from './db.js';
import { Repo } from './repo.js';

const now = () => new Date().toISOString();

function daysFromNow(d: number): string {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();
}

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
}

const USERS: User[] = [
  { id: 'user-mira', name: 'Mira', role: 'manager' },
  { id: 'user-tuan', name: 'Tuan', role: 'technician' },
  { id: 'user-an', name: 'An', role: 'member' },
  { id: 'user-linh', name: 'Linh', role: 'member' },
  { id: 'user-guest', name: 'Guest', role: 'observer' },
];

const KILNS: Kiln[] = [
  {
    id: 'kiln-skutt-1027',
    name: 'Skutt 1027',
    shelfWidthCm: 55,
    shelfDepthCm: 55,
    shelves: 4,
    maxWeightKg: 75,
    maxHeightPerShelfCm: 18,
  },
  {
    id: 'kiln-mini-raku',
    name: 'Mini Raku',
    shelfWidthCm: 32,
    shelfDepthCm: 32,
    shelves: 2,
    maxWeightKg: 20,
    maxHeightPerShelfCm: 14,
  },
];

function buildPieces(): Piece[] {
  const base = {
    notes: '',
    createdAt: daysAgo(7),
    updatedAt: daysAgo(1),
  };
  return [
    {
      ...base,
      id: 'piece-an-bowl-1',
      ownerId: 'user-an',
      name: 'Celadon teacup',
      clayBody: 'porcelain',
      glazeFamily: 'celadon',
      targetCone: '6',
      firingType: 'oxidation',
      widthCm: 9,
      depthCm: 9,
      heightCm: 8,
      weightKg: 0.4,
      drynessPercent: 95,
      dueDate: daysFromNow(7),
      status: 'ready',
    },
    {
      ...base,
      id: 'piece-an-vase',
      ownerId: 'user-an',
      name: 'Shino vase',
      clayBody: 'stoneware',
      glazeFamily: 'shino',
      targetCone: '6',
      firingType: 'oxidation',
      widthCm: 14,
      depthCm: 14,
      heightCm: 16,
      weightKg: 2.1,
      drynessPercent: 92,
      dueDate: daysFromNow(3),
      status: 'ready',
    },
    {
      ...base,
      id: 'piece-linh-mug-wrongcone',
      ownerId: 'user-linh',
      name: 'Crawl-glazed mug (cone 10)',
      clayBody: 'stoneware',
      glazeFamily: 'crawl',
      targetCone: '10',
      firingType: 'reduction',
      widthCm: 10,
      depthCm: 10,
      heightCm: 10,
      weightKg: 0.6,
      drynessPercent: 96,
      dueDate: daysFromNow(14),
      status: 'ready',
    },
    {
      ...base,
      id: 'piece-linh-bowl-underdry',
      ownerId: 'user-linh',
      name: 'Fresh bowl (still drying)',
      clayBody: 'stoneware',
      glazeFamily: 'clear',
      targetCone: '6',
      firingType: 'oxidation',
      widthCm: 12,
      depthCm: 12,
      heightCm: 6,
      weightKg: 0.8,
      drynessPercent: 55,
      dueDate: daysFromNow(10),
      status: 'ready',
    },
    {
      ...base,
      id: 'piece-an-unknown-glaze',
      ownerId: 'user-an',
      name: 'Mystery wood-ash test',
      clayBody: 'stoneware',
      glazeFamily: 'unknown',
      targetCone: '6',
      firingType: 'oxidation',
      widthCm: 8,
      depthCm: 8,
      heightCm: 8,
      weightKg: 0.3,
      drynessPercent: 90,
      dueDate: daysFromNow(20),
      status: 'ready',
    },
    {
      ...base,
      id: 'piece-linh-tall',
      ownerId: 'user-linh',
      name: 'Tall jug (too tall)',
      clayBody: 'stoneware',
      glazeFamily: 'clear',
      targetCone: '6',
      firingType: 'oxidation',
      widthCm: 14,
      depthCm: 14,
      heightCm: 26,
      weightKg: 1.6,
      drynessPercent: 91,
      dueDate: daysFromNow(12),
      status: 'ready',
    },
    {
      ...base,
      id: 'piece-an-toohheavy',
      ownerId: 'user-an',
      name: 'Garden planter (heavy)',
      clayBody: 'stoneware',
      glazeFamily: 'clear',
      targetCone: '6',
      firingType: 'oxidation',
      widthCm: 30,
      depthCm: 30,
      heightCm: 16,
      weightKg: 60,
      drynessPercent: 90,
      dueDate: daysFromNow(30),
      status: 'ready',
    },
    {
      ...base,
      id: 'piece-linh-raku-ok',
      ownerId: 'user-linh',
      name: 'Raku-ready vase',
      clayBody: 'stoneware',
      glazeFamily: 'clear',
      targetCone: '04',
      firingType: 'raku',
      widthCm: 12,
      depthCm: 12,
      heightCm: 12,
      weightKg: 1.2,
      drynessPercent: 92,
      dueDate: daysFromNow(5),
      status: 'ready',
    },
    {
      ...base,
      id: 'piece-an-raku-incompatible',
      ownerId: 'user-an',
      name: 'Porcelain (raku-incompatible)',
      clayBody: 'porcelain',
      glazeFamily: 'celadon',
      targetCone: '04',
      firingType: 'raku',
      widthCm: 10,
      depthCm: 10,
      heightCm: 10,
      weightKg: 0.4,
      drynessPercent: 95,
      dueDate: daysFromNow(6),
      status: 'ready',
    },
    {
      ...base,
      id: 'piece-linh-cone10-earthenware',
      ownerId: 'user-linh',
      name: 'Earthenware test (cone 10 forbidden)',
      clayBody: 'earthenware',
      glazeFamily: 'clear',
      targetCone: '10',
      firingType: 'reduction',
      widthCm: 9,
      depthCm: 9,
      heightCm: 8,
      weightKg: 0.5,
      drynessPercent: 93,
      dueDate: daysFromNow(15),
      status: 'ready',
    },
    {
      ...base,
      id: 'piece-an-urgent',
      ownerId: 'user-an',
      name: 'Commission plate (urgent)',
      clayBody: 'stoneware',
      glazeFamily: 'celadon',
      targetCone: '6',
      firingType: 'oxidation',
      widthCm: 18,
      depthCm: 18,
      heightCm: 4,
      weightKg: 1.0,
      drynessPercent: 96,
      dueDate: daysFromNow(1),
      status: 'ready',
    },
    {
      ...base,
      id: 'piece-linh-soda',
      ownerId: 'user-linh',
      name: 'Soda-sensitive cup',
      clayBody: 'porcelain',
      glazeFamily: 'soda-sensitive',
      targetCone: '6',
      firingType: 'oxidation',
      widthCm: 8,
      depthCm: 8,
      heightCm: 9,
      weightKg: 0.35,
      drynessPercent: 91,
      dueDate: daysFromNow(9),
      status: 'ready',
    },
  ];
}

export function seedDatabase(db: DB) {
  const repo = new Repo(db);
  if (repo.listUsers().length > 0) {
    return;
  }
  for (const u of USERS) repo.insertUser(u);
  for (const k of KILNS) repo.insertKiln(k);
  for (const p of buildPieces()) repo.insertPiece(p);
}

export function ensureSeeded(db: DB) {
  seedDatabase(db);
}

// CLI entrypoint: `npm run seed` resets the file-backed DB to a clean seed.
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ''));
if (isMain) {
  const db = getDb();
  db.exec('DELETE FROM alerts; DELETE FROM sensor_readings; DELETE FROM load_notes; DELETE FROM kiln_loads; DELETE FROM pieces; DELETE FROM kilns; DELETE FROM users;');
  seedDatabase(db);
  console.log('[kilnflow] seed complete');
  // help typecheck so `now` is used
  void now;
}
