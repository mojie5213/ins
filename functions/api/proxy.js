export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response('缺少目标图片链接', { status: 400 });
    }

    try {
        const imageRes = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
            }
        });

        if (!imageRes.ok) {
            return new Response(`上游图片响应失败: ${imageRes.status}`, { status: 500 });
        }

        // 【关键修复】使用 arrayBuffer 替代直接返回 stream，彻底解决 iOS Safari 读取流失败的问题
        const buffer = await imageRes.arrayBuffer();

        const responseHeaders = new Headers(imageRes.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');

        return new Response(buffer, {
            status: imageRes.status,
            headers: responseHeaders
        });
    } catch (err) {
        return new Response(`代理异常: ${err.message}`, { status: 500 });
    }
}
