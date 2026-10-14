import type { FormInstance } from 'antd'
import { Button } from '../Button'
import {
  AppForm,
  confirmPasswordRules,
  FormCard,
  FormCardItem,
  formCardLayout,
  newPasswordRules,
  PasswordInput,
} from '../form'
import { cx } from '../../utils/cx'
import styles from './ForgotPasswordCard.module.css'

// 忘記密碼「設定新密碼」表單（docs/design/forgot-password/README.md re／re-ing）。
// 放在 ForgotPasswordCard 內，會員中心與 SSO 登入頁共用（#47 D12）：
// 只負責畫面與前端驗證，呼叫哪個 API、錯誤怎麼顯示由各頁處理。不可 import src/api/client.ts（SSO build 會擋）。

export interface NewPasswordValues {
  newPassword: string
  confirmPassword: string
}

const newPasswordFieldRules = newPasswordRules()
const confirmPasswordFieldRules = confirmPasswordRules('newPassword')

export interface NewPasswordFormProps {
  /** 呼叫端用 Form.useForm 建立，伺服器回欄位錯誤時用 form.setFields 標在欄位上 */
  form: FormInstance<NewPasswordValues>
  onFinish: (values: NewPasswordValues) => void | Promise<void>
  /** 送出中：「確認」顯示 loading */
  submitting?: boolean
}

export default function NewPasswordForm({ form, onFinish, submitting }: NewPasswordFormProps) {
  return (
    <AppForm<NewPasswordValues>
      form={form}
      requiredMark={false}
      validateTrigger="onBlur"
      className={styles.form}
      {...formCardLayout}
      onFinish={onFinish}
    >
      <FormCard className={styles.rows}>
        <FormCardItem name="newPassword" label="新密碼" className={styles.row} rules={newPasswordFieldRules}>
          <PasswordInput placeholder="請輸入新密碼" autoComplete="new-password" autoFocus />
        </FormCardItem>
        <FormCardItem
          name="confirmPassword"
          label="確認密碼"
          className={styles.row}
          dependencies={['newPassword']}
          rules={confirmPasswordFieldRules}
        >
          <PasswordInput placeholder="請確認新密碼" autoComplete="new-password" />
        </FormCardItem>
      </FormCard>
      {/* 稿上欄位空白時「確認」已是啟用樣式，照稿不停用；未填按下會顯示 inline 必填訊息。TODO(#12)：是否改成填完才啟用 */}
      <Button htmlType="submit" block className={cx(styles.submit, styles.resetSubmit)} loading={submitting}>
        確認
      </Button>
    </AppForm>
  )
}
