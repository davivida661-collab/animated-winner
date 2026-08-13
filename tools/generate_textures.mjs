// ============================================================
//  Gerador de texturas do Addon Naruto Jedy
//  Gera PNGs (RGBA, sem dependências) para o resource pack.
//  Uso: node tools/generate_textures.mjs  (ou: bun tools/generate_textures.mjs)
// ============================================================
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ------------------------------------------------------------
//  Codificador PNG mínimo
// ------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (1 + width * 4) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ------------------------------------------------------------
//  Canvas
// ------------------------------------------------------------
class Canvas {
  constructor(w, h, transparent = false) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4);
    if (!transparent) {
      for (let i = 0; i < w * h; i++) this.data[i * 4 + 3] = 255;
    }
  }

  px(x, y, [r, g, b, a = 255]) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }

  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c);
  }

  circle(cx, cy, r, c) {
    for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++) {
      for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++) {
        if (Math.hypot(i - cx, j - cy) <= r) this.px(i, j, c);
      }
    }
  }

  ring(cx, cy, rOuter, rInner, c) {
    for (let j = Math.floor(cy - rOuter); j <= Math.ceil(cy + rOuter); j++) {
      for (let i = Math.floor(cx - rOuter); i <= Math.ceil(cx + rOuter); i++) {
        const d = Math.hypot(i - cx, j - cy);
        if (d <= rOuter && d >= rInner) this.px(i, j, c);
      }
    }
  }

  line(x0, y0, x1, y1, thickness, c) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 4;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thickness / 2, c);
    }
  }

  spiral(cx, cy, turns, r0, r1, c, step = 0.06) {
    const total = turns * Math.PI * 2;
    for (let t = 0; t <= total; t += step) {
      const r = r0 + (r1 - r0) * (t / total);
      this.px(cx + Math.cos(t) * r, cy + Math.sin(t) * r, c);
    }
  }

  save(relPath) {
    const abs = join(root, relPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, encodePng(this.w, this.h, this.data));
    console.log("✓", relPath);
  }
}

// ------------------------------------------------------------
//  Paleta
// ------------------------------------------------------------
const C = (r, g, b) => [r, g, b];
const steelLight = C(0xe8, 0xea, 0xef);
const steel = C(0xb4, 0xb8, 0xc2);
const steelDark = C(0x6e, 0x73, 0x80);
const steelEdge = C(0x3f, 0x43, 0x4e);
const gold = C(0xe3, 0xb5, 0x3f);
const goldDark = C(0x8f, 0x6a, 0x1c);
const blue = C(0x3b, 0x6f, 0xd4);
const blueDark = C(0x2a, 0x4f, 0x9e);
const blueDeep = C(0x1f, 0x3d, 0x7d);
const metal = C(0xcd, 0xd2, 0xda);
const metalDark = C(0x9a, 0xa2, 0xad);
const metalLight = C(0xf2, 0xf4, 0xf7);
const leafGreen = C(0x2f, 0x9e, 0x44);
const leafDark = C(0x1f, 0x6b, 0x2e);
const cloudRed = C(0xc2, 0x2d, 0x2d);
const cloudRedDark = C(0x7c, 0x1c, 0x1c);
const cloakBlack = C(0x14, 0x15, 0x1a);
const cloakShade = C(0x24, 0x26, 0x2e);
const cloakDeep = C(0x0a, 0x0b, 0x0e);
const ramenWhite = C(0xf7, 0xf3, 0xec);
const ramenShade = C(0xd9, 0xd3, 0xc5);
const ramenOutline = C(0x8f, 0x88, 0x7a);
const ramenRed = C(0xe2, 0x57, 0x4c);
const noodle = C(0xf0, 0xc7, 0x5e);
const noodleDark = C(0xcf, 0xa4, 0x3f);
const chop = C(0x7a, 0x4a, 0x21);
const rasenganBlue = C(0x3f, 0x8e, 0xfc);
const rasenganMid = C(0x4f, 0x9d, 0xff);
const rasenganLight = C(0x82, 0xbd, 0xff);
const rasenganGlow = C(0xcf, 0xe6, 0xff);
const white = C(0xff, 0xff, 0xff);
const chidoriBg = C(0x0d, 0x1b, 0x3f);
const boltLight = C(0x9f, 0xd0, 0xff);
const darkBg = C(0x13, 0x17, 0x22);
const darkRing = C(0x0e, 0x11, 0x1a);
const orange = C(0xf5, 0x9e, 0x0b);
const redMain = C(0xcf, 0x35, 0x35);
const handleDark = C(0x3a, 0x3a, 0x3a);
const wrapDark = C(0x2c, 0x2f, 0x3a);

// ------------------------------------------------------------
//  Desenhos
// ------------------------------------------------------------
function cloud(c, cx, cy, s) {
  c.circle(cx, cy, 1.6 * s, cloudRed);
  c.circle(cx - 1.8 * s, cy + 0.6 * s, 1.2 * s, cloudRed);
  c.circle(cx + 1.8 * s, cy + 0.4 * s, 1.2 * s, cloudRed);
  c.circle(cx - 1.0 * s, cy - 1.2 * s, 1.0 * s, cloudRed);
  c.circle(cx + 1.2 * s, cy - 1.1 * s, 1.0 * s, cloudRed);
  c.rect(Math.round(cx - 0.8 * s), Math.round(cy + 0.9 * s), Math.max(1, Math.round(1.6 * s)), Math.max(1, Math.round(1.4 * s)), cloudRed);
  // contorno escuro
  c.ring(cx, cy, 1.6 * s, Math.max(0.4, 1.6 * s - 0.5), cloudRedDark);
}

function leafSwirl(c, cx, cy) {
  c.spiral(cx, cy, 1.2, 0.5, 2.6, leafGreen, 0.06);
  c.px(cx, cy - 2.8, leafDark);
}

function drawKunai() {
  const c = new Canvas(16, 16, true);
  // lâmina (estreita no topo, mais larga na base)
  for (let y = 1; y <= 9; y++) {
    const hw = 1 + Math.round(((y - 1) / 9) * 1.4);
    for (let x = 7 - hw; x <= 8 + hw; x++) {
      c.px(x, y, x === 7 || x === 8 ? steelLight : steel);
    }
    c.px(7 - hw - 1, y, steelEdge);
    c.px(8 + hw + 1, y, steelEdge);
  }
  c.px(7, 1, white);
  // guarda
  c.rect(5, 10, 6, 1, steelDark);
  // cabo
  c.rect(7, 11, 2, 2, handleDark);
  c.px(7, 12, gold);
  // argola
  c.ring(7.5, 14.2, 2.1, 1.4, steelLight);
  c.ring(7.5, 14.2, 2.1, 2.0, steelEdge);
  c.save("Naruto_Jedy_RP/textures/items/kunai.png");
}

function drawShuriken() {
  const c = new Canvas(16, 16, true);
  for (let j = 0; j < 16; j++) {
    for (let i = 0; i < 16; i++) {
      const dx = i - 7.5;
      const dy = j - 7.5;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      const d = Math.hypot(dx, dy);
      // quatro pontas diagonais
      if (Math.abs(adx - ady) <= 1.5 && Math.max(adx, ady) <= 7) {
        const edge = Math.max(adx, ady) >= 6;
        c.px(i, j, edge ? steelEdge : adx >= 4 ? steelDark : steel);
      }
      // anel central
      if (d <= 5 && d >= 2.4) c.px(i, j, steelLight);
      if (d < 2.4) c.px(i, j, [0, 0, 0, 0]); // furo
    }
  }
  c.save("Naruto_Jedy_RP/textures/items/shuriken.png");
}

function drawRasengan() {
  const c = new Canvas(16, 16, true);
  c.circle(7.5, 7.5, 7.4, rasenganBlue);
  c.circle(7.5, 7.5, 6.0, rasenganMid);
  c.circle(7.5, 7.5, 4.4, rasenganLight);
  c.circle(7.5, 7.5, 1.6, white);
  c.spiral(7.5, 7.5, 1.5, 1.6, 5.8, white, 0.05);
  c.ring(7.5, 7.5, 7.2, 6.6, rasenganGlow);
  c.save("Naruto_Jedy_RP/textures/items/rasengan.png");
}

function drawChidori() {
  const c = new Canvas(16, 16, false);
  c.rect(0, 0, 16, 16, chidoriBg);
  const pts = [
    [2, 0],
    [6, 3],
    [4, 5],
    [8, 9],
    [5, 12],
    [9, 15],
  ];
  for (let k = 0; k < pts.length - 1; k++) {
    c.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], 2.2, boltLight);
  }
  for (let k = 0; k < pts.length - 1; k++) {
    c.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], 1.0, white);
  }
  c.px(2, 8, white);
  c.px(11, 4, white);
  c.px(13, 11, boltLight);
  c.px(1, 13, boltLight);
  c.px(12, 14, white);
  c.save("Naruto_Jedy_RP/textures/items/chidori.png");
}

function drawKusanagi() {
  const c = new Canvas(16, 16, true);
  // lâmina
  for (let y = 0; y <= 8; y++) {
    const hw = y <= 1 ? 1 : 2;
    for (let x = 7 - hw; x <= 8 + hw; x++) {
      c.px(x, y, x === 7 || x === 8 ? steelLight : steel);
    }
    c.px(7 - hw - 1, y, steelEdge);
    c.px(8 + hw + 1, y, steelEdge);
  }
  c.px(7, 0, white);
  c.px(8, 0, white);
  // guarda dourada
  c.rect(4, 9, 8, 1, gold);
  c.px(4, 9, goldDark);
  c.px(11, 9, goldDark);
  // cabo com amarração
  c.rect(7, 10, 2, 4, wrapDark);
  c.px(7, 11, gold);
  c.px(8, 12, gold);
  c.px(7, 13, gold);
  // pomo
  c.rect(6, 14, 4, 1, gold);
  c.save("Naruto_Jedy_RP/textures/items/kusanagi.png");
}

function drawKonohaHeadbandItem() {
  const c = new Canvas(16, 16, true);
  // faixa azul
  c.rect(0, 8, 16, 7, blue);
  c.rect(0, 9, 16, 1, blueDark);
  c.rect(0, 13, 16, 1, blueDark);
  c.rect(0, 14, 16, 1, blueDeep);
  // placa de metal
  c.rect(4, 6, 8, 8, metalDark);
  c.rect(5, 7, 6, 6, metal);
  c.rect(5, 7, 6, 1, metalLight);
  c.rect(5, 12, 6, 1, metalDark);
  // símbolo da folha
  leafSwirl(c, 8, 10);
  c.save("Naruto_Jedy_RP/textures/items/konoha_headband.png");
}

function drawAkatsukiCloakItem() {
  const c = new Canvas(16, 16, true);
  c.rect(1, 2, 14, 12, cloakBlack);
  c.rect(1, 2, 14, 1, cloakShade);
  c.rect(1, 13, 14, 1, cloakDeep);
  cloud(c, 4.5, 5.5, 0.9);
  cloud(c, 11.5, 10.5, 1.2);
  c.save("Naruto_Jedy_RP/textures/items/akatsuki_cloak.png");
}

function drawRamen() {
  const c = new Canvas(16, 16, true);
  // borda da tigela
  c.rect(1, 9, 14, 1, ramenRed);
  c.rect(2, 10, 12, 1, ramenWhite);
  // corpo da tigela
  c.rect(1, 11, 14, 4, ramenWhite);
  c.rect(2, 14, 12, 1, ramenShade);
  c.px(0, 11, ramenShade);
  c.px(15, 11, ramenShade);
  c.rect(1, 12, 1, 2, ramenShade);
  c.rect(14, 12, 1, 2, ramenShade);
  c.rect(0, 15, 16, 1, ramenOutline);
  // macarrão
  for (let y = 4; y <= 8; y++) {
    for (let x = 2; x <= 13; x++) {
      const off = Math.round(Math.sin(x * 0.9 + y) * 0.9);
      c.px(x, y + off, noodle);
    }
  }
  c.rect(2, 9, 12, 1, noodleDark);
  // hashi
  c.line(5, 0, 7, 4, 0.9, chop);
  c.line(9, 0, 11, 4, 0.9, chop);
  c.save("Naruto_Jedy_RP/textures/items/ramen.png");
}

function drawHeadbandEntity() {
  const c = new Canvas(16, 16, false);
  c.rect(0, 0, 16, 16, blue);
  c.rect(0, 0, 16, 1, blueDeep);
  c.rect(0, 2, 16, 1, blueDark);
  c.rect(0, 13, 16, 1, blueDark);
  c.rect(0, 15, 16, 1, blueDeep);
  c.rect(2, 4, 12, 8, metalDark);
  c.rect(3, 5, 10, 6, metal);
  c.rect(3, 5, 10, 1, metalLight);
  leafSwirl(c, 8, 8);
  c.save("Naruto_Jedy_RP/textures/entity/naruto_headband.png");
}

function drawCloakEntity() {
  const c = new Canvas(16, 16, false);
  c.rect(0, 0, 16, 16, cloakBlack);
  c.rect(0, 0, 16, 1, cloakShade);
  c.rect(0, 15, 16, 1, cloakDeep);
  cloud(c, 4, 4, 1.0);
  cloud(c, 12, 9, 1.2);
  cloud(c, 8, 13.5, 0.8);
  c.save("Naruto_Jedy_RP/textures/entity/akatsuki_cloak_entity.png");
}

function drawPackIcon(size, mainColor) {
  const c = new Canvas(size, size, false);
  c.rect(0, 0, size, size, darkBg);
  const cx = size / 2;
  const cy = size / 2;
  c.circle(cx, cy, size * 0.42, darkRing);
  c.circle(cx, cy, size * 0.36, mainColor);
  c.spiral(cx, cy, 2.2, size * 0.04, size * 0.3, white, 0.015);
  c.circle(cx, cy, size * 0.05, white);
  return c;
}

function drawChibi(path, p) {
  const c = new Canvas(32, 32, true);
  // --- cabeça (região 0,0-7,7) ---
  // cabelo espetado no topo
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 7; x++) {
      if ((x + y) % 3 !== 0) c.px(x, y, p.hair);
    }
  }
  // faixa na cabeça
  c.rect(0, 3, 7, 1, p.band);
  // placa de metal com símbolo
  c.rect(1, 4, 5, 1, p.bandPlate);
  c.px(3, 4, p.bandSymbol);
  // rosto
  c.rect(0, 5, 7, 2, p.skin);
  c.px(1, 5, p.eye);
  c.px(1, 6, p.eye);
  c.px(5, 5, p.eye);
  c.px(5, 6, p.eye);
  // --- corpo (região 8,0-15,4) ---
  c.rect(8, 0, 8, 4, p.body);
  c.rect(8, 3, 8, 1, p.bodyTrim);
  c.px(11, 1, p.bodyLine);
  c.px(11, 2, p.bodyLine);
  // --- braços (região 16,0-22,3) ---
  c.rect(16, 0, 7, 4, p.arm);
  // --- pernas (região 0,8-9,11) ---
  c.rect(0, 8, 5, 4, p.leg);
  c.rect(6, 8, 5, 4, p.leg);
  c.rect(0, 11, 5, 1, p.shoe);
  c.rect(6, 11, 5, 1, p.shoe);
  c.save(path);
}

function drawNinjaSensei() {
  drawChibi("Naruto_Jedy_RP/textures/entity/ninja_sensei.png", {
    hair: C(0xf0, 0xa0, 0x20), // cabelo alaranjado
    band: C(0x3b, 0x6f, 0xd4), // faixa azul
    bandPlate: C(0xcd, 0xd2, 0xda), // placa de metal
    bandSymbol: C(0x2f, 0x9e, 0x44), // símbolo da folha
    skin: C(0xf2, 0xc7, 0x9b),
    eye: C(0x3a, 0x2a, 0x1a),
    body: C(0xe5, 0x8b, 0x2a), // jaqueta laranja
    bodyTrim: C(0xb8, 0x6a, 0x12),
    bodyLine: C(0x7a, 0x4a, 0x10),
    arm: C(0xf2, 0xc7, 0x9b),
    leg: C(0x2f, 0x5c, 0xb4), // calça azul
    shoe: C(0x7a, 0x3b, 0x10),
  });
}

function drawRogueNinja() {
  drawChibi("Naruto_Jedy_RP/textures/entity/rogue_ninja.png", {
    hair: C(0x2a, 0x2a, 0x2e), // cabelo escuro
    band: C(0x2b, 0x2b, 0x30), // bandana escura
    bandPlate: C(0x8f, 0x1f, 0x1f), // placa vermelha
    bandSymbol: C(0x1c, 0x1c, 0x20),
    skin: C(0xe8, 0xb9, 0x8a),
    eye: C(0x1a, 0x1a, 0x1a),
    body: C(0x3a, 0x3b, 0x42), // roupa escura
    bodyTrim: C(0xc2, 0x2d, 0x2d), // faixa vermelha
    bodyLine: C(0x1c, 0x1c, 0x20),
    arm: C(0xe8, 0xb9, 0x8a),
    leg: C(0x23, 0x24, 0x2a),
    shoe: C(0x14, 0x15, 0x1a),
  });
}

function drawTrainingScroll() {
  const c = new Canvas(16, 16, true);
  const paper = C(0xe8, 0xd9, 0xa8);
  const paperDark = C(0xc9, 0xb6, 0x82);
  const paperLight = C(0xf6, 0xec, 0xce);
  const red = C(0xc2, 0x2d, 0x2d);
  // rolo de pergaminho
  c.rect(4, 2, 8, 12, paper);
  c.rect(4, 2, 1, 12, paperDark);
  c.rect(11, 2, 1, 12, paperDark);
  c.rect(4, 2, 8, 1, paperLight);
  c.rect(4, 13, 8, 1, paperDark);
  // espiral de chakra
  c.spiral(8, 8, 1.5, 0.6, 3.2, blue, 0.06);
  // selos vermelhos
  c.rect(5, 3, 6, 1, red);
  c.rect(5, 12, 6, 1, red);
  c.save("Naruto_Jedy_RP/textures/items/training_scroll.png");
}

function drawShopkeeper() {
  drawChibi("Naruto_Jedy_RP/textures/entity/shopkeeper.png", {
    hair: C(0xd9, 0xc9, 0xa8), // cabelo grisalho
    band: C(0x2f, 0x9e, 0x5f), // faixa verde
    bandPlate: C(0xe3, 0xb5, 0x3f), // placa dourada
    bandSymbol: C(0x8f, 0x6a, 0x1c),
    skin: C(0xf2, 0xc7, 0x9b),
    eye: C(0x3a, 0x2a, 0x1a),
    body: C(0x4a, 0x8f, 0x3f), // colete verde
    bodyTrim: C(0xe3, 0xb5, 0x3f), // acabamento dourado
    bodyLine: C(0x2f, 0x5c, 0x28),
    arm: C(0xf2, 0xc7, 0x9b),
    leg: C(0x6b, 0x4a, 0x2a), // calça marrom
    shoe: C(0x3a, 0x24, 0x12),
  });
}

function drawChakraPill() {
  const c = new Canvas(16, 16, true);
  const red = C(0xd3, 0x33, 0x33);
  const redLight = C(0xf0, 0x8a, 0x8a);
  c.circle(4, 8, 3.6, red);
  c.circle(12, 8, 3.6, red);
  c.rect(4, 4.4, 8, 7.2, red);
  c.rect(4, 4.4, 8, 1.2, redLight);
  c.rect(7, 4.4, 2, 7.2, gold);
  c.rect(7, 4.4, 2, 1.2, C(0xf6, 0xd6, 0x7a));
  c.save("Naruto_Jedy_RP/textures/items/chakra_pill.png");
}

function drawExplosiveKunai() {
  const c = new Canvas(16, 16, true);
  // lâmina igual à kunai
  for (let y = 1; y <= 9; y++) {
    const hw = 1 + Math.round(((y - 1) / 9) * 1.4);
    for (let x = 7 - hw; x <= 8 + hw; x++) {
      c.px(x, y, x === 7 || x === 8 ? steelLight : steel);
    }
    c.px(7 - hw - 1, y, steelEdge);
    c.px(8 + hw + 1, y, steelEdge);
  }
  c.px(7, 1, white);
  c.rect(5, 10, 6, 1, steelDark);
  c.rect(7, 11, 2, 1, handleDark);
  // etiqueta explosiva vermelha
  c.rect(4, 12, 8, 3, cloudRed);
  c.rect(4, 12, 8, 1, C(0xe0, 0x6a, 0x5a));
  c.px(6, 13, cloudRedDark);
  c.px(8, 14, cloudRedDark);
  c.px(10, 13, cloudRedDark);
  c.save("Naruto_Jedy_RP/textures/items/explosive_kunai.png");
}

function drawFumaShuriken() {
  const c = new Canvas(16, 16, true);
  for (let j = 0; j < 16; j++) {
    for (let i = 0; i < 16; i++) {
      const dx = i - 7.5;
      const dy = j - 7.5;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      const d = Math.hypot(dx, dy);
      // braços largos
      if (Math.abs(adx - ady) <= 1.8 && Math.max(adx, ady) <= 7.6) {
        c.px(i, j, Math.max(adx, ady) >= 6.5 ? steelEdge : adx >= 4 ? steelDark : steel);
      }
      // anel externo
      if (d >= 6.6 && d <= 7.6) c.px(i, j, steelEdge);
      if (d <= 6.2 && d >= 3.6) c.px(i, j, steelLight);
      if (d < 3.4) c.px(i, j, [0, 0, 0, 0]);
    }
  }
  c.save("Naruto_Jedy_RP/textures/items/fuma_shuriken.png");
}

function drawKaton() {
  const c = new Canvas(16, 16, true);
  c.circle(7.5, 8, 7.2, C(0xe8, 0x55, 0x2a));
  c.circle(7.5, 8, 5.6, C(0xf0, 0x7a, 0x2a));
  c.circle(7.5, 8, 3.8, C(0xf6, 0xb9, 0x3b));
  c.circle(7.5, 8, 1.8, C(0xff, 0xf3, 0x8f));
  c.circle(7.5, 8, 0.8, white);
  // chamas ao redor
  c.px(4, 2, C(0xf0, 0x7a, 0x2a));
  c.px(5, 1, C(0xf6, 0xb9, 0x3b));
  c.px(10, 1, C(0xf0, 0x7a, 0x2a));
  c.px(11, 3, C(0xf6, 0xb9, 0x3b));
  c.px(12, 13, C(0xe8, 0x55, 0x2a));
  c.px(3, 13, C(0xe8, 0x55, 0x2a));
  c.save("Naruto_Jedy_RP/textures/items/katon.png");
}

function drawRasenshuriken() {
  const c = new Canvas(16, 16, true);
  for (let j = 0; j < 16; j++) {
    for (let i = 0; i < 16; i++) {
      const dx = i - 7.5;
      const dy = j - 7.5;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      // estrela azul
      if (Math.abs(adx - ady) <= 2.2 && Math.max(adx, ady) <= 7.4) {
        c.px(i, j, Math.max(adx, ady) >= 6.2 ? C(0x2f, 0x6f, 0xd8) : rasenganMid);
      }
    }
  }
  // núcleo giratório
  c.circle(7.5, 7.5, 3.2, rasenganBlue);
  c.circle(7.5, 7.5, 1.5, white);
  c.spiral(7.5, 7.5, 1.2, 0.5, 2.6, white, 0.06);
  c.save("Naruto_Jedy_RP/textures/items/rasenshuriken.png");
}

function drawKageBunshin() {
  const c = new Canvas(16, 16, true);
  const paper = C(0x6f, 0x9f, 0xe8);
  const paperDark = C(0x4a, 0x6f, 0xb8);
  c.rect(4, 2, 8, 12, paper);
  c.rect(4, 2, 1, 12, paperDark);
  c.rect(11, 2, 1, 12, paperDark);
  c.rect(4, 2, 8, 1, C(0x9f, 0xc4, 0xf2));
  // duas figurinhas (clones)
  c.rect(5, 5, 3, 4, white);
  c.rect(9, 5, 3, 4, white);
  c.px(6, 4, white);
  c.px(10, 4, white);
  // selo
  c.rect(5, 12, 6, 1, cloudRed);
  c.save("Naruto_Jedy_RP/textures/items/kage_bunshin.png");
}

function drawSharingan() {
  const c = new Canvas(16, 16, true);
  const red = C(0xc2, 0x2d, 0x2d);
  const redDark = C(0x7c, 0x1c, 0x1c);
  c.circle(7.5, 7.5, 7, red);
  c.circle(7.5, 7.5, 6, redDark);
  c.circle(7.5, 7.5, 4.4, red);
  c.circle(7.5, 7.5, 1.6, C(0x1a, 0x1a, 0x1a));
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3 - Math.PI / 2;
    c.circle(7.5 + Math.cos(a) * 3.1, 7.5 + Math.sin(a) * 3.1, 0.9, C(0x1a, 0x1a, 0x1a));
  }
  c.circle(7.5, 7.5, 0.7, red);
  c.save("Naruto_Jedy_RP/textures/items/sharingan.png");
}

function drawByakugan() {
  const c = new Canvas(16, 16, true);
  const pale = C(0xe8, 0xf2, 0xf5);
  const ring = C(0xbf, 0xd8, 0xe0);
  c.circle(7.5, 7.5, 7, pale);
  c.circle(7.5, 7.5, 5.6, ring);
  c.circle(7.5, 7.5, 3.4, C(0xd8, 0xe8, 0xee));
  c.circle(7.5, 7.5, 2.4, white);
  c.px(4, 4, C(0x9f, 0xbf, 0xcc));
  c.px(11, 11, C(0x9f, 0xbf, 0xcc));
  c.save("Naruto_Jedy_RP/textures/items/byakugan.png");
}

function drawShadowClone() {
  drawChibi("Naruto_Jedy_RP/textures/entity/shadow_clone.png", {
    hair: C(0xcf, 0xd6, 0xe8), // cabelo pálido
    band: C(0x9f, 0xb4, 0xd8), // faixa clara
    bandPlate: C(0xdf, 0xe6, 0xf2), // placa branca
    bandSymbol: C(0x8f, 0xa0, 0xc0),
    skin: C(0xf2, 0xc7, 0x9b),
    eye: C(0x3a, 0x2a, 0x1a),
    body: C(0xdf, 0xe6, 0xf2), // roupa clara
    bodyTrim: C(0xb8, 0xc6, 0xe0),
    bodyLine: C(0x9f, 0xb0, 0xd0),
    arm: C(0xf2, 0xc7, 0x9b),
    leg: C(0xb0, 0xbc, 0xd8),
    shoe: C(0x8f, 0xa0, 0xc0),
  });
}

function drawBowNinja() {
  drawChibi("Naruto_Jedy_RP/textures/entity/bow_ninja.png", {
    hair: C(0x3a, 0x5a, 0x4a), // cabelo verde-escuro
    band: C(0x2b, 0x4a, 0x3a), // faixa escura
    bandPlate: C(0x6b, 0x8a, 0x6a), // placa esverdeada
    bandSymbol: C(0x1c, 0x2c, 0x20),
    skin: C(0xe8, 0xb9, 0x8a),
    eye: C(0x1a, 0x1a, 0x1a),
    body: C(0x4a, 0x6f, 0x5a), // colete verde
    bodyTrim: C(0x8f, 0xa8, 0x7a),
    bodyLine: C(0x2c, 0x4a, 0x38),
    arm: C(0xe8, 0xb9, 0x8a),
    leg: C(0x2f, 0x3a, 0x30),
    shoe: C(0x1c, 0x24, 0x1c),
  });
}

function drawSuiton() {
  const c = new Canvas(16, 16, true);
  const water = C(0x2e, 0x86, 0xe8);
  const waterMid = C(0x4f, 0xa8, 0xf2);
  const waterLight = C(0x9f, 0xd6, 0xff);
  c.circle(7.5, 7.5, 7.2, water);
  c.circle(7.5, 7.5, 5.6, waterMid);
  c.circle(7.5, 7.5, 3.4, waterLight);
  c.circle(7.5, 7.5, 1.4, white);
  c.spiral(7.5, 7.5, 1.4, 1.4, 5.4, white, 0.05);
  // brilhos de água
  c.px(4, 3, white);
  c.px(11, 4, white);
  c.px(12, 11, white);
  c.px(3, 12, white);
  c.save("Naruto_Jedy_RP/textures/items/suiton.png");
}

function drawDoton() {
  const c = new Canvas(16, 16, true);
  const rock = C(0x8a, 0x6d, 0x4a);
  const rockMid = C(0x6b, 0x52, 0x36);
  const rockDark = C(0x4a, 0x38, 0x24);
  c.circle(7.5, 7.5, 7.2, rock);
  c.circle(7.5, 7.5, 5.4, rockMid);
  c.circle(7.5, 7.5, 2.6, rockDark);
  // rachaduras
  c.line(4, 3, 7, 7, 0.7, rockDark);
  c.line(7, 7, 5, 12, 0.7, rockDark);
  c.line(7, 7, 12, 5, 0.7, rockDark);
  c.line(9, 10, 13, 12, 0.6, rockDark);
  c.line(3, 10, 5, 12, 0.6, rockDark);
  c.px(7, 7, C(0x3a, 0x2c, 0x1c));
  c.px(12, 5, C(0x3a, 0x2c, 0x1c));
  c.save("Naruto_Jedy_RP/textures/items/doton.png");
}

function drawRaikiri() {
  const c = new Canvas(16, 16, false);
  c.rect(0, 0, 16, 16, C(0x0a, 0x10, 0x2e));
  // relâmpago central branco-azulado
  const pts = [
    [3, 0],
    [7, 4],
    [4, 6],
    [9, 10],
    [6, 12],
    [11, 16],
  ];
  for (let k = 0; k < pts.length - 1; k++) {
    c.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], 2.4, boltLight);
  }
  for (let k = 0; k < pts.length - 1; k++) {
    c.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], 1.0, white);
  }
  // raios secundários
  c.line(8, 5, 13, 3, 0.7, boltLight);
  c.line(7, 11, 12, 13, 0.7, boltLight);
  c.line(2, 12, 5, 14, 0.7, boltLight);
  c.px(13, 3, white);
  c.px(12, 13, white);
  c.px(5, 14, white);
  c.save("Naruto_Jedy_RP/textures/items/raikiri.png");
}

function drawKyuubi() {
  const c = new Canvas(16, 16, true);
  const foxRed = C(0xd8, 0x3a, 0x1e);
  const foxDark = C(0x9a, 0x24, 0x12);
  const foxLight = C(0xf0, 0x7a, 0x2a);
  // rosto de raposa
  c.circle(7.5, 7.5, 7.2, foxRed);
  c.circle(7.5, 7.5, 5.4, foxLight);
  // orelhas
  c.px(4, 0, foxRed);
  c.px(5, 1, foxRed);
  c.px(10, 0, foxRed);
  c.px(11, 1, foxRed);
  c.px(5, 2, foxLight);
  c.px(11, 2, foxLight);
  // olhos com pupilas
  c.px(5, 6, C(0x1a, 0x1a, 0x1a));
  c.px(6, 6, C(0x1a, 0x1a, 0x1a));
  c.px(9, 6, C(0x1a, 0x1a, 0x1a));
  c.px(10, 6, C(0x1a, 0x1a, 0x1a));
  // bigodes
  c.line(3, 8, 6, 9, 0.5, C(0xff, 0xd9, 0xa8));
  c.line(9, 9, 13, 8, 0.5, C(0xff, 0xd9, 0xa8));
  c.line(4, 10, 6, 10, 0.5, C(0xff, 0xd9, 0xa8));
  c.line(10, 10, 12, 10, 0.5, C(0xff, 0xd9, 0xa8));
  // focinho
  c.circle(7.5, 11, 1.6, foxDark);
  c.px(7.5, 9, foxDark);
  // caudas ao redor
  c.line(1, 5, 2, 2, 1.0, foxRed);
  c.line(15, 5, 14, 2, 1.0, foxRed);
  c.line(1, 12, 3, 15, 1.0, foxRed);
  c.line(15, 12, 13, 15, 1.0, foxRed);
  c.save("Naruto_Jedy_RP/textures/items/kyuubi.png");
}

// ------------------------------------------------------------
//  Geração
// ------------------------------------------------------------
drawKunai();
drawShuriken();
drawRasengan();
drawChidori();
drawKusanagi();
drawKonohaHeadbandItem();
drawAkatsukiCloakItem();
drawRamen();
drawTrainingScroll();
drawChakraPill();
drawExplosiveKunai();
drawFumaShuriken();
drawKaton();
drawRasenshuriken();
drawKageBunshin();
drawSharingan();
drawByakugan();
drawHeadbandEntity();
drawCloakEntity();
drawNinjaSensei();
drawRogueNinja();
drawShopkeeper();
drawShadowClone();
drawBowNinja();
drawSuiton();
drawDoton();
drawRaikiri();
drawKyuubi();
drawPackIcon(64, orange).save("Naruto_Jedy_BP/pack_icon.png");
drawPackIcon(64, redMain).save("Naruto_Jedy_RP/pack_icon.png");

console.log("\nTexturas geradas com sucesso!");
