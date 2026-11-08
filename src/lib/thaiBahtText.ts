/**
 * แปลงจำนวนเงินตัวเลขเป็นข้อความภาษาไทย (Thai Baht Text)
 * ตัวอย่าง: 1950.50 -> "หนึ่งพันเก้าร้อยห้าสิบบาทห้าสิบสตางค์"
 * ใช้สำหรับเอกสารการค้า ใบเสร็จรับเงิน ใบกำกับภาษี และใบเสนอราคาตามมาตรฐานกรมสรรพากร
 */

const THAI_NUMBERS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_DIGIT_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertGroup(numStr: string, isMillion: boolean = false): string {
  let result = '';
  const len = numStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr[i], 10);
    const unitIndex = len - i - 1;

    if (digit !== 0) {
      if (unitIndex === 1 && digit === 1) {
        result += 'สิบ';
      } else if (unitIndex === 1 && digit === 2) {
        result += 'ยี่สิบ';
      } else if (unitIndex === 0 && digit === 1 && len > 1 && numStr[len - 2] !== '0') {
        result += 'เอ็ด';
      } else {
        result += THAI_NUMBERS[digit] + THAI_DIGIT_UNITS[unitIndex];
      }
    }
  }

  return result;
}

export function thaiBahtText(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'ศูนย์บาทถ้วน';
  }

  if (amount === 0) {
    return 'ศูนย์บาทถ้วน';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // ปัดทศนิยมเป็น 2 ตำแหน่ง
  const fixed = absAmount.toFixed(2);
  const [bahtPart, satangPart] = fixed.split('.');

  let result = '';

  // กรณีตัวเลขเกินล้าน
  if (bahtPart.length > 6) {
    const millionsCount = Math.floor((bahtPart.length - 1) / 6);
    let remaining = bahtPart;
    const groups: string[] = [];

    while (remaining.length > 6) {
      groups.unshift(remaining.slice(-6));
      remaining = remaining.slice(0, -6);
    }
    groups.unshift(remaining);

    for (let i = 0; i < groups.length; i++) {
      const groupText = convertGroup(groups[i]);
      result += groupText;
      if (i < groups.length - 1) {
        result += 'ล้าน';
      }
    }
  } else {
    result = convertGroup(bahtPart);
  }

  if (result === '') {
    result = 'ศูนย์';
  }

  result += 'บาท';

  const satangVal = parseInt(satangPart, 10);
  if (satangVal === 0) {
    result += 'ถ้วน';
  } else {
    result += convertGroup(satangPart) + 'สตางค์';
  }

  return isNegative ? `ลบ${result}` : result;
}

