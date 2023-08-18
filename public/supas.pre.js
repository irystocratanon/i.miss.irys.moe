"use strict";
window.__i_miss_irys_supas = (function() {
    let self = {
        now: function() {
            return (window.performance && typeof window.performance === 'object' && typeof window.performance.now === 'function') ? performance.now() : Date.now()
        }
    }
    self.startTime = self.now();
    return self;
})();
(function() {
    document.title = window.location.hostname + window.location.pathname
    const k = window.location.pathname.split('/').filter(e => { return e.length > 0}).pop().split('.html').filter(e => { return e.length > 0}).pop();
    const housekeeping = () => {
        let now = Date.now();
        let housekeepingLastPerformed
        let perform_duties = false;
        const ONE_WEEK = ((1_000 * 3_600) * 24) * 7
        try {
            housekeepingLastPerformed = localStorage.getItem("supas_maid");
            housekeepingLastPerformed = new Date(+housekeepingLastPerformed);
            perform_duties = (housekeepingLastPerformed == "Invalid Date") ? true : perform_duties
            housekeepingLastPerformed = Date.parse(housekeepingLastPerformed)
            if (!perform_duties && !Number.isNaN(housekeepingLastPerformed)) {
                perform_duties = (now >= (housekeepingLastPerformed + (ONE_WEEK))) ? true : perform_duties
            }
        } catch (e) { console.error(e); perform_duties = true; }
        console.log('perform_duties: ', perform_duties);
        if (!perform_duties) { const next_date = new Date((+housekeepingLastPerformed)+ONE_WEEK); console.log(`maid is performing next on ${next_date}`); return; }
        Object.keys(localStorage).map(e => { e = e.match(/\w+\[(.*)\]$/); return e && e.pop() || null; }).filter((e,i,s) => e && e != k && s.indexOf(e) === i).forEach(key => {
            Object.keys(localStorage).filter(e => e.endsWith(`[${key}]`)).forEach(entry => {
                try {
                    console.log(`cleaning entry ${entry}`);
                    localStorage.removeItem(entry);
                } catch {}
            });
        });
        try {
            localStorage.setItem("supas_maid", now);
        } catch {}
    };
    housekeeping();
	let checkboxState
	try {
		checkboxState = JSON.parse(localStorage.getItem('buttons[' + k + ']'))
	} catch {
		try {
			localStorage.removeItem('buttons[' + k + ']')
		} catch {}
	}
    checkboxState = (!checkboxState) ? {} : checkboxState
    let styleEl = document.createElement("style");
    styleEl.innerHTML += 'tr { display: table-row }'
    const toggleControls = (toggle = true) => {
        Array.from(document.querySelectorAll("#control input[type=checkbox]")).forEach(el => { el.disabled = toggle; })
    };
	Array.from(document.getElementsByTagName('input'))
		.filter(el => { return el.type === 'checkbox' && el.className.indexOf('-button') > -1 })
		.forEach(el => {
			const keyName = (el.name || el.className.split('-button')[0]);
			if (checkboxState.hasOwnProperty(keyName)) {
				el.checked = Boolean(checkboxState[keyName])
			}
            const onChange = function(self) {
                self.disabled = true;
                if (keyName !== 'supacha') { toggleControls(); };
				const display = (self.checked) ? 'table-row' : 'none'
				try {
					checkboxState[keyName] = self.checked
					localStorage.setItem('buttons[' + k + ']', JSON.stringify(checkboxState))
				} catch (e) { console.error(e); }
				if (keyName === 'supacha') {
					Array.from(document.getElementsByClassName('supacha-button')).forEach(btn => {
                        btn.checked = self.checked
                        btn.disabled = true;
						const _keyName = (btn.name || btn.className.split('-button')[0]);
                        checkboxState[_keyName] = btn.checked
                    })
					localStorage.setItem('buttons[' + k + ']', JSON.stringify(checkboxState))
                }
                let items = document.getElementsByClassName(keyName);
                if (items.length < 1) {
                    self.disabled = false;
                    toggleControls(false);
                    return;
                }
				Array.from(items).forEach((supacha, i, arr) => {
                    supacha.style.display = display;
                    if (i === arr.length-1) {
                        self.disabled = false;
                        toggleControls(false);
                    }
				})
                const supachaButton = document.querySelector('.supacha-button[data-supas]')
                if (supachaButton) {
                    supachaButton.nextSibling.textContent = "SuperChat(" + String(Array.from(document.querySelectorAll('tr[data-num]')).filter(e => { return window.getComputedStyle(e).display === 'table-row'; }).length).padStart(2, 0) + "/" + String(supachaButton.dataset["supas"]).padStart(2, 0) + ")"
                }
            }
            el.onchange = function() {
                onChange(this);
                setTimeout(function() {
                    const visibleElements = Array.from(document.querySelectorAll('tr[data-num]')).filter(tr => window.getComputedStyle(tr).display==='table-row')
                    visibleElements.forEach(e => {
                        e.firstElementChild.title=(visibleElements.findIndex(j => j.dataset["num"] === e.dataset["num"])+1) + "/" + visibleElements.length  })
                }, 0);
            }
			const cssClassName = (el.name || el.className.split('-button')[0]);
			const display = (el.checked);
			if (cssClassName == 'supacha') { return; }
			styleEl.innerHTML += ('.' + ((cssClassName.startsWith('#')) ? '\\' + cssClassName : cssClassName) + '{display: ' + (el.checked ? 'table-row' : 'none') + '}')
		})
	document.querySelector("#control").appendChild(styleEl)
})()
