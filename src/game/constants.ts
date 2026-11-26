import { ArenaZoneConfig, LightSource, PickupKind, ShelfObstacle, StyleRank, UpgradeOption } from './types';

export const ARENA_WIDTH = 768;
export const ARENA_HEIGHT = 512;
export const WALL_THICKNESS = 26;
export const TILE_SIZE = 16;

export const PLAYER_SPAWN = { x: 384, y: 276 };
export const SHELF_RESPAWN_DELAY = 6.5;

const GROCERY_SHELVES: ShelfObstacle[] = [
  { id: 'fridge-1', x: 88, y: 34, w: 128, h: 28, style: 'fridge', label: 'МОЛОЧКА', emissiveColor: '#38bdf8', maxHp: 75 },
  { id: 'fridge-2', x: 320, y: 34, w: 128, h: 28, style: 'fridge', label: 'ЗАМОРОЗКА', emissiveColor: '#22d3ee', maxHp: 75 },
  { id: 'fridge-3', x: 552, y: 34, w: 128, h: 28, style: 'fridge', label: 'НАПИТКИ', emissiveColor: '#38bdf8', maxHp: 75 },

  { id: 'shelf-produce', x: 96, y: 132, w: 104, h: 32, style: 'produce', label: 'ОВОЩИ', maxHp: 50 },
  { id: 'shelf-snacks', x: 568, y: 132, w: 104, h: 32, style: 'snacks', label: 'ЧИПСЫ', maxHp: 50 },
  { id: 'shelf-drinks', x: 96, y: 342, w: 104, h: 32, style: 'drinks', label: 'СОКИ', maxHp: 50 },
  { id: 'shelf-bakery', x: 568, y: 342, w: 104, h: 32, style: 'bakery', label: 'ВЫПЕЧКА', maxHp: 50 },

  { id: 'rack-nw', x: 252, y: 118, w: 68, h: 28, style: 'snacks', label: 'АКЦИЯ', maxHp: 40 },
  { id: 'rack-ne', x: 448, y: 118, w: 68, h: 28, style: 'drinks', label: 'СКИДКА', maxHp: 40 },
  { id: 'rack-sw', x: 252, y: 360, w: 68, h: 28, style: 'bakery', label: 'ХЛЕБ', maxHp: 40 },
  { id: 'rack-se', x: 448, y: 360, w: 68, h: 28, style: 'produce', label: 'ФРУКТЫ', maxHp: 40 },

  { id: 'crate-w', x: 112, y: 238, w: 34, h: 34, style: 'crate', label: 'ЯЩИК', maxHp: 25 },
  { id: 'crate-e', x: 622, y: 238, w: 34, h: 34, style: 'crate', label: 'ЯЩИК', maxHp: 25 },
  { id: 'crate-c1', x: 274, y: 240, w: 30, h: 30, style: 'crate', label: 'ПАЛЛЕТ', maxHp: 25 },
  { id: 'crate-c2', x: 464, y: 240, w: 30, h: 30, style: 'crate', label: 'ПАЛЛЕТ', maxHp: 25 },

  { id: 'checkout-1', x: 148, y: 446, w: 128, h: 30, style: 'checkout', label: 'КАССА 1', emissiveColor: '#fbbf24', maxHp: 80 },
  { id: 'checkout-2', x: 492, y: 446, w: 128, h: 30, style: 'checkout', label: 'КАССА 2', emissiveColor: '#34d399', maxHp: 80 },
];

const FROZEN_SHELVES: ShelfObstacle[] = [
  { id: 'fz-top-1', x: 72, y: 34, w: 150, h: 28, style: 'fridge', label: 'ЛЕД', emissiveColor: '#22d3ee', maxHp: 75 },
  { id: 'fz-top-2', x: 309, y: 34, w: 150, h: 28, style: 'fridge', label: 'ПЕЛЬМЕНИ', emissiveColor: '#38bdf8', maxHp: 75 },
  { id: 'fz-top-3', x: 546, y: 34, w: 150, h: 28, style: 'fridge', label: 'МОРОЖЕНОЕ', emissiveColor: '#60a5fa', maxHp: 75 },

  { id: 'fz-bank-nw', x: 176, y: 120, w: 32, h: 92, style: 'fridge', label: 'РЫБА', emissiveColor: '#22d3ee', maxHp: 60 },
  { id: 'fz-bank-ne', x: 560, y: 120, w: 32, h: 92, style: 'fridge', label: 'КРЕВЕТКИ', emissiveColor: '#22d3ee', maxHp: 60 },
  { id: 'fz-bank-sw', x: 176, y: 300, w: 32, h: 92, style: 'fridge', label: 'МЯСО', emissiveColor: '#38bdf8', maxHp: 60 },
  { id: 'fz-bank-se', x: 560, y: 300, w: 32, h: 92, style: 'fridge', label: 'ФРИ', emissiveColor: '#38bdf8', maxHp: 60 },

  { id: 'fz-crate-1', x: 286, y: 172, w: 32, h: 32, style: 'crate', label: 'ЛЕД-БОКС', maxHp: 30 },
  { id: 'fz-crate-2', x: 450, y: 172, w: 32, h: 32, style: 'crate', label: 'ЛЕД-БОКС', maxHp: 30 },
  { id: 'fz-crate-3', x: 286, y: 308, w: 32, h: 32, style: 'crate', label: 'ЛЕД-БОКС', maxHp: 30 },
  { id: 'fz-crate-4', x: 450, y: 308, w: 32, h: 32, style: 'crate', label: 'ЛЕД-БОКС', maxHp: 30 },
  { id: 'fz-crate-w', x: 94, y: 240, w: 34, h: 34, style: 'drinks', label: 'ВОДА', maxHp: 35 },
  { id: 'fz-crate-e', x: 640, y: 240, w: 34, h: 34, style: 'drinks', label: 'КВАС', maxHp: 35 },

  { id: 'fz-cash-1', x: 148, y: 446, w: 128, h: 30, style: 'checkout', label: 'ХОЛОД-1', emissiveColor: '#22d3ee', maxHp: 85 },
  { id: 'fz-cash-2', x: 492, y: 446, w: 128, h: 30, style: 'checkout', label: 'ХОЛОД-2', emissiveColor: '#38bdf8', maxHp: 85 },
];

const WAREHOUSE_SHELVES: ShelfObstacle[] = [
  { id: 'wh-oven-1', x: 92, y: 34, w: 140, h: 28, style: 'bakery', label: 'ПЕЧЬ-1', maxHp: 80 },
  { id: 'wh-oven-2', x: 314, y: 34, w: 140, h: 28, style: 'bakery', label: 'ПЕЧЬ-2', maxHp: 80 },
  { id: 'wh-oven-3', x: 536, y: 34, w: 140, h: 28, style: 'bakery', label: 'ПЕЧЬ-3', maxHp: 80 },

  { id: 'wh-rack-nw', x: 118, y: 134, w: 88, h: 30, style: 'bakery', label: 'БАГЕТЫ', maxHp: 50 },
  { id: 'wh-rack-ne', x: 562, y: 134, w: 88, h: 30, style: 'snacks', label: 'СНЕКИ', maxHp: 50 },
  { id: 'wh-rack-sw', x: 118, y: 348, w: 88, h: 30, style: 'produce', label: 'АРБУЗЫ', maxHp: 50 },
  { id: 'wh-rack-se', x: 562, y: 348, w: 88, h: 30, style: 'bakery', label: 'БУЛКИ', maxHp: 50 },

  { id: 'wh-p1', x: 246, y: 150, w: 34, h: 34, style: 'crate', label: 'ПАЛЛЕТ', maxHp: 30 },
  { id: 'wh-p2', x: 288, y: 150, w: 34, h: 34, style: 'crate', label: 'ПАЛЛЕТ', maxHp: 30 },
  { id: 'wh-p3', x: 446, y: 150, w: 34, h: 34, style: 'crate', label: 'ПАЛЛЕТ', maxHp: 30 },
  { id: 'wh-p4', x: 488, y: 150, w: 34, h: 34, style: 'crate', label: 'ПАЛЛЕТ', maxHp: 30 },
  { id: 'wh-p5', x: 246, y: 328, w: 34, h: 34, style: 'crate', label: 'ПАЛЛЕТ', maxHp: 30 },
  { id: 'wh-p6', x: 288, y: 328, w: 34, h: 34, style: 'crate', label: 'ПАЛЛЕТ', maxHp: 30 },
  { id: 'wh-p7', x: 446, y: 328, w: 34, h: 34, style: 'crate', label: 'ПАЛЛЕТ', maxHp: 30 },
  { id: 'wh-p8', x: 488, y: 328, w: 34, h: 34, style: 'crate', label: 'ПАЛЛЕТ', maxHp: 30 },

  { id: 'wh-side-w', x: 96, y: 240, w: 36, h: 36, style: 'crate', label: 'МУКА', maxHp: 32 },
  { id: 'wh-side-e', x: 636, y: 240, w: 36, h: 36, style: 'crate', label: 'САХАР', maxHp: 32 },

  { id: 'wh-cash-1', x: 150, y: 446, w: 128, h: 30, style: 'checkout', label: 'ВЫДАЧА 1', emissiveColor: '#f59e0b', maxHp: 85 },
  { id: 'wh-cash-2', x: 490, y: 446, w: 128, h: 30, style: 'checkout', label: 'ВЫДАЧА 2', emissiveColor: '#fbbf24', maxHp: 85 },
];

const VIP_SHELVES: ShelfObstacle[] = [
  { id: 'vip-top-1', x: 96, y: 34, w: 132, h: 28, style: 'fridge', label: 'VIP-БАР', emissiveColor: '#e879f9', maxHp: 85 },
  { id: 'vip-top-2', x: 318, y: 34, w: 132, h: 28, style: 'fridge', label: 'ЭНЕРГИЯ', emissiveColor: '#22d3ee', maxHp: 85 },
  { id: 'vip-top-3', x: 540, y: 34, w: 132, h: 28, style: 'fridge', label: 'НЕОН', emissiveColor: '#e879f9', maxHp: 85 },

  { id: 'vip-ring-nw', x: 242, y: 142, w: 84, h: 26, style: 'drinks', label: 'ВИТРИНА', maxHp: 55 },
  { id: 'vip-ring-ne', x: 442, y: 142, w: 84, h: 26, style: 'snacks', label: 'ВИТРИНА', maxHp: 55 },
  { id: 'vip-ring-sw', x: 242, y: 344, w: 84, h: 26, style: 'snacks', label: 'ВИТРИНА', maxHp: 55 },
  { id: 'vip-ring-se', x: 442, y: 344, w: 84, h: 26, style: 'drinks', label: 'ВИТРИНА', maxHp: 55 },

  { id: 'vip-pillar-w', x: 172, y: 212, w: 28, h: 88, style: 'fridge', label: 'СТЕНА', emissiveColor: '#e879f9', maxHp: 65 },
  { id: 'vip-pillar-e', x: 568, y: 212, w: 28, h: 88, style: 'fridge', label: 'СТЕНА', emissiveColor: '#22d3ee', maxHp: 65 },

  { id: 'vip-c1', x: 102, y: 156, w: 32, h: 32, style: 'crate', label: 'КЕЙС', maxHp: 32 },
  { id: 'vip-c2', x: 634, y: 156, w: 32, h: 32, style: 'crate', label: 'КЕЙС', maxHp: 32 },
  { id: 'vip-c3', x: 102, y: 324, w: 32, h: 32, style: 'crate', label: 'КЕЙС', maxHp: 32 },
  { id: 'vip-c4', x: 634, y: 324, w: 32, h: 32, style: 'crate', label: 'КЕЙС', maxHp: 32 },

  { id: 'vip-cash-1', x: 148, y: 446, w: 128, h: 30, style: 'checkout', label: 'VIP-1', emissiveColor: '#e879f9', maxHp: 90 },
  { id: 'vip-cash-2', x: 492, y: 446, w: 128, h: 30, style: 'checkout', label: 'VIP-2', emissiveColor: '#facc15', maxHp: 90 },
];

export const ARENA_ZONES: ArenaZoneConfig[] = [
  {
    id: 'grocery',
    name: 'Бакалея 24/7',
    floorText: 'АКЦИЯ 24/7',
    tileColorA: '#cbd5e1',
    tileColorB: '#bcc7d6',
    promoFill: 'rgba(239, 68, 68, 0.13)',
    promoStroke: 'rgba(239, 68, 68, 0.34)',
    stripeColor: 'rgba(250, 204, 21, 0.45)',
    wallColor: '#1e293b',
    wallTrim: '#334155',
    accentLine: '#dc2626',
    ambientRgb: [78, 86, 112],
    emergencyRgb: [30, 26, 58],
    shelves: GROCERY_SHELVES,
    lights: [
      { id: 'tube-nw', x: 184, y: 112, radius: 190, color: '#fff3d6', intensity: 0.92 },
      { id: 'tube-ne', x: 584, y: 112, radius: 190, color: '#fef3c7', intensity: 0.9 },
      { id: 'tube-center', x: 384, y: 256, radius: 230, color: '#fffbeb', intensity: 1.0, flickerSpeed: 5.5, flickerPhase: 1.2, flickerMin: 0.78 },
      { id: 'tube-sw', x: 184, y: 392, radius: 190, color: '#fef9c3', intensity: 0.88 },
      { id: 'tube-se', x: 584, y: 392, radius: 190, color: '#fff3d6', intensity: 0.86, flickerSpeed: 11.0, flickerPhase: 3.7, flickerMin: 0.55 },
      { id: 'glow-fridge-1', x: 152, y: 74, radius: 125, color: '#38bdf8', intensity: 0.78 },
      { id: 'glow-fridge-2', x: 384, y: 74, radius: 135, color: '#22d3ee', intensity: 0.8 },
      { id: 'glow-fridge-3', x: 616, y: 74, radius: 125, color: '#38bdf8', intensity: 0.78 },
      { id: 'glow-cash-1', x: 212, y: 444, radius: 115, color: '#f59e0b', intensity: 0.68 },
      { id: 'glow-cash-2', x: 556, y: 444, radius: 115, color: '#34d399', intensity: 0.68 },
    ],
  },
  {
    id: 'frozen',
    name: 'Отдел Заморозки',
    floorText: 'ХОЛОД -18°',
    tileColorA: '#bfd7ea',
    tileColorB: '#adc8de',
    promoFill: 'rgba(14, 165, 233, 0.14)',
    promoStroke: 'rgba(34, 211, 238, 0.42)',
    stripeColor: 'rgba(56, 189, 248, 0.52)',
    wallColor: '#0f2744',
    wallTrim: '#1e3a5f',
    accentLine: '#06b6d4',
    ambientRgb: [60, 82, 118],
    emergencyRgb: [20, 32, 68],
    shelves: FROZEN_SHELVES,
    lights: [
      { id: 'tube-nw', x: 184, y: 120, radius: 205, color: '#bae6fd', intensity: 0.94 },
      { id: 'tube-ne', x: 584, y: 120, radius: 205, color: '#a5f3fc', intensity: 0.94 },
      { id: 'tube-center', x: 384, y: 256, radius: 245, color: '#e0f2fe', intensity: 1.0, flickerSpeed: 7.5, flickerPhase: 0.4, flickerMin: 0.75 },
      { id: 'tube-sw', x: 184, y: 392, radius: 205, color: '#bae6fd', intensity: 0.9 },
      { id: 'tube-se', x: 584, y: 392, radius: 205, color: '#a5f3fc', intensity: 0.9 },
      { id: 'glow-cryo-1', x: 192, y: 165, radius: 120, color: '#22d3ee', intensity: 0.85 },
      { id: 'glow-cryo-2', x: 576, y: 165, radius: 120, color: '#22d3ee', intensity: 0.85 },
      { id: 'glow-cryo-3', x: 192, y: 345, radius: 120, color: '#38bdf8', intensity: 0.85 },
      { id: 'glow-cryo-4', x: 576, y: 345, radius: 120, color: '#38bdf8', intensity: 0.85 },
    ],
  },
  {
    id: 'warehouse',
    name: 'Склад и Пекарня',
    floorText: 'СКЛАД / ХЛЕБ',
    tileColorA: '#d6c8b2',
    tileColorB: '#c5b59b',
    promoFill: 'rgba(245, 158, 11, 0.14)',
    promoStroke: 'rgba(245, 158, 11, 0.42)',
    stripeColor: 'rgba(249, 115, 22, 0.5)',
    wallColor: '#2c1f16',
    wallTrim: '#4b3525',
    accentLine: '#f59e0b',
    ambientRgb: [86, 72, 58],
    emergencyRgb: [48, 24, 24],
    shelves: WAREHOUSE_SHELVES,
    lights: [
      { id: 'tube-nw', x: 180, y: 110, radius: 200, color: '#fde68a', intensity: 0.95 },
      { id: 'tube-ne', x: 588, y: 110, radius: 200, color: '#fed7aa', intensity: 0.95 },
      { id: 'tube-center', x: 384, y: 256, radius: 245, color: '#fffbeb', intensity: 1.0, flickerSpeed: 4.0, flickerPhase: 2.0, flickerMin: 0.8 },
      { id: 'tube-sw', x: 180, y: 398, radius: 200, color: '#fde68a', intensity: 0.9 },
      { id: 'tube-se', x: 588, y: 398, radius: 200, color: '#fed7aa', intensity: 0.9, flickerSpeed: 12.0, flickerPhase: 1.1, flickerMin: 0.62 },
      { id: 'glow-oven-1', x: 162, y: 66, radius: 130, color: '#f97316', intensity: 0.82 },
      { id: 'glow-oven-2', x: 384, y: 66, radius: 130, color: '#fb923c', intensity: 0.82 },
      { id: 'glow-oven-3', x: 606, y: 66, radius: 130, color: '#f97316', intensity: 0.82 },
    ],
  },
  {
    id: 'vip_night',
    name: 'VIP-Секция 24/7',
    floorText: 'VIP НЕОН',
    tileColorA: '#3b4259',
    tileColorB: '#2f364b',
    promoFill: 'rgba(232, 121, 249, 0.14)',
    promoStroke: 'rgba(232, 121, 249, 0.45)',
    stripeColor: 'rgba(250, 204, 21, 0.55)',
    wallColor: '#181029',
    wallTrim: '#2e1d4d',
    accentLine: '#e879f9',
    ambientRgb: [62, 54, 92],
    emergencyRgb: [46, 18, 52],
    shelves: VIP_SHELVES,
    lights: [
      { id: 'tube-nw', x: 184, y: 112, radius: 200, color: '#f0abfc', intensity: 0.88 },
      { id: 'tube-ne', x: 584, y: 112, radius: 200, color: '#67e8f9', intensity: 0.88 },
      { id: 'tube-center', x: 384, y: 256, radius: 250, color: '#fef08a', intensity: 1.0, flickerSpeed: 8.5, flickerPhase: 0.7, flickerMin: 0.76 },
      { id: 'tube-sw', x: 184, y: 396, radius: 200, color: '#67e8f9', intensity: 0.88 },
      { id: 'tube-se', x: 584, y: 396, radius: 200, color: '#f0abfc', intensity: 0.88 },
      { id: 'glow-vip-w', x: 186, y: 256, radius: 130, color: '#e879f9', intensity: 0.9 },
      { id: 'glow-vip-e', x: 582, y: 256, radius: 130, color: '#22d3ee', intensity: 0.9 },
      { id: 'glow-vip-c1', x: 212, y: 444, radius: 120, color: '#e879f9', intensity: 0.78 },
      { id: 'glow-vip-c2', x: 556, y: 444, radius: 120, color: '#facc15', intensity: 0.78 },
    ],
  },
];

export const ARENA_SHELVES: ShelfObstacle[] = ARENA_ZONES[0].shelves;
export const BASE_LIGHTS: LightSource[] = ARENA_ZONES[0].lights;

export const SPAWN_POINTS = [
  { x: 64, y: 104 },
  { x: 704, y: 104 },
  { x: 64, y: 408 },
  { x: 704, y: 408 },
  { x: 384, y: 98 },
  { x: 384, y: 416 },
];

export const PICKUP_SPAWN_POINTS = [
  { x: 224, y: 195 },
  { x: 544, y: 195 },
  { x: 224, y: 315 },
  { x: 544, y: 315 },
  { x: 384, y: 190 },
  { x: 384, y: 348 },
];

export const SHOPPER_NAMES: Record<string, string[]> = {
  brawler: [
    'Бешеный Слава',
    'Торопыга за Акцией',
    'Охотник за Кэшбэком',
    'Хулиган из Бакалеи',
  ],
  charger: [
    'Турбо-Тележка Петрович',
    'Бабуля-Форсаж',
    'Таран 5-й Кассы',
    'Оптовик-Берсерк',
  ],
  thrower: [
    'Снайпер Консервов',
    'Жонглёр Банками',
    'Метатель Скидок',
    'Кибер-Дегустатор',
  ],
  heavy: [
    'Качок Протеиныч',
    'Мега-Закупщик',
    'Титан Морозилки',
    'Король Очереди',
  ],
  flanker: [
    'Курьер-Молния',
    'Самокатчик Макс',
    'Призрак Аллеи',
    'Ночной Спринтер',
  ],
};

export const BOSS_NAMES = [
  'БОСС: Администратор Вадим',
  'БОСС: Королева Распродажи',
  'БОСС: Старший Кассир V2',
  'БОСС: Ночной Ревизор',
  'БОСС: Мясник Морозилки',
  'БОСС: Повелитель Погрузчика',
];

export const ROUND_TITLES = [
  'Разгром в бакалее',
  'Турбо-очередь',
  'Красный ценник: Ярость',
  'Шторм в отделе',
  'Босс смены: Чёрная пятница',
  'Ледяной замес',
  'Ультрасмена 24/7',
];

export const PICKUP_LABELS: Record<PickupKind, string> = {
  watermelon: 'АРБУЗ',
  baguette: 'БАГЕТ',
  soda_bomb: 'ГАЗИРОВКА',
  energy_drink: 'ЭНЕРГЕТИК',
  croissant: 'КРУАССАН',
};

export const STYLE_RANK_COLORS: Record<StyleRank, string> = {
  D: '#94a3b8',
  C: '#38bdf8',
  B: '#4ade80',
  A: '#facc15',
  S: '#fb923c',
  SS: '#f43f5e',
  SSS: '#e879f9',
  ULTRA: '#fde047',
};

export const UPGRADE_CATALOG: UpgradeOption[] = [
  {
    id: 'tape_fists',
    title: 'Синяя изолента',
    subtitle: '+25% к урону всех ударов, дроби и луча',
    accentColor: '#38bdf8',
    iconKind: 'fist',
  },
  {
    id: 'extra_coin',
    title: 'Горсть сдачи',
    subtitle: '+1 монета в карман и быстрый заряд рельсы',
    accentColor: '#facc15',
    iconKind: 'crit',
  },
  {
    id: 'hot_shotgun',
    title: 'Термо-сканер',
    subtitle: '+3 дробины в залпе ценникомёта',
    accentColor: '#fb7185',
    iconKind: 'cart',
  },
  {
    id: 'juice_vamp',
    title: 'Соко-Вампиризм',
    subtitle: '+65% лечения от брызг в ближнем бою',
    accentColor: '#4ade80',
    iconKind: 'croissant',
  },
  {
    id: 'turbo_sneakers',
    title: 'Режим Турбо',
    subtitle: '+15% скорости и +1 заряд рывка',
    accentColor: '#38bdf8',
    iconKind: 'bolt',
  },
  {
    id: 'steel_apron',
    title: 'Титановый фартук',
    subtitle: '+40 макс. HP и полное лечение сейчас',
    accentColor: '#a78bfa',
    iconKind: 'fridge',
  },
];

export const PLAYER_PALETTE = {
  outline: '#111827',
  skin: '#f6c8a6',
  skinShade: '#d99b72',
  vest: '#ef4444',
  vestShade: '#b91c1c',
  shirt: '#f8fafc',
  pants: '#1e293b',
  cap: '#fbbf24',
  capShade: '#d97706',
};

export const ENEMY_PALETTES = [
  { jacket: '#3b82f6', jacketShade: '#1d4ed8', hair: '#451a03', pants: '#334155', accent: '#93c5fd' },
  { jacket: '#10b981', jacketShade: '#047857', hair: '#fde047', pants: '#1e293b', accent: '#6ee7b7' },
  { jacket: '#a855f7', jacketShade: '#7e22ce', hair: '#1c1917', pants: '#312e81', accent: '#d8b4fe' },
  { jacket: '#f97316', jacketShade: '#c2410c', hair: '#cbd5e1', pants: '#44403c', accent: '#fdba74' },
  { jacket: '#ec4899', jacketShade: '#be185d', hair: '#78350f', pants: '#1f2937', accent: '#f9a8d4' },
];
