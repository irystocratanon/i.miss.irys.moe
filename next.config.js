module.exports = {
    reactStrictMode: true,
    async redirects() {
        return [
            {
                source: '/index.html',
                destination: '/',
                permanent: true
            },
            {
                source: '/karaokes',
                destination: '/karaoke',
                permanent: true
            }
        ]
    }
}
