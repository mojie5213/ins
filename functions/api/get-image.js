export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const postUrl = url.searchParams.get('url');

    if (!postUrl) {
        return new Response(JSON.stringify({ success: false, error: '缺少 Instagram 链接' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    try {
        let imageUrls = [];

        // 使用稳定公开的无Key解析代理接口获取多图数组
        const response = await fetch(`https://api.vkrproject.com/v1/instagram?url=${encodeURIComponent(postUrl)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const data = await response.json();
        
        if (data && data.status && data.result) {
            // 兼容不同的返回结构
            const items = Array.isArray(data.result) ? data.result : [data.result];
            for (let item of items) {
                if (item.url) imageUrls.push(item.url);
                if (item.images && Array.isArray(item.images)) {
                    imageUrls.push(...item.images);
                }
            }
        }

        // 备用通道：如果上一个接口没返回，尝试通过公共无限制解析接口
        if (imageUrls.length === 0) {
            const altRes = await fetch(`https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`);
            const altData = await altRes.json();
            if (altData && altData.urls && Array.isArray(altData.urls)) {
                imageUrls = altData.urls;
            }
        }

        // 最终兜底：如果外部接口都挂了，退化为抓取第一张
        if (imageUrls.length === 0) {
            const pageRes = await fetch(postUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' }
            });
            const html = await pageRes.text();
            const match = html.match(/<meta property="og:image" content="([^"]+)"/);
            if (match && match[1]) {
                imageUrls.push(match[1].replace(/&amp;/g, '&'));
            }
        }

        if (imageUrls.length === 0) {
            throw new Error('未找到图片，请确保链接正确且为公开帖子');
        }

        return new Response(JSON.stringify({
            success: true,
            authorName: 'Instagram_Media',
            imageUrls: imageUrls
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
