/**
 * ฟังก์ชันสร้าง PromptPay QR Code Payload ตามมาตรฐาน EMVCo ของประเทศไทย
 * รองรับ:
 * 1. เบอร์โทรศัพท์มือถือ (10 หลัก เช่น 081-234-5678)
 * 2. เลขประจำตัวผู้เสียภาษี / บัตรประชาชน (13 หลัก)
 * 3. ระบุจำนวนเงินอัตโนมัติ (Dynamic Amount)
 */

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatTLV(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

export function generatePromptPayPayload(target: string, amount?: number): string {
  if (!target) return '';

  // ล้างอักขระพิเศษเหลือเฉพาะตัวเลข
  const cleanTarget = target.replace(/[^0-9]/g, '');

  let targetField = '';

  if (cleanTarget.length === 10) {
    // กรณีเบอร์โทรศัพท์มือถือ เช่น 0812345678 -> 0066812345678
    const mobileNumber = '0066' + cleanTarget.substring(1);
    const sub00 = formatTLV('00', 'A000000677010111');
    const sub01 = formatTLV('01', mobileNumber);
    targetField = formatTLV('29', sub00 + sub01);
  } else if (cleanTarget.length === 13) {
    // กรณีเลขประจำตัวผู้เสียภาษี / บัตรประชาชน 13 หลัก
    const sub00 = formatTLV('00', 'A000000677010111');
    const sub02 = formatTLV('02', cleanTarget);
    targetField = formatTLV('29', sub00 + sub02);
  } else {
    // หากไม่ตรงเกณฑ์ ให้ return ค่าว่าง
    return '';
  }

  const p00 = formatTLV('00', '01'); // Version
  const p01 = formatTLV('01', amount && amount > 0 ? '12' : '11'); // 11 = Static, 12 = Dynamic
  const p53 = formatTLV('53', '764'); // Currency code 764 = THB
  const p58 = formatTLV('58', 'TH');  // Country code

  let payload = `${p00}${p01}${targetField}${p53}`;

  if (amount !== undefined && amount !== null && amount > 0) {
    const amountStr = amount.toFixed(2);
    payload += formatTLV('54', amountStr);
  }

  payload += p58;
  payload += '6304';

  const checksum = crc16(payload);
  return payload + checksum;
}

