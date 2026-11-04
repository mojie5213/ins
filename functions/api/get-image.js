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

        // 通道 1：直接抓取官方 embed 页面源码，穷举所有高清 CDN 图片链接
        try {
            const res = await fetch(postUrl + 'embed/captioned/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                }
            });
            if (res.ok) {
                const html = await res.text();
                
                // 提取博主名
                const ownerMatch = html.match(/"owner":\s*\{[^}]*"username":\s*"([^"]+)"/);
                if (ownerMatch && ownerMatch[1]) authorName = ownerMatch[1];

                // 穷举所有 scontent 的 cdninstagram 图片链接
                const regex = /https:\/\/scontent[^"']+\.cdninstagram\.com\/[^"'\s]+/g;
                const matches = html.match(regex);
                if (matches) {
                    imageUrls.push(...matches);
                }
            }
        } catch (e) {}

        // 通道 2：如果嵌入页抓取的图片较少，尝试抓取主页 HTML 的 og:image 和共享数据
        if (imageUrls.length <= 1) {
            try {
                const mainRes = await fetch(postUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                    }
                });
                if (mainRes.ok) {
                    const mainHtml = await mainRes.text();
                    
                    // 提取标题中的博主名
                    const titleMatch = mainHtml.match(/<meta property="og:title" content="([^"]+?)\s*\(/);
                    if (titleMatch && titleMatch[1] && !authorName) authorName = titleMatch[1].trim();

                    // 穷举主页源码中的所有图片链接
                    const regex = /https:\/\/scontent[^"']+\.cdninstagram\.com\/[^"'\s]+/g;
                    const matches = mainHtml.match(regex);
                    if (matches) {
                        imageUrls.push(...matches);
                    }
                }
            } catch (e) {}
        }

        // 通道 3：调用稳定可靠的开源解析镜像作为最后补充
        if (imageUrls.length <= 1) {
            try {
                const apiRes = await fetch(`https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`);
                if (apiRes.ok) {
                    const data = await apiRes.json();
                    if (data) {
                        if (data.author || data.username) authorName = data.author || data.username;
                        if (Array.isArray(data.urls)) imageUrls.push(...data.urls);
                    }
                }
            } catch (e) {}
        }

        // 统一清洗、去重、过滤缩略图
        imageUrls = imageUrls.map(u => u.replace(/&amp;/g, '&').replace(/u0026/g, '&').replace(/\\u0026/g, '&'));
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

        // 安全生成博主文件夹名
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
