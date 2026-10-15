// API 的 request / response 型別與錯誤碼。
// 依各功能 docs/design/*/README.md 的「需要的 API（推測，後端未定）」整理；完整契約見 backend/README.md。
// 後端定案後若欄位有異動，只需要改這個檔案與 src/api/*.ts。

/* ---------- 共用 ---------- */

/** leader = 區長以上（可使用會員審核）；member = 一般會員 */
export type Role = 'member' | 'leader'
/**
 * 帳號狀態：ACTIVE = 已核准可使用會員中心；PENDING = 等待審核（不可進入會員中心）；
 * UNREGISTERED = 已有 SSO 帳號但還沒填會員資料；REJECTED = 申請被退回（可修改後重新送出）。
 * 本機模式：待審核帳號登入會直接回 ACCOUNT_PENDING，所以登入成功時一律為 ACTIVE。
 * Logto 模式：已通過 SSO 登入的人 /auth/session 一律回 200，由路由守衛依狀態導到等待審核頁或會員資料填寫流程（#48）。
 */
export type AccountStatus = 'ACTIVE' | 'PENDING' | 'UNREGISTERED' | 'REJECTED'
export type Gender = 'male' | 'female'
/** 靈程 */
export type Journey = 'NF' | 'VIP' | 'XN'

/** 下拉選項（教會／牧區／小組／EKK），id 為後端識別碼、name 為顯示文字 */
export interface Option {
  id: string
  name: string
}

export interface JourneyOption {
  id: Journey
  name: string
}

/** 所有「發送 OTP」API 的回應：expiresIn 為有效秒數（倒數用，預設 300），length 為驗證碼位數（預設 4） */
export interface OtpSendResponse {
  expiresIn: number
  length: number
}

/* ---------- 錯誤 ---------- */

/**
 * 後端錯誤碼，放在非 2xx 回應 body 的 `code`。
 * 401 只保留給「token 缺少／過期／無效」（UNAUTHORIZED），登入帳密錯誤不會回 401，
 * 這樣 client 才能放心地「401 → 導回登入頁」。
 */
export type ErrorCode =
  // 登入
  | 'ACCOUNT_NOT_FOUND' // 查無此帳號
  | 'WRONG_PASSWORD' // 密碼輸入錯誤
  | 'TOO_MANY_ATTEMPTS' // 登入／發送 OTP 過度頻繁，請稍後再試
  | 'ACCOUNT_LOCKED' // 帳號已鎖定，需聯繫教會
  | 'ACCOUNT_PENDING' // 帳號尚未核准（等待審核頁）
  | 'ACCOUNT_REJECTED' // 申請被退回（設計未畫，推測）
  // OTP／驗證
  | 'OTP_INVALID' // 驗證碼錯誤
  | 'OTP_EXPIRED' // 驗證碼逾時
  | 'TOKEN_INVALID' // registerToken／resetToken 無效或已過期
  | 'EMAIL_PHONE_MISMATCH' // 信箱與手機不屬於同一帳號／與會員資料不符
  // 註冊／會員
  | 'ALREADY_REGISTERED' // 信箱、手機或身分證字號已被註冊
  | 'CONTACT_IN_USE' // 個人資訊修改：新的 email／手機已被其他 SSO 帳號使用，fields 指出哪一欄（#49）
  // 密碼
  | 'WRONG_CURRENT_PASSWORD' // 目前密碼錯誤
  | 'PASSWORD_SAME_AS_OLD' // 新密碼不可與舊密碼相同
  | 'PASSWORD_NOT_SET' // 帳號沒有密碼（只用 Line／Google 登入），不能修改密碼（#49）
  // 收據
  | 'NO_RECORDS' // 該年度無奉獻紀錄
  // 審核
  | 'MEMBER_NOT_FOUND' // 查無此申請
  | 'ALREADY_PROCESSED' // 此申請已被審核／退回；會員資料申請已送出過（#48）
  // 通用
  | 'VALIDATION_ERROR' // 欄位格式錯誤，body 可帶 fields
  | 'FORBIDDEN' // 已登入但沒有權限（例如一般會員打會員審核）
  | 'UNAUTHORIZED' // 未登入或 token 過期
  | 'NETWORK_ERROR' // 前端產生：連不到後端（status = 0）
  | 'UNKNOWN' // 後端沒給 code 且無法由 status 判斷

/** 非 2xx 回應的 body 格式 */
export interface ApiErrorBody {
  code: ErrorCode
  message: string
  /** VALIDATION_ERROR 時，欄位名稱 → 錯誤訊息 */
  fields?: Record<string, string>
}

/* ---------- 登入（auth.ts） ---------- */

/**
 * GET /auth/session（Logto 模式，#44）：以 Logto access token 取得會員中心的角色與帳號狀態。
 * 已通過 SSO 驗證的人一律回 200（#48）：待審核 PENDING、被退回 REJECTED、尚未填會員資料 UNREGISTERED，
 * 由前端守衛導到對應頁面。只有帳號已鎖定回 423 ACCOUNT_LOCKED。
 */
export interface AuthSessionResponse {
  role: Role
  status: AccountStatus
}

/** 以下登入、Line OAuth 為本機模式（未設定 Logto）使用；Logto 模式由 Logto 登入頁處理 */
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  role: Role
  status: AccountStatus
}

export type LineAuthPurpose = 'login' | 'register'

export interface LineAuthUrlResponse {
  /** Line OAuth 授權網址，前端直接 location.href 導過去 */
  url: string
}

export interface LineCallbackRequest {
  code: string
  state: string
}

export type LineCallbackResponse =
  | { status: 'LOGGED_IN'; token: string; role: Role; accountStatus: AccountStatus }
  /** Line 帳號尚未綁定／建立：帶 lineToken 接回一般創建流程（接回哪一步設計待確認） */
  | { status: 'REGISTER_REQUIRED'; lineToken: string }

/* ---------- 註冊與進度查詢（register.ts） ---------- */

export interface RegisterOtpRequest {
  /** YYYY-MM-DD */
  birthDate: string
  email: string
  phone: string
  /** 未滿 18 歲時必填 */
  guardianName?: string
}

export interface RegisterOtpVerifyRequest {
  email: string
  phone: string
  otp: string
}

export interface RegisterOtpVerifyResponse {
  /** OTP 驗證通過的憑證，送出註冊時帶回 */
  registerToken: string
}

export interface PrivacyStatement {
  title: string
  content: string
  version: string
}

export interface RegisterRequest {
  registerToken: string
  /** Line 創建流程帶入（暫定） */
  lineToken?: string
  birthDate: string
  email: string
  phone: string
  guardianName?: string
  name: string
  nickname?: string
  gender: Gender
  /** 身分證字號（明碼，僅註冊送出時使用） */
  idNumber: string
  password: string
  churchId: string
  districtId: string
  groupId: string
  ekkId: string
  journey: Journey
  /** 是否同意個資保護聲明，一律 true */
  agreedToPrivacy: boolean
}

export interface RegisterResponse {
  id: string
  status: 'PENDING'
}

/* ---------- 會員資料申請（register.ts，Logto 模式，#48） ---------- */

/** SSO 帳號上的名字與已驗證的聯絡方式；沒有的欄位為 null（例：用 Line 註冊的人可能兩個都沒有） */
export interface SsoAccount {
  name: string | null
  email: string | null
  phone: string | null
}

/** 會員資料申請的內容（不含身分證字號）。被退回時後端帶回上次填的內容 */
export interface RegistrationDraft {
  /** YYYY-MM-DD */
  birthDate: string
  /** 未滿 18 歲時必填 */
  guardianName?: string
  name: string
  nickname?: string
  gender: Gender
  churchId: string
  districtId: string
  groupId: string
  ekkId: string
  journey: Journey
}

/** GET /me/registration：填寫會員資料前要知道的事 */
export interface RegistrationInfo {
  /** UNREGISTERED、REJECTED 才需要填寫；PENDING、ACTIVE 時前端改導到對應頁面 */
  status: AccountStatus
  account: SsoAccount
  /** 被退回時的退回原因 */
  rejectReason?: string
  /** 被退回時帶回上次填的內容（身分證字號不回傳，需重新輸入） */
  previous?: Partial<RegistrationDraft>
}

/** 補填聯絡方式：email、phone 擇一 */
export interface ContactOtpRequest {
  email?: string
  phone?: string
}

export interface ContactVerifyRequest extends ContactOtpRequest {
  otp: string
}

export interface RegistrationRequest extends RegistrationDraft {
  /** 身分證字號（明碼，僅送出時使用） */
  idNumber: string
  /** 是否同意個資保護聲明，一律 true */
  agreedToPrivacy: boolean
  /** 同意的個資保護聲明版本 */
  privacyVersion?: string
}

export interface RegistrationResponse {
  status: 'PENDING'
}

/** 進度查詢：申請時的 email 或手機擇一，先收驗證碼（#52，架構整理 D8） */
export type ProgressOtpRequest = { email: string; phone?: never } | { phone: string; email?: never }

export type ProgressQueryRequest = ProgressOtpRequest & { otp: string }

export type ProgressStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ProgressQueryResponse {
  status: ProgressStatus
  /** ISO 8601 */
  submittedAt: string
  reviewedAt?: string
  /** 退回原因（status 為 REJECTED 時） */
  rejectReason?: string
}

/* ---------- 密碼（password.ts） ---------- */

export interface ForgotPasswordOtpRequest {
  email: string
  phone: string
}

export interface ForgotPasswordVerifyRequest {
  email: string
  phone: string
  otp: string
}

export interface ForgotPasswordVerifyResponse {
  /** 一次性重設憑證 */
  resetToken: string
}

export interface ResetPasswordRequest {
  resetToken: string
  newPassword: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

/* ---------- 會員資料（member.ts） ---------- */

export interface Me {
  id: string
  name: string
  nickname: string
  gender: Gender
  /** 後端遮罩後回傳，例如 Q12*****89 */
  idNumber: string
  /** email、手機以 SSO 為準（#49），可能只有其中一個；沒有的為 null（至少會有一個，D5） */
  email: string | null
  phone: string | null
  /** 以下為顯示名稱 */
  church: string
  district: string
  group: string
  ekk: string
  journey: Journey
  role: Role
  /** SSO 帳號有沒有密碼（#49）：只用 Line／Google 登入的人為 false，不顯示「修改密碼」 */
  hasPassword: boolean
}

/**
 * 個人資訊只有這四欄可修改。驗證通過後由後端寫回 SSO（#49）。
 * email、phone 空字串 = 沒有（原本沒有就維持沒有、原本有就刪除）；兩個不能同時為空（D5）
 */
export interface ProfileChangeRequest {
  name: string
  nickname: string
  email: string
  phone: string
}

export interface ProfileChangeVerifyRequest {
  otp: string
}

/* ---------- 奉獻收據（receipt.ts） ---------- */

export interface ReceiptOtpRequest {
  email: string
  phone: string
  /** 設計未決定年度怎麼選，留空由後端決定 */
  year?: number
}

export interface ReceiptSendRequest extends ReceiptOtpRequest {
  otp: string
}

/* ---------- 會員審核（review.ts，區長以上） ---------- */

export interface PendingMember {
  id: string
  name: string
  nickname: string
  gender: Gender
  email: string
  phone: string
  church: string
  district: string
  group: string
  ekk: string
  journey: Journey
  /** ISO 8601 */
  submittedAt: string
}

export interface PendingCountResponse {
  count: number
}

export interface ApproveRequest {
  ids: string[]
}

/** 單筆退回：退回原因（#48 D10，必填，會顯示給申請者並附在退回通知） */
export interface RejectRequest {
  reason: string
}

export interface ApproveResponse {
  approved: number
  /** 沒能審核通過的 id（不存在或已處理） */
  failedIds: string[]
}
