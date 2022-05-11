module.exports = {
    reactStrictMode: true,
    async redirects() {
        return [
            {
                source: '/karaokes',
                destination: '/karaoke',
                permanent: true
            }
        ]
    }
}
