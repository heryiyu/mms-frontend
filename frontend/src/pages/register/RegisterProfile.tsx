import { Form, Select } from 'antd'
import type { FormProps } from 'antd'
import type { Rule } from 'antd/es/form'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { isApiError } from '../../api/client'
import { getChurches, getDistricts, getEkks, getGroups, getJourneys } from '../../api/options'
import { submitRegister } from '../../api/register'
import type { Gender, Journey, JourneyOption, Option } from '../../api/types'
import ActionBar from '../../components/ActionBar'
import { AppForm, FormCard, FormCardItem, formCardLayout, PasswordInput, Radio, TextInput } from '../../components/form'
import Icon from '../../components/Icon'
import { useNotifyModal } from '../../components/NoticeModal'
import { getPasswordRuleError } from '../../constants/password'
import { useGuestLayout } from '../../layouts/guestLayoutContext'
import { PATHS } from '../../routes/paths'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import { hasInAppHistory } from '../../utils/history'
import { clearRegisterFlow, getRegisterFlow } from './registerFlow'
import styles from './RegisterProfile.module.css'

// 註冊：會員資料輸入（issue #17，docs/design/register/README.md「會員資料輸入」「會員資料輸入中」）
// 全寬表單（GuestLayout full 變體）＋底部固定操作列；選了教會後才展開牧區／小組／EKK（連動下拉）。
// 送出成功 → 等待核准中（PATHS.registerDone）。
//
// TODO(#12)：以下皆為設計未定、先依推測實作——
// - 「確認」啟用時機：web 稿填完仍是停用、mob 稿已啟用，以 mob 為準（必填皆有值即可按）
// - 教會 placeholder 稿上寫「牧區」，疑誤植，改為「請選擇教會」；牧區／小組／EKK 的 placeholder 稿上未畫
// - EKK 依哪個欄位連動未說明，暫依小組（api/options.ts getEkks）；選項資料來源待後端確認
// - 靈程預設值：稿上空白表單即選 XN，暫照稿預設 XN；性別照稿預設男
// - 身分證字號格式、密碼規則、各錯誤文案未定；錯誤除欄位下方提示外也跳通知彈窗（設計註記「輸入錯誤需跳pop提醒」）

interface ProfileValues {
  name: string
  nickname?: string
  gender: Gender
  idNumber: string
  password: string
  confirmPassword: string
  churchId?: string
  districtId?: string
  groupId?: string
  ekkId?: string
  journey: Journey
}

type FieldName = keyof ProfileValues

const REQUIRED_FIELDS: FieldName[] = [
  'name',
  'gender',
  'idNumber',
  'password',
  'confirmPassword',
  'churchId',
  'districtId',
  'groupId',
  'ekkId',
  'journey',
]

const INITIAL_VALUES: Partial<ProfileValues> = { gender: 'male', journey: 'XN' }

// 上層欄位變更時要清空的下層欄位（教會 → 牧區 → 小組 → EKK）
const CASCADE_RESET: Partial<Record<FieldName, FieldName[]>> = {
  churchId: ['districtId', 'groupId', 'ekkId'],
  districtId: ['groupId', 'ekkId'],
  groupId: ['ekkId'],
}

// TODO(#12)：錯誤文案設計未定
const MESSAGES = {
  invalidTitle: '資料有誤',
  idNumberFormat: '身份證字號格式錯誤',
  mismatch: '兩次輸入的密碼不一致',
  optionsFailed: '選項載入失敗，請稍後再試',
  tokenInvalidTitle: '驗證已失效',
  tokenInvalid: '手機驗證已逾時，請重新驗證',
  alreadyRegistered: '此身份證字號、電子信箱或手機已註冊',
  failedTitle: '註冊失敗',
  failedContent: '發生錯誤，請稍後再試',
} as const

// 身分證（1、2 開頭）與新式居留證（8、9 開頭）；TODO(#12)：是否需檢查碼、是否接受舊式居留證待確認
const ID_NUMBER_PATTERN = /^[A-Z][1289]\d{8}$/i

const required = (message: string): Rule => ({ required: true, whitespace: true, message })

const passwordRules: Rule[] = [
  required('請輸入密碼'),
  {
    validator(_, value?: string) {
      const error = value ? getPasswordRuleError(value) : undefined
      return error ? Promise.reject(new Error(error)) : Promise.resolve()
    },
  },
]

const confirmPasswordRules: Rule[] = [
  required('請再次輸入密碼'),
  ({ getFieldValue }) => ({
    validator(_, value?: string) {
      if (!value || value === getFieldValue('password')) return Promise.resolve()
      return Promise.reject(new Error(MESSAGES.mismatch))
    },
  }),
]

const selectFieldNames = { label: 'name', value: 'id' }
const selectSuffix = <Icon name="chevron-down" className={styles.selectArrow} />

type Loaded<T> = { key: string; options: T[]; failed: boolean }

/**
 * 依上層 id 載入選項；parentId 為空時不載入。
 * 結果以 key 記錄對應的上層 id，切換上層時舊結果自動失效（不必在 effect 內同步 setState）。
 */
function useOptions<T>(load: (parentId: string) => Promise<T[]>, parentId: string | undefined) {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null)

  useEffect(() => {
    if (!parentId) return
    let cancelled = false
    load(parentId)
      .then((options) => !cancelled && setLoaded({ key: parentId, options, failed: false }))
      .catch(() => !cancelled && setLoaded({ key: parentId, options: [], failed: true }))
    return () => {
      cancelled = true
    }
  }, [load, parentId])

  const current = parentId && loaded?.key === parentId ? loaded : null
  return {
    options: current?.options ?? [],
    loading: !!parentId && !current,
    failed: !!current?.failed,
  }
}

// 教會、靈程不依賴上層，用固定 key 觸發一次載入
const ROOT = 'root'
const loadChurches = () => getChurches()
const loadJourneys = () => getJourneys()

export default function RegisterProfile() {
  useGuestLayout('full')
  const navigate = useNavigate()
  const [flow] = useState(getRegisterFlow)
  const [form] = Form.useForm<ProfileValues>()
  const values = Form.useWatch([], form) as Partial<ProfileValues> | undefined
  const [submitting, setSubmitting] = useState(false)
  const { notify, contextHolder } = useNotifyModal()

  const churches = useOptions<Option>(loadChurches, ROOT)
  const journeys = useOptions<JourneyOption>(loadJourneys, ROOT)
  const districts = useOptions<Option>(getDistricts, values?.churchId)
  const groups = useOptions<Option>(getGroups, values?.districtId)
  const ekks = useOptions<Option>(getEkks, values?.groupId)

  const optionsFailed = [churches, journeys, districts, groups, ekks].some((o) => o.failed)
  useEffect(() => {
    if (optionsFailed) void notify({ title: MESSAGES.failedTitle, content: MESSAGES.optionsFailed })
  }, [optionsFailed, notify])

  // TODO(#12)：前面步驟（#15 出生／信箱／手機＋OTP、個資聲明）未完成就直接進入此頁時，暫導回註冊起點
  const { registerToken, agreedToPrivacy, birthDate, email, phone } = flow
  if (!registerToken || !agreedToPrivacy || !birthDate || !email || !phone) {
    return <Navigate to={PATHS.register} replace />
  }

  const allFilled = REQUIRED_FIELDS.every((name) => {
    const value = values?.[name]
    return typeof value === 'string' ? value.trim() !== '' : value != null
  })

  // 有站內上一頁（個資聲明）就回上一頁，直接開啟此頁時回個資聲明
  const handleBack = () => {
    if (hasInAppHistory()) navigate(-1)
    else navigate(PATHS.registerPrivacy, { replace: true })
  }

  const handleValuesChange: FormProps<ProfileValues>['onValuesChange'] = (changed) => {
    const resetFields = Object.keys(changed).flatMap((name) => CASCADE_RESET[name as FieldName] ?? [])
    if (resetFields.length > 0) form.resetFields(resetFields)
  }

  const handleFinishFailed: FormProps<ProfileValues>['onFinishFailed'] = ({ errorFields }) => {
    const first = errorFields[0]?.errors[0]
    if (first) void notify({ title: MESSAGES.invalidTitle, content: first })
  }

  const handleFinish = async (v: ProfileValues) => {
    if (!v.churchId || !v.districtId || !v.groupId || !v.ekkId) return
    setSubmitting(true)
    try {
      await submitRegister({
        registerToken,
        lineToken: flow.lineToken,
        birthDate,
        email,
        phone,
        guardianName: flow.guardianName,
        name: v.name.trim(),
        nickname: v.nickname?.trim() || undefined,
        gender: v.gender,
        idNumber: v.idNumber.trim().toUpperCase(),
        password: v.password,
        churchId: v.churchId,
        districtId: v.districtId,
        groupId: v.groupId,
        ekkId: v.ekkId,
        journey: v.journey,
        agreedToPrivacy: true,
      })
      clearRegisterFlow()
      navigate(PATHS.registerDone, { replace: true })
    } catch (error) {
      if (isApiError(error, 'TOKEN_INVALID')) {
        await notify({ title: MESSAGES.tokenInvalidTitle, content: MESSAGES.tokenInvalid })
        clearRegisterFlow()
        navigate(PATHS.register, { replace: true })
        return
      }
      if (isApiError(error, 'ALREADY_REGISTERED')) {
        void notify({ title: MESSAGES.failedTitle, content: MESSAGES.alreadyRegistered })
        return
      }
      if (isApiError(error, 'VALIDATION_ERROR')) {
        const fields = (error.data as { fields?: Record<string, string> } | undefined)?.fields ?? {}
        const known = Object.keys(fields).filter((name): name is FieldName => REQUIRED_FIELDS.includes(name as FieldName))
        form.setFields(known.map((name) => ({ name, errors: [fields[name]] })))
        const first = known[0] ? fields[known[0]] : error.message
        void notify({ title: MESSAGES.invalidTitle, content: first })
        return
      }
      // 後端沒給 code（例如 5xx）時不顯示「API 502」這類技術訊息
      const known = isApiError(error) && error.code !== 'UNKNOWN'
      void notify({ title: MESSAGES.failedTitle, content: known ? error.message : MESSAGES.failedContent })
    } finally {
      setSubmitting(false)
    }
  }

  const hasChurch = !!values?.churchId

  return (
    <div className={styles.page}>
      {contextHolder}
      <AppForm<ProfileValues>
        form={form}
        initialValues={INITIAL_VALUES}
        validateTrigger="onBlur"
        {...formCardLayout}
        onValuesChange={handleValuesChange}
        onFinish={handleFinish}
        onFinishFailed={handleFinishFailed}
      >
        <h1 className={cx(typography.headline5, styles.title)}>會員資料</h1>
        <FormCard>
          <FormCardItem name="name" label="姓名" rules={[required('請輸入姓名')]}>
            <TextInput placeholder="請輸入姓名" autoComplete="name" maxLength={50} />
          </FormCardItem>
          <FormCardItem name="nickname" label="暱稱">
            <TextInput placeholder="請輸入暱稱" autoComplete="nickname" maxLength={50} />
          </FormCardItem>
          <FormCardItem name="gender" label="性別" rules={[{ required: true, message: '請選擇性別' }]}>
            <Radio.Group className={styles.radioGroup}>
              <Radio value="male">男</Radio>
              <Radio value="female">女</Radio>
            </Radio.Group>
          </FormCardItem>
          <FormCardItem
            name="idNumber"
            label="身份證字號"
            rules={[required('請輸入身份證字號'), { pattern: ID_NUMBER_PATTERN, message: MESSAGES.idNumberFormat }]}
          >
            <TextInput placeholder="請輸入身份證字號" autoComplete="off" maxLength={10} />
          </FormCardItem>
          <FormCardItem name="password" label="密碼" rules={passwordRules}>
            {/* 稿上空白時沒有眼睛圖示，有值後才出現 */}
            <PasswordInput placeholder="請輸入密碼" autoComplete="new-password" visibilityToggle={!!values?.password} />
          </FormCardItem>
          <FormCardItem
            name="confirmPassword"
            label="確認密碼"
            dependencies={['password']}
            rules={confirmPasswordRules}
          >
            <PasswordInput
              placeholder="再次輸入密碼"
              autoComplete="new-password"
              visibilityToggle={!!values?.confirmPassword}
            />
          </FormCardItem>
          <FormCardItem
            name="churchId"
            label="教會"
            rules={[{ required: true, message: '請選擇教會' }]}
            validateTrigger="onChange"
          >
            <Select
              placeholder="請選擇教會"
              options={churches.options}
              fieldNames={selectFieldNames}
              loading={churches.loading}
              suffixIcon={selectSuffix}
            />
          </FormCardItem>
          {hasChurch && (
            <>
              <FormCardItem
                name="districtId"
                label="牧區"
                rules={[{ required: true, message: '請選擇牧區' }]}
                validateTrigger="onChange"
              >
                <Select
                  placeholder="請選擇牧區"
                  options={districts.options}
                  fieldNames={selectFieldNames}
                  loading={districts.loading}
                  suffixIcon={selectSuffix}
                />
              </FormCardItem>
              <FormCardItem
                name="groupId"
                label="小組"
                rules={[{ required: true, message: '請選擇小組' }]}
                validateTrigger="onChange"
              >
                <Select
                  placeholder="請選擇小組"
                  options={groups.options}
                  fieldNames={selectFieldNames}
                  loading={groups.loading}
                  disabled={!values?.districtId}
                  suffixIcon={selectSuffix}
                />
              </FormCardItem>
              <FormCardItem
                name="ekkId"
                label="EKK"
                rules={[{ required: true, message: '請選擇 EKK' }]}
                validateTrigger="onChange"
              >
                <Select
                  placeholder="請選擇 EKK"
                  options={ekks.options}
                  fieldNames={selectFieldNames}
                  loading={ekks.loading}
                  disabled={!values?.groupId}
                  suffixIcon={selectSuffix}
                />
              </FormCardItem>
            </>
          )}
          <FormCardItem name="journey" label="靈程" rules={[{ required: true, message: '請選擇靈程' }]}>
            <Radio.Group className={styles.radioGroup}>
              {journeys.options.map((j) => (
                <Radio key={j.id} value={j.id}>
                  {j.name}
                </Radio>
              ))}
            </Radio.Group>
          </FormCardItem>
        </FormCard>
        <ActionBar
          fixed
          cancelText="返回"
          onCancel={handleBack}
          confirmHtmlType="submit"
          confirmDisabled={!allFilled}
          confirmLoading={submitting}
        />
      </AppForm>
    </div>
  )
}
