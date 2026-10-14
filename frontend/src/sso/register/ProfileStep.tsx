import { Checkbox, Flex, Form } from 'antd'
import type { FormProps } from 'antd'
import type { Rule } from 'antd/es/form'
import { useState } from 'react'
import { Button } from '../../components/Button'
import {
  AppForm,
  confirmPasswordRules,
  newPasswordRules,
  PasswordInput,
  requiredRule,
  TextInput,
} from '../../components/form'
import { useNotifyModal } from '../../components/NoticeModal'
import { RegisterBackLink, RegisterCard } from '../../components/RegisterCard'
import { isExperienceError } from '../api/client'
import { getExperienceErrorMessage } from '../api/errors'
import { goToRedirect } from '../api/experience'
import { formatIdentifier } from '../identifier'
import type { VerifiedAccount } from './AccountStep'
import styles from './Register.module.css'
import { completeRegister, PRIVACY_URL, TERMS_URL } from './registerFlow'

// 註冊第二步：姓名、密碼、同意條款 → 建立帳號 → 回到原網站。
// 姓名是 Logto 的必填自訂欄位 fullname（姓氏＋名字，後台說明「請填寫您的本名／本姓」）。
// 同意條款：Logto 設定一般註冊要勾（agreeToTermsPolicy: ManualRegistrationOnly）；Experience API 沒有「同意條款」的參數
// （OpenAPI 查無 terms／agree），和 Logto 原本登入頁一樣只在前端擋。
//
// TODO(#12)：設計稿沒畫這一步（會員中心是在「會員資料輸入」全寬表單填姓名、密碼），先沿用「創建帳號」卡片版面：
// 欄位 placeholder、條款文案、錯誤文案皆為推測；錯誤一律跳通知彈窗（設計註記「輸入錯誤需跳pop提醒」）

interface ProfileValues {
  familyName: string
  givenName: string
  password: string
  confirmPassword: string
  agreed: boolean
}

const NOTICE_TITLE = '通知'

const MESSAGES = {
  mismatch: '兩次輸入的密碼不一致',
  agreeRequired: '請閱讀並同意服務條款與隱私權政策',
  /** 驗證已失效（例如在別的分頁重新開始註冊），要回第一步重新驗證 */
  expired: '驗證已失效，請重新驗證電子信箱或手機',
} as const

/** Logto fullname 各部分的長度上限（customProfileFields 的 maxLength） */
const NAME_MAX_LENGTH = 100

const FAMILY_NAME_RULES = [requiredRule('請輸入姓氏')]
const GIVEN_NAME_RULES = [requiredRule('請輸入名字')]
const PASSWORD_RULES = newPasswordRules(undefined, '請輸入密碼')
const CONFIRM_PASSWORD_RULES = confirmPasswordRules('password', { required: '請再次輸入密碼', mismatch: MESSAGES.mismatch })
const AGREED_RULES: Rule[] = [
  {
    validator: (_, value?: boolean) => (value ? Promise.resolve() : Promise.reject(new Error(MESSAGES.agreeRequired))),
  },
]

/** 這些錯誤代表第一步的驗證已不能用，要回第一步 */
const BACK_TO_ACCOUNT = ['session.verification_session_not_found', 'session.verification_failed']

export interface ProfileStepProps {
  account: VerifiedAccount
  onBack: () => void
}

export default function ProfileStep({ account, onBack }: ProfileStepProps) {
  const [form] = Form.useForm<ProfileValues>()
  const password = Form.useWatch('password', form)
  const confirmPassword = Form.useWatch('confirmPassword', form)
  const [submitting, setSubmitting] = useState(false)
  const { notify, contextHolder } = useNotifyModal()

  const handleFinish = async (values: ProfileValues) => {
    setSubmitting(true)
    try {
      // needsProfile 為 false（第一步 identify 已成功，目前 Logto 設定不會發生）時不再補資料，只同意條款後送出
      const profile = { familyName: values.familyName.trim(), givenName: values.givenName.trim(), password: values.password }
      const redirectTo = await completeRegister(account.verificationId, account.needsProfile ? profile : null)
      // 轉址期間維持 loading，避免重複送出
      goToRedirect(redirectTo)
    } catch (error) {
      setSubmitting(false)
      if (isExperienceError(error, ...BACK_TO_ACCOUNT)) {
        await notify({ title: NOTICE_TITLE, content: MESSAGES.expired })
        onBack()
        return
      }
      void notify({ title: NOTICE_TITLE, content: getExperienceErrorMessage(error) })
    }
  }

  const handleFinishFailed: FormProps<ProfileValues>['onFinishFailed'] = ({ errorFields }) => {
    const first = errorFields[0]?.errors[0]
    if (first) void notify({ title: NOTICE_TITLE, content: first })
  }

  return (
    <RegisterCard footer={<RegisterBackLink onClick={onBack} disabled={submitting} />}>
      {contextHolder}
      <p className={styles.account}>
        帳號：<span className={styles.accountValue}>{formatIdentifier(account.identifier)}</span>
      </p>
      <AppForm<ProfileValues>
        form={form}
        requiredMark={false}
        validateTrigger="onBlur"
        onFinish={handleFinish}
        onFinishFailed={handleFinishFailed}
        className={RegisterCard.formClassName}
      >
        <Flex gap="middle" className={styles.nameRow}>
          <Form.Item name="familyName" rules={FAMILY_NAME_RULES}>
            <TextInput placeholder="姓氏" aria-label="姓氏" autoComplete="family-name" maxLength={NAME_MAX_LENGTH} />
          </Form.Item>
          <Form.Item name="givenName" rules={GIVEN_NAME_RULES}>
            <TextInput placeholder="名字" aria-label="名字" autoComplete="given-name" maxLength={NAME_MAX_LENGTH} />
          </Form.Item>
        </Flex>

        <Form.Item name="password" rules={PASSWORD_RULES}>
          {/* 同會員中心：空白時沒有眼睛圖示，有值後才出現 */}
          <PasswordInput
            placeholder="請輸入密碼"
            aria-label="密碼"
            autoComplete="new-password"
            visibilityToggle={!!password}
          />
        </Form.Item>

        <Form.Item name="confirmPassword" dependencies={['password']} rules={CONFIRM_PASSWORD_RULES}>
          <PasswordInput
            placeholder="再次輸入密碼"
            aria-label="確認密碼"
            autoComplete="new-password"
            visibilityToggle={!!confirmPassword}
          />
        </Form.Item>

        <Form.Item name="agreed" valuePropName="checked" rules={AGREED_RULES} validateTrigger="onChange">
          <Checkbox className={styles.agree}>
            我已閱讀並同意
            <a href={TERMS_URL} target="_blank" rel="noreferrer" className={styles.agreeLink}>
              服務條款
            </a>
            與
            <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className={styles.agreeLink}>
              隱私權政策
            </a>
          </Checkbox>
        </Form.Item>

        <Button htmlType="submit" block loading={submitting} className={RegisterCard.submitClassName}>
          確認
        </Button>
      </AppForm>
    </RegisterCard>
  )
}
