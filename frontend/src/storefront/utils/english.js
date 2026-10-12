// Localize system messages only; product codes and customer-entered data are unchanged.
export function englishErrorMessage(message, status = 0, path = '') {
  const text = typeof message === 'string' ? message.trim() : ''
  if (text && !/[\u3400-\u9fff]/u.test(text)) return text
  if (status === 401) return path.split('?')[0] === '/api/auth/store/login'
    ? 'Invalid account or password.' : 'Your session has expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status === 404) return 'The requested item could not be found.'
  if (status === 409) return 'This data has changed. Please refresh and try again.'
  if (status >= 500) return 'The service is temporarily unavailable. Please try again later.'
  if (status === 400) return 'Please check your input and try again.'
  return 'The request could not be completed. Please try again.'
}
