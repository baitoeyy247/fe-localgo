/** Temporary SIT playtest accounts (stable personaKey → same user on re-login). */
export type TestPersona = {
  key: string;
  displayName: string;
  activeRole: 'Requester' | 'Provider';
  asAdmin?: boolean;
  blurb: string;
};

export const TEST_PERSONAS: TestPersona[] = [
  {
    key: 'req-01',
    displayName: 'ทดสอบ ผู้รับ 01',
    activeRole: 'Requester',
    blurb: 'ผู้รับบริการ — โพสต์งาน / เลือกข้อเสนอ',
  },
  {
    key: 'req-02',
    displayName: 'ทดสอบ ผู้รับ 02',
    activeRole: 'Requester',
    blurb: 'ผู้รับบริการ — โพสต์งาน / เลือกข้อเสนอ',
  },
  {
    key: 'req-03',
    displayName: 'ทดสอบ ผู้รับ 03',
    activeRole: 'Requester',
    blurb: 'ผู้รับบริการ — โพสต์งาน / เลือกข้อเสนอ',
  },
  {
    key: 'req-04',
    displayName: 'ทดสอบ ผู้รับ 04',
    activeRole: 'Requester',
    blurb: 'ผู้รับบริการ — โพสต์งาน / เลือกข้อเสนอ',
  },
  {
    key: 'prov-01',
    displayName: 'ทดสอบ ผู้ให้ 01',
    activeRole: 'Provider',
    blurb: 'ผู้ให้บริการ — ตั้งค่าโปรไฟล์ / เสนอราคา',
  },
  {
    key: 'prov-02',
    displayName: 'ทดสอบ ผู้ให้ 02',
    activeRole: 'Provider',
    blurb: 'ผู้ให้บริการ — ตั้งค่าโปรไฟล์ / เสนอราคา',
  },
  {
    key: 'prov-03',
    displayName: 'ทดสอบ ผู้ให้ 03',
    activeRole: 'Provider',
    blurb: 'ผู้ให้บริการ — ตั้งค่าโปรไฟล์ / เสนอราคา',
  },
  {
    key: 'both-01',
    displayName: 'ทดสอบ สองบทบาท 01',
    activeRole: 'Requester',
    blurb: 'เริ่มผู้รับ — สลับบทบาทไม่ลบข้อมูลเดิม',
  },
  {
    key: 'both-02',
    displayName: 'ทดสอบ สองบทบาท 02',
    activeRole: 'Provider',
    blurb: 'เริ่มผู้ให้ (มีโปรไฟล์) — สลับไม่ลบข้อมูล',
  },
  {
    key: 'admin-01',
    displayName: 'ทดสอบ แอดมิน',
    activeRole: 'Requester',
    asAdmin: true,
    blurb: 'แอดมิน — เข้าหลังบ้านได้',
  },
];
