import { DatePicker, Flex, Form, Grid, Skeleton, Typography } from 'antd'
import type { DatePickerProps, FormProps } from 'antd'
import type { Rule } from 'antd/es/form'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getApiErrorMessage, isApiError } from '../../api/client'
import { getRegistration, sendRegistrationContactOtp, verifyRegistrationContact } from '../../api/register'
import type { ContactOtpRequest, RegistrationInfo, SsoAccount } from '../../api/types'
import { authStore } from '../../auth/store'
import { useLeaveToLogin } from '../../auth/useLeaveToLogin'
import { Button } from '../../components/Button'
import { AppForm, applyServerFieldErrors, FIELD_RULE_MESSAGES, TextInput } from '../../components/form'
import Icon from '../../components/Icon'
import { useNotifyModal } from '../../components/NoticeModal'
import { getOtpErrorMessage, OtpField, otpRules, useOtpForm } from '../../components/OtpInput'
import { PHONE_PATTERN } from '../../constants/validation'
import { useGuestLayout } from '../../layouts/guestLayoutContext'
import { PATHS } from '../../routes/paths'
import typography from '../../styles/typography.module.css'
import { isMinor } from '../../utils/age'
import { cx } from '../../utils/cx'
import GuardianNameField from '../register/GuardianNameField'
import registerStyles from '../register/Register.module.css'
import { getRegisterFlow, type RegisterFlowState, updateRegisterFlow } from '../register/registerFlow'
import styles from './ApplyBasic.module.css'

// Logto 模式第一次登入填寫會員資料（#48）第一步：出生日期＋補填聯絡方式。
// 版面沿用註冊第一步（Register.tsx，docs/design/register「創建帳號」）：卡片、出生、監護人、信箱、手機、OTP 列、「確認」。
// 與註冊第一步不同（設計稿未畫，依 #43、#48 的決定）：
// - SSO 已驗證的 email／手機以唯讀顯示；沒有的那個是選填，填了按「確認」先收驗證碼，驗證通過後後端寫回 SSO
// - email、手機都沒有（用 Line、Google 註冊）時，至少要填一個（D5）
// - 被退回重新送出時，帶入上次填的出生日期、監護人，以及第三步會員資料的內容
// - 「返回」會登出 SSO（已登入但不能使用會員中心）

type Contact = 'email' | 'phone'

const CONTACTS: Contact[] = ['email', 'phone']

const CONTACT_LABELS: Record<Contact, string> = { email: '電子信箱', phone: '手機' }

interface BasicValues {
  birthDate?: BirthDate | null
  guardianName?: string
  email?: string
  phone?: string
  otp?: string
}

/** DatePicker 的日期值（Dayjs） */
type BirthDate = Parameters<NonNullable<DatePickerProps['disabledDate']>>[0]

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; initialValues: Pick<BasicValues, 'birthDate' | 'guardianName'> }

const NOTICE_TITLE = '通知'

// 設計稿未畫，文案待確認
const MESSAGES = {
  birthDateRequired: '請選擇出生日期',
  contactRequired: '請至少填寫電子信箱或手機',
  contactUsed: (contact: Contact) => `此${CONTACT_LABELS[contact]}已被其他帳號使用`,
  loadFailed: '資料載入失敗，請稍後再試',
  failed: '發生錯誤，請稍後再試',
} as const

const BIRTH_DATE_FORMAT = 'YYYY/MM/DD'
const API_DATE_FORMAT = 'YYYY-MM-DD'

/** 不能選今天之後的日期 */
const disabledFutureDate: DatePickerProps['disabledDate'] = (current) => {
  const now = new Date()
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  return current.valueOf() >= endOfToday
}

const trim = (value?: string) => value?.trim()

const FORMAT_RULES: Record<Contact, Rule> = {
  email: { type: 'email', message: FIELD_RULE_MESSAGES.emailFormat, transform: trim },
  phone: { pattern: PHONE_PATTERN, message: FIELD_RULE_MESSAGES.phoneFormat, transform: trim },
}

/** 聯絡方式欄位的規則：格式；SSO 帳號兩個都沒有時，兩欄至少填一個 */
function contactRules(contact: Contact, needOne: boolean): Rule[] {
  const other: Contact = contact === 'email' ? 'phone' : 'email'
  const atLeastOne: Rule = ({ getFieldValue }) => ({
    validator: (_, value?: string) =>
      value?.trim() || (getFieldValue(other) as string | undefined)?.trim()
        ? Promise.resolve()
        : Promise.reject(new Error(MESSAGES.contactRequired)),
  })
  return needOne ? [atLeastOne, FORMAT_RULES[contact]] : [FORMAT_RULES[contact]]
}

/** 第三步會員資料的預設值：名字先帶 SSO 的名字；被退回時帶上次填的內容 */
function toPrefill(info: RegistrationInfo): RegisterFlowState['prefill'] {
  const { birthDate: _birthDate, guardianName: _guardianName, ...previous } = info.previous ?? {}
  return { ...(info.account.name ? { name: info.account.name } : {}), ...previous }
}

export default function ApplyBasic() {
  useGuestLayout('card')
  const navigate = useNavigate()
  const screens = Grid.useBreakpoint()
  const leaveToLogin = useLeaveToLogin()
  const [form] = Form.useForm<BasicValues>()
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [account, setAccount] = useState<SsoAccount>({ name: null, email: null, phone: null })
  /** 已發送驗證碼、正在驗證的聯絡方式 */
  const [otpTarget, setOtpTarget] = useState<Contact | null>(null)
  const [verifying, setVerifying] = useState(false)
  const { notify, contextHolder } = useNotifyModal()

  const showError = (error: unknown, contact?: Contact) => {
    const content =
      getOtpErrorMessage(error) ??
      (contact && isApiError(error, 'ALREADY_REGISTERED')
        ? MESSAGES.contactUsed(contact)
        : getApiErrorMessage(error, MESSAGES.failed))
    return notify({ title: NOTICE_TITLE, content })
  }

  const otp = useOtpForm(form, sendRegistrationContactOtp, {
    targetFields: otpTarget ? [otpTarget] : [],
    onResendError: (error) => void showError(error, otpTarget ?? undefined),
  })
  const activeTarget = otp.sent ? otpTarget : null

  useEffect(() => {
    let cancelled = false
    getRegistration()
      .then((info) => {
        if (cancelled) return
        if (info.status === 'ACTIVE' || info.status === 'PENDING') {
          // 已經送出過（例如另一個分頁）：更新登入狀態，守衛會導到對應頁面
          authStore.updateSession({ status: info.status })
          return
        }
        // 同一分頁內回到這一步時，沿用剛才填的；否則帶入被退回前的內容
        const saved = getRegisterFlow('apply')
        const birthDate = saved.birthDate ?? info.previous?.birthDate
        updateRegisterFlow({ prefill: toPrefill(info) }, 'apply')
        setAccount(info.account)
        setLoad({
          status: 'ready',
          initialValues: {
            birthDate: birthDate ? dayjs(birthDate, API_DATE_FORMAT) : undefined,
            guardianName: saved.guardianName ?? info.previous?.guardianName,
          },
        })
      })
      .catch((error: unknown) => {
        // 401 由 client 統一導回登入頁
        if (!cancelled && !isApiError(error, 'UNAUTHORIZED')) setLoad({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = () => {
    setLoad({ status: 'loading' })
    setReloadKey((key) => key + 1)
  }

  const needOne = !account.email && !account.phone

  /** 下一個要驗證的聯絡方式：有填、但 SSO 帳號還沒有的 */
  const nextUnverified = (values: BasicValues, current: SsoAccount) =>
    CONTACTS.find((contact) => !current[contact] && values[contact]?.trim())

  const goNext = (values: BasicValues) => {
    const minor = isMinor(values.birthDate)
    updateRegisterFlow(
      {
        birthDate: values.birthDate?.format(API_DATE_FORMAT),
        guardianName: minor ? values.guardianName?.trim() : undefined,
      },
      'apply',
    )
    navigate(PATHS.applyPrivacy)
  }

  /** 還有沒驗證的聯絡方式就發驗證碼，否則進下一步 */
  const proceed = async (values: BasicValues, current: SsoAccount) => {
    const contact = nextUnverified(values, current)
    if (!contact) {
      goNext(values)
      return
    }
    const body: ContactOtpRequest = { [contact]: values[contact]?.trim() }
    setOtpTarget(contact)
    try {
      await otp.send(body)
    } catch (error) {
      if (isApiError(error, 'VALIDATION_ERROR')) {
        const [first] = applyServerFieldErrors(form, error, CONTACTS)
        void notify({ title: NOTICE_TITLE, content: first ?? error.message })
        return
      }
      void showError(error, contact)
    }
  }

  const verify = async (values: BasicValues, contact: Contact) => {
    setVerifying(true)
    try {
      const updated = await verifyRegistrationContact({ [contact]: values[contact]?.trim(), otp: values.otp ?? '' })
      otp.reset()
      otp.clearOtp()
      setAccount(updated)
      setVerifying(false)
      await proceed(values, updated)
    } catch (error) {
      setVerifying(false)
      if (isApiError(error, 'OTP_INVALID')) otp.clearOtp()
      // 驗證碼逾時、已被其他帳號使用：回到尚未發送，讓使用者重新按「確認」
      if (isApiError(error, 'OTP_EXPIRED') || isApiError(error, 'ALREADY_REGISTERED')) otp.reset()
      void showError(error, contact)
    }
  }

  const handleFinish = (values: BasicValues) =>
    activeTarget ? verify(values, activeTarget) : proceed(values, account)

  const handleFinishFailed: FormProps<BasicValues>['onFinishFailed'] = ({ errorFields }) => {
    const first = errorFields[0]?.errors[0]
    if (first) void notify({ title: NOTICE_TITLE, content: first })
  }

  const busy = otp.sending || verifying

  const renderContact = (contact: Contact) => {
    const label = CONTACT_LABELS[contact]
    const verifiedValue = account[contact]
    if (verifiedValue) {
      return (
        <Form.Item key={contact}>
          <TextInput
            value={verifiedValue}
            disabled
            aria-label={label}
            suffix={
              <span className={styles.verified}>
                <Icon name="check-circle-fill" />
                已驗證
              </span>
            }
          />
        </Form.Item>
      )
    }
    return (
      <div key={contact}>
        <Form.Item
          name={contact}
          rules={contactRules(contact, needOne)}
          dependencies={needOne ? [contact === 'email' ? 'phone' : 'email'] : undefined}
        >
          {contact === 'email' ? (
            <TextInput
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={needOne ? '請輸入電子信箱' : '電子信箱（選填）'}
              aria-label={label}
              maxLength={254}
              disabled={busy}
            />
          ) : (
            <TextInput
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={needOne ? '請輸入手機號碼' : '手機號碼（選填）'}
              aria-label={label}
              maxLength={10}
              disabled={busy}
            />
          )}
        </Form.Item>
        {activeTarget === contact && (
          <Form.Item name="otp" rules={otpRules(otp.length)}>
            <OtpField
              length={otp.length}
              expiresAt={otp.expiresAt}
              onResend={otp.resend}
              disabled={verifying}
              autoFocus
            />
          </Form.Item>
        )}
      </div>
    )
  }

  const missing = CONTACTS.filter((contact) => !account[contact])

  return (
    <div className={registerStyles.page}>
      {contextHolder}
      <h1 className={cx(typography.headline5, registerStyles.title)}>基本資料</h1>

      {load.status === 'loading' && <Skeleton active title={false} paragraph={{ rows: 5 }} />}

      {load.status === 'error' && (
        <Flex vertical align="center" gap="small">
          <Typography.Text type="secondary">{MESSAGES.loadFailed}</Typography.Text>
          <Button variant="text" onClick={reload}>
            重新載入
          </Button>
        </Flex>
      )}

      {load.status === 'ready' && (
        <AppForm<BasicValues>
          form={form}
          initialValues={load.initialValues}
          requiredMark={false}
          validateTrigger="onBlur"
          onFinish={handleFinish}
          onFinishFailed={handleFinishFailed}
          onValuesChange={otp.handleValuesChange}
          className={registerStyles.form}
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
              suffixIcon={<Icon name="calendar4" className={registerStyles.calendarIcon} />}
              className={registerStyles.picker}
            />
          </Form.Item>

          <GuardianNameField />

          {CONTACTS.map(renderContact)}

          {missing.length > 0 && (
            <p className={styles.hint}>
              {needOne
                ? '請至少填寫電子信箱或手機其中一個，用來接收驗證碼與審核通知。填寫後需驗證，之後也可以用它登入。'
                : `補填${CONTACT_LABELS[missing[0]]}並驗證後，之後也可以用它登入；不需要可以留空。`}
            </p>
          )}

          <Button
            htmlType="submit"
            block
            loading={busy}
            disabled={!!activeTarget && !otp.otpFilled}
            className={registerStyles.submit}
          >
            確認
          </Button>
        </AppForm>
      )}

      <p className={registerStyles.footer}>
        <button type="button" className={styles.back} onClick={() => void leaveToLogin()}>
          返回
        </button>
      </p>
    </div>
  )
}
