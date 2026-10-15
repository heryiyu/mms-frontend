import { Form } from 'antd'
import { useState } from 'react'
import { getApiErrorMessage, isApiError } from '../../api/client'
import { verifyProfileChange } from '../../api/member'
import type { Me, OtpSentTo, ProfileChangeOtpResponse, ProfileChangeRequest } from '../../api/types'
import ActionBar from '../../components/ActionBar'
import { AppForm, FormCard } from '../../components/form'
import type { NotifyOptions } from '../../components/NoticeModal'
import { getOtpErrorMessage, OTP_MESSAGES, OtpField, otpRules, type OtpSender } from '../../components/OtpInput'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import styles from './Profile.module.css'

// 資料變更驗證（docs/design/profile/README.md「資料變更驗證（OTP）」otp／otp-ing）
// web：標題靠左、卡片接在標題下；mob：標題置中、標題＋卡片在內容區垂直置中
// 主要按鈕「確認」（#12 C4），驗證碼未輸入完整前停用
//
// TODO(#12)：驗證碼錯誤／逾時的提示樣式未出圖，先用通知彈窗（同 OTP 元件建議）
// TODO(#12)：「驗證碼已寄到…」（#49，後端回傳的遮罩目的地）稿上沒有，接在說明文字後面

interface OtpValues {
  otp: string
}

const MESSAGES = {
  hint: '為保障您的帳號安全，送出會員資料修改前，請先完成 OTP 驗證。',
  failedTitle: '驗證失敗',
  failedContent: '發生錯誤，請稍後再試',
} as const

export interface ProfileOtpStepProps {
  otp: OtpSender<ProfileChangeRequest, ProfileChangeOtpResponse>
  /** 驗證碼寄到哪裡（發送 API 回傳）；沒有時不顯示 */
  sentTo: OtpSentTo | null
  notify: (options: NotifyOptions) => Promise<boolean>
  /** 取消／返回：回資料修改（保留已修改內容） */
  onCancel: () => void
  onVerified: (me: Me) => void
}

export default function ProfileOtpStep({ otp, sentTo, notify, onCancel, onVerified }: ProfileOtpStepProps) {
  const [form] = Form.useForm<OtpValues>()
  const code = Form.useWatch('otp', form) ?? ''
  const [verifying, setVerifying] = useState(false)

  const handleFinish = async ({ otp: value }: OtpValues) => {
    setVerifying(true)
    try {
      onVerified(await verifyProfileChange({ otp: value }))
    } catch (error) {
      if (isApiError(error, 'UNAUTHORIZED')) return // client 已統一導回登入頁
      void notify({
        title: MESSAGES.failedTitle,
        content: getOtpErrorMessage(error) ?? getApiErrorMessage(error, MESSAGES.failedContent),
      })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <AppForm<OtpValues> form={form} className={styles.form} initialValues={{ otp: '' }} onFinish={handleFinish}>
      <div className={styles.otpBody}>
        <h1 className={cx(typography.pageTitle, styles.title, styles.otpTitle)}>資料變更驗證</h1>
        <FormCard className={styles.otpCard}>
          <p className={styles.otpHint}>
            {MESSAGES.hint}
            {sentTo && (
              <>
                <br />
                {OTP_MESSAGES.sentTo(sentTo)}
              </>
            )}
          </p>
          <Form.Item name="otp" rules={otpRules(otp.length)} className={styles.otpItem}>
            <OtpField length={otp.length} expiresAt={otp.expiresAt} onResend={otp.resend} autoFocus />
          </Form.Item>
        </FormCard>
      </div>
      <ActionBar
        bleed
        onCancel={onCancel}
        confirmHtmlType="submit"
        confirmDisabled={code.length !== otp.length}
        confirmLoading={verifying}
      />
    </AppForm>
  )
}
