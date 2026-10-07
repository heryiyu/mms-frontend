import type { FormInstance } from 'antd'
import { getValidationFields } from '../../api/client'

/**
 * 把後端 VALIDATION_ERROR 的欄位錯誤顯示在對應欄位下方（只處理 names 列出的本頁欄位）。
 * 回傳有對應到的錯誤訊息（依 names 順序）；不是 VALIDATION_ERROR 或沒有對應欄位時回空陣列，由呼叫端改跳通知彈窗。
 */
export function applyServerFieldErrors(form: FormInstance, error: unknown, names: readonly string[]): string[] {
  const fields = getValidationFields(error)
  const matched = names.filter((name) => fields[name])
  if (matched.length > 0) form.setFields(matched.map((name) => ({ name, errors: [fields[name]] })))
  return matched.map((name) => fields[name])
}
