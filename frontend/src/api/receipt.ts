// 奉獻收據：用會員已有的 email 或手機驗證後寄出（不在網頁直接下載，#50）
// email → 加密 PDF 附件；手機 → 簡訊寄下載頁網址（/receipt/download/:id，要登入、只有本人、1 小時內有效）
import { get, post } from './client'
import type {
  ReceiptDownloadInfo,
  ReceiptFileResponse,
  ReceiptOtpRequest,
  ReceiptOtpResponse,
  ReceiptSendRequest,
  ReceiptSendResponse,
} from './types'

/**
 * 發送 OTP 到選定的聯絡方式（重新發送也是呼叫這支）。
 * 可能的 ApiError.code：TOO_MANY_ATTEMPTS、VALIDATION_ERROR（會員沒有這個聯絡方式）
 */
export function sendReceiptOtp(body: ReceiptOtpRequest): Promise<ReceiptOtpResponse> {
  return post<ReceiptOtpResponse>('/receipts/otp', body)
}

/** 驗證 OTP 並寄出收據。錯誤碼：OTP_INVALID、OTP_EXPIRED、NO_RECORDS、VALIDATION_ERROR */
export function sendReceipt(body: ReceiptSendRequest): Promise<ReceiptSendResponse> {
  return post<ReceiptSendResponse>('/receipts/send', body)
}

/** 下載頁：查詢連結狀態。錯誤碼：LINK_EXPIRED、FORBIDDEN（不是本人）、RECEIPT_NOT_FOUND */
export function getReceiptDownload(id: string): Promise<ReceiptDownloadInfo> {
  return get<ReceiptDownloadInfo>(`/receipts/downloads/${encodeURIComponent(id)}`)
}

/** 下載頁按「下載」：向後端要即時產生、5 分鐘內有效的檔案網址。錯誤碼同 getReceiptDownload */
export function createReceiptFileUrl(id: string): Promise<ReceiptFileResponse> {
  return post<ReceiptFileResponse>(`/receipts/downloads/${encodeURIComponent(id)}/file`)
}
