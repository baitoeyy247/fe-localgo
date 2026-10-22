#!/usr/bin/env node
/**
 * Fail when legacy UI terms appear outside src/i18n/glossary.ts (N-7 / QA28 L-6).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.join(root, 'src', 'app');

/** Substrings that must only live in glossary.ts (use GLOSSARY.* in app code). */
const BANNED = [
  'จุดให้บริการ',
  'ราคาเสนอ',
  'วันและเวลานัด',
  'จุดที่ใช้กับบริการนี้',
  'จัดการจุด',
  '· นัด ',
  'นัด: ',
  'เพิ่มจุดใหม่',
  'ลบจุด',
  'บันทึกจุด',
  'จุดรับงาน',
  'ปิดจุด',
  'เพิ่มจุดนี้',
  'แก้ไขจุด',
  'ชื่อจุด',
  'ยังไม่มีจุด',
  ' · 1 จุด',
  'รอยืนยันนัด',
];

/** Raw "นัด" without "นัดหมาย" in UI copy (L-6). */
const BANNED_NAD_REGEX = /นัด(?!หมาย)/u;

const EXT = new Set(['.ts', '.html', '.scss']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules') continue;
      walk(full, out);
    } else if (EXT.has(path.extname(name))) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];

for (const file of walk(appRoot)) {
  if (file.endsWith('glossary.ts')) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const term of BANNED) {
    if (text.includes(term)) {
      violations.push(`${path.relative(root, file)}: banned "${term}"`);
    }
  }
  if (BANNED_NAD_REGEX.test(text)) {
    violations.push(`${path.relative(root, file)}: banned bare "นัด" (use นัดหมาย)`);
  }
}

if (violations.length) {
  console.error('glossary-grep: use GLOSSARY keys instead of raw copy:\n');
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

console.log('glossary-grep OK');
