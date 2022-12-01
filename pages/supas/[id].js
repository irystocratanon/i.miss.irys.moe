import performance from '../../server/lib/get-performance.js'

export default function Home(props) {}

Home.getInitialProps = async function ({ req, res, query }) {

    let reqT0 = performance.now()
    let reqT1 = Number(reqT0)

    if (res) {
        if (req.method != 'GET' && req.method != 'HEAD') {
            res.writeHead(400);
            return res.end()
        }
        if (!query || !query?.id || query?.id.endsWith('.html') === false) {
            res.writeHead(404);
            return res.end()
        }
        if (process.env.hasOwnProperty('SUPAS_MAINTENANCE_WINDOW')) {
            res.writeHead(503, { "Cache-Control": "public, max-age=0, must-revalidate"});
            return res.end(`<html>
<head><title>503 Service Unavailable</title></head>
<body>
<center><h1>503 Service Unavailable</h1></center>
<hr><center>maintenance in progress</center>
</body>
</html>`);
        }
        try {
            let supaReqHeaders = {
                "Accept-Encoding": "gzip, deflate, br"
            }
            const modified_since = req.headers['if-modified-since']
            if (modified_since) {
                supaReqHeaders['If-Modified-Since'] = modified_since
            }
            const none_match = req.headers['if-none-match']
            if (none_match) {
                supaReqHeaders['If-None-Match'] = none_match
            }
            const supaReq = await fetch(`${process.env.SUPAS_ENDPOINT}/${query.id}`, {method: req.method, headers: supaReqHeaders})
            reqT1 = performance.now()

            let etag = supaReq.headers.get('ETag')
            let last_modified = supaReq.headers.get('Last-Modified')
            last_modified = (last_modified) ? last_modified : (new Date(Date.now()).toUTCString())

            let resHeaders = {}
            if (etag) { resHeaders["ETag"] = etag }
            resHeaders["Last-Modified"] = last_modified

            let cache_control = supaReq.headers.get('Cache-Control')
            cache_control = (cache_control && cache_control.indexOf('immutable') > -1 && supaReq.status === 200) ? cache_control : "public, max-age=1, s-maxage=4, stale-if-error=59, stale-while-revalidate=10"

            let supas_items = supaReq.headers.get('X-Supas-Items')
            if (supas_items) {
                resHeaders['X-Supas-Items'] = supas_items
            }

            cache_control = (supaReq.status === 206 || supas_items === "0") ? "public, max-age=0, must-revalidate" : cache_control

            resHeaders["Cache-Control"] = cache_control

            if (supaReq.status === 304) {
                res.writeHead(304, resHeaders)
                return res.end();
            }

            resHeaders["Content-Type"] = "text/html"
            resHeaders["Server-Timing"] = `supas;dur=${reqT1-reqT0}`

            res.writeHead((supaReq.status === 206) ? 200 : supaReq.status, resHeaders);
            res.end(await supaReq.text());
        } catch (err) {
            console.error(err)
            res.writeHead(500);
            res.end();
        }
    }
}
