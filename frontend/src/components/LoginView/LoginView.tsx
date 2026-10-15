import { Divider, Form } from 'antd'
import type { Rule } from 'antd/es/form'
import type { ReactNode } from 'react'
import { Button } from '../Button'
import { AppForm, Checkbox, PasswordInput, TextInput } from '../form'
import LoginLink from './LoginLink'
import LoginLoading from './LoginLoading'
import LoginShell from './LoginShell'
import styles from './LoginView.module.css'

// 登入畫面（docs/design/login/README.md），會員中心登入頁（src/pages/login/Login.tsx）與
// 新 SSO 登入頁（src/sso/pages/SignIn.tsx）共用（#47 D12：改設計時只改這裡）。
// 只管畫面；送出後呼叫哪個 API、錯誤怎麼提示由各頁處理。
//
// 已確認（#12）：
// - web ing 稿的「登入」仍為停用色、mob ing 為可按：採「兩欄都有值就啟用」
// - 稿上帳號欄右側也有眼睛圖示，判定為複製密碼欄的殘留，只在密碼欄放
// - 欄位格式錯誤採 inline 訊息（稿未畫），伺服器回傳的錯誤由各頁用通知彈窗

export interface LoginValues {
  /** 帳號欄：會員中心是電子信箱，SSO 是電子信箱或手機 */
  account: string
  password: string
  /** 「記住帳號」，showRemember 為 false 時沒有這欄 */
  remember?: boolean
}

export interface LoginAccountField {
  rules: Rule[]
  placeholder: string
  /** 無障礙標籤（畫面上沒有欄位標題） */
  label: string
  /** email 會帶出手機的信箱鍵盤；可輸入手機時用 text */
  type?: 'email' | 'text'
  /** 預設 username；SSO 開了通行密鑰自動填入時用 username webauthn（#63） */
  autoComplete?: string
}

export interface LoginViewProps {
  account: LoginAccountField
  /** 是否顯示「記住帳號」，預設顯示 */
  showRemember?: boolean
  /** 送出中：顯示 Logo loading 遮罩 */
  submitting: boolean
  onFinish: (values: LoginValues) => void
  /** 連結目標：站內路徑或完整網址（見 LoginLink） */
  links: { progress: string; forgotPassword: string; register: string }
  /** 「or」分隔線下方的社群登入按鈕 */
  social: ReactNode
}

const PASSWORD_RULES: Rule[] = [{ required: true, message: '請輸入密碼' }]

export default function LoginView({ account, showRemember = true, submitting, onFinish, links, social }: LoginViewProps) {
  const [form] = Form.useForm<LoginValues>()
  const accountValue = Form.useWatch('account', form)
  const password = Form.useWatch('password', form)

  // loading 期間按鈕維持可按樣式（mob loading 稿），由遮罩與 useLoginSubmit 阻擋重複送出
  const canSubmit = !!accountValue?.trim() && !!password

  return (
    <LoginShell>
      <AppForm<LoginValues>
        form={form}
        requiredMark={false}
        validateTrigger="onBlur"
        initialValues={{ remember: false }}
        onFinish={onFinish}
        className={styles.form}
      >
        <Form.Item name="account" className={styles.field} rules={account.rules}>
          <TextInput
            type={account.type ?? 'text'}
            inputMode={account.type === 'email' ? 'email' : undefined}
            autoComplete={account.autoComplete ?? 'username'}
            placeholder={account.placeholder}
            aria-label={account.label}
            maxLength={254}
          />
        </Form.Item>
        <Form.Item name="password" className={styles.field} rules={PASSWORD_RULES}>
          <PasswordInput autoComplete="current-password" placeholder="請輸入密碼" aria-label="密碼" />
        </Form.Item>
        {showRemember && (
          <Form.Item name="remember" valuePropName="checked" className={styles.remember}>
            <Checkbox>記住帳號</Checkbox>
          </Form.Item>
        )}
        <Button htmlType="submit" block disabled={!canSubmit} className={showRemember ? undefined : styles.submitNoRemember}>
          登入
        </Button>
      </AppForm>

      <div className={styles.links}>
        {/* 已確認（#12） L3 不另出稿；查詢條件改為信箱或手機擇一＋驗證碼（#52） */}
        <LoginLink to={links.progress}>進度查詢</LoginLink>
        <LoginLink to={links.forgotPassword}>忘記密碼？</LoginLink>
      </div>

      <Divider plain className={styles.divider}>
        or
      </Divider>

      {social}

      <p className={styles.footer}>
        還沒有帳號？
        <LoginLink to={links.register}>註冊帳號</LoginLink>
      </p>

      <LoginLoading spinning={submitting} />
    </LoginShell>
  )
}
