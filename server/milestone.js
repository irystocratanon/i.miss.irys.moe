

function closestMillion(views) {
    return (Math.floor(views / 1_000_000) + 1) * 1_000_000
}

function closest100thousand(views) {
    return (Math.floor(views / 100_000) + 1) * 100_000
}

export function closestMilestone(views) {
    var m = closestMillion(views)
    if(m > 1_000_000) {
        return m
    } else {
        return closest100thousand(views)
    }
}

export function milestoneDelta(views) {
    var m = closestMilestone(views)
    var mm = closestMillion(views)
    return { 
        milestone: m, 
        delta: m - views, 
        million: (m % 1_000_000) == 0,
        millionDelta: mm - views,
        millionMilestone: mm
    } 
}