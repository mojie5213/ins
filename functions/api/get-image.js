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

        // 使用支持完整多图返回的专业解析通道
        try {
            const res = await fetch(`https://api.vkrproject.com/v1/instagram?url=${encodeURIComponent(postUrl)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.result) {
                    if (data.result.author) authorName = data.result.author;
                    if (Array.isArray(data.result.images)) {
                        imageUrls.push(...data.result.images);
                    }
                }
            }
        } catch (e) {}

        // 备用通道：如果上一个通道图片少于 3 张，用备用高防通道补充
        if (imageUrls.length <= 3) {
            try {
                const altRes = await fetch(`https://instagram-dl.chinup.workers.dev/?url=${encodeURIComponent(postUrl)}`);
                if (altRes.ok) {
                    const altData = await altRes.json();
                    if (altData) {
                        if (altData.author || altData.username) authorName = altData.author || altData.username;
                        if (Array.isArray(altData.urls)) imageUrls.push(...altData.urls);
                        if (Array.isArray(altData.images)) imageUrls.push(...altData.images);
                    }
                }
            } catch (e) {}
        }

        // 清洗、去重、过滤小图
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
