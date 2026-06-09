import { normalizeReferenceCode } from './normalize';

function crc16Ccitt(str: string): string {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatTag(tag: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${tag}${length}${value}`;
}

export function buildVietQRString(options: {
  bankBin: string;
  accountNumber: string;
  amount?: number;
  addInfo: string;
}): string {
  // Tag 38: Consumer Provider Information (Merchant Account Information)
  const guid = formatTag('00', 'A000000727');
  
  // Tag 38 -> Sub-tag 01 (Beneficiary details)
  const beneficiaryBin = formatTag('00', options.bankBin);
  const beneficiaryAccount = formatTag('01', options.accountNumber);
  const beneficiarySub = formatTag('01', beneficiaryBin + beneficiaryAccount);
  
  const serviceCode = formatTag('02', 'QRIBFTTA');
  
  const merchantInfo = formatTag('38', guid + beneficiarySub + serviceCode);
  
  let payload = '';
  payload += formatTag('00', '01'); // Payload Format Indicator
  payload += formatTag('01', '12'); // Point of Initiation Method (12 = dynamic)
  payload += merchantInfo;
  payload += formatTag('53', '704'); // Currency = VND
  if (options.amount && options.amount > 0) {
    payload += formatTag('54', Math.round(options.amount).toString()); // Transaction Amount
  }
  payload += formatTag('58', 'VN'); // Country Code
  
  // Tag 62: Additional Data Field Template
  const addInfoTag = formatTag('08', options.addInfo);
  payload += formatTag('62', addInfoTag);
  
  // Tag 63: CRC. Append 6304 first, then compute CRC
  const preCrc = payload + '6304';
  const crcValue = crc16Ccitt(preCrc);
  return preCrc + crcValue;
}

export function generatePaymentAddInfo(memberRefCode: string, campaignName: string): string {
  const normMember = normalizeReferenceCode(memberRefCode).slice(0, 9);
  const normCampaign = normalizeReferenceCode(campaignName).slice(0, 8);
  
  // Ensure total length <= 25 characters including "QUYLOP_"
  // Format: QUYLOP_<MEMBER>_<CAMPAIGN>
  // QUYLOP_ is 7 chars. We have 18 chars left.
  // 7 + normMember (max 9) + 1 (underscore) + normCampaign (max 8) = 25
  return `QUYLOP_${normMember}_${normCampaign}`;
}
