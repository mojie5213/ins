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
        let authorName = 'Instagram_Media';

        // 尝试通道 1：使用公开的 SnapInsta 兼容解析通道
        try {
            const res = await fetch(`https://api.alligato.com/v1/instagram?url=${encodeURIComponent(postUrl)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const data = await res.json();
            if (data && data.images && Array.isArray(data.images)) {
                imageUrls = data.images;
            }
        } catch (e) {
            console.warn('通道 1 解析失败，切换备用通道');
        }

        // 如果通道 1 未获取到多图，使用强大的嵌入式页面和多重正则深度提取
        if (imageUrls.length === 0) {
            const cleanUrl = postUrl.split('?')[0];
            const embedRes = await fetch(`${cleanUrl}embed/captioned/`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
                }
            });
            const html = await embedRes.text();

            // 深度匹配页面中所有高清晰度的图片链接
            const matches = html.matchAll(/class="EmbeddedMediaImage"[^>]+src="([^"]+)"/g);
            for (const match of matches) {
                const decoded = match[1].replace(/&amp;/g, '&');
                if (!imageUrls.includes(decoded)) {
                    imageUrls.push(decoded);
                }
            }

            // 兜底：如果 embed 没抓到，匹配标准的 og:image
            if (imageUrls.length === 0) {
                const ogMatches = html.matchAll(/<meta property="og:image" content="([^"]+)"/g);
                for (const match of ogMatches) {
                    const decoded = match[1].replace(/&amp;/g, '&');
                    if (!imageUrls.includes(decoded)) {
                        imageUrls.push(decoded);
                    }
                }
            }
        }

        if (imageUrls.length === 0) {
            throw new Error('未找到图片，请确保链接正确且为公开帖子');
        }

        return new Response(JSON.stringify({
            success: true,
            authorName: authorName,
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
