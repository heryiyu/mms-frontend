import { colors, fontFamily, layout, radius, shadows, typography } from './tokens'

// 把 tokens.ts 轉成 :root CSS 變數，給 CSS Modules 使用（例：var(--color-gray2)、var(--font-size-body2)）
// 命名：--color-*、--font-size-*／--line-height-*／--letter-spacing-*、--shadow-*、--radius-*、--layout-*

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/(\D)(\d)/g, '$1-$2')

function buildVars(): Record<string, string> {
  const vars: Record<string, string> = { '--font-family': fontFamily }
  for (const [k, v] of Object.entries(colors)) vars[`--color-${kebab(k)}`] = v
  for (const [k, v] of Object.entries(typography)) {
    const name = kebab(k)
    vars[`--font-size-${name}`] = `${v.fontSize}px`
    vars[`--line-height-${name}`] = String(v.lineHeight)
    vars[`--letter-spacing-${name}`] = `${v.letterSpacing}px`
  }
  for (const [k, v] of Object.entries(shadows)) vars[`--${kebab(k)}`] = v
  for (const [k, v] of Object.entries(radius)) vars[`--radius-${k}`] = `${v}px`
  for (const [k, v] of Object.entries(layout)) vars[`--layout-${kebab(k)}`] = `${v}px`
  return vars
}

export function applyDesignCssVars() {
  if (typeof document === 'undefined') return
  const id = 'design-tokens'
  const el = document.getElementById(id) ?? document.head.appendChild(document.createElement('style'))
  el.id = id
  const body = Object.entries(buildVars())
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')
  el.textContent = `:root {\n${body}\n}`
}
