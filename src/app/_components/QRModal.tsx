'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { buildVietQRString, generatePaymentAddInfo } from '@/lib/vietqr';
import { Check, Copy, X } from 'lucide-react';

const BANK_NAMES: Record<string, string> = {
  '970415': 'VietinBank',
  '970436': 'Vietcombank',
  '970418': 'BIDV',
  '970422': 'MB Bank',
  '970407': 'Techcombank',
  '970432': 'VPBank',
  '970416': 'ACB',
  '970423': 'TPBank',
  '970403': 'Sacombank',
  '970454': 'Bản Việt',
  '970439': 'ZaloPay',
};

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: number;
    fullName: string;
    referenceCode: string;
    studentId: string | null;
  } | null;
  campaign: {
    id: number;
    name: string;
    targetAmount: number;
    paidAmount: number;
  } | null;
  bankBin: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export default function QRModal({
  isOpen,
  onClose,
  member,
  campaign,
  bankBin,
  bankAccountNumber,
  bankAccountName,
}: QRModalProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const amountToPay = campaign ? Math.max(0, campaign.targetAmount - campaign.paidAmount) : 0;
  const paymentMessage = (member && campaign) 
    ? generatePaymentAddInfo(member.referenceCode, campaign.name)
    : '';

  useEffect(() => {
    if (!isOpen || !member || !campaign) return;

    const qrString = buildVietQRString({
      bankBin,
      accountNumber: bankAccountNumber,
      amount: amountToPay,
      addInfo: paymentMessage,
    });

    QRCode.toDataURL(qrString, {
      width: 300,
      margin: 2,
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff',
      },
    })
      .then(setQrUrl)
      .catch((err) => {
        console.error('Failed to generate QR Code:', err);
      });
  }, [isOpen, member, campaign, bankBin, bankAccountNumber, amountToPay, paymentMessage]);

  if (!isOpen || !member || !campaign) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="relative w-full max-w-md scale-95 overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl p-6 transition-all duration-300 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">Quét Mã QR Đóng Quỹ</h3>
            <p className="text-xs text-slate-400 mt-0.5">{campaign.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center py-6">
          {/* QR Display */}
          <div className="relative p-3 bg-white rounded-xl shadow-lg border border-slate-200 mb-6 overflow-hidden">
            {qrUrl ? (
              <img src={qrUrl} alt="VietQR Code" className="w-56 h-56 object-contain" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-500">
                Đang tạo mã QR...
              </div>
            )}
          </div>

          <p className="text-center text-xs text-slate-400 mb-6 max-w-xs leading-relaxed">
            Mở ứng dụng Mobile Banking của bạn, chọn quét mã QR và xác nhận thông tin thanh toán.
          </p>

          {/* Copyable Details */}
          <div className="w-full space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
            {/* Bank Info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 text-xs">Ngân hàng</span>
              <span className="font-semibold text-white">{BANK_NAMES[bankBin] || 'Ngân hàng'} (BIN: {bankBin})</span>
            </div>

            {/* Account Number */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 text-xs">Số tài khoản</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white font-mono">{bankAccountNumber}</span>
                <button
                  onClick={() => handleCopy(bankAccountNumber, 'account')}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  {copiedField === 'account' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Account Name */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 text-xs">Tên người nhận</span>
              <span className="font-semibold text-white uppercase">{bankAccountName}</span>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between text-sm border-t border-slate-800/60 pt-3">
              <span className="text-slate-400 text-xs">Số tiền chuyển</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-cyan-400">{amountToPay.toLocaleString('vi-VN')} ₫</span>
                <button
                  onClick={() => handleCopy(amountToPay.toString(), 'amount')}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  {copiedField === 'amount' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 text-xs">Nội dung chuyển khoản</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white font-mono">{paymentMessage}</span>
                <button
                  onClick={() => handleCopy(paymentMessage, 'msg')}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  {copiedField === 'msg' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 text-white font-semibold text-sm hover:bg-slate-700 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
