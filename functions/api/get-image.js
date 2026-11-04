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

        // 1. 抓取嵌入页
        const embedUrl = postUrl + 'embed/captioned/';
        const res = await fetch(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            }
        });

        if (res.ok) {
            const html = await res.text();
            
            // 精准提取博主用户名
            const ownerMatch = html.match(/"owner":\s*\{[^}]*"username":\s*"([^"]+)"/);
            if (ownerMatch && ownerMatch[1]) {
                authorName = ownerMatch[1];
            } else {
                const authorMatchAlt = html.match(/"username":\s*"([^"]+)"/);
                if (authorMatchAlt && authorMatchAlt[1]) authorName = authorMatchAlt[1];
            }

            // 提取所有高清图片链接（支持多图轮播的侧滑图片）
            const regex = /https:\/\/scontent[^"']+\.cdninstagram\.com\/[^"'\s]+/g;
            const matches = html.match(regex);
            if (matches) {
                imageUrls.push(...matches);
            }
        }

        // 2. 如果图片少于 6 张，尝试通过第三方高可用镜像源补全多图数组
        if (imageUrls.length < 6) {
            try {
                const altRes = await fetch(`https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`);
                if (altRes.ok) {
                    const altData = await altRes.json();
                    if (altData) {
                        if (altData.author || altData.username) {
                            authorName = altData.author || altData.username;
                        }
                        if (Array.isArray(altData.urls)) {
                            imageUrls.push(...altData.urls);
                        }
                    }
                }
            } catch (e) {}
        }

        // 清洗去重：过滤掉缩略图，只留原图/大图
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
