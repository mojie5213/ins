export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        let postUrl = url.searchParams.get('url');

        if (!postUrl) {
            return new Response(JSON.stringify({ success: false, error: '缺少 Instagram 链接' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (postUrl.includes('?')) {
            postUrl = postUrl.split('?')[0];
        }
        if (!postUrl.endsWith('/')) {
            postUrl += '/';
        }

        let imageUrls = [];
        let authorName = '';

        // 方案 A：调用海外高可用稳定解析源（专门用于完整获取多图轮播的所有原图数组）
        try {
            const apiRes = await fetch(`https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`);
            if (apiRes.ok) {
                const data = await apiRes.json();
                if (data) {
                    if (data.author) authorName = data.author;
                    if (data.username) authorName = data.username;
                    if (Array.isArray(data.urls) && data.urls.length > 0) {
                        imageUrls.push(...data.urls);
                    }
                }
            }
        } catch (e) {}

        // 方案 B：如果方案 A 没拿到或数量不够，使用备用高级聚合接口
        if (imageUrls.length < 2) {
            try {
                const altRes = await fetch(`https://api.vkrproject.com/v1/instagram?url=${encodeURIComponent(postUrl)}`);
                if (altRes.ok) {
                    const altData = await altRes.json();
                    if (altData && altData.result) {
                        if (altData.result.author) authorName = altData.result.author;
                        if (Array.isArray(altData.result.images)) {
                            imageUrls.push(...altData.result.images);
                        }
                    }
                }
            } catch (e) {}
        }

        // 方案 C：直接抓取官方嵌入页作为最终兜底，确保绝不为空
        if (imageUrls.length === 0) {
            const embedRes = await fetch(postUrl + 'embed/captioned/', {
                headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)' }
            });
            if (embedRes.ok) {
                const html = await embedRes.text();
                const ownerMatch = html.match(/"owner":\s*\{[^}]*"username":\s*"([^"]+)"/);
                if (ownerMatch && ownerMatch[1]) authorName = ownerMatch[1];

                const regex = /https:\/\/scontent[^"']+\.cdninstagram\.com\/[^"'\s]+/g;
                const matches = html.match(regex);
                if (matches) imageUrls.push(...matches);
            }
        }

        // 严格清洗去重，过滤掉小尺寸图标，只保留高清原图
        imageUrls = imageUrls.map(u => u.replace(/&amp;/g, '&').replace(/u0026/g, '&'));
        imageUrls = [...new Set(imageUrls)].filter(u => 
            typeof u === 'string' && 
            u.startsWith('http') && 
            !u.includes('s150x150') && 
            !u.includes('320x320') &&
            !u.includes('480x480')
        );

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未能解析到图片，请确认该帖子为公开状态' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 如果依然没有匹配到作者名，从链接或时间戳安全生成
        if (!authorName) {
            authorName = 'IG_Creator_' + Date.now().toString().slice(-5);
        }

        const safeAuthorName = authorName.replace(/[\/\\?%*:|"<>]/g, '_').trim();

        return new Response(JSON.stringify({
            success: true,
            authorName: safeAuthorName,
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
