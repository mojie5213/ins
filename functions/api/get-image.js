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

        let imageUrls = [];
        let authorName = 'Instagram_Media';

        // 核心方案：模拟 Instagram 官方移动端嵌入页面获取公开多图数据
        const embedUrl = postUrl + 'embed/captioned/';
        const res = await fetch(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        if (res.ok) {
            const html = await res.text();
            
            // 提取嵌入页面的所有高清图片链接
            const imgRegex = /class="(1080|1080x1080|EmbeddedMediaImage)"[^>]*src="([^"]+)"/g;
            let match;
            while ((match = imgRegex.exec(html)) !== null) {
                if (match[2]) {
                    imageUrls.push(match[2].replace(/&amp;/g, '&'));
                }
            }

            // 备用匹配：提取所有标准图片 CDN 链接
            if (imageUrls.length === 0) {
                const altRegex = /https:\/\/scontent[^"']+\.cdninstagram\.com\/[^"'\s]+/g;
                const altMatches = html.match(altRegex);
                if (altMatches) {
                    imageUrls.push(...altMatches);
                }
            }
        }

        // 如果嵌入页没有取到，尝试直接抓取主页 og:image
        if (imageUrls.length === 0) {
            const mainRes = await fetch(postUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (mainRes.ok) {
                const mainHtml = await mainRes.text();
                const ogMatch = mainHtml.match(/<meta property="og:image" content="([^"]+)"/);
                if (ogMatch && ogMatch[1]) {
                    imageUrls.push(ogMatch[1].replace(/&amp;/g, '&'));
                }
            }
        }

        // 数组去重
        imageUrls = [...new Set(imageUrls)];

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未能解析到图片，请确认该 Instagram 帖子为公开状态' }), {
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
