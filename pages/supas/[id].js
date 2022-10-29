export default function Home(props) {}

Home.getInitialProps = async function ({ req, res, query }) {
    if (!res || !query || !query?.id || query?.id.endsWith('.html') === false) {
        res.writeHead(404);
        res.end()
    }

    let _performance
    if (typeof performance !== 'object') {
        try {
            _performance = require('perf_hooks')
            _performance = _performance.performance
        } catch (e) {
            _performance = {now: function(){}}
        }
    } else {
        _performance = performance
    }
    let reqT0 = _performance.now()
    let reqT1 = Number(reqT0)

    if (res) {
        try {
            let supaReqHeaders = {
                "Accept-Encoding": "gzip, deflate, br"
            }
            const modified_since = req.headers['if-modified-since']
            if (modified_since) {
                supaReqHeaders['If-Modified-Since'] = modified_since
            }
            const supaReq = await fetch(`${process.env.SUPAS_ENDPOINT}/${query.id}`, {headers: supaReqHeaders})
            reqT1 = _performance.now()

            if (supaReq.status === 304) {
                res.writeHead(304);
                return res.end();
            }

            let last_modified = supaReq.headers.get('Last-Modified')
            let etag = supaReq.headers.get('ETag')
            last_modified = (last_modified) ? last_modified : (new Date(Date.now()).toUTCString())
            res.writeHead(supaReq.status, {
                "Cache-Control": "public, max-age=10, must-revalidate",
                "Content-Type": "text/html",
                "Last-Modified": last_modified,
                "ETag": (etag) ? etag : (+(new Date())).toString(),
                "Server-Timing": `supas;dur=${reqT1-reqT0}`
            });
            res.end(await supaReq.text());
        } catch (err) {
            console.error(err)
            res.writeHead(500);
            res.end();
        }
    }
}
