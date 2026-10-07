import { CHURCH_CONTACT_EMAIL, CHURCH_CONTACT_MAILTO } from '../constants/contact'

/** 教會聯絡信箱連結（「請聯繫XXXX」：登入帳號鎖定彈窗、等待審核、註冊等待核准中共用） */
export default function ContactEmailLink() {
  return <a href={CHURCH_CONTACT_MAILTO}>{CHURCH_CONTACT_EMAIL}</a>
}
