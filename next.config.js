module.exports = {
    reactStrictMode: true,
    async redirects() {
        return [
            {
                source: '/',
                destination: 'https://irys.moe/',
                permanent: true
            },
            {
                source: '/supas',
                destination: 'https://irys.moe/supas',
                permanent: true
            },
            {
                source: '/supas/:slug',
                destination: 'https://irys.moe/supas/:slug',
                permanent: true
            },
            {
                source: '/index.html',
                destination: 'https://irys.moe/',
                permanent: true
            },
            {
                source: '/karaokes',
                destination: 'https://irys.moe/karaoke',
                permanent: true
            },
        ]
    }
}
