export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const postUrl = url.searchParams.get('url');

    if (!postUrl) {
        return new Response(JSON.stringify({ success: false, error: '缺少 Instagram 链接' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    try {
        // 调用稳定且免费的公开解析服务获取多图数据
        const apiUrl = `https://api.cobalt.tools/api/json`;
        const apiRes = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({
                url: postUrl,
                vQuality: 'max'
            })
        });

        const data = await apiRes.json();
        let imageUrls = [];

        // 适配返回的数据结构（支持多图或视频封面）
        if (data && data.status === 'redirect' || data.status === 'success') {
            if (data.url) {
                imageUrls.push(data.url);
            }
            if (data.picker && Array.isArray(data.picker)) {
                imageUrls = data.picker.map(item => item.url);
            }
        }

        // 兜底方案：如果 Cobalt 没返回，则尝试直接通过页面 JSON 抓取
        if (imageUrls.length === 0) {
            const pageRes = await fetch(postUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' }
            });
            const html = await pageRes.text();
            const matches = html.matchAll(/<meta property="og:image" content="([^"]+)"/g);
            for (const match of matches) {
                const decoded = match[1].replace(/&amp;/g, '&');
                if (!imageUrls.includes(decoded)) imageUrls.push(decoded);
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
