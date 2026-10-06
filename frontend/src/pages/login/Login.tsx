import { Divider, Form } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { getLineAuthUrl, login } from '../../api/auth'
import { ApiError, isApiError } from '../../api/client'
import type { ErrorCode } from '../../api/types'
import { Button } from '../../components/Button'
import { AppForm, Checkbox, PasswordInput, TextInput } from '../../components/form'
import Icon from '../../components/Icon'
import { useNotifyModal } from '../../components/NoticeModal'
import GuestBrandHeader from '../../layouts/GuestBrandHeader'
import { PATHS } from '../../routes/paths'
import { brandColors } from '../../theme/tokens'
import LoginLoading from './LoginLoading'
import { getLoginErrorNotice, TOO_MANY_ATTEMPTS_NOTICE } from './loginErrors'
import styles from './Login.module.css'

// 登入頁（issue #14，docs/design/login/README.md）
// 狀態：default（空白）→ ing（輸入中，兩欄皆有值才可按「登入」）→ loading（Logo 遮罩）
//   → 成功：login() 寫入 auth store，GuestOnly 守衛自動導回原頁／首頁
//   → ACCOUNT_PENDING：導向等待審核頁
//   → 其他失敗：通知彈窗，關閉後回到輸入中（保留已輸入內容）
//
// TODO(#12)：以下為設計未定、先依推測實作——
// - web ing 稿的「登入」仍為停用色、mob ing 為可按：採「兩欄都有值就啟用」
// - 稿上電子信箱欄右側也有眼睛圖示，判定為複製密碼欄的殘留，只在密碼欄放
// - 欄位格式錯誤採 inline 訊息（稿未畫），伺服器回傳的錯誤用通知彈窗
// - 「記住帳號」沿用 authStore 的 remember（勾選＝關閉瀏覽器仍保持登入），是否改為記住信箱待確認
// - 登入過度頻繁的門檻（錯幾次暫停、暫停多久）待後端定義；前端收到 TOO_MANY_ATTEMPTS 後先暫停送出 LOGIN_COOLDOWN_MS

interface LoginValues {
  email: string
  password: string
  remember: boolean
}

/** 收到「登入過度頻繁」後，前端暫停送出的時間。TODO(#12)：實際門檻待後端定義 */
const LOGIN_COOLDOWN_MS = 30_000

/** Line 登入失敗時，LineCallback 導回登入頁用 location.state 帶錯誤碼，由這裡顯示彈窗 */
export interface LoginPageState {
  lineError?: { status: number; code: ErrorCode; message: string }
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form] = Form.useForm<LoginValues>()
  const email = Form.useWatch('email', form)
  const password = Form.useWatch('password', form)
  const [submitting, setSubmitting] = useState(false)
  const [lineLoading, setLineLoading] = useState(false)
  const { notify, contextHolder } = useNotifyModal()
  // 前端阻擋重複送出：state 更新前連點／連按 Enter 也只會送一次
  const submittingRef = useRef(false)
  const cooldownUntilRef = useRef(0)

  // loading 期間按鈕維持可按樣式（mob loading 稿），由遮罩與 submittingRef 阻擋重複送出
  const canSubmit = !!email?.trim() && !!password

  // Line 登入失敗導回時顯示對應彈窗，並清掉 state 避免重新整理後再跳一次
  const lineError = (location.state as LoginPageState | null)?.lineError
  useEffect(() => {
    if (!lineError) return
    void notify(getLoginErrorNotice(new ApiError(lineError.status, lineError.code, lineError.message)))
    navigate(location.pathname, { replace: true, state: null })
  }, [lineError, location.pathname, navigate, notify])

  const handleFinish = async ({ email, password, remember }: LoginValues) => {
    if (submittingRef.current) return
    if (Date.now() < cooldownUntilRef.current) {
      void notify(TOO_MANY_ATTEMPTS_NOTICE)
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    try {
      await login({ email: email.trim(), password }, remember)
      // 成功：GuestOnly 守衛會自動導頁，元件即將卸載，不需再更新狀態
    } catch (error) {
      submittingRef.current = false
      setSubmitting(false)
      if (isApiError(error, 'ACCOUNT_PENDING')) {
        navigate(PATHS.pending)
        return
      }
      if (isApiError(error, 'TOO_MANY_ATTEMPTS')) cooldownUntilRef.current = Date.now() + LOGIN_COOLDOWN_MS
      void notify(getLoginErrorNotice(error))
    }
  }

  const handleLineLogin = async () => {
    if (lineLoading) return
    setLineLoading(true)
    try {
      const { url } = await getLineAuthUrl('login')
      window.location.assign(url)
    } catch (error) {
      setLineLoading(false)
      void notify(getLoginErrorNotice(error))
    }
  }

  return (
    <div className={styles.page}>
      {contextHolder}
      <GuestBrandHeader />

      <AppForm<LoginValues>
        form={form}
        requiredMark={false}
        validateTrigger="onBlur"
        initialValues={{ remember: false }}
        onFinish={handleFinish}
        className={styles.form}
      >
        <Form.Item
          name="email"
          className={styles.field}
          rules={[
            { required: true, whitespace: true, message: '請輸入電子信箱' },
            { type: 'email', message: '電子信箱格式錯誤', transform: (value?: string) => value?.trim() },
          ]}
        >
          <TextInput
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="請輸入電子信箱"
            aria-label="電子信箱"
            maxLength={254}
          />
        </Form.Item>
        <Form.Item name="password" className={styles.field} rules={[{ required: true, message: '請輸入密碼' }]}>
          <PasswordInput autoComplete="current-password" placeholder="請輸入密碼" aria-label="密碼" />
        </Form.Item>
        <Form.Item name="remember" valuePropName="checked" className={styles.remember}>
          <Checkbox>記住帳號</Checkbox>
        </Form.Item>
        <Button htmlType="submit" block disabled={!canSubmit}>
          登入
        </Button>
      </AppForm>

      <div className={styles.links}>
        {/* TODO(#12)：「進度查詢」設計未畫，暫導向進度查詢佔位頁 */}
        <Link to={PATHS.progress} className={styles.link}>
          進度查詢
        </Link>
        <Link to={PATHS.forgotPassword} className={styles.link}>
          忘記密碼？
        </Link>
      </div>

      <Divider plain className={styles.divider}>
        or
      </Divider>

      <Button
        variant="secondary"
        block
        icon={<Icon name="line" color={brandColors.line} />}
        loading={lineLoading}
        onClick={handleLineLogin}
      >
        使用Line快速登入
      </Button>

      <p className={styles.footer}>
        還沒有帳號？
        <Link to={PATHS.register} className={styles.link}>
          註冊帳號
        </Link>
      </p>

      <LoginLoading spinning={submitting} />
    </div>
  )
}
