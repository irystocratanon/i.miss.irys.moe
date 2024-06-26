"use strict";
(function() {
	let selected_rows
    const k = window.location.pathname.split('/').filter(e => { return e.length > 0}).pop().split('.html').filter(e => { return e.length > 0}).pop();
    let cursor;
    const queryString = window.location.search.split('=');
    let cursorIndex = queryString.findIndex(e => { return e.match(/\??cursor/) || e.endsWith("&cursor"); });
    if (cursorIndex > -1) {
        try {
            cursor = queryString[cursorIndex+1];
        } catch {}
    }
    let oldCursor
    try {
        oldCursor = localStorage.getItem('cursor[' + k + ']')
    } catch {}

    let oldSort
    try {
        oldSort = localStorage.getItem('sort[' + k + ']')
        oldSort = (oldSort == "desc") ? oldSort : "asc"
    } catch { oldSort = "asc"; }

    const sort_is_descending = () => { return !!window.location.search.match(/(\?|\&)sort=desc\&?/) };
    const newSort = (sort_is_descending()) ? "desc" : "asc"

    const invalidate_scroll = () => {
        try {
	    	localStorage.removeItem('scrollPosition[' + k + ']')
	    } catch {}
	    try {
	    	localStorage.removeItem('lastElement[' + k + ']')
	    } catch {}
	    try {
	    	localStorage.removeItem('scrollToLastElement[' + k + ']')
	    } catch {}
    };

    if (oldSort != newSort) { invalidate_scroll(); }

    const setCursor = () => {
        if (cursor) {
            try {
                localStorage.setItem('cursor[' + k + ']', cursor);
            } catch {}
        } else {
            try {
                localStorage.removeItem('cursor[' + k + ']');
            } catch {}
        }
    };

    if ((cursor && oldCursor && cursor != oldCursor) || oldCursor && !cursor) {
        console.info(`cursor: ${cursor} oldCursor: ${oldCursor}`);
        invalidate_scroll();
        setCursor();
    }

    const addEventListeners = (listeners, f) => {
        listeners.forEach(l => {
            window.addEventListener(l, f)
        })
    }

    const scrollMaxY = () => {
        return Object.hasOwn(window, 'scrollMaxY') ? window.scrollMaxY : document.documentElement.scrollHeight - document.documentElement.clientHeight
    }

    const palemoonWorkaround = () => {
        // quirk for PaleMoon which doesn't seem to support content: url("data:image/png;base64,...") properly on img elements
        const applyWorkaround = String(navigator?.userAgent || '').indexOf("PaleMoon/") > -1;
        if (applyWorkaround) {
            Array.from(document.querySelectorAll('img')).filter(e => { return e.className.startsWith('_'); }).forEach(img => { if (img.src.length > 0) { return; } const imgSelector = img.classList[0]; let cssRule; for (let i = 0; i < document.styleSheets.length; i++) { let rules = Array.from(document.styleSheets[i].rules).find(rule => { return rule.selectorText == `img.${imgSelector}`; }); if (rules) { cssRule = rules; break;} } img.src=cssRule.style.content.substr(5,cssRule.style.content.length-7)})
        }
    };

    addEventListener("palemoon_quirk", palemoonWorkaround)

    const systemEmojis = () => {
        Array.from(document.querySelectorAll("img")).filter(e => { return [...e.alt].length === 1 }).forEach(img => { img.outerHTML = `<span class="${img.className}" style="font-size: 26px;font-family: Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;">${img.alt}</span>`; })
    };

    let useSystemEmoji = false;
    try {
		useSystemEmoji = Boolean(+localStorage.getItem('use_system_emoji[' + k + ']'));
    } catch {}
    if (useSystemEmoji) {
        systemEmojis();
    }

	try {
		selected_rows = localStorage.getItem('selected_rows[' + k + ']')
		selected_rows = selected_rows.split(',').filter(e => { return e.length > 0; })
	} catch { selected_rows = [] }
	selected_rows = (selected_rows) ? selected_rows : [];
	if (selected_rows.length === 0) {
		let lastElement
		let scrollToLastElement = false
		let scrollPosition
		try {
			scrollToLastElement = localStorage.getItem('scrollToLastElement[' + k + ']')
			scrollToLastElement = Boolean(+scrollToLastElement)
		} catch (e) { console.error(e); scrollToLastElement = false; }
		try {
			lastElement = localStorage.getItem('lastElement[' + k + ']')
			lastElement = +lastElement
            lastElement = (sort_is_descending()) ? lastElement : lastElement + 1
		} catch {}
		try {
            if (lastElement && lastElement != 1) {
                console.log('lastElement', lastElement);
                const table_rows = Array.from(document.querySelectorAll('tr[data-num]'));
                const firstElement = table_rows.find(e => { return window.getComputedStyle(e).display === 'table-row'; })
                console.log('firstElement', firstElement);
                lastElement = ((sort_is_descending) ? table_rows.reverse() : table_rows).filter(e => { return Number(e.dataset['num']) >= lastElement && lastElement != firstElement.dataset['num'] }).filter(e => { return window.getComputedStyle(e).display === 'table-row'; })
                const lastElementLength = lastElement.length
                lastElement = lastElement[lastElementLength-1]
                console.log('lastElement', lastElement);
				scrollPosition = (lastElement && lastElement.length === 1 && scrollToLastElement) ? scrollMaxY() : scrollPosition
                if (lastElement && lastElementLength > 1) {
                    if (lastElement.dataset['num'] != 1 && lastElement != firstElement) {
                        lastElement = (k.startsWith("supana_")) ? lastElement.previousElementSibling : lastElement
                        lastElement.style.borderTop = 'solid 0.5em orange'
                        if (scrollToLastElement) {
                            scrollPosition = lastElement.offsetTop
                        }
					}
				}
			}
			if (!scrollPosition) {
				scrollPosition = (scrollToLastElement && lastElement) ? (lastElement.offsetTop) : localStorage.getItem('scrollPosition[' + k + ']')
			}
            window.onload = function() {
                palemoonWorkaround();
				let interval
				let breakLoops = 1
				setTimeout(function() {
					console.log('onload firing...')
					scrollPosition = +scrollPosition
					if (!isNaN(scrollPosition)) {
						// firefox has a really annoying bug where sometimes window.scrollMaxY will be zero
						// after reloading (this is a VERY ugly hack to fix this)
						interval = setInterval(function() {
							breakLoops+=1
							console.log('scrollY: ', Number.parseInt(window.scrollY))
							console.log('scrollPosition: ', Number.parseInt(scrollPosition))
							scrollPosition = (scrollPosition > Number.parseInt(scrollMaxY()) && scrollMaxY() > 0) ? scrollMaxY() : scrollPosition
							window.scrollTo(window.scrollX, Number.parseInt(scrollPosition))
							console.log('scrollY: ', Number.parseInt(window.scrollY))
							console.log('scrollPosition: ', Number.parseInt(scrollPosition))
							if (Number.parseInt(window.scrollY) === Number.parseInt(scrollPosition) || (Number.parseInt(scrollPosition) > scrollMaxY() && scrollMaxY() > 0) || breakLoops >= 100) {
								if (breakLoops >= 100) {
									console.warn('window.scrollTo is broken? Breaking interval to avoid breaking scrolling.')
								}
								clearInterval(interval)
								clearInterval(this)
							}
						}, 0)
					}
				}, 0)
			}
		} catch (e) { console.error(e); }
    }
    invalidate_scroll();
    addEventListeners(['pagehide', 'contextmenu'], (event) => {
        if (event.persisted) { return; }
        try {
            const descSort = sort_is_descending();
            setCursor();
			localStorage.setItem('sort[' + k + ']', (descSort) ? "desc" : "asc")
            localStorage.setItem('scrollPosition[' + k + ']', window.scrollY)
            let first, last
            try {
                first = Number(document.querySelector('[data-num]').dataset['num']);
            } catch { first = 0; }
            try {
                last = Number(Array.from(document.querySelectorAll('[data-num]')).pop().dataset['num'])
            } catch { last = 0; }
            const firstLast = (first > last) ? first : last;
            if (firstLast > 0) {
                localStorage.setItem('lastElement[' + k + ']', firstLast)
            }
            localStorage.setItem('scrollToLastElement[' + k + ']', (scrollMaxY() === Math.round(window.scrollY)) ? "1" : "0");
            if (selected_rows && selected_rows.length > 0) {
                localStorage.setItem('selected_rows[' + k + ']', selected_rows.toString())
            }
		} catch(e) {
			console.error(e);
		}
	});
    for (let i = 0; i < selected_rows.length; i++) {
        if (oldSort != newSort) { break; }
		try {
			let el = document.querySelectorAll('tr[data-num="' + selected_rows[i] + '"]')
			el[0].children[0].style.backgroundColor = 'aquamarine'
			window.scrollTo(window.scrollX, el[0].offsetTop)
			el[0].scrollIntoView();
            window.onload = function() {
                palemoonWorkaround();
				let interval
				let breakLoops = 1
				setTimeout(function() {
                    console.log('onload (selected_rows) firing...')
                    console.log('oldSort: ', oldSort, 'newSort: ', newSort);
					interval = setInterval(function() {
						breakLoops+=1
						window.scrollTo(window.scrollX, el[0].offsetTop)
						if (Number.parseInt(window.scrollY) === Number.parseInt(el[0].offsetTop) || (Number.parseInt(el[0].offsetTop) > scrollMaxY() && scrollMaxY() > 0) || breakLoops >= 100) {
							if (breakLoops >= 100) {
								console.warn('window.scrollTo is broken? Breaking interval to avoid breaking scrolling.')
							}
							clearInterval(interval)
							clearInterval(this)
							el[0].scrollIntoView()
						}

					}, 0)
				}, 0)
			}
		} catch { delete selected_rows[i]; }
	}
    const tr = Array.from(document.getElementsByTagName('tr')).filter((e) => { return e.className.length > 0 });
    const highlightRows = function(el) {
        if (el && el.srcElement?.tagName == "A" || el.currentTarget?.tagName == "A") { return; }
        const findTr = currentEl => {
            currentEl = (currentEl.tagName.match(/TR|TABLE|BODY|HEAD/)) ? currentEl : findTr(currentEl.parentNode);
            return (currentEl.previousElementSibling && currentEl.previousElementSibling.dataset.hasOwnProperty('num')) ? currentEl.previousElementSibling : currentEl;
        };
        el = (k.startsWith("supana_")) ? el.target.parentNode : findTr(el.target);
        if (el.tagName != 'TR') { return; }
        // ignore table headings in first row
        if (el == document.querySelector("table.main-table tbody tr") || (!k.startsWith("supana_") && el == document.querySelector("table.main-table tbody tr:nth-child(2)"))) { return; }
        const num = el.dataset['num'];
        el = el.children[0];
        el.style.backgroundColor=(el.style.backgroundColor === 'aquamarine') ? 'initial' : 'aquamarine';
        if (el.style.backgroundColor === 'initial') {
            const index = selected_rows.indexOf(num)
            if (index !== -1) {
                delete selected_rows[index]
            }
        } else {
            selected_rows.push(num)
        }
        localStorage.setItem('selected_rows[' + k + ']', selected_rows.toString())
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
                  node.onclick = highlightRows
            });
          }
        }
      }
    };
    const observer = new MutationObserver(callback);
    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
	tr.forEach(e => {
		e.onclick = highlightRows
    });
    if (!k.startsWith("supana_")) {
	    const supachaButton = document.querySelector('.supacha-button[data-supas]')
        supachaButton.nextSibling.textContent = " SuperChat(" + String(Array.from(document.querySelectorAll('tr[data-num]')).filter(e => { return window.getComputedStyle(e).display === 'table-row'; }).length).padStart(2, 0) + "/" + String(supachaButton.dataset["supas"]).padStart(2, 0) + ")"
    }
    setTimeout(function() {
        const visibleElements = Array.from(document.querySelectorAll('tr[data-num]')).filter(tr => window.getComputedStyle(tr).display==='table-row')
        visibleElements.forEach(e => { e.firstElementChild.title=(visibleElements.findIndex(j => j.dataset["num"] === e.dataset["num"])+1) + "/" + visibleElements.length  })
    }, 0);
})();
// log backend timing entries for supas request to the console
if (window.performance && performance.getEntriesByType) { // avoid error in Safari 10, IE9- and other old browsers
    let navTiming = performance.getEntriesByType('navigation')
    if (navTiming.length > 0) { // still not supported as of Safari 14...
        let serverTiming = navTiming[0].serverTiming
        if (serverTiming && serverTiming.length > 0) {
            serverTiming.forEach(serverTimingEntry => {
                if (serverTimingEntry?.name != 'supas') { return; }
                console.info('Supas Endpoint request completed in: ' + serverTimingEntry.duration + 'ms')
            })
        }
    }
}
// try to keep the cache hot by requesting updates in the background with exponential back-off
(async function() {
    const progressEl = document.querySelector('progress')
    const initialDelay = 2000
    let delay = initialDelay*2
    let is_5xx = false
    let is_4xx = false
    let x_supas_items
    const now = Date.now()
    const nowDate = new Date(now)

    const limit = !!window.location.search.match(/(\??|\&)limit=-?[0-9]+\&?/);
    const cursor = !!window.location.search.match(/(\??|\&)cursor=[0-9]+\&?/);
    const is_sort_desc = () => {
        return !!window.location.search.match(/(\?|\&)sort=desc\&?/);
    }
    const sort_is_descending = is_sort_desc();

    const backgroundUpdateCache = async function(modified_since = null) {
        let x
        try {
            let headers = {}
            if (modified_since) {
                let debug_cache = null
                try {
                    let debug_cache = localStorage.getItem('debug_cache')
                } catch {}
                if (!debug_cache) {
                    headers["If-Modified-Since"] = modified_since
                } else {
                    headers["Pragma"]="no-cache"
                }
            }
            x = await fetch(window.location.protocol + '//' + window.location.hostname + ((window.location.port != 80 && window.location.port != 443) ? (':' + window.location.port) : '') + window.location.pathname, {method: 'HEAD', headers: headers});
            const _modified_since = x.headers.get('last-modified')
            modified_since = (_modified_since) ? _modified_since : modified_since
            const vercel_cache_state = x.headers.get('x-vercel-cache')
            if (vercel_cache_state && vercel_cache_state === "STALE") { modified_since = null; }
        } catch {
            delay*=2
            return setTimeout(() => { return backgroundUpdateCache(modified_since) }, delay);
        }
        is_5xx = x.status >= 500
        is_4xx = x.status >= 400 && x.status < 500
        delay = (delay > 60_000 && is_5xx === false) ? Number(initialDelay) : delay
        const cache_control = x.headers.get('cache-control');
        const resetTitle = () => {
            document.title = `${window.location.hostname}${window.location.pathname}`;
        }
        if (cache_control.indexOf('immutable') === -1 && !is_4xx) {
            let last_modified = x.headers.get("Last-Modified")
            last_modified = (last_modified) ? new Date(last_modified) : new Date(now)
            if (Date.parse(last_modified) - Date.parse(nowDate) >= ((3600*48)*1000)) {
                return
            }
            x_supas_items = x.headers.get('X-Supas-Items')
            if (x_supas_items) {
                if (progressEl) {
                    progressEl.max=x_supas_items;
                }
                let current_items
                try {
                    const first = Number(document.querySelector('[data-num]').dataset['num'])
                    const last = Number(Array.from(document.querySelectorAll('[data-num]')).pop().dataset['num'])
                    current_items = (first > last) ? first : last
                } catch { current_items = 0 }
                x_supas_items = Number(x_supas_items)
                let load_more_btn = document.querySelector(".load-more")
                if (x_supas_items > current_items) {
                    // String.fromCharCode is used here because the minification eats the space
                    document.title = `(${x_supas_items-current_items})${String.fromCharCode(32)}${window.location.hostname}${window.location.pathname}`;
                    if (!load_more_btn) {
                        const main_table = document.querySelector(".main-table")
                        load_more_btn = document.createElement("button")
                        load_more_btn.className="load-more sticky w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-2 border border-gray-400 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        load_more_btn.innerHTML="Load More"
                        load_more_btn.onclick = function(event) {
                            load_more_btn.setAttribute("disabled", "");
                            (async function(self, evt) {
                                let first, last
                                try {
                                    first = Number(document.querySelector('[data-num]').dataset['num'])
                                    last = Number(Array.from(document.querySelectorAll('[data-num]')).pop().dataset['num'])
                                } catch {
                                    first = 0
                                    last = 0
                                }
                                const current_items = (first > last) ? first : last
                                let cursor = current_items;
                                cursor = (cursor < 0) ? 0 : cursor
                                let text = ''
                                while (true) {
                                    let supaReq = await fetch(window.location.protocol + '//' + window.location.hostname + ((window.location.port != 80 && window.location.port != 443) ? (':' + window.location.port) : '') + window.location.pathname + `?cursor=${cursor}&api=true`, {headers: {"Accept": "text/supas"}});
                                    if (!supaReq.status === 200) { break; }
                                    const body = await supaReq.text();
                                    if (body.length === 0) { break; }
                                    text += body
                                    const frag = document.createElement("template")
                                    frag.innerHTML = body
                                    const nodes = frag.content.querySelectorAll("tr[data-num]")
                                    if (nodes.length < 1) { break; }
                                    const first = +nodes[0].dataset.num
                                    const last = +nodes[nodes.length-1].dataset.num
                                    const firstLast = (first > last) ? first : last
                                    cursor = firstLast+1
                                }
                                if (text.length === 0) { return; }
                                let frag = document.createElement("template")
                                frag.innerHTML = text
                                Array.from(frag.content.querySelectorAll('td[title]')).filter(e => e && e.parentNode && e.parentNode.dataset.hasOwnProperty("num")).forEach(e => {
                                    let span = e.querySelector('span');
                                    let d = new Date(e.title);
                                    let year=((new Date()).getFullYear()!=d.getFullYear())?'numeric':undefined;
                                    let timestamp = (d=="Invalid Date")?'':`${d.toLocaleDateString([...navigator.languages, 'en'], {day: 'numeric', month: 'numeric', year})}<br>${d.toLocaleTimeString()}`;
                                    span.innerHTML = timestamp;
                                })
                                const getFirstVisible = () => { return Array.from(main_table.querySelectorAll("tr[data-num]")).filter(e => { return e.dataset["num"] > cursor; }).find(e => window.getComputedStyle(e).display === 'table-row') }
                                const scrollFirstVisible = () => {
                                    const visible = getFirstVisible()
                                    if (visible) {
                                        visible.scrollIntoView()
                                    }
                                }
                                if (first === 0 && last === 0) {
                                    document.querySelector("table").replaceWith(frag.content.querySelector("table"))
                                    let s = document.createElement("script");
                                    const targetScript = Array.from(document.scripts).find(e => e.src && e.src.indexOf("/supas.pre.min") > -1)
                                    document.querySelector("#control").replaceWith(frag.content.querySelector("#control"))
                                    s.src = targetScript.src
                                    document.querySelector("#control").appendChild(s);

                                    Array.from(frag.content.querySelectorAll("style")).forEach((e,i) => { const selector = `.replace-syles${i}`; let targetNode = document.querySelector(selector); if (!targetNode) { const css = document.createElement("style"); css.className=selector.slice(1); document.body.appendChild(css); targetNode = document.querySelector(selector) } targetNode.replaceWith(e); })
                                    main_table.replaceWith(frag.content.querySelector(".main-table"))
                                } else {
                                    const sort_is_descending = is_sort_desc();
                                    if (sort_is_descending) {
                                        const k = window.location.pathname.split('/').filter(e => { return e.length > 0}).pop().split('.html').filter(e => { return e.length > 0}).pop();
                                        ["borderTop", "borderBottom"].forEach(b => {
                                            Array.from(main_table.querySelectorAll("tr[data-num]")).map(e => e?.nextElementSibling).filter(e => e && e.style[b].indexOf('orange') > -1).forEach(el => el.style[b] = 'initial')
                                        })
                                        let nodes = []
                                        let rows = Array.from(frag.content.querySelectorAll('tr'));
                                        for (let i = 0; i < rows.length; i++) {
                                            if (k.startsWith("supana_")) {
                                                nodes.push([rows[i]])
                                                continue
                                            }
                                            let node = [rows[i], rows[i+1]]
                                            nodes.push(node)
                                            i+=1
                                        }
                                        nodes.forEach((row, i) => {
                                            const is_supana = k.startsWith("supana_")
                                            const targetNode = main_table.querySelector('.main-table tr[data-num]')
                                            if (i === 0) {
                                                const highlight = (is_supana) ? row[0] : row[0].nextElementSibling
                                                highlight.style.borderBottom = 'solid 0.5em orange'
                                            }
                                            main_table.querySelector('tbody').insertBefore(row[0], targetNode)
                                            if (!is_supana) {
                                                main_table.querySelector('tbody').insertBefore(row[1], targetNode)
                                            }
                                        })
                                    } else {
                                        ["borderTop", "borderBottom"].forEach(b => {
                                            Array.from(main_table.querySelectorAll("tr[data-num]")).filter(e => e && e.style[b].indexOf('orange') > -1).forEach(el => el.style[b] = 'initial')
                                        })
                                        frag.content.firstChild.style.borderTop = 'solid 0.5em orange'
                                        main_table.querySelector('tbody').appendChild(frag.content)
                                    }
                                }
                                scrollFirstVisible();
                                resetTitle();
                                (async function() {
                                    let req = await fetch(window.location.protocol + '//' + window.location.hostname + ((window.location.port != 80 && window.location.port != 443) ? (':' + window.location.port) : '') + window.location.pathname + "?cursor=1&limit=1")
                                    let frag = document.createElement("template")
                                    let html = await req.text()
                                    frag.innerHTML=html
                                    document.querySelector("table").replaceWith(frag.content.querySelector("table"))
                                    let s = document.createElement("script");
                                    const targetScript = Array.from(document.scripts).find(e => e.src && e.src.indexOf("/supas.pre.min") > -1)
                                    s.src = targetScript.src
                                    const replacementControl = frag.content.querySelector("#control")
                                    if (replacementControl) {
                                        document.querySelector("#control").replaceWith(replacementControl)
                                    }
                                    s.addEventListener("afterscriptexecute", scrollFirstVisible)
                                    const control = document.querySelector("#control")
                                    if (control) {
                                        control.appendChild(s);
                                    }
                                    Array.from(frag.content.querySelectorAll("style")).forEach((e,i) => { const selector = `.replace-syles${i}`; e.className=selector.slice(1); let targetNode = document.querySelector(selector); if (!targetNode) { const css = document.createElement("style"); css.className=e.className; document.head.appendChild(css); targetNode = document.querySelector(selector) } targetNode.replaceWith(e); })
                                    scrollFirstVisible();
                                    const quirk_evt = new Event("palemoon_quirk");
                                    window.dispatchEvent(quirk_evt);
                                })()
                            })(this, event)
                        }
                        if (is_sort_desc()) {
                            main_table.style.marginTop = '3.5rem'
                            document.querySelector('.main-table').parentElement.prepend(load_more_btn);
                        } else {
                            document.querySelector('.main-table').parentElement.appendChild(load_more_btn);
                        }
                    } else {
                        load_more_btn.removeAttribute("disabled")
                    }
                } else {
                    resetTitle();
                    if (load_more_btn) {
                        load_more_btn.setAttribute("disabled", "")
                    }
                }
            }
            let server_timing_header = x.headers.get('server-timing')
            server_timing_header = (server_timing_header) ? server_timing_header.split(';') : []
            let server_timing
            for (let i = 0; i < server_timing_header.length; i++) {
                if (server_timing_header[i] == 'supas') {
                    if (i < server_timing_header.length) {
                        server_timing = server_timing_header[i+1]
                        server_timing = server_timing.split('dur=')
                        server_timing = (server_timing.length > 1) ? server_timing[1] : null
                        server_timing = Number(server_timing)
                        break
                    }
                }
            }
            // if the request takes longer than 1000ms or a server error has occurred then keep backing off, else set the delay to initialDelay + some random fuzz
            delay = (server_timing && server_timing >= 1_000 || is_5xx) ? delay*2 : ((initialDelay*2) + Math.random()*1000)
            return setTimeout(() => { return backgroundUpdateCache(modified_since) }, delay);
        }
    }
    if (!limit && !(cursor && sort_is_descending)) {
        setTimeout(backgroundUpdateCache, delay);
    }
})()
