interface Props {
  message: string
}

function friendlyMessage(raw: string): { title: string; detail: string } {
  if (raw.includes('401') || raw.includes('Unauthorized'))
    return { title: 'Authentication failed', detail: 'Your token may have expired. Disconnect and reconnect to refresh it.' }
  if (raw.includes('403') || raw.includes('Forbidden'))
    return { title: 'Access denied', detail: 'Your token does not have the required scope for this data. Check your Intigriti API configuration.' }
  if (raw.includes('429'))
    return { title: 'Rate limit reached', detail: 'Too many requests. The app will retry automatically in a few seconds.' }
  if (raw.includes('Network error') || raw.includes('Failed to fetch'))
    return { title: 'Network error', detail: 'Could not reach the Intigriti API. Check that the Vite dev server is running and the proxy is configured.' }
  return { title: 'Something went wrong', detail: raw }
}

export function ErrorPanel({ message }: Props) {
  const { title, detail } = friendlyMessage(message)
  return (
    <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-xl">
      <div className="font-semibold text-red-800 text-sm mb-1">{title}</div>
      <div className="text-xs text-red-600">{detail}</div>
    </div>
  )
}
