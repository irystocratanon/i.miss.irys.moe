"use strict";
(function() {
    document.title = window.location.hostname + window.location.pathname
	const k = window.location.pathname.split('/').filter(e => { return e.length > 0}).pop().split('.html').filter(e => { return e.length > 0}).pop();
	let checkboxState
	try {
		checkboxState = JSON.parse(localStorage.getItem('buttons[' + k + ']'))
	} catch {
		try {
			localStorage.removeItem('buttons[' + k + ']')
		} catch {}
	}
	checkboxState = (!checkboxState) ? {} : checkboxState
    document.write('<style>tr { display: table-row }');
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
            el.onchange = function() {
                const self = this;
                self.disabled = true;
                if (keyName !== 'supacha') { toggleControls(); };
				const display = (this.checked) ? 'table-row' : 'none'
				try {
					checkboxState[keyName] = this.checked
					localStorage.setItem('buttons[' + k + ']', JSON.stringify(checkboxState))
				} catch (e) { console.error(e); }
				if (keyName === 'supacha') {
					Array.from(document.getElementsByClassName('supacha-button')).forEach(btn => {
                        btn.checked = this.checked
                        btn.disabled = true;
						const _keyName = (btn.name || btn.className.split('-button')[0]);
                        checkboxState[_keyName] = btn.checked
                    })
					localStorage.setItem('buttons[' + k + ']', JSON.stringify(checkboxState))
                }
				Array.from(document.getElementsByClassName(keyName)).forEach((supacha, i, arr) => {
                    supacha.style.display = display;
                    if (i === arr.length-1) {
                        self.disabled = false;
                        toggleControls(false);
                    }
				})
				const supachaButton = document.querySelector('.supacha-button[data-supas]')
                supachaButton.nextSibling.textContent = "SuperChat(" + String(Array.from(document.querySelectorAll('tr[data-num]')).filter(e => { return window.getComputedStyle(e).display === 'table-row'; }).length).padStart(2, 0) + "/" + String(supachaButton.dataset["supas"]).padStart(2, 0) + ")"
			}
			const cssClassName = (el.name || el.className.split('-button')[0]);
			const display = (el.checked);
			if (cssClassName == 'supacha') { return; }
			document.write('.' + ((cssClassName.startsWith('#')) ? '\\' + cssClassName : cssClassName) + '{display: ' + (el.checked ? 'table-row' : 'none') + '}')
		})
	document.write('</style>');
})()
