import { Card, Flex, Form, Segmented, Switch, Typography } from 'antd'
import { useState } from 'react'
import { isApiError } from '../api/client'
import { sendForgotPasswordOtp, verifyForgotPasswordOtp } from '../api/password'
import { Button } from '../components/Button'
import { AppForm, TextInput } from '../components/form'
import { useNotifyModal } from '../components/NoticeModal'
import { getOtpErrorMessage, OtpField, otpRules, useOtpSender } from '../components/OtpInput'
import { toOtpExpiresAt } from '../constants/otp'

// 開發用：OTP 元件示範（issue #5）。只在 dev 模式掛在 PATHS.devOtp（/dev/otp），正式 build 不包含。
// 1. 單獨使用：不打 API，可切換位數、倒數秒數、錯誤狀態，測輸入／貼上／倒數／重新發送
// 2. 搭配 AppForm＋MSW：以忘記密碼的 API 實際發送／驗證（mock 規則見 src/mocks/README.md「OTP」）

const LENGTH_OPTIONS = [4, 5, 6]
const SECONDS_OPTIONS = [
  { label: '10 秒', value: 10 },
  { label: '1 分', value: 60 },
  { label: '5 分', value: 300 },
]

function StandaloneDemo() {
  const [length, setLength] = useState(4)
  const [seconds, setSeconds] = useState(10)
  const [expiresAt, setExpiresAt] = useState(() => toOtpExpiresAt(10))
  const [value, setValue] = useState('')
  const [showError, setShowError] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const append = (line: string) => setLog((prev) => [`${new Date().toLocaleTimeString()} ${line}`, ...prev].slice(0, 6))

  const restart = (nextSeconds = seconds) => setExpiresAt(toOtpExpiresAt(nextSeconds))

  return (
    <Card title="1. 單獨使用（不打 API）">
      <Flex vertical gap="middle">
        <Flex wrap gap="small" align="center">
          <Typography.Text type="secondary">位數</Typography.Text>
          <Segmented<number>
            options={LENGTH_OPTIONS}
            value={length}
            onChange={(next) => {
              setLength(next)
              setValue('')
            }}
          />
          <Typography.Text type="secondary">倒數</Typography.Text>
          <Segmented<number>
            options={SECONDS_OPTIONS}
            value={seconds}
            onChange={(next) => {
              setSeconds(next)
              restart(next)
            }}
          />
        </Flex>
        <Flex wrap gap="middle" align="center">
          <Flex gap="small" align="center">
            <Switch checked={showError} onChange={setShowError} />
            <Typography.Text>錯誤狀態</Typography.Text>
          </Flex>
          <Flex gap="small" align="center">
            <Switch checked={disabled} onChange={setDisabled} />
            <Typography.Text>停用</Typography.Text>
          </Flex>
          <Button variant="secondary" onClick={() => restart()}>
            重設倒數
          </Button>
        </Flex>
        <OtpField
          value={value}
          onChange={setValue}
          length={length}
          expiresAt={expiresAt}
          disabled={disabled}
          error={showError ? '驗證碼錯誤，請重新輸入' : undefined}
          onComplete={(code) => append(`onComplete：${code}`)}
          onExpire={() => append('onExpire')}
          onResend={async () => {
            append('onResend（模擬 600ms）')
            await new Promise((resolve) => window.setTimeout(resolve, 600))
            restart()
          }}
        />
        <Typography.Text type="secondary">
          目前值：「{value}」。試試貼上「您的驗證碼為 ７４１４，5 分鐘內有效」。
        </Typography.Text>
        <Typography.Text type="secondary" style={{ whiteSpace: 'pre-line' }}>
          {log.join('\n')}
        </Typography.Text>
      </Flex>
    </Card>
  )
}

interface FormValues {
  email: string
  phone: string
  otp: string
}

function FormDemo() {
  const [form] = Form.useForm<FormValues>()
  const { notify, contextHolder } = useNotifyModal()
  const [shortCountdown, setShortCountdown] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const otpValue = Form.useWatch('otp', form) ?? ''

  const showError = (error: unknown) =>
    notify({
      title: '通知',
      content: getOtpErrorMessage(error) ?? (isApiError(error) ? error.message : '發生錯誤，請稍後再試'),
    })

  const otp = useOtpSender(sendForgotPasswordOtp, {
    onResendError: showError,
    expiresInOverride: shortCountdown ? 10 : undefined,
  })

  const handleSend = async () => {
    const { email, phone } = await form.validateFields(['email', 'phone'])
    try {
      await otp.send({ email, phone })
      form.setFieldValue('otp', '')
    } catch (error) {
      showError(error)
    }
  }

  const handleVerify = async () => {
    // 信箱、手機在發送後停用，用 getFieldsValue(true) 確保一併取得
    const { email, phone, otp: code } = form.getFieldsValue(true) as FormValues
    setVerifying(true)
    try {
      const { resetToken } = await verifyForgotPasswordOtp({ email, phone, otp: code })
      await notify({ title: '驗證成功', content: `resetToken：${resetToken}` })
    } catch (error) {
      // 驗證碼錯誤也可以改用 inline：form.setFields([{ name: 'otp', errors: [message] }])
      showError(error)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Card title="2. AppForm＋MSW（忘記密碼 API）">
      {contextHolder}
      <AppForm<FormValues>
        form={form}
        layout="vertical"
        initialValues={{ email: 'member@test.com', phone: '0912345678', otp: '' }}
        onFinish={handleVerify}
      >
        <Form.Item name="email" rules={[{ required: true }]}>
          <TextInput placeholder="電子信箱" disabled={otp.sent} />
        </Form.Item>
        <Form.Item name="phone" rules={[{ required: true }]}>
          <TextInput placeholder="手機" disabled={otp.sent} />
        </Form.Item>
        {otp.sent && (
          <Form.Item name="otp" rules={otpRules(otp.length)}>
            <OtpField length={otp.length} expiresAt={otp.expiresAt} onResend={otp.resend} autoFocus />
          </Form.Item>
        )}
        <Flex vertical gap="middle">
          {otp.sent ? (
            <Button htmlType="submit" block loading={verifying} disabled={otpValue.length !== otp.length}>
              確認
            </Button>
          ) : (
            <Button block loading={otp.sending} onClick={handleSend}>
              確認（發送 OTP）
            </Button>
          )}
          <Flex gap="small" align="center">
            <Switch checked={shortCountdown} onChange={setShortCountdown} />
            <Typography.Text>倒數改成 10 秒（只影響下一次發送）</Typography.Text>
          </Flex>
          {otp.sent && (
            <Button variant="text" onClick={otp.reset}>
              重來（reset）
            </Button>
          )}
          <Typography.Text type="secondary">
            OTP：0000 → 錯誤、9999 → 逾時、其他 4 碼（如 1234）→ 通過；信箱 frequent@test.com → 發送過於頻繁。
          </Typography.Text>
        </Flex>
      </AppForm>
    </Card>
  )
}

export default function OtpDemo() {
  return (
    <Flex vertical gap="large" style={{ maxWidth: 640, margin: '0 auto', padding: 'var(--page-padding)' }}>
      <Typography.Title level={4}>OTP 元件示範（dev only）</Typography.Title>
      <StandaloneDemo />
      <FormDemo />
    </Flex>
  )
}
