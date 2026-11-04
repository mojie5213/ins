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

        // 尝试通过模拟手机浏览器抓取官方嵌入页
        const embedUrl = postUrl + 'embed/captioned/';
        const res = await fetch(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        });

        if (res.ok) {
            const html = await res.text();
            
            // 提取用户名作为文件夹名
            const authorMatch = html.match(/"owner":\s*\{[^}]*"username":\s*"([^"]+)"/);
            if (authorMatch && authorMatch[1]) {
                authorName = authorMatch[1];
            }

            // 提取所有图片 CDN 链接
            const cdnRegex = /https:\/\/scontent[^"']+\.cdninstagram\.com\/[^"'\s]+/g;
            const cdnMatches = html.match(cdnRegex);
            if (cdnMatches) {
                imageUrls.push(...cdnMatches);
            }
        }

        // 兜底：如果嵌入页没抓到，尝试抓取主页的 og:image
        if (imageUrls.length === 0) {
            const mainRes = await fetch(postUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

        // 去重并过滤
        imageUrls = [...new Set(imageUrls)].filter(u => typeof u === 'string' && u.startsWith('http'));

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未能解析到图片，请确认该帖子为公开状态' }), {
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
