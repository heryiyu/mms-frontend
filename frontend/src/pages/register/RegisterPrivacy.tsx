import { Flex, Skeleton, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getPrivacyStatement } from '../../api/register'
import type { PrivacyStatement } from '../../api/types'
import { Button } from '../../components/Button'
import { ScrollAgreement } from '../../components/ScrollAgreement'
import { useGuestLayout } from '../../layouts/guestLayoutContext'
import { PATHS } from '../../routes/paths'
import styles from './RegisterPrivacy.module.css'

// TODO(#12)：「會員資料輸入」頁尚未實作，路徑暫定（PATHS.registerProfile）
const NEXT_PATH = PATHS.registerProfile

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; statement: PrivacyStatement }

/**
 * 註冊：個資保護聲明（docs/design/register/README.md「個資保護聲明」）。
 * 內文要捲到底才能勾選「本人同意個資保護之聲明」，勾選後「確認」才可按。
 * 稿上沒有「返回」連結（web／mob 皆無）。
 *
 * TODO(#12)：註冊流程狀態（registerToken、同意版本）尚無共用 store，暫以 router state 帶到下一步；
 *            也還沒有步驟守衛（未完成 OTP 驗證就直接進入此頁）。
 */
export default function RegisterPrivacy() {
  useGuestLayout('card')
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPrivacyStatement()
      .then((statement) => !cancelled && setState({ status: 'ready', statement }))
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = () => {
    setState({ status: 'loading' })
    setReloadKey((k) => k + 1)
  }

  const handleConfirm = () => {
    if (state.status !== 'ready' || !agreed) return
    navigate(NEXT_PATH, { state: { agreedToPrivacy: true, privacyVersion: state.statement.version } })
  }

  return (
    <Flex vertical className={styles.page}>
      <h1 className={styles.title}>個資保護聲明</h1>

      <ScrollAgreement
        regionLabel="個資保護聲明內容"
        ready={state.status === 'ready'}
        checked={agreed}
        onChange={setAgreed}
        label={
          <>
            {/* TODO(#12)：稿上「個資保護」有底線，是否為連結（開啟完整條款）待確認 */}
            本人同意<span className={styles.underline}>個資保護</span>之聲明
          </>
        }
      >
        {state.status === 'loading' && <Skeleton active title={false} paragraph={{ rows: 6 }} />}
        {state.status === 'error' && (
          <Flex vertical align="center" justify="center" gap="small" className={styles.error}>
            <Typography.Text type="secondary">聲明內容載入失敗，請稍後再試</Typography.Text>
            <Button variant="text" onClick={reload}>
              重新載入
            </Button>
          </Flex>
        )}
        {state.status === 'ready' && state.statement.content}
      </ScrollAgreement>

      <Button block disabled={!agreed || state.status !== 'ready'} onClick={handleConfirm}>
        確認
      </Button>
    </Flex>
  )
}
