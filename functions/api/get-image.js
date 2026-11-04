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

        // 通道 1：深度抓取 Instagram 官方嵌入页的完整 HTML（包含多图轮播的所有 CDN 原图）
        try {
            const embedRes = await fetch(postUrl + 'embed/captioned/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                }
            });
            if (embedRes.ok) {
                const html = await embedRes.text();
                
                // 提取真实博主名
                const ownerMatch = html.match(/"owner":\s*\{[^}]*"username":\s*"([^"]+)"/);
                if (ownerMatch && ownerMatch[1]) authorName = ownerMatch[1];

                // 穷举页面中出现的所有 cdninstagram 高清图片和视频封面链接
                const regex = /https:\/\/scontent[^"']+\.cdninstagram\.com\/[^"'\s]+/g;
                const matches = html.match(regex);
                if (matches) {
                    imageUrls.push(...matches);
                }
            }
        } catch (e) {}

        // 通道 2：同时请求公开解析接口作为多图补充，防止部分帖子结构特殊
        try {
            const apiRes = await fetch(`https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`);
            if (apiRes.ok) {
                const data = await apiRes.json();
                if (data) {
                    if (data.author) authorName = data.author;
                    if (data.username) authorName = data.username;
                    if (Array.isArray(data.urls)) imageUrls.push(...data.urls);
                }
            }
        } catch (e) {}

        // 终极清洗去重：排除所有小头像、缩略图，只保留最大尺寸的原图
        imageUrls = imageUrls.map(u => u.replace(/&amp;/g, '&').replace(/u0026/g, '&'));
        imageUrls = [...new Set(imageUrls)].filter(u => 
            typeof u === 'string' && 
            u.startsWith('http') && 
            !u.includes('s150x150') && 
            !u.includes('320x320') &&
            !u.includes('480x480') &&
            !u.includes('p150x150')
        );

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未能解析到图片，请确认该帖子为公开状态' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 确保博主名称有效，有则用真名，无则安全生成
        if (!authorName) {
            authorName = 'IG_User_' + Date.now().toString().slice(-5);
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
