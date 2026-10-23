export const environment = {
  production: false,
  apiBaseUrl: '/api',
  // TODO: สร้าง LIFF บน Channel 2010177240 แล้วใส่ LIFF ID ที่นี่ (และ Line:LiffId ใน appsettings)
  // FE จะดึง liffId จาก GET /api/config/line ก่อน ถ้ามีค่าใน backend
  liffId: '2010177240-Bu98ZCLT',
  mapDefaultLat: 13.7563,
  mapDefaultLng: 100.5018,
  devLoginDisplayName: 'Demo Requester',
  allowDevLogin: true,
  privacyVersion: '1.0-mvp',
  buildSha: 'dev',
  httpConsoleLog: false,
};
