import { Flex, Skeleton, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { getPrivacyStatement } from '../../api/register'
import type { PrivacyStatement } from '../../api/types'
import { Button } from '../../components/Button'
import { ScrollAgreement } from '../../components/ScrollAgreement'
import { useGuestLayout } from '../../layouts/guestLayoutContext'
import { PATHS } from '../../routes/paths'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import styles from './RegisterPrivacy.module.css'
import { getRegisterFlow, type RegisterFlowKind, updateRegisterFlow } from './registerFlow'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; statement: PrivacyStatement }

/**
 * 註冊：個資保護聲明（docs/design/register/README.md「個資保護聲明」）。
 * 內文要捲到底才能勾選「本人同意個資保護之聲明」，勾選後「確認」才可按。
 * 稿上沒有「返回」連結（web／mob 皆無）。
 *
 * 同意結果與聲明版本寫入註冊流程暫存（registerFlow），下一步「會員資料輸入」送出時帶回。
 * TODO(#12)：本機註冊還沒有步驟守衛（未完成 OTP 驗證就直接進入此頁）；會員資料頁會檢查 registerToken 並導回起點。
 *
 * flow = 'apply'：Logto 模式第一次登入填寫會員資料（#48）的第二步，沒填出生日期就進來時導回第一步。
 */
export default function RegisterPrivacy({ flow = 'register' }: { flow?: RegisterFlowKind }) {
  useGuestLayout('card')
  const navigate = useNavigate()
  const [hasBasic] = useState(() => !!getRegisterFlow(flow).birthDate)
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

  if (flow === 'apply' && !hasBasic) return <Navigate to={PATHS.apply} replace />

  const handleConfirm = () => {
    if (state.status !== 'ready' || !agreed) return
    updateRegisterFlow({ agreedToPrivacy: true, privacyVersion: state.statement.version }, flow)
    navigate(flow === 'apply' ? PATHS.applyProfile : PATHS.registerProfile)
  }

  return (
    <Flex vertical className={styles.page}>
      <h1 className={cx(typography.headline5, styles.title)}>個資保護聲明</h1>

      <ScrollAgreement
        regionLabel="個資保護聲明內容"
        ready={state.status === 'ready'}
        checked={agreed}
        onChange={setAgreed}
        label={
          <>
            {/* 已確認（#12） S1：「個資保護」不是連結，取消稿上的底線 */}
            本人同意個資保護之聲明
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
