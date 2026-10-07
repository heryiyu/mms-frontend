import { Form } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { isApiError } from '../../api/client'
import { sendReceipt, sendReceiptOtp } from '../../api/receipt'
import type { ReceiptOtpRequest } from '../../api/types'
import ActionBar from '../../components/ActionBar'
import { AppForm, applyServerFieldErrors, emailRules, FormCard, phoneRules, TextInput } from '../../components/form'
import { useNotifyModal } from '../../components/NoticeModal'
import { getOtpErrorMessage, OtpField, otpRules, useOtpForm } from '../../components/OtpInput'
import ResultPage from '../../components/ResultPage'
import { PATHS } from '../../routes/paths'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import { hasInAppHistory } from '../../utils/history'
import styles from './ReceiptDownload.module.css'

// 奉獻收據下載（issue #26，docs/design/receipt/README.md）
// 狀態流程：表單初始（兩欄空白，「確認」停用）→ 填寫中 → 按「確認」發送 OTP
//   → OTP 驗證（驗證碼＋有效時間倒數）→ 按「確認」驗證並寄出 → 完成（結果頁）
// 收據不在網頁上直接下載，而是寄到填寫的信箱（附件密碼為身分證字號）。
//
// TODO(#12)：以下皆為設計未定、先依推測實作——
// - 年度怎麼決定：稿中沒有年度欄位，API 不帶 year，由後端決定（mock 視為去年度）
// - 信箱／手機是否帶入會員資料：稿中表單初始為空白，先照稿不預填；若要預填可用 api/member 的 getMe()
//   在 initialValues 帶入 email／phone（後端目前要求兩者與會員資料一致）
// - OTP 狀態下信箱／手機是否鎖定：稿中仍為一般輸入框，先保持可編輯；修改後退回填寫中、需重新發送 OTP
// - 錯誤狀態未出圖：欄位格式錯誤顯示在輸入框下方；API 錯誤（資料不符、OTP 錯誤／逾時、無紀錄）用通知彈窗
// - 「取消／返回」與完成頁「返回」導向：取消回上一頁（無站內上一頁時回首頁），完成頁返回回首頁

interface ReceiptValues {
  email: string
  phone: string
  otp: string
}

// TODO(#12)：錯誤文案設計未定
const MESSAGES = {
  phoneRequired: '請輸入手機',
  phoneFormat: '手機格式錯誤',
  noticeTitle: '通知',
  mismatch: '電子信箱或手機與會員資料不符',
  noRecords: '查無該年度的奉獻紀錄',
  failed: '發生錯誤，請稍後再試',
} as const

const EMAIL_RULES = emailRules()
/** 手機：09 開頭共 10 碼（稿中範例 09XXXXXXXX）；文案依稿上欄位「手機」 */
const PHONE_RULES = phoneRules({ required: MESSAGES.phoneRequired, format: MESSAGES.phoneFormat })

export default function ReceiptDownload() {
  const navigate = useNavigate()
  const [form] = Form.useForm<ReceiptValues>()
  const values = Form.useWatch([], form) as Partial<ReceiptValues> | undefined
  const [verifying, setVerifying] = useState(false)
  const [done, setDone] = useState(false)
  const { notify, contextHolder } = useNotifyModal()

  const showError = (error: unknown) => {
    if (isApiError(error, 'UNAUTHORIZED')) return // client 已統一導回登入頁
    let content: string = getOtpErrorMessage(error) ?? MESSAGES.failed
    if (isApiError(error, 'EMAIL_PHONE_MISMATCH')) content = MESSAGES.mismatch
    else if (isApiError(error, 'NO_RECORDS')) content = MESSAGES.noRecords
    void notify({ title: MESSAGES.noticeTitle, content })
  }

  // OTP 綁定送出時的信箱與手機：已發送後若修改，回到填寫中狀態重新發送
  const otp = useOtpForm(form, sendReceiptOtp, { targetFields: ['email', 'phone'], onResendError: showError })

  const contactFilled = !!values?.email?.trim() && !!values?.phone?.trim()
  const canConfirm = otp.sent ? contactFilled && otp.otpFilled : contactFilled

  const goHome = () => navigate(PATHS.home, { replace: true })

  // 有站內上一頁就回上一頁，直接開啟此頁時回首頁
  const handleCancel = () => {
    if (hasInAppHistory()) navigate(-1)
    else goHome()
  }

  // 後端回 VALIDATION_ERROR 時把欄位錯誤顯示在對應輸入框下方
  const applyFieldErrors = (error: unknown) => applyServerFieldErrors(form, error, ['email', 'phone']).length > 0

  const handleSendOtp = async (body: ReceiptOtpRequest) => {
    try {
      await otp.send(body)
    } catch (error) {
      if (!applyFieldErrors(error)) showError(error)
    }
  }

  const handleVerify = async (body: ReceiptOtpRequest & { otp: string }) => {
    setVerifying(true)
    try {
      await sendReceipt(body)
      setDone(true)
    } catch (error) {
      if (!applyFieldErrors(error)) showError(error)
    } finally {
      setVerifying(false)
    }
  }

  const handleFinish = ({ email, phone, otp: code }: ReceiptValues) => {
    const body = { email: email.trim(), phone: phone.trim() }
    return otp.sent ? handleVerify({ ...body, otp: code }) : handleSendOtp(body)
  }

  if (done) {
    return <ResultPage title="奉獻收據已送出，請至信箱查收！" description="密碼為身分證字號" onBack={goHome} />
  }

  return (
    <div className={styles.page}>
      {contextHolder}
      <AppForm<ReceiptValues>
        form={form}
        className={styles.form}
        requiredMark={false}
        validateTrigger="onBlur"
        initialValues={{ email: '', phone: '', otp: '' }}
        onValuesChange={otp.handleValuesChange}
        onFinish={handleFinish}
      >
        <div className={styles.body}>
          <h1 className={cx(typography.pageTitle, styles.title)}>奉獻收據下載</h1>
          <FormCard className={styles.card}>
            <p className={styles.description}>請輸入電子信箱，我們將寄送該年度的奉獻收據至此信箱。</p>
            <Form.Item<ReceiptValues> name="email" rules={EMAIL_RULES} className={styles.field}>
              <TextInput placeholder="請輸入電子信箱" inputMode="email" autoComplete="email" aria-label="電子信箱" />
            </Form.Item>
            <Form.Item<ReceiptValues> name="phone" rules={PHONE_RULES} className={styles.field}>
              <TextInput placeholder="請輸入手機" type="tel" inputMode="tel" autoComplete="tel" aria-label="手機" />
            </Form.Item>
            {otp.sent && (
              <Form.Item<ReceiptValues>
                name="otp"
                rules={otpRules(otp.length)}
                validateTrigger="onSubmit"
                className={styles.field}
              >
                <OtpField
                  length={otp.length}
                  expiresAt={otp.expiresAt}
                  onResend={otp.resend}
                  autoFocus
                  inputProps={{ 'aria-label': '驗證碼' }}
                />
              </Form.Item>
            )}
          </FormCard>
        </div>
        <ActionBar
          bleed
          onCancel={handleCancel}
          confirmHtmlType="submit"
          confirmDisabled={!canConfirm}
          confirmLoading={otp.sending || verifying}
        />
      </AppForm>
    </div>
  )
}
