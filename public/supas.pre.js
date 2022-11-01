(function() {
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
	Array.from(document.getElementsByTagName('input'))
		.filter(el => { return el.type === 'checkbox' && el.className.indexOf('-button') > -1 })
		.forEach(el => {
			const keyName = (el.name || el.className.split('-button')[0]);
			if (checkboxState.hasOwnProperty(keyName)) {
				el.checked = Boolean(checkboxState[keyName])
			}
			el.onchange = function() {
				const display = (this.checked) ? 'table-row' : 'none'
				try {
					checkboxState[keyName] = this.checked
					localStorage.setItem('buttons[' + k + ']', JSON.stringify(checkboxState))
				} catch (e) { console.error(e); }
				if (keyName === 'supacha') {
					Array.from(document.getElementsByClassName('supacha-button')).forEach(btn => {
						btn.checked = this.checked
						const _keyName = (btn.name || btn.className.split('-button')[0]);
						checkboxState[_keyName] = btn.checked
					})
					localStorage.setItem('buttons[' + k + ']', JSON.stringify(checkboxState))
				}
				Array.from(document.getElementsByClassName(keyName)).forEach(supacha => {
					supacha.style.display = display;
				})
				const supachaButton = document.querySelector('.supacha-button[data-supas]')
				supachaButton.nextSibling.textContent = "SuperChat(" + (Array.from(document.querySelectorAll('tr[data-num]')).filter(e => { return window.getComputedStyle(e).display === 'table-row'; }).length) + "/" + supachaButton.dataset["supas"] + ")"
			}
			const cssClassName = (el.name || el.className.split('-button')[0]);
			const display = (el.checked);
			if (cssClassName == 'supacha') { return; }
			document.write('.' + ((cssClassName.startsWith('#')) ? '\\' + cssClassName : cssClassName) + '{display: ' + (el.checked ? 'table-row' : 'none') + '}')
		})
	document.write('</style>');
})()