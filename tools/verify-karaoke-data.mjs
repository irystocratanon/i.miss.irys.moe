#!/usr/bin/env node
import KaraokeData from "../server/karaoke_data.js"

let exit_code = 0
KaraokeData.karaoke.list.forEach(item => {
	exit_code = item.hasOwnProperty('title') && item.hasOwnProperty('date') && item.hasOwnProperty('songs') && typeof item['title'] === 'string' && typeof item['date'] === 'object' && item['date'] instanceof Date && typeof item['songs'] === 'object' && item['songs'] instanceof Array
	if (!exit_code) {
		console.log(item);
		process.exit(1);
	}
})
