export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response('缺少目标图片链接', { status: 400 });
    }

    try {
        // 通过 Cloudflare 服务器端发起请求，完美绕过浏览器 CORS 跨域限制
        const imageRes = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!imageRes.ok) {
            return new Response('获取图片失败', { status: 500 });
        }

        const responseHeaders = new Headers(imageRes.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');

        return new Response(imageRes.body, {
            status: imageRes.status,
            headers: responseHeaders
        });
    } catch (err) {
        return new Response(`代理异常: ${err.message}`, { status: 500 });
    }
}