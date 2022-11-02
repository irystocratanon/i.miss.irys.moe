(function() {
	let selected_rows
	const k = window.location.pathname.split('/').filter(e => { return e.length > 0}).pop().split('.html').filter(e => { return e.length > 0}).pop();
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
						lastElement.nextElementSibling.style.backgroundColor = 'yellow'
						lastElement.style.backgroundColor = 'yellow'
					}
				}
			}
			if (!scrollPosition) {
				scrollPosition = (scrollToLastElement && lastElement) ? (lastElement.offsetTop) : localStorage.getItem('scrollPosition[' + k + ']')
			}
			window.onload = function() {
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
	try {
		localStorage.removeItem('scrollPosition[' + k + ']')
	} catch {}
	try {
		localStorage.removeItem('lastElement[' + k + ']')
	} catch {}
	try {
		localStorage.removeItem('scrollToLastElement[' + k + ']')
	} catch {}
	addEventListener('beforeunload', (event) => {
		try {
			localStorage.setItem('scrollPosition[' + k + ']', window.scrollY)
			localStorage.setItem('lastElement[' + k + ']', Array.from(document.querySelectorAll('tr[data-num]')).pop().dataset['num'])
			localStorage.setItem('scrollToLastElement[' + k + ']', (window.scrollMaxY === Math.round(window.scrollY)) ? "1" : "0")
		} catch(e) {
			console.error(e);
		}
	});
	for (let i = 0; i < selected_rows.length; i++) {
		try {
			let el = document.querySelectorAll('tr[data-num="' + selected_rows[i] + '"]')
			el[0].children[0].style.backgroundColor = 'aquamarine'
			window.scrollTo(window.scrollX, el[0].offsetTop)
			el[0].scrollIntoView();
			window.myElement = el[0]
			window.onload = function() {
				let interval
				let breakLoops = 1
				setTimeout(function() {
					console.log('onload (selected_rows) firing...')
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
	tr.forEach(e => {
		e.onclick = function(el) {
			el = (el.target.parentNode.children.length === 1) ? el.target.parentNode.children[0].parentElement.previousElementSibling.children[0] : el.target.parentNode.children[0];
			el.style.backgroundColor=(el.style.backgroundColor === 'aquamarine') ? 'initial' : 'aquamarine';
			const num = el.parentNode.dataset['num'];
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
	});
	const supachaButton = document.querySelector('.supacha-button[data-supas]')
	supachaButton.nextSibling.textContent = "SuperChat(" + (Array.from(document.querySelectorAll('tr[data-num]')).filter(e => { return window.getComputedStyle(e).display === 'table-row'; }).length) + "/" + supachaButton.dataset["supas"] + ")"
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
    const backgroundUpdateCache = async function() {
        delay = (delay > 60_000 && is_5xx === false) ? Number(initialDelay) : delay
        let x = await fetch(window.location.protocol + '//' + window.location.hostname + ((window.location.port != 80 && window.location.port != 443) ? (':' + window.location.port) : '') + window.location.pathname, {method: 'HEAD'});
        is_5xx = x.status >= 500
        is_4xx = x.status >= 400 && x.status < 500
        const cache_control = x.headers.get('cache-control');
        if (cache_control.indexOf('immutable') === -1 && !is_4xx) {
            let server_timing_header = x.headers.get('server-timing')
            server_timing_header = server_timing_header.split(';')
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
            // if the request takes longer than 1000ms then we have probably re-generated the page in the background
            delay = (server_timing && server_timing >= 1_000 && !is_5xx) ? Number(initialDelay) : delay
            delay*=2
            return setTimeout(backgroundUpdateCache, delay);
        }
    }
    setTimeout(backgroundUpdateCache, delay);
})()
