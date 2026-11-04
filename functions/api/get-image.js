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
        let authorName = 'Instagram_Media';

        // 模拟真实浏览器的手机端 UA 抓取官方嵌入页
        const embedUrl = postUrl + 'embed/captioned/';
        const res = await fetch(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        if (res.ok) {
            const html = await res.text();
            
            // 提取博主名
            const ownerMatch = html.match(/"owner":\s*\{[^}]*"username":\s*"([^"]+)"/);
            if (ownerMatch && ownerMatch[1]) {
                authorName = ownerMatch[1];
            }

            // 提取所有高清图片直链
            const regex = /https:\/\/scontent[^"']+\.cdninstagram\.com\/[^"'\s]+/g;
            const matches = html.match(regex);
            if (matches) {
                imageUrls.push(...matches);
            }
        }

        // 兜底：如果嵌入页没抓到，尝试抓取主页 og:image
        if (imageUrls.length === 0) {
            const mainRes = await fetch(postUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            });
            if (mainRes.ok) {
                const mainHtml = await mainRes.text();
                const ogMatch = mainHtml.match(/<meta property="og:image" content="([^"]+)"/);
                if (ogMatch && ogMatch[1]) {
                    imageUrls.push(ogMatch[1].replace(/&amp;/g, '&'));
                }
                const titleMatch = mainHtml.match(/<meta property="og:title" content="([^"]+?)\s*\(/);
                if (titleMatch && titleMatch[1]) {
                    authorName = titleMatch[1].trim();
                }
            }
        }

        // 清洗链接：去除转义字符和重复项
        imageUrls = imageUrls.map(u => u.replace(/&amp;/g, '&').replace(/u0026/g, '&'));
        imageUrls = [...new Set(imageUrls)].filter(u => typeof u === 'string' && u.startsWith('http') && !u.includes('s150x150'));

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未能解析到图片，请确认该帖子为公开状态且链接正确' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const safeAuthorName = authorName.replace(/[\/\\?%*:|"<>]/g, '_').trim() || 'Instagram_Media';

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
