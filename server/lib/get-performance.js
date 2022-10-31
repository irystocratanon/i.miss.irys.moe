// performance isn't available in every context
// (e.g Webpack can break accessing performance)
module.exports = (function() {
    let _performance
    if (typeof performance !== 'object') {
        try {
            _performance = require('perf_hooks')
            _performance = _performance.performance
        } catch (e) {
            _performance = {now: function(){}}
        }
    } else {
        _performance = performance
    }
    return (_performance?.performance) ? _performance.performance : _performance
})()
