import { Form } from 'antd'
import { TextInput } from '../../components/form'
import { isMinor, type BirthDateInput } from '../../utils/age'

export interface GuardianNameFieldProps {
  /** 出生日期欄位的 name（同一個 Form 內），預設 birthDate */
  birthDateName?: string
  /** 監護人欄位的 name，預設 guardianName（與 RegisterOtpRequest 欄位同名） */
  name?: string
}

/**
 * 未成年判斷（docs/design/register/README.md「未成年判斷 ing」）：
 * 放在註冊第一步「出生」欄之後，出生日期一選定就判斷，未滿 18 歲時插入 placeholder「監護人名稱」的必填欄位。
 * 必須放在 <Form> 內；送出時 guardianName 一併帶給 sendRegisterOtp，並寫入 registerFlow。
 *
 * TODO(#15)：註冊第一步（出生／信箱／手機＋OTP）實作時放進表單。
 * TODO(#12)：監護人只有「名稱」一欄；是否需要手機／關係／同意，以及信箱與手機填本人或監護人，待確認。
 */
export default function GuardianNameField({ birthDateName = 'birthDate', name = 'guardianName' }: GuardianNameFieldProps) {
  const form = Form.useFormInstance()
  const birthDate = Form.useWatch(birthDateName, form) as BirthDateInput

  if (!isMinor(birthDate)) return null

  return (
    // TODO(#12)：錯誤文案設計未定
    <Form.Item name={name} rules={[{ required: true, whitespace: true, message: '請輸入監護人名稱' }]}>
      <TextInput placeholder="監護人名稱" autoComplete="off" />
    </Form.Item>
  )
}
