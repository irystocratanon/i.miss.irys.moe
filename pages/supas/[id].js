export default function Home(props) {}

Home.getInitialProps = async function ({ req, res, query }) {
    if (!res || !query || !query?.id || query?.id.endsWith('.html') === false) {
        res.writeHead(404);
        res.end()
    }
    if (res) {
        try {
            let supaReqHeaders = {}
            const modified_since = req.headers['if-modified-since']
            if (modified_since) {
                supaReqHeaders['If-Modified-Since'] = modified_since
            }
            const supaReq = await fetch(`${process.env.SUPAS_ENDPOINT}/${query.id}`, {headers: supaReqHeaders})

            if (supaReq.status === 304) {
                res.writeHead(304);
                return res.end();
            }

            let last_modified = supaReq.headers.get('Last-Modified')
            last_modified = (last_modified) ? last_modified : (new Date(Date.now()).toUTCString())
            res.writeHead(supaReq.status, {
                "Cache-Control": "public, max-age=10, must-revalidate",
                "Content-Type": "text/html",
                "Last-Modified": last_modified
            });
            res.end(await supaReq.text());
        } catch (err) {
            console.error(err)
            res.writeHead(500);
            res.end();
        }
    }
}
