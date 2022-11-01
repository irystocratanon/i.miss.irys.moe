import performance from '../../server/lib/get-performance.js'

export default function Home(props) {}

Home.getInitialProps = async function ({ req, res, query }) {
    if (!res || !query || !query?.id || query?.id.endsWith('.html') === false) {
        res.writeHead(404);
        res.end()
    }

    let reqT0 = performance.now()
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
            reqT1 = performance.now()

            let etag = supaReq.headers.get('ETag')
            etag = (etag) ? etag : (+(new Date())).toString()

            if (supaReq.status === 304) {
                res.writeHead(304, {"ETag": etag});
                return res.end();
            }

            let cache_control = supaReq.headers.get('Cache-Control')

            let last_modified = supaReq.headers.get('Last-Modified')
            last_modified = (last_modified) ? last_modified : (new Date(Date.now()).toUTCString())
            cache_control = (cache_control && cache_control.indexOf('immutable') > -1 && supaReq.status === 200) ? cache_control : "public, max-age=10, stale-if-error=59, must-revalidate"
            res.writeHead(supaReq.status, {
                "Cache-Control": cache_control,
                "Content-Type": "text/html",
                "Last-Modified": last_modified,
                "ETag": etag,
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
