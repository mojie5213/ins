export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        let postUrl = url.searchParams.get('url');

        if (!postUrl) {
            return new Response(JSON.stringify({ success: false, error: '缺少 Instagram 链接' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 清理链接中的追踪参数
        if (postUrl.includes('?')) {
            postUrl = postUrl.split('?')[0];
        }
        if (!postUrl.endsWith('/')) {
            postUrl += '/';
        }

        // 模拟公开浏览器请求 Instagram 帖子页面获取原始数据
        const igRes = await fetch(postUrl + '?__a=1&__d=dis', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        const html = await igRes.text();
        let imageUrls = [];
        let authorName = 'Instagram_Media';

        // 正则提取页面中的图片直链 (og:image 或 og:video)
        const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (ogImageMatch && ogImageMatch[1]) {
            // 解码 HTML 实体
            const decodedUrl = ogImageMatch[1].replace(/&amp;/g, '&');
            imageUrls.push(decodedUrl);
        }

        // 提取作者用户名
        const authorMatch = html.match(/property="og:title" content="([^"]+?)\s*\(/);
        if (authorMatch && authorMatch[1]) {
            authorName = authorMatch[1].trim();
        }

        // 如果上面没抓到，尝试备用公开解析通道
        if (imageUrls.length === 0) {
            const altRes = await fetch(`https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`);
            const altData = await altRes.json();
            if (altData && Array.isArray(altData.urls)) {
                imageUrls.push(...altData.urls);
            }
        }

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未解析到图片，请确认链接是公开的帖子（带 /p/）' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            authorName: authorName,
            imageUrls: imageUrls
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: `系统异常: ${err.message}` }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
