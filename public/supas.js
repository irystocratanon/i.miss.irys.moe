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

    const newSort = (window.location.search.indexOf('sort=desc') > -1) ? "desc" : "asc"

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

    const palemoonWorkaround = () => {
        // quirk for PaleMoon which doesn't seem to support content: url("data:image/png;base64,...") properly on img elements
        const applyWorkaround = String(navigator?.userAgent || '').indexOf("PaleMoon/") > -1;
        if (applyWorkaround) {
            Array.from(document.querySelectorAll('img')).filter(e => { return e.className.startsWith('_'); }).forEach(img => { const imgSelector = img.classList[0]; let cssRule; for (let i = 0; i < document.styleSheets.length; i++) { let rules = Array.from(document.styleSheets[i].rules).find(rule => { return rule.selectorText == `img.${imgSelector}`; }); if (rules) { cssRule = rules; break;} } img.src=cssRule.style.content.substr(5,cssRule.style.content.length-7)})
        }
    };

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
			lastElement += 1
		} catch {}
		try {
			if (lastElement) {
				const firstElement = Array.from(document.querySelectorAll('tr[data-num]')).find(e => { return window.getComputedStyle(e).display === 'table-row'; })
				lastElement = Array.from(document.querySelectorAll('tr[data-num]')).filter(e => { return e.dataset['num'] >= lastElement }).find(e => { return window.getComputedStyle(e).display === 'table-row'; })
				scrollPosition = (lastElement && lastElement.length === 1 && scrollToLastElement) ? window.scrollMaxY : scrollPosition
				if (lastElement) {
					if (lastElement.dataset['num'] != 1 && lastElement != firstElement) {
						if (! k.startsWith("supana_")) {
							lastElement.nextElementSibling.style.backgroundColor = 'yellow'
						}
                        lastElement.style.backgroundColor = 'yellow'
                        try {
                            // This is ugly. I should find a better way to do this...
							Array.from(lastElement.querySelectorAll('span')).forEach(e => { e.parentElement.style.backgroundColor = 'yellow'; e.style.backgroundColor = 'yellow'; });
							if (! k.startsWith("supana_")) {
								Array.from(lastElement.nextElementSibling.querySelectorAll('span')).forEach(e => { e.parentElement.style.backgroundColor = 'yellow'; e.style.backgroundColor = 'yellow'; })
							}
                        } catch {}
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
							scrollPosition = (scrollPosition > Number.parseInt(window.scrollMaxY) && window.scrollMaxY > 0) ? window.scrollMaxY : scrollPosition
							window.scrollTo(window.scrollX, Number.parseInt(scrollPosition))
							console.log('scrollY: ', Number.parseInt(window.scrollY))
							console.log('scrollPosition: ', Number.parseInt(scrollPosition))
							if (Number.parseInt(window.scrollY) === Number.parseInt(scrollPosition) || (Number.parseInt(scrollPosition) > window.scrollMaxY && window.scrollMaxY > 0) || breakLoops >= 100) {
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
	addEventListener('beforeunload', (event) => {
        try {
            let descSort = window.location.search.indexOf('sort=desc') > -1;
            setCursor();
			localStorage.setItem('sort[' + k + ']', (descSort) ? "desc" : "asc")
			localStorage.setItem('scrollPosition[' + k + ']', window.scrollY)
			localStorage.setItem('lastElement[' + k + ']', (descSort) ? document.querySelector('tr[data-num]').dataset["num"] : Array.from(document.querySelectorAll('tr[data-num]')).pop().dataset['num'])
            localStorage.setItem('scrollToLastElement[' + k + ']', (window.scrollMaxY === Math.round(window.scrollY)) ? "1" : "0");
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
						if (Number.parseInt(window.scrollY) === Number.parseInt(el[0].offsetTop) || (Number.parseInt(el[0].offsetTop) > window.scrollMaxY && window.scrollMaxY > 0) || breakLoops >= 100) {
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
    const initialDelay = 2000
    let delay = initialDelay*2
    let is_5xx = false
    let is_4xx = false
    let x_supas_items
    const now = Date.now()
    const nowDate = new Date(now)
    const backgroundUpdateCache = async function() {
        let x
        try {
            x = await fetch(window.location.protocol + '//' + window.location.hostname + ((window.location.port != 80 && window.location.port != 443) ? (':' + window.location.port) : '') + window.location.pathname, {method: 'HEAD'});
        } catch {
            delay*=2
            return setTimeout(backgroundUpdateCache, delay);
        }
        is_5xx = x.status >= 500
        is_4xx = x.status >= 400 && x.status < 500
        delay = (delay > 60_000 && is_5xx === false) ? Number(initialDelay) : delay
        const cache_control = x.headers.get('cache-control');
        if (cache_control.indexOf('immutable') === -1 && !is_4xx) {
            let last_modified = x.headers.get("Last-Modified")
            last_modified = (last_modified) ? new Date(last_modified) : new Date(now)
            if (Date.parse(last_modified) - Date.parse(nowDate) >= ((3600*48)*1000)) {
                return
            }
            x_supas_items = x.headers.get('X-Supas-Items')
            if (x_supas_items) {
                let current_items
                try {
                    if (window.location.search.match(/(\?|\*)sort=desc?/)) {
                        current_items = Number(document.querySelector('[data-num]').dataset['num'])
                    } else {
                        current_items = Number(Array.from(document.querySelectorAll('[data-num]')).pop().dataset['num'])
                    }
                } catch { current_items = 0 }
                x_supas_items = Number(x_supas_items)
                if (x_supas_items > current_items) {
                    // String.fromCharCode is used here because the minification eats the space
                    document.title = `(${x_supas_items-current_items})${String.fromCharCode(32)}${window.location.hostname}${window.location.pathname}`
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
            return setTimeout(backgroundUpdateCache, delay);
        }
    }
    setTimeout(backgroundUpdateCache, delay);
})()
