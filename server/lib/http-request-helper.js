export function getDefaultRequestHeaders(headers = {}) {
    const userAgent = `${process.env.PUBLIC_HOSTNAME} (${process.env.VERCEL_ENV || process.env.NODE_ENV || "development"})`
    if (!headers instanceof Object) {
        headers = {}
    }
    if (!headers.hasOwnProperty('headers')) {
        headers.headers = {}
    }
    headers.headers['User-Agent'] = userAgent
    return headers
}
