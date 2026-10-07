import { Form, Grid, Result, Skeleton } from 'antd'
import type { Rule } from 'antd/es/form'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getApiErrorMessage, isApiError } from '../../api/client'
import { sendProfileChangeOtp } from '../../api/member'
import type { Me, ProfileChangeRequest } from '../../api/types'
import ActionBar from '../../components/ActionBar'
import { Button } from '../../components/Button'
import {
  AppForm,
  applyServerFieldErrors,
  emailRules,
  FormCard,
  FormCardItem,
  formCardLayout,
  phoneRules,
  requiredRule,
  TextInput,
} from '../../components/form'
import Icon from '../../components/Icon'
import { type NotifyOptions, useNotifyModal } from '../../components/NoticeModal'
import { getOtpErrorMessage, type OtpSender, useOtpSender } from '../../components/OtpInput'
import ResultPage from '../../components/ResultPage'
import { PATHS } from '../../routes/paths'
import ProfileHeader, { type ProfileEditLocationState } from './ProfileHeader'
import ProfileOtpStep from './ProfileOtpStep'
import styles from './Profile.module.css'
import { useMe } from './useMe'

// 個人資訊修改（issue #21，docs/design/profile/README.md menberedit → otp → changed）
// 狀態流程：資料修改（姓名／暱稱／信箱／手機）→ 點「確認」送出修改內容並發送 OTP
//          → 資料變更驗證（OTP）→ 驗證通過正式更新 → 變更完成（結果頁）→「返回」回個人資訊檢視
// 首頁暱稱、檢視頁資料每次進頁都重新 GET /me（pages/Home.tsx、./useMe.ts），沒有前端快取需要同步。
//
// TODO(#12)：以下皆為設計未定、先依稿／推測實作——
// - OTP 寄送對象（簡訊／信箱？改了手機或信箱時寄新的還是舊的？）未定；前端只送修改內容，由後端決定寄送對象
// - 「確認」依稿在未修改任何欄位時即可點；是否改成有變更才可點待確認
// - mob menberedited 底部只剩「返回」，推測為稿件遺漏，與 menberedit 一致用「返回＋確認」
// - 「取消／返回」直接回檢視頁並捨棄修改，不跳「確定放棄修改？」
// - 欄位驗證規則與錯誤文案未定義：姓名必填、暱稱選填（註冊時可不填）、信箱格式、手機 09 開頭 10 碼
// - 驗證頁按「取消／返回」回資料修改並保留已修改內容；重新確認會再發送一次 OTP

type Step = 'edit' | 'otp' | 'done'
type FieldName = keyof ProfileChangeRequest

const FIELD_NAMES: FieldName[] = ['name', 'nickname', 'email', 'phone']

// TODO(#12)：錯誤文案設計未定
const MESSAGES = {
  nameRequired: '請輸入姓名',
  emailRequired: '請輸入信箱',
  emailFormat: '信箱格式錯誤',
  phoneRequired: '請輸入手機',
  phoneFormat: '手機格式錯誤，請輸入 09 開頭共 10 碼',
  alreadyRegistered: '此信箱或手機已被其他帳號使用',
  failedTitle: '變更失敗',
  failedContent: '發生錯誤，請稍後再試',
  loadFailedTitle: '資料載入失敗',
  loadFailedContent: '請稍後再試',
  reload: '重新載入',
} as const

const RULES: Record<FieldName, Rule[]> = {
  name: [requiredRule(MESSAGES.nameRequired)],
  nickname: [],
  email: emailRules({ required: MESSAGES.emailRequired, format: MESSAGES.emailFormat }),
  phone: phoneRules({ required: MESSAGES.phoneRequired, format: MESSAGES.phoneFormat }),
}

const toDraft = (me: Me): ProfileChangeRequest => ({
  name: me.name,
  nickname: me.nickname,
  email: me.email,
  phone: me.phone,
})

const trimValues = (values: ProfileChangeRequest): ProfileChangeRequest => ({
  name: values.name.trim(),
  nickname: (values.nickname ?? '').trim(),
  email: values.email.trim(),
  phone: values.phone.trim(),
})

interface EditStepProps {
  initialValues: ProfileChangeRequest
  otp: OtpSender<ProfileChangeRequest>
  notify: (options: NotifyOptions) => Promise<boolean>
  onCancel: () => void
  /** OTP 發送成功，帶回本次送出的修改內容 */
  onSent: (values: ProfileChangeRequest) => void
}

/** 資料修改（menberedit／menberedited）：卡片式表單，label gray1、右側輸入框帶入現值 */
function EditStep({ initialValues, otp, notify, onCancel, onSent }: EditStepProps) {
  const [form] = Form.useForm<ProfileChangeRequest>()
  const isDesktop = !!Grid.useBreakpoint().lg

  const handleFinish = async (values: ProfileChangeRequest) => {
    const body = trimValues(values)
    try {
      await otp.send(body)
      onSent(body)
    } catch (error) {
      if (isApiError(error, 'UNAUTHORIZED')) return // client 已統一導回登入頁
      if (applyServerFieldErrors(form, error, FIELD_NAMES).length > 0) return
      void notify({
        title: MESSAGES.failedTitle,
        content: isApiError(error, 'ALREADY_REGISTERED')
          ? MESSAGES.alreadyRegistered
          : (getOtpErrorMessage(error) ?? getApiErrorMessage(error, MESSAGES.failedContent)),
      })
    }
  }

  return (
    <AppForm<ProfileChangeRequest>
      form={form}
      className={styles.form}
      requiredMark={false}
      validateTrigger="onBlur"
      initialValues={initialValues}
      {...formCardLayout}
      onFinish={handleFinish}
    >
      {/* web 修改頁依稿仍顯示「編輯資料」，mob 不顯示 */}
      <ProfileHeader showEdit={isDesktop} editing />
      <FormCard className={styles.card}>
        <FormCardItem name="name" label="姓名" rules={RULES.name}>
          <TextInput autoComplete="name" />
        </FormCardItem>
        <FormCardItem name="nickname" label="暱稱" rules={RULES.nickname}>
          <TextInput autoComplete="nickname" />
        </FormCardItem>
        <FormCardItem name="email" label="信箱" rules={RULES.email}>
          <TextInput type="email" inputMode="email" autoComplete="email" />
        </FormCardItem>
        <FormCardItem name="phone" label="手機" rules={RULES.phone}>
          <TextInput type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} />
        </FormCardItem>
      </FormCard>
      <ActionBar bleed onCancel={onCancel} confirmHtmlType="submit" confirmLoading={otp.sending} />
    </AppForm>
  )
}

export default function ProfileEdit() {
  const navigate = useNavigate()
  const location = useLocation()
  const fromProfile = !!(location.state as ProfileEditLocationState | null)?.fromProfile
  const { me, loadState, reload } = useMe()
  const [step, setStep] = useState<Step>('edit')
  const [draft, setDraft] = useState<ProfileChangeRequest | null>(null)
  const { notify, contextHolder } = useNotifyModal()

  const otp = useOtpSender(sendProfileChangeOtp, {
    onResendError: (error) => {
      if (isApiError(error, 'UNAUTHORIZED')) return
      void notify({ title: MESSAGES.failedTitle, content: getOtpErrorMessage(error) ?? MESSAGES.failedContent })
    },
  })

  // 從檢視頁點「編輯資料」進來時回上一頁（檢視頁重新掛載會重抓資料）；直接開啟網址時換成檢視頁
  const backToProfile = () => {
    if (fromProfile) navigate(-1)
    else navigate(PATHS.profile, { replace: true })
  }

  const handleSent = (values: ProfileChangeRequest) => {
    setDraft(values)
    setStep('otp')
  }

  const handleOtpCancel = () => {
    otp.reset()
    setStep('edit')
  }

  if (step === 'done') return <ResultPage title="變更完成！" onBack={backToProfile} />

  let content
  if (step === 'otp') {
    content = <ProfileOtpStep otp={otp} notify={notify} onCancel={handleOtpCancel} onVerified={() => setStep('done')} />
  } else if (loadState === 'ready' && me) {
    content = (
      <EditStep
        initialValues={draft ?? toDraft(me)}
        otp={otp}
        notify={notify}
        onCancel={backToProfile}
        onSent={handleSent}
      />
    )
  } else {
    content = (
      <>
        <ProfileHeader />
        <FormCard className={styles.card} aria-busy={loadState === 'loading'}>
          {loadState === 'error' ? (
            <Result
              icon={<Icon name="exclamation-circle" className={styles.errorIcon} />}
              title={MESSAGES.loadFailedTitle}
              subTitle={MESSAGES.loadFailedContent}
              extra={
                <Button variant="secondary" onClick={reload}>
                  {MESSAGES.reload}
                </Button>
              }
            />
          ) : (
            <Skeleton active title={false} paragraph={{ rows: 4 }} className={styles.skeleton} />
          )}
        </FormCard>
        <ActionBar bleed onCancel={backToProfile} confirmDisabled />
      </>
    )
  }

  return (
    <div className={styles.page}>
      {contextHolder}
      {content}
    </div>
  )
}
