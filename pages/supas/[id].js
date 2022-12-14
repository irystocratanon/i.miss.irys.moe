import { parse } from "node-html-parser"
import performance from '../../server/lib/get-performance.js'

export default function Home(props) {}

Home.getInitialProps = async function ({ req, res, query }) {

    let reqT0 = performance.now()
    let reqT1 = Number(reqT0)
    let cursor = 0

    if (res) {
        if (req.method != 'GET' && req.method != 'HEAD') {
            res.writeHead(400);
            return res.end()
        }
        if (!query || !query?.id || query?.id.endsWith('.html') === false) {
            res.writeHead(404);
            return res.end()
        }
        if (query?.cursor) {
            cursor = Number(query.cursor)
            cursor = (Number.isNaN(cursor)) ? 0 : cursor
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

            // size of uncompressed content
            let content_length = supaReq.headers.get("X-Content-Length");

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

            if (content_length && req.method === 'GET') {
                // Vercel limits single requests to 5MB payloads and some streams with a LOT of superchats can result in a payload larger than this e.g
                // https://i.miss.irys.moe/supas/n6yep2gl1HY.html
                // fixing this means we need to stream the body in batches
                // the first request will load as many rows as it possibly can within a budget of 4.75mb (this gives some headroom for the max of 5mb)
                if (Math.round(content_length / (1024*1024)) >= 5) {
                    const textContent = await supaReq.text();
                    let html = parse(textContent);

                    let rows = html.childNodes[1].childNodes[3].querySelectorAll('tr[data-num]');

                    let body = ''
                    if (cursor === 0) {
                        body += `<!doctype html>
<html>`;
                        // head
                        body += html.childNodes[1].childNodes[1].toString();
                        body += `<body class="m-0 sm:m-2">
<br/>`;
                        body += html.childNodes[1].childNodes[3].querySelector('table').toString();
                        body += html.childNodes[1].childNodes[3].querySelector('#control').toString();
                        body += `
<div class="bg-white min-w-[129vw] sm:min-w-[0]">
<div class="overflow-x-auto">
<progress id="main-table-progress" class="w-full" max="${rows.length}" value="1"></progress>
<table class="main-table table-auto w-full" border="1">
<script>document.currentScript.parentElement.style.visibility = 'collapse';Array.from(document.getElementById('control').getElementsByTagName('input')).forEach(el => { el.disabled = true; })</script>
<tbody>
<tr>
<th rowspan="2" class="w-[1em]">No</th>
<th rowspan="2" class="w-[1em]">時間<br><span class="text-sm"><noscript>JST</noscript><script>document.write(Intl.DateTimeFormat().resolvedOptions().timeZone)</script></span></th>
<th class="text-left w-[1em]">元金額</th>
<th class="invisible hidden sm:visible sm:table-cell w-[0.1%]" rowspan="2">色</th>
<th class="invisible hidden sm:visible sm:table-cell w-[0.5em]" rowspan="2">icon</th>
<th class="w-[1em]" rowspan="2">チャンネル名</th>
<th class="text-left min-w-[75%]" rowspan="2">チャット</th>
</tr>
<tr><th class="text-right">円建て</th></tr>`

                        // blocking style tags unfortunately need to come first to make sure we stay in size budget
                        let style = html.childNodes[1].childNodes[3].querySelectorAll('style');
                        for (let i = 0; i < style.length; i++) {
                            body += style[i].toString();
                        }
                    }

                    let loopRecords = true;

                    if (! rows[cursor]) {
                        loopRecords = false;
                    }

                    let i = (cursor == -1) ? 0 : cursor;
                    while (loopRecords) {
                        reqT1 = performance.now();
                        if (reqT1-reqT0 >= 9000) {
                            break;
                        }
                        if (i > rows.length) {
                            break;
                        }
                        if (! rows[i]) {
                            i+=1;
                            continue;
                        }
                        let row = rows[i].toString();
                        row += rows[i].nextElementSibling.toString();
                        if (Buffer.byteLength(body + row, 'utf8') < 4_750_000) {
                            body += row;
                        } else {
                            break;
                        }
                        i+=1;
                    }

                    if (cursor === 0) {
                        body += `</tbody></table></div></div>`;
                    }

                    let script = html.childNodes[1].childNodes[3].querySelectorAll('script');
                    script = (script.length > 0) ? script.pop() : {getAttribute: function() {
                        return '/supas.min.js';
                    }};
                    script = script.getAttribute('src');

                    res.writeHead((loopRecords) ? 206 : 204, resHeaders);
                    return res.end((cursor === 0) ? `${body}</body><script type="application/javascript">
(async function() {
    const showTable = () => {
        Array.from(document.getElementsByClassName('main-table')).forEach(table => { table.style.visibility = 'initial'; });
        document.getElementById('main-table-progress').style.display = 'none';
        Array.from(document.getElementById('control').getElementsByTagName('input')).forEach(el => { el.disabled = false; })
    };
    async function requestRecords() {
        let cursorLength = document.querySelectorAll("tr[data-num]").length;
        cursorLength = (cursorLength === 0) ? -1 : cursorLength;
        const uriString = '//' + window.location.hostname + ((window.location.port != 80 && window.location.port != 443) ? ':' + window.location.port : '') + window.location.pathname + '?cursor=' + cursorLength;
        for (let i = 0; i < 10; i++) {
            document.getElementById('main-table-progress').value=cursorLength;
            let req = await fetch(uriString);
            console.dir(req, {depth: null});
            if (req.status > 200 && req.status < 400) {
                if (req.status != 204) {
                    let body = await req.text();
                    let tbody = document.getElementsByTagName('tbody')[1];
                    tbody.innerHTML += body;
                    await requestRecords();
                } else {
                    let script = document.createElement("script");
                    script.src = "${script}";
                    // manually trigger window.onload if readyState is already complete
                    if (document.readyState === 'complete') {
                        script.onload = function() {
                            showTable();
                            window.onload();
                        }
                    } else { showTable(); }
                    document.head.appendChild(script);
                }
            break;
            }
        }
    }
    await requestRecords();
    showTable();
})();
</script></html>` : body);
                }
            }

            res.writeHead((supaReq.status === 206) ? 200 : supaReq.status, resHeaders);
            res.end(await supaReq.text());
        } catch (err) {
            console.error(err)
            res.writeHead(500);
            res.end();
        }
    }
}
