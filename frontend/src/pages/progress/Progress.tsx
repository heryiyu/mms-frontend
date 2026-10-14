import { Form } from 'antd'
import type { Rule } from 'antd/es/form'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { getApiErrorMessage, getValidationFields, isApiError } from '../../api/client'
import { queryProgress, sendProgressOtp } from '../../api/register'
import type { ProgressOtpRequest } from '../../api/types'
import { Button } from '../../components/Button'
import { AppForm, TextInput } from '../../components/form'
import { useNotifyModal } from '../../components/NoticeModal'
import { ForgotPasswordCard } from '../../components/ForgotPasswordCard'
import { getOtpErrorMessage, OtpFormItem, useOtpForm } from '../../components/OtpInput'
import { PHONE_PATTERN } from '../../constants/validation'
import { useGuestLayout } from '../../layouts/guestLayoutContext'
import { PATHS } from '../../routes/paths'
import type { ProgressResultState } from './ProgressResult'
import styles from './Progress.module.css'

// 審核進度查詢（#52，架構整理 D8）。登入頁「進度查詢」進入，不需登入。
// 設計稿沒有這頁（#12 L3 已確認不另出稿），版面沿用忘記密碼頁（GuestLayout 卡片：欄位＋OTP 列＋「確認」）：
//   輸入申請時的電子信箱或手機（同一欄，有 @ 視為信箱）→「確認」發驗證碼 → OTP 列＋倒數 →「確認」驗證
//   → 結果頁（PATHS.progressResult，整頁版，同等待審核頁）
// 不透露帳號是否存在：查無申請紀錄時一樣顯示「已發送」，驗證時顯示驗證碼錯誤（後端規則，見 backend/README.md）

interface ProgressValues {
  account: string
  otp?: string
}

const NOTICE_TITLE = '通知'

// 設計稿未畫，文案待確認
const MESSAGES = {
  accountRequired: '請輸入電子信箱或手機號碼',
  accountFormat: '請輸入正確的電子信箱或手機號碼',
  sentHint: {
    email: '如果這個電子信箱有申請紀錄，驗證碼已寄到信箱；沒收到請確認輸入是否正確。',
    phone: '如果這個手機號碼有申請紀錄，驗證碼已用簡訊傳送；沒收到請確認輸入是否正確。',
  },
  failed: '發生錯誤，請稍後再試',
} as const

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 欄位值 → API 查詢條件：有 @ 當信箱，否則當手機；格式不符回 null */
function toContact(value: string | undefined): ProgressOtpRequest | null {
  const trimmed = value?.trim() ?? ''
  if (trimmed.includes('@')) return EMAIL_PATTERN.test(trimmed) ? { email: trimmed } : null
  return PHONE_PATTERN.test(trimmed) ? { phone: trimmed } : null
}

const ACCOUNT_RULES: Rule[] = [
  { required: true, whitespace: true, message: MESSAGES.accountRequired },
  {
    validator: (_, value?: string) =>
      !value?.trim() || toContact(value) ? Promise.resolve() : Promise.reject(new Error(MESSAGES.accountFormat)),
  },
]

export default function Progress() {
  useGuestLayout('card')
  const navigate = useNavigate()
  const [form] = Form.useForm<ProgressValues>()
  const account = Form.useWatch('account', form)
  const [verifying, setVerifying] = useState(false)
  const { notify, contextHolder } = useNotifyModal()

  const showError = (error: unknown) => {
    // 後端欄位錯誤（email／phone）都顯示在同一欄
    const fieldError = Object.values(getValidationFields(error))[0]
    if (fieldError) {
      form.setFields([{ name: 'account', errors: [fieldError] }])
      return
    }
    void notify({ title: NOTICE_TITLE, content: getOtpErrorMessage(error) ?? getApiErrorMessage(error, MESSAGES.failed) })
  }

  const otp = useOtpForm(form, sendProgressOtp, {
    targetFields: ['account'],
    onResendError: showError,
  })

  const contact = toContact(account)
  const canSubmit = !!account?.trim() && (!otp.sent || otp.otpFilled)

  const send = async (request: ProgressOtpRequest) => {
    try {
      await otp.send(request)
    } catch (error) {
      showError(error)
    }
  }

  const verify = async (request: ProgressOtpRequest, code: string) => {
    setVerifying(true)
    try {
      const result = await queryProgress({ ...request, otp: code })
      navigate(PATHS.progressResult, { state: { result } satisfies ProgressResultState })
    } catch (error) {
      setVerifying(false)
      if (isApiError(error, 'OTP_INVALID')) otp.clearOtp()
      // 逾時（或伺服器沒有發送紀錄）：回到尚未發送，按「確認」重新發送
      if (isApiError(error, 'OTP_EXPIRED')) otp.reset()
      showError(error)
    }
  }

  const handleFinish = ({ account: value, otp: code }: ProgressValues) => {
    const request = toContact(value)
    if (!request) return
    return otp.sent ? verify(request, code ?? '') : send(request)
  }

  return (
    <ForgotPasswordCard title="進度查詢">
      {contextHolder}
      <p className={styles.intro}>請輸入申請時填寫的電子信箱或手機號碼，驗證後即可查看審核進度。</p>
      <AppForm<ProgressValues>
        form={form}
        requiredMark={false}
        validateTrigger="onBlur"
        className={ForgotPasswordCard.formClassName}
        onFinish={handleFinish}
        // 已發送後改了信箱／手機：原本的驗證碼作廢，回到「尚未發送」
        onValuesChange={otp.handleValuesChange}
      >
        <Form.Item name="account" className={ForgotPasswordCard.fieldClassName} rules={ACCOUNT_RULES}>
          <TextInput
            inputMode="email"
            autoComplete="username"
            placeholder="請輸入電子信箱或手機號碼"
            aria-label="電子信箱或手機號碼"
            maxLength={254}
            disabled={verifying}
          />
        </Form.Item>
        {otp.sent && (
          <>
            <OtpFormItem otp={otp} disabled={verifying} className={ForgotPasswordCard.fieldClassName} />
            {contact && <p className={styles.hint}>{MESSAGES.sentHint['email' in contact ? 'email' : 'phone']}</p>}
          </>
        )}
        <Button
          htmlType="submit"
          block
          className={ForgotPasswordCard.submitClassName}
          disabled={!canSubmit}
          loading={otp.sending || verifying}
        >
          確認
        </Button>
      </AppForm>
    </ForgotPasswordCard>
  )
}
