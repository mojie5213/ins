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

        // 核心：抓取 Instagram 官方公开的 embed 页面
        const embedUrl = postUrl + 'embed/captioned/';
        const res = await fetch(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        });

        if (res.ok) {
            const html = await res.text();
            
            // 1. 精准匹配博主用户名（尝试多种常见 JSON 结构）
            const ownerMatch1 = html.match(/"owner":\s*\{[^}]*"username":\s*"([^"]+)"/);
            const ownerMatch2 = html.match(/"username":\s*"([^"]+)"/);
            const ownerMatch3 = html.match(/class="[^"]*Algscalable[^"]*"[^>]*>@([a-zA-Z0-9._]+)/);
            
            if (ownerMatch1 && ownerMatch1[1]) {
                authorName = ownerMatch1[1];
            } else if (ownerMatch2 && ownerMatch2[1]) {
                authorName = ownerMatch2[1];
            } else if (ownerMatch3 && ownerMatch3[1]) {
                authorName = ownerMatch3[1];
            }

            // 2. 提取页面中所有合法的 cdninstagram 高清图片链接
            const regex = /https:\/\/scontent[^"']+\.cdninstagram\.com\/[^"'\s]+/g;
            const matches = html.match(regex);
            if (matches) {
                imageUrls.push(...matches);
            }
        }

        // 清洗去重：过滤掉重复项、小缩略图和水印图
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

        // 如果实在没匹配到用户名，用链接里的特征或时间戳代替，绝不使用死板的固定名
        if (!authorName) {
            authorName = 'IG_User_' + Date.now().toString().slice(-4);
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
