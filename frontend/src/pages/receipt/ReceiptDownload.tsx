import { Form, Result, Skeleton } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { getApiErrorMessage, isApiError } from '../../api/client'
import { sendReceipt, sendReceiptOtp } from '../../api/receipt'
import type { Me, OtpSentTo, ReceiptChannel, ReceiptOtpRequest, ReceiptSendResponse } from '../../api/types'
import { useMe } from '../../auth/useMe'
import ActionBar from '../../components/ActionBar'
import { Button } from '../../components/Button'
import { AppForm, FormCard, Radio } from '../../components/form'
import Icon from '../../components/Icon'
import { useNotifyModal } from '../../components/NoticeModal'
import { getOtpErrorMessage, OTP_MESSAGES, OtpField, otpRules, useOtpForm } from '../../components/OtpInput'
import ResultPage from '../../components/ResultPage'
import { PATHS } from '../../routes/paths'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import { hasInAppHistory } from '../../utils/history'
import { maskContact } from '../../utils/maskContact'
import { passwordHint } from './receiptMessages'
import styles from './ReceiptDownload.module.css'

// 奉獻收據下載（issue #26，docs/design/receipt/README.md；#50 改用會員已有的聯絡方式）
// 狀態流程：顯示會員已有的 email／手機（遮罩）→ 按「確認」發送 OTP 到選定的那一個
//   → OTP 驗證（驗證碼＋有效時間倒數）→ 按「確認」驗證並寄出 → 完成（結果頁）
// 收據不在網頁上直接下載：
// - email：寄加密 PDF 附件
// - 手機：簡訊寄會員中心下載頁網址（/receipt/download/:id，要登入、只有本人、1 小時內有效，見 ReceiptLinkDownload.tsx）
// PDF 密碼為身分證字號；沒有身分證字號的會員改用出生年月日 8 碼（後端在寄出結果帶 passwordRule）。
//
// #50（2026-10-15 決定）已解答原本的待確認：
// - 信箱／手機不再輸入，直接用會員已有的（GET /me，以 SSO 為準，可能只有其中一個）
// - 兩個都有 → 讓會員選（預設 email）；只有一個 → 直接用那一個；驗證碼寄到選定的那一個
// - 發送驗證碼後改選另一個 → 驗證碼列收起，需重新按「確認」發送
//
// TODO(#12)：以下皆為設計未定、先依推測實作——
// - 年度怎麼決定：稿中沒有年度欄位，API 不帶 year，由後端決定（mock 視為去年度）
// - 「選擇寄送方式」、只有一個聯絡方式時的顯示、「驗證碼已寄到…」、手機的完成頁、密碼規則說明：稿中沒有，照現有畫面風格做
// - email、手機都沒有（理論上不會發生，D5）：提示先到個人資訊新增
// - 錯誤狀態未出圖：API 錯誤（OTP 錯誤／逾時、無紀錄）用通知彈窗
// - 「取消／返回」與完成頁「返回」導向：取消回上一頁（無站內上一頁時回首頁），完成頁返回回首頁

interface OtpValues {
  otp: string
}

/** 會員已有的聯絡方式（前端遮罩，格式同後端回的 sentTo） */
type ContactOption = OtpSentTo

// TODO(#12)：文案設計未定（原稿只有「請輸入電子信箱，我們將寄送該年度的奉獻收據至此信箱。」）
const MESSAGES = {
  chooseChannel: '我們將寄送該年度的奉獻收據給您，請選擇寄送方式：',
  onlyEmail: '我們將寄送該年度的奉獻收據至您的電子信箱：',
  onlyPhone: '我們將以簡訊傳送該年度奉獻收據的下載連結至您的手機：',
  channelLabel: { email: '電子信箱', phone: '手機簡訊' },
  channelHint: { email: 'PDF 附件寄到信箱', phone: '簡訊傳送下載連結，1 小時內有效' },
  noContact: '您的帳號沒有電子信箱或手機，請先到個人資訊新增後再申請。',
  goProfile: '前往個人資訊',
  noticeTitle: '通知',
  noRecords: '查無該年度的奉獻紀錄',
  failed: '發生錯誤，請稍後再試',
  loadFailedTitle: '資料載入失敗',
  loadFailedContent: '請稍後再試',
  reload: '重新載入',
  emailDoneTitle: '奉獻收據已送出，請至信箱查收！',
  emailDone: (destination: string) => `已寄到 ${destination}。`,
  phoneDoneTitle: '下載連結已傳送到手機！',
  phoneDone: (destination: string) => `下載連結已傳送到手機 ${destination}，1 小時內有效。開啟連結並登入後即可下載。`,
} as const

const CHANNEL_ICONS: Record<ReceiptChannel, string> = { email: 'envelope', phone: 'phone' }

/** 會員已有的聯絡方式（email 在前，預設寄 email） */
function contactOptions(me: Me): ContactOption[] {
  const options: ContactOption[] = []
  if (me.email) options.push({ channel: 'email', destination: maskContact('email', me.email) })
  if (me.phone) options.push({ channel: 'phone', destination: maskContact('phone', me.phone) })
  return options
}

export default function ReceiptDownload() {
  const navigate = useNavigate()
  const { me, loadState, reload } = useMe()
  const [result, setResult] = useState<ReceiptSendResponse | null>(null)

  const goHome = () => navigate(PATHS.home, { replace: true })

  // 有站內上一頁就回上一頁，直接開啟此頁時回首頁
  const handleCancel = () => {
    if (hasInAppHistory()) navigate(-1)
    else goHome()
  }

  if (result) return <ReceiptSent result={result} onBack={goHome} />

  const options = me ? contactOptions(me) : []

  return (
    <div className={styles.page}>
      {loadState === 'ready' && options.length > 0 ? (
        <ReceiptForm key={me?.id} options={options} onCancel={handleCancel} onSent={setResult} />
      ) : (
        <>
          <div className={styles.body}>
            <h1 className={cx(typography.pageTitle, styles.title)}>奉獻收據下載</h1>
            <FormCard className={styles.card}>
              {loadState === 'loading' && (
                <Skeleton active title={false} paragraph={{ rows: 3 }} aria-busy="true" aria-label="載入中" />
              )}
              {loadState === 'error' && (
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
              )}
              {loadState === 'ready' && (
                <>
                  <p className={styles.description}>{MESSAGES.noContact}</p>
                  <Button variant="secondary" onClick={() => navigate(PATHS.profileEdit)}>
                    {MESSAGES.goProfile}
                  </Button>
                </>
              )}
            </FormCard>
          </div>
          <ActionBar bleed onCancel={handleCancel} confirmDisabled />
        </>
      )}
    </div>
  )
}

interface ReceiptFormProps {
  options: ContactOption[]
  onCancel: () => void
  onSent: (result: ReceiptSendResponse) => void
}

function ReceiptForm({ options, onCancel, onSent }: ReceiptFormProps) {
  const [form] = Form.useForm<OtpValues>()
  const [channel, setChannel] = useState<ReceiptChannel>(options[0].channel)
  const [sentTo, setSentTo] = useState<OtpSentTo | null>(null)
  const [verifying, setVerifying] = useState(false)
  const { notify, contextHolder } = useNotifyModal()

  const showError = (error: unknown) => {
    if (isApiError(error, 'UNAUTHORIZED')) return // client 已統一導回登入頁
    let content: string = getOtpErrorMessage(error) ?? MESSAGES.failed
    if (isApiError(error, 'NO_RECORDS')) content = MESSAGES.noRecords
    else if (isApiError(error, 'VALIDATION_ERROR')) content = getApiErrorMessage(error, MESSAGES.failed)
    void notify({ title: MESSAGES.noticeTitle, content })
  }

  // 發送（含重新發送）成功時記下後端回的遮罩目的地，顯示「驗證碼已寄到…」
  const otp = useOtpForm(
    form,
    async (body: ReceiptOtpRequest) => {
      const res = await sendReceiptOtp(body)
      setSentTo(res.sentTo)
      return res
    },
    { targetFields: [], onResendError: showError },
  )

  const selected = options.find((option) => option.channel === channel) ?? options[0]
  const canConfirm = otp.sent ? otp.otpFilled : true

  // 已發送後改選另一個：回到尚未發送，需重新按「確認」發送到新的那一個
  const handleChannelChange = (next: ReceiptChannel) => {
    setChannel(next)
    if (otp.sent) {
      otp.reset()
      otp.clearOtp()
      setSentTo(null)
    }
  }

  const handleSendOtp = async () => {
    try {
      await otp.send({ channel: selected.channel })
    } catch (error) {
      showError(error)
    }
  }

  const handleVerify = async (code: string) => {
    setVerifying(true)
    try {
      onSent(await sendReceipt({ channel: selected.channel, otp: code }))
    } catch (error) {
      if (isApiError(error, 'OTP_INVALID') || isApiError(error, 'OTP_EXPIRED')) otp.clearOtp()
      showError(error)
    } finally {
      setVerifying(false)
    }
  }

  const handleFinish = ({ otp: code }: OtpValues) => (otp.sent ? handleVerify(code) : handleSendOtp())

  return (
    <>
      {contextHolder}
      <AppForm<OtpValues>
        form={form}
        className={styles.form}
        requiredMark={false}
        initialValues={{ otp: '' }}
        onFinish={handleFinish}
      >
        <div className={styles.body}>
          <h1 className={cx(typography.pageTitle, styles.title)}>奉獻收據下載</h1>
          <FormCard className={styles.card}>
            {options.length > 1 ? (
              <>
                <p id="receipt-channel-label" className={styles.description}>
                  {MESSAGES.chooseChannel}
                </p>
                <Radio.Group
                  className={styles.options}
                  value={channel}
                  onChange={(e) => handleChannelChange(e.target.value as ReceiptChannel)}
                  aria-labelledby="receipt-channel-label"
                >
                  {options.map((option) => (
                    <Radio key={option.channel} value={option.channel} className={styles.option}>
                      <span className={styles.optionText}>
                        <span>
                          {MESSAGES.channelLabel[option.channel]}
                          <span className={styles.destination}>{option.destination}</span>
                        </span>
                        <span className={styles.optionHint}>{MESSAGES.channelHint[option.channel]}</span>
                      </span>
                    </Radio>
                  ))}
                </Radio.Group>
              </>
            ) : (
              <>
                <p className={styles.description}>
                  {selected.channel === 'email' ? MESSAGES.onlyEmail : MESSAGES.onlyPhone}
                </p>
                <p className={styles.contact}>
                  <Icon name={CHANNEL_ICONS[selected.channel]} className={styles.contactIcon} />
                  <span className={styles.destination}>{selected.destination}</span>
                </p>
              </>
            )}
            {otp.sent && (
              <>
                <p className={cx(styles.description, styles.sentHint)} role="status">
                  {OTP_MESSAGES.sentTo(sentTo ?? selected)}
                </p>
                <Form.Item<OtpValues>
                  name="otp"
                  rules={otpRules(otp.length)}
                  validateTrigger="onSubmit"
                  className={styles.field}
                >
                  <OtpField
                    length={otp.length}
                    expiresAt={otp.expiresAt}
                    onResend={otp.resend}
                    autoFocus
                    inputProps={{ 'aria-label': '驗證碼' }}
                  />
                </Form.Item>
              </>
            )}
          </FormCard>
        </div>
        <ActionBar
          bleed
          onCancel={onCancel}
          confirmHtmlType="submit"
          confirmDisabled={!canConfirm}
          confirmLoading={otp.sending || verifying}
        />
      </AppForm>
    </>
  )
}

/** 完成頁：email 照原稿；手機改說明下載連結與有效時間（TODO(#12) 稿中沒有） */
function ReceiptSent({ result, onBack }: { result: ReceiptSendResponse; onBack: () => void }) {
  const { sentTo, passwordRule } = result
  const isEmail = sentTo.channel === 'email'
  return (
    <ResultPage
      title={isEmail ? MESSAGES.emailDoneTitle : MESSAGES.phoneDoneTitle}
      description={
        <>
          {isEmail ? MESSAGES.emailDone(sentTo.destination) : MESSAGES.phoneDone(sentTo.destination)}
          <br />
          {passwordHint(passwordRule)}
        </>
      }
      onBack={onBack}
    />
  )
}
