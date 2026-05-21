export default function handler(request, response) {
    const token = process.env.MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN || '';

    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    response.status(200).json({token});
}
