import { parse } from "node-html-parser"
import performance from '../../server/lib/get-performance.js'

export default function Home(props) {}

Home.getInitialProps = async function ({ req, res, query }) {

    let reqT0 = performance.now()
    let reqT1 = Number(reqT0)
    let cursor = 0
    let limit = 0
    let sort = 'asc';

    if (res) {
        if (req.method != 'GET' && req.method != 'HEAD') {
            res.writeHead(400);
            return res.end()
        }
        if (!query || !query?.id || query?.id.endsWith('.html') === false) {
            res.writeHead(404);
            return res.end()
        }
        let hashed_cursor
        if (query?.cursor) {
            cursor = Number(query.cursor)
            cursor = (Number.isNaN(cursor)) ? 0 : cursor
            hashed_cursor = `${query.id.substr(0, query.id.length-5)}-${cursor}`;
        }
        if (query?.limit) {
            limit = new Number(query.limit);
            limit = Number.isNaN(limit) ? 0 : limit;
        }
        if (query?.sort && query?.sort == 'desc') {
            sort = 'desc';
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
            const referer = req.headers['referer']
            // signal to the server to request pre-generated sorted HTML since doing this in a serverless function is expensive
            // if the HTML is bigger than 5MB we will still sort in the serverless function
            if (sort == "desc") {
                supaReqHeaders["x-sort"] = "desc";
            } else {
                if (referer && req.method == "HEAD") {
                    const test_referer = new RegExp(`^http(s)?:\/\/${process.env.PUBLIC_HOSTNAME}(:[0-9]+)?\/supas/\\w+.html\\??.*[^sort](\\??|\\&)sort=desc(\\&|\$)`, "g")
                    if (referer.match(test_referer)) {
                        supaReqHeaders["x-sort"] = "desc";
                    }
                }
            }
            const modified_since = req.headers['if-modified-since']
            if (modified_since) {
                supaReqHeaders['If-Modified-Since'] = modified_since
            }
            let none_match = req.headers['if-none-match']

            let content_type = req.headers["accept"];
            const user_requests_html = content_type?.indexOf("text/html");
            const user_requests_supas = content_type?.indexOf("text/supas");
            content_type = (query?.api || content_type && user_requests_supas > -1 && user_requests_html > user_requests_supas) ? 'text/supas' : 'text/html';

            if (cursor > 0 && content_type.indexOf('text/html') > -1) {
                // human user's do not expect zero-based indexing
                cursor-=1;
            }

            if (none_match) {
                supaReqHeaders['If-None-Match'] = none_match
                if (hashed_cursor && (none_match == `${hashed_cursor}${(sort == "desc") ? "/desc" : ""}`) && content_type === 'text/supas') {
                    res.writeHead(304, {"Cache-Control": "public, max-age=3600, must-revalidate", "Vary": "Accept, Accept-Encoding"});
                    return res.end();
                }
            }
            let supaReq
            for (let i = 0; i < 3; i++) {
                try {
                    const endpoint = (Math.floor(Math.random()*10%2)) ? process.env.SUPAS_ENDPOINT_A : process.env.SUPAS_ENDPOINT_B
                    supaReq = await fetch(`${endpoint}/${query.id}`, {method: req.method, headers: supaReqHeaders});
                    if (supaReq.status < 400) {
                        break;
                    }
                } catch (e) { console.error(e); console.trace(e); }
            }
            if (!supaReq) {
                throw new Error("Fetch error");
            }
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

            if (query?.cursor) {
                resHeaders["Vary"] = "Accept";
            }

            resHeaders["Cache-Control"] = cache_control

            if (supaReq.status === 304) {
                res.writeHead(304, resHeaders)
                return res.end();
            }

            resHeaders["Content-Type"] = content_type
            resHeaders["Server-Timing"] = `supas;dur=${reqT1-reqT0}`

            if ((content_length || query?.cursor || query?.limit || query?.sort) && req.method === 'GET') {
                // Vercel limits single requests to 5MB payloads and some streams with a LOT of superchats can result in a payload larger than this e.g
                // https://i.miss.irys.moe/supas/n6yep2gl1HY.html
                // fixing this means we need to stream the body in batches
                // the first request will load as many rows as it possibly can within a budget of 4.75mb (this gives some headroom for the max of 5mb)
                if (cursor > 0 || (query?.limit && (limit < 0 || limit > 0)) || Math.round(content_length / (1024*1024)) >= 5) {
                    if (cursor > 0 && hashed_cursor && content_type === 'text/supas') {
                        resHeaders["ETag"] = `${hashed_cursor}${(sort == "desc") ? "/desc": ""}`;
                    }

                    if (cache_control.indexOf("s-maxage") > -1 && content_type === 'text/supas') {
                        cache_control = "public, max-age=604800, immutable";
                    }
                    const textContent = await supaReq.text();
                    let html = parse(textContent);

                    let rows = html.querySelectorAll('tr[data-num]');
                    rows = (limit < 0 && sort != 'desc') ? rows.reverse() : rows;

                    if (limit < 0) {
                        limit = -limit;
                    }

                    let body = ''
                    const isSupana = query.id.startsWith("supana_");
                    if (cursor === 0 || content_type != 'text/supas') {
                        body += `<!doctype html>
<html>`;
                        // head
                        body += html.querySelector('head').toString();
                        body += `<body class="m-0 sm:m-2">
<br/>`;
                        if (!isSupana) {
                            body += html.querySelector('table').toString();
                            body += html.querySelector('#control').toString();
                        } else {
                            body += html.querySelector('table').toString();
                        }
                        let sortIndicator = "rotate-90" 
                        sortIndicator = (sort == "desc") ? "-" + sortIndicator : sortIndicator
                        const rowSpan = (!isSupana) ? 'rowspan="2" ' : ''
                        body += `
<div class="bg-white min-w-[129vw] sm:min-w-[0]">
<progress id="main-table-progress" class="w-full overflow-hidden" max="${rows.length}" value="${(cursor < 1) ? 1 : cursor}"></progress>
<div class="overflow-x-auto">
<table class="main-table table-auto w-full" border="1">
<script>document.currentScript.parentElement.style.visibility = 'collapse';document.currentScript.parentElement.parentElement.style["overflow-x"]="hidden";Array.from(document.getElementById('control').getElementsByTagName('input')).forEach(el => { el.disabled = true; })</script>
<tbody>
<tr>
<th ${rowSpan}class="w-[1em]"><button onclick="(function sortTable(evt, self) { if (document.readyState != 'complete' && evt.type != 'DOMContentLoaded') { document.addEventListener('DOMContentLoaded', evt => { sortTable(evt, self); }); return; } let sort = window.location.search.match(/(\\?|\\&)sort=(asc|desc)/); sort = (sort) ? sort : ['asc']; if (sort) { sort = sort.pop(); let newURL = window.location.href; const newSort = (sort == 'desc') ? 'asc' : 'desc'; newURL = newURL.replace(\`sort=\${sort}\`, \`sort=\${newSort}\`); newURL = (newURL.indexOf(newSort) > -1) ? newURL : \`?sort=\${newSort}\`; let newClass='inline-block '; newClass += (newSort == 'asc') ? 'rotate-90' : '-rotate-90'; self.querySelector('span').classList=newClass; window.history.pushState({path: newURL}, '', newURL); let newTableNodes = []; newTableNodes.push(document.querySelector('.main-table tr:nth-child(n+1)')); newTableNodes.push(document.querySelector('.main-table tr:nth-child(n+2)')); newTableNodes.push(...document.querySelectorAll('.main-table style')); Array.from(document.querySelectorAll('.main-table tr[data-num]')).sort((a,b) => { const x = +a.dataset['num']; const y = +b.dataset['num']; return ((sort == 'desc') ? x > y : x < y) || -1; }).forEach(e => { newTableNodes.push(e); if (!window.location.pathname.split('/').pop().startsWith('supana_')) { newTableNodes.push(e.nextElementSibling); } }); let newTbody = document.createElement('tbody'); newTableNodes.forEach(node => { newTbody.appendChild(node)}); document.querySelector('.main-table tbody').innerHTML = newTbody.innerHTML; } })({}, this)">No<br><span class="inline-block ${sortIndicator}">〈</span></button></th>
<th ${rowSpan}class="w-[1em]">時間<br><span class="text-sm"><noscript>JST</noscript><script>document.write(Intl.DateTimeFormat().resolvedOptions().timeZone)</script></span></th>
${(!isSupana) ? '<th class="text-left w-[1em]">元金額</th>' : ''}
${(!isSupana) ? '<th ' + rowSpan + 'class="invisible hidden sm:visible sm:table-cell w-[0.1%]">色</th>' : ''}
<th ${rowSpan}class="invisible hidden sm:visible sm:table-cell w-[0.5em]">icon</th>
<th ${rowSpan}class="w-[1em]">チャンネル名</th>
<th ${rowSpan}class="text-left min-w-[75%]">チャット</th>
</tr>
${(!isSupana) ? '<tr><th class="text-right">円建て</th></tr>' : ''}`

                        // blocking style tags unfortunately need to come first to make sure we stay in size budget
                        let style = html.querySelectorAll('style');
                        for (let i = 0; i < style.length; i++) {
                            body += style[i].toString();
                        }
                    }

                    let loopRecords = true;

                    if (! rows[cursor]) {
                        loopRecords = false;
                    }

                    // use a lower max response time for the first request
                    // lighthouse gives a Green Speed Index score for request <=3400ms
                    // (https://developer.chrome.com/docs/lighthouse/performance/speed-index/)
                    const max_response_time = (cursor < 1) ? 1700 : 9000;

                    limit = (query?.cursor == 1 && sort == "desc") ? 1 : limit
                    cursor = (query?.cursor && sort == "desc" && content_type.indexOf('text/html') > -1) ? cursor + 2 : cursor

                    let i = (cursor == -1) ? 0 : cursor;
                    if (sort == 'desc' && i > 0) {
                        i = (cursor == 1) ? 0 : rows.findIndex(e => {
                            if (!e._attrs.hasOwnProperty('data-num')) { return false; }
                            return +e._attrs["data-num"] === cursor -1;
                        });
                        loopRecords = (cursor > 1 && i !== -1)
                    }
                    let processedRecords = -1;
                    while (loopRecords) {
                        reqT1 = performance.now();
                        processedRecords+=1;
                        if (limit > 0) {
                            if (processedRecords == limit) {
                                break;
                            }
                        }
                        if (reqT1-reqT0 >= max_response_time) {
                            // don't break if we haven't processed a single row yet
                            if (processedRecords > 0 && (max_response_time > 1700 || body.indexOf('data-num') > -1)) {
                                break;
                            }
                        }
                        if (i > rows.length) {
                            break;
                        }
                        if (! rows[i]) {
                            i+=1;
                            continue;
                        }
                        let row = rows[i].toString();
                        if (!isSupana) {
                            row += rows[i].nextElementSibling.toString();
                        }
                        if (Buffer.byteLength(body + row, 'utf8') < 4_750_000) {
                            body += row;
                        } else {
                            break;
                        }
                        i+=1;
                    }

                    if (cursor === 0 || content_type != 'text/supas') {
                        body += `</tbody></table></div></div>`;
                    }

                    let script = html.querySelectorAll('script');
                    script = (script.length > 0) ? script.pop() : {getAttribute: function() {
                        return '/supas.min.js';
                    }};
                    script = script.getAttribute('src');

                    let resStatus = (loopRecords) ? 200 : 204;
                    if (resStatus == 204 || content_type.indexOf("text/html") > -1) {
                        resHeaders["Cache-Control"] = (sort == "desc") ? cache_control : "public, max-age=0, must-revalidate";
                        resHeaders["ETag"] = etag;
                    } else {
                        resHeaders["Cache-Control"] = cache_control;
                    }

                    res.writeHead(resStatus, resHeaders);
                    let query_params = ''
                    query_params += (query?.sort) ? `&sort=${query.sort}` : ''
                    query_params += (query?.limit) ? `&limit=${query.limit}` : ''
                    return res.end((cursor === 0 || content_type != 'text/supas') ? `${body}<noscript>
<div class="inline-flex">
  <button class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l">
    <a href="/supas/${query.id}${query_params.replace('&', '?')}">First</a>
  </button>
  <button class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-r">
    <a href="/supas/${query.id}?cursor=${(processedRecords==1) ? i+1 : i}${query_params}">Next</a>
  </button>
  <button class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-r">
    <a href="/supas/${query.id}?cursor=${(rows.length > 0) ? rows.length-1 : -1}${query_params}">Last</a>
  </button>
</div>
</noscript></body><script type="application/javascript">
(async function() {
    const progressElement = document.getElementById('main-table-progress');
    const showTable = () => {
        Array.from(document.getElementsByClassName('main-table')).forEach(table => { table.style.visibility = 'initial'; table.parentElement.style["overflow-x"]='auto'; });
        progressElement.style.display = 'none';
        Array.from(document.querySelectorAll("#control input[type=checkbox]")).forEach(el => { el.disabled = false; })
    };
    const appendScript = () => {
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
    };
    if (window.location.search.match(/(\\?|\\&)limit=-?[0-9]+/)) {
        appendScript();
        showTable();
        return;
    }
    const targetNode = document.querySelector('table.main-table');
    // Options for the observer (which mutations to observe)
    const config = { attributes: false, childList: true, subtree: true };
    // Callback function to execute when mutations are observed
    const callback = (mutationList, observer) => {
      for (const mutation of mutationList) {
        if (mutation.type === 'childList') {
          if (mutation?.addedNodes?.length > 0) {
            mutation.addedNodes.forEach(node => {
                if (! node || !node.dataset || !node.dataset["num"]) { return; }
                Array.from(node.querySelectorAll('td[title]')).forEach(e => { let span = e.querySelector('span'); let d = new Date(e.title); let year=((new Date()).getFullYear()!=d.getFullYear())?'numeric':undefined;let timestamp = (d=="Invalid Date")?'':\`\${d.toLocaleDateString([...navigator.languages, 'en'], {day: 'numeric', month: 'numeric', year})}<br>\${d.toLocaleTimeString()}\`; span.innerHTML = timestamp; });
            });
          }
        }
      }
    };
    const observer = new MutationObserver(callback);
    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
    let interval = setInterval(() => {
        progressElement.value += 1;
    }, 300);
    async function requestRecords() {
        const cursorLength = document.querySelectorAll("tr[data-num]").length;
        const cursorNext = (cursorLength === 0) ? -1 : Array.from(document.querySelectorAll("tr[data-num]")).pop().dataset["num"];
        const uriString = '//' + window.location.hostname + ((window.location.port != 80 && window.location.port != 443) ? ':' + window.location.port : '') + window.location.pathname + '?cursor=' + cursorNext;
        let sort = window.location.search.match(/(\\?|\\&)sort=(asc|desc)/);
        sort = (sort) ? '&sort=' + sort.pop() : '';
        for (let i = 0; i < 10; i++) {
            progressElement.value=${(cursor > 0) ? 'cursorNext' : 'cursorLength'};
            let req
            try {
                if (cursorNext == 1 && sort.endsWith("=desc")) {
                    req = {status: 204};
                } else {
                    req = await fetch(\`\${uriString}\${sort}&api=true\`, {headers: {"Accept": "text/supas"}});
                }
            } catch (e) { console.error(e); continue; }
            if (req.status >= 200 && req.status < 400) {
                if (req.status != 204) {
                    let body = await req.text();
                    let tbody = document.getElementsByTagName('tbody')[1];
                    let table = document.createElement('table');
                    table.innerHTML = body;
                    for (const tr of table.querySelectorAll("tr[data-num]")) {
                        if (document.querySelector(\`tr[data-num="\${tr.dataset.num}"]\`)) { continue; }
                        if (progressElement.max < tr.dataset.num) {
                            progressElement.max = tr.dataset.num;
                        }
                        let sibling = tr?.nextElementSibling;
                        tbody.appendChild(tr);
                        if (sibling) {
                            tbody.appendChild(sibling);
                        }
                    }
                    await requestRecords();
                } else {
                    appendScript();
                }
            break;
            }
        }
    }
    await requestRecords();
    observer.disconnect();
    clearInterval(interval);
    showTable();
    if (window.__i_miss_irys_supas && window.__i_miss_irys_supas.startTime) {
        window.__i_miss_irys_supas.endTime = window.__i_miss_irys_supas.now();
        const {startTime,endTime} = window.__i_miss_irys_supas;
        console.info(\`Supas: finished in \${endTime-startTime}\`);
    }
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
