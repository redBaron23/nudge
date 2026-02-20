import Anthropic from '@anthropic-ai/sdk'
import { ENV } from '../config/constants.js'

export const anthropic = new Anthropic({
  apiKey: ENV.ANTHROPIC_API_KEY,
})
