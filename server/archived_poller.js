export async function getArchivedStreams() {
    const now = Date.now()
	const lz4 = (await import('lz4'))
	const req = await fetch("https://raw.githubusercontent.com/irystocratanon/i.miss.irys.moe-supadata/master/archives.jsonl.lz4")
	const buf = await req.arrayBuffer()
	const archives = lz4.decode(Buffer.from(buf)).toString().split('\n').filter(e => e).map(e => JSON.parse(e)).sort((x, y) => {
		return new Date(x.startTime) < new Date(y.startTime) ? 1 : -1
    }).filter(j => j.title.indexOf('FREE CHAT') === -1).filter(j => {
        let index = -1
        if (j?.mentions) {
            index = (j.mentions.findIndex(e => {
                return e.toLowerCase() === 'IRyS'.toLowerCase()
            }))
        }
        return j.channelId === process.env.WATCH_CHANNEL_ID || j?.mentions && (index > -1 || j.mentions.indexOf(process.env.WATCH_CHANNEL_ID) > -1) || j.title.toLowerCase().indexOf('councilrys') > -1
    }).map(e => {
        // I currently have no visibility into the current state of a frame in the archives so all of this info may be wildly inaccurate
        e.status = (Date.parse(e.startTime) > now) ? "upcoming" : "past"
        e.end_actual = new Date(e.startTime)
        e.start_scheduled = e.end_actual
        return e
    })
	return archives
}
