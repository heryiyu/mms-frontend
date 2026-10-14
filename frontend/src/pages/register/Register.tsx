import { DatePicker, Form, Grid } from 'antd'
import type { DatePickerProps, FormProps } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { getLineAuthUrl } from '../../api/auth'
import { getApiErrorMessage, isApiError } from '../../api/client'
import { sendRegisterOtp, verifyRegisterOtp } from '../../api/register'
import { Button } from '../../components/Button'
import { AppForm, applyServerFieldErrors, emailRules, phoneRules, TextInput } from '../../components/form'
import Icon from '../../components/Icon'
import { useNotifyModal } from '../../components/NoticeModal'
import { getOtpErrorMessage, OtpFormItem, useOtpForm } from '../../components/OtpInput'
import { RegisterBackLink, RegisterCard, RegisterDivider } from '../../components/RegisterCard'
import { useGuestLayout } from '../../layouts/guestLayoutContext'
import { PATHS } from '../../routes/paths'
import { brandColors } from '../../theme/tokens'
import { isMinor } from '../../utils/age'
import GuardianNameField from './GuardianNameField'
import styles from './Register.module.css'
import { getRegisterFlow, updateRegisterFlow } from './registerFlow'

// 註冊第一步：出生／信箱／手機＋OTP 驗證（issue #15，docs/design/register/README.md「Default」「ing」「otp」「未成年判斷 ing」）
// Default（按「確認」發送 OTP）→ ing（OTP 列＋倒數，OTP 未填滿時「確認」停用）→ otp（填滿可按「確認」驗證）
//   → 成功：registerToken 與出生／信箱／手機／監護人寫入 registerFlow，導向個資保護聲明
//   → 失敗：通知彈窗（設計註記「輸入錯誤需跳pop提醒」）
// 出生日期未滿 18 歲時，出生欄下方插入「監護人名稱」（GuardianNameField）。
//
// TODO(#12)：以下為設計未定、先依推測實作——
// - Default 稿上欄位全空時「確認」也是可按樣式：照稿一律可按，按下才驗證（錯誤顯示在欄位下方並跳通知彈窗）
// - 未成年 ing 稿沒有「確認」與「or／Line」：判定為稿未畫完，沿用 Default 的按鈕與 Line 區
// - 監護人只有名稱一欄；信箱與手機填本人或監護人未定
// - 發送 OTP 後改了出生／信箱／手機／監護人：回到 Default（需重新發送），稿未畫
// - 驗證碼逾時（OTP_EXPIRED）：回到 Default 重新發送；倒數結束後則可直接按倒數框的「重新發送」
// - Line 分支（registerFlow 已有 lineToken）：已完成 Line 授權，隱藏「or／使用Line創建帳號」，其餘同一般流程
// - 錯誤彈窗標題與文案未畫，標題沿用登入頁「通知」

interface RegisterValues {
  birthDate?: BirthDate | null
  guardianName?: string
  email: string
  phone: string
  otp?: string
}

/** DatePicker 的日期值（Dayjs）；不直接 import dayjs，避免依賴 antd 的間接相依套件 */
type BirthDate = Parameters<NonNullable<DatePickerProps['disabledDate']>>[0]
type FieldName = keyof RegisterValues

const NOTICE_TITLE = '通知'

// TODO(#12)：錯誤文案設計未定
const MESSAGES = {
  birthDateRequired: '請選擇出生日期',
  alreadyRegistered: '此電子信箱或手機已註冊',
  failed: '發生錯誤，請稍後再試',
} as const

const EMAIL_RULES = emailRules()
const PHONE_RULES = phoneRules()

const BIRTH_DATE_FORMAT = 'YYYY/MM/DD'
const API_DATE_FORMAT = 'YYYY-MM-DD'

/** 送出 OTP 前會改變驗證對象的欄位；發送後改動就要重新發送 */
const OTP_TARGET_FIELDS: FieldName[] = ['birthDate', 'guardianName', 'email', 'phone']

/** 後端 VALIDATION_ERROR 的 fields 可對應到本頁欄位 */
const SERVER_FIELDS: FieldName[] = ['birthDate', 'guardianName', 'email', 'phone']

/** 不能選今天之後的日期 */
const disabledFutureDate: DatePickerProps['disabledDate'] = (current) => {
  const now = new Date()
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  return current.valueOf() >= endOfToday
}

function apiErrorContent(error: unknown): string {
  const otpMessage = getOtpErrorMessage(error)
  if (otpMessage) return otpMessage
  if (isApiError(error, 'ALREADY_REGISTERED')) return MESSAGES.alreadyRegistered
  return getApiErrorMessage(error, MESSAGES.failed)
}

export default function Register() {
  useGuestLayout('card')
  const navigate = useNavigate()
  const screens = Grid.useBreakpoint()
  const [form] = Form.useForm<RegisterValues>()
  const [hasLineToken] = useState(() => !!getRegisterFlow().lineToken)
  const [verifying, setVerifying] = useState(false)
  const [lineLoading, setLineLoading] = useState(false)
  const { notify, contextHolder } = useNotifyModal()

  const showError = (error: unknown) => notify({ title: NOTICE_TITLE, content: apiErrorContent(error) })

  const otp = useOtpForm(form, sendRegisterOtp, {
    targetFields: OTP_TARGET_FIELDS,
    onResendError: (error) => void showError(error),
  })

  /** 表單值 → API 欄位；未滿 18 歲才帶監護人 */
  const toRequest = (values: RegisterValues) => {
    const minor = isMinor(values.birthDate)
    return {
      birthDate: values.birthDate?.format(API_DATE_FORMAT) ?? '',
      email: values.email.trim(),
      phone: values.phone.trim(),
      guardianName: minor ? values.guardianName?.trim() : undefined,
    }
  }

  const handleSend = async (values: RegisterValues) => {
    try {
      await otp.send(toRequest(values))
    } catch (error) {
      if (isApiError(error, 'VALIDATION_ERROR')) {
        const [first] = applyServerFieldErrors(form, error, SERVER_FIELDS)
        void notify({ title: NOTICE_TITLE, content: first ?? error.message })
        return
      }
      void showError(error)
    }
  }

  const handleVerify = async (values: RegisterValues) => {
    const request = toRequest(values)
    setVerifying(true)
    try {
      const { registerToken } = await verifyRegisterOtp({
        email: request.email,
        phone: request.phone,
        otp: values.otp ?? '',
      })
      updateRegisterFlow({
        registerToken,
        ...request,
        // 重新驗證後，之前同意過的個資聲明不沿用（undefined 不會寫入 sessionStorage）
        agreedToPrivacy: undefined,
        privacyVersion: undefined,
      })
      navigate(PATHS.registerPrivacy)
    } catch (error) {
      setVerifying(false)
      if (isApiError(error, 'OTP_INVALID')) otp.clearOtp()
      // TODO(#12)：逾時後的狀態未畫，回到 Default 讓使用者按「確認」重新發送
      if (isApiError(error, 'OTP_EXPIRED')) otp.reset()
      void showError(error)
    }
  }

  const handleFinish = (values: RegisterValues) => (otp.sent ? handleVerify(values) : handleSend(values))

  const handleFinishFailed: FormProps<RegisterValues>['onFinishFailed'] = ({ errorFields }) => {
    const first = errorFields[0]?.errors[0]
    if (first) void notify({ title: NOTICE_TITLE, content: first })
  }

  const handleLine = async () => {
    if (lineLoading) return
    setLineLoading(true)
    try {
      const { url } = await getLineAuthUrl('register')
      window.location.assign(url)
    } catch (error) {
      setLineLoading(false)
      void showError(error)
    }
  }

  const busy = otp.sending || verifying

  return (
    <RegisterCard footer={<RegisterBackLink to={PATHS.login} />}>
      {contextHolder}

      <AppForm<RegisterValues>
        form={form}
        requiredMark={false}
        validateTrigger="onBlur"
        onFinish={handleFinish}
        onFinishFailed={handleFinishFailed}
        onValuesChange={otp.handleValuesChange}
        className={RegisterCard.formClassName}
      >
        <Form.Item name="birthDate" rules={[{ required: true, message: MESSAGES.birthDateRequired }]}>
          <DatePicker
            placeholder="出生"
            aria-label="出生日期"
            format={BIRTH_DATE_FORMAT}
            disabledDate={disabledFutureDate}
            allowClear={false}
            // 手機避免點日期欄跳出鍵盤，只用日曆選；桌機可直接輸入
            inputReadOnly={!screens.lg}
            suffixIcon={<Icon name="calendar4" className={styles.calendarIcon} />}
            className={styles.picker}
          />
        </Form.Item>

        <GuardianNameField />

        <Form.Item name="email" rules={EMAIL_RULES}>
          <TextInput
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="請輸入電子信箱"
            aria-label="電子信箱"
            maxLength={254}
          />
        </Form.Item>

        <Form.Item name="phone" rules={PHONE_RULES}>
          {/* 稿上 placeholder 為「手機驗證」，填手機號碼 */}
          <TextInput
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="手機驗證"
            aria-label="手機號碼"
            maxLength={10}
          />
        </Form.Item>

        {otp.sent && <OtpFormItem otp={otp} disabled={verifying} />}

        <Button
          htmlType="submit"
          block
          loading={busy}
          disabled={otp.sent && !otp.otpFilled}
          className={RegisterCard.submitClassName}
        >
          確認
        </Button>
      </AppForm>

      {/* ing／otp 稿上「or」與 Line 按鈕消失；Line 授權完成後接回此頁時也不再顯示 */}
      {!otp.sent && !hasLineToken && (
        <>
          <RegisterDivider />
          <Button
            variant="secondary"
            block
            icon={<Icon name="line" color={brandColors.line} />}
            loading={lineLoading}
            disabled={busy}
            onClick={handleLine}
          >
            使用Line創建帳號
          </Button>
        </>
      )}
    </RegisterCard>
  )
}
