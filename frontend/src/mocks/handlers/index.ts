import { authHandlers } from './auth'
import { memberHandlers } from './member'
import { optionsHandlers } from './options'
import { passwordHandlers } from './password'
import { receiptHandlers } from './receipt'
import { registerHandlers } from './register'
import { registrationHandlers } from './registration'
import { reviewHandlers } from './review'

export const handlers = [
  ...authHandlers,
  ...registerHandlers,
  ...registrationHandlers,
  ...passwordHandlers,
  ...memberHandlers,
  ...optionsHandlers,
  ...receiptHandlers,
  ...reviewHandlers,
]
