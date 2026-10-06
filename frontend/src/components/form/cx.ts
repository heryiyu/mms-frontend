// 合併 className（略過 falsy 值）
export const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ')
