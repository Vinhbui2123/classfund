/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { buildVietQRString, generatePaymentAddInfo } from '@/lib/vietqr';
import { Check, Copy, X, QrCode } from 'lucide-react';
import { useToast } from './Toast';

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
  const { showToast } = useToast();
  const [customAmount, setCustomAmount] = useState<number>(() => {
    return campaign ? Math.max(0, campaign.targetAmount - campaign.paidAmount) : 0;
  });
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const paymentMessage = (member && campaign) 
    ? generatePaymentAddInfo(member.referenceCode, campaign.name)
    : '';

  // Generate QR code when details change
  useEffect(() => {
    if (!isOpen || !member || !campaign) return;

    const qrString = buildVietQRString({
      bankBin,
      accountNumber: bankAccountNumber,
      amount: customAmount,
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
  }, [isOpen, member, campaign, bankBin, bankAccountNumber, customAmount, paymentMessage]);

  if (!isOpen || !member || !campaign) return null;

  const handleCopy = (text: string, field: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast(`Đã sao chép ${label}!`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAmountInputChange = (val: string) => {
    const parsed = parseInt(val.replace(/\D/g, ''), 10) || 0;
    setCustomAmount(parsed);
  };

  const remaining = Math.max(0, campaign.targetAmount - campaign.paidAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 p-4">
      <div className="relative w-full max-w-md scale-95 overflow-hidden rounded-2xl bg-bg-surface border border-border-subtle text-text-main shadow-2xl p-5 sm:p-6 transition-all duration-300 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div>
            <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
              <QrCode className="w-5 h-5 text-brand" />
              Quét Mã QR Đóng Quỹ
            </h3>
            <p className="text-xs text-text-muted mt-0.5">Đợt thu: {campaign.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-text-muted hover:text-text-main hover:bg-bg-page transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center py-5">
          
          {remaining <= 0 ? (
            <div className="w-full mb-4 p-4 rounded-xl border border-status-success-text/25 bg-status-success-bg text-status-success-text text-center flex flex-col items-center gap-1.5">
              <Check className="w-6 h-6" />
              <span className="font-bold text-xs">ĐÃ ĐÓNG ĐỦ ĐỢT THU NÀY</span>
            </div>
          ) : (
            <>
              {/* QR Display */}
              <div className="relative p-3 bg-white rounded-xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
                {qrUrl ? (
                  <img src={qrUrl} alt="VietQR Code" className="w-52 h-52 object-contain" />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-text-muted text-xs">
                    Đang tạo mã QR...
                  </div>
                )}
              </div>

              {/* Amount adjust input for paying custom amount */}
              <div className="w-full mb-4 space-y-1.5">
                <label className="text-text-muted text-[11px] font-semibold uppercase tracking-wider block">
                  Số tiền đóng (Thay đổi nếu đóng lẻ)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={customAmount.toLocaleString('vi-VN')}
                    onChange={(e) => handleAmountInputChange(e.target.value)}
                    className="w-full bg-bg-page border border-border-subtle focus:border-brand rounded-xl py-2 px-3.5 text-sm font-bold text-text-main outline-none transition pr-10 text-right tabular-nums h-10 focus:ring-2 focus:ring-brand/10"
                  />
                  <span className="absolute right-3.5 text-xs text-text-muted font-semibold pointer-events-none">VND</span>
                </div>
              </div>

              <p className="text-center text-xs text-text-muted mb-4 max-w-xs leading-relaxed">
                Mở ứng dụng Mobile Banking của bạn, quét mã QR và xác nhận thanh toán.
              </p>
            </>
          )}

          {/* Copyable Details */}
          <div className="w-full space-y-2.5 bg-bg-page/60 p-4 rounded-xl border border-border-subtle">
            {/* Bank Info */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-text-muted">Ngân hàng</span>
              <span className="font-semibold text-text-main">{BANK_NAMES[bankBin] || 'Ngân hàng'}</span>
            </div>

            {/* Account Number */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-text-muted">Số tài khoản</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-text-main font-mono">{bankAccountNumber}</span>
                <button
                  onClick={() => handleCopy(bankAccountNumber, 'account', 'số tài khoản')}
                  className="p-1 rounded hover:bg-bg-surface text-text-muted hover:text-text-main transition cursor-pointer"
                >
                  {copiedField === 'account' ? (
                    <Check className="w-3.5 h-3.5 text-brand" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Account Name */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-text-muted">Tên người nhận</span>
              <span className="font-semibold text-text-main uppercase">{bankAccountName}</span>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between text-xs sm:text-sm border-t border-border-subtle pt-2.5">
              <span className="text-text-muted">Số tiền chuyển</span>
              <div className="flex items-center gap-1.5 font-bold text-brand tabular-nums">
                <span>{customAmount.toLocaleString('vi-VN')} ₫</span>
                <button
                  onClick={() => handleCopy(customAmount.toString(), 'amount', 'số tiền')}
                  className="p-1 rounded hover:bg-bg-surface text-text-muted hover:text-brand transition cursor-pointer"
                >
                  {copiedField === 'amount' ? (
                    <Check className="w-3.5 h-3.5 text-brand" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-text-muted">Nội dung chuyển khoản</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-text-main font-mono">{paymentMessage}</span>
                <button
                  onClick={() => handleCopy(paymentMessage, 'msg', 'nội dung chuyển khoản')}
                  className="p-1 rounded hover:bg-bg-surface text-text-muted hover:text-text-main transition cursor-pointer"
                >
                  {copiedField === 'msg' ? (
                    <Check className="w-3.5 h-3.5 text-brand" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-1">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-bg-page border border-border-subtle text-text-main font-semibold text-sm hover:bg-bg-surface transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
