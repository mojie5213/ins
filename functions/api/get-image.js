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

        let imageUrls = [];
        let authorName = 'Instagram_Media';

        // 尝试使用目前稳定的备用解析源
        const endpoints = [
            `https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`,
            `https://api.vkrproject.com/v1/instagram?url=${encodeURIComponent(postUrl)}`
        ];

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });
                if (res.ok) {
                    const data = await res.json();
                    console.log('API Response:', data); // 会记录在 Cloudflare Workers 日志中
                    
                    if (data) {
                        if (data.author) authorName = data.author;
                        if (data.username) authorName = data.username;
                        if (data.result && data.result.author) authorName = data.result.author;

                        if (Array.isArray(data.urls)) imageUrls.push(...data.urls);
                        if (data.url) imageUrls.push(data.url);
                        if (data.result && Array.isArray(data.result.images)) imageUrls.push(...data.result.images);
                    }
                }
            } catch (err) {
                console.error('Fetch error:', err);
            }
            if (imageUrls.length > 0) break;
        }

        imageUrls = [...new Set(imageUrls)].filter(u => typeof u === 'string' && u.startsWith('http'));

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '所有解析通道均被拦截，请确保帖子为公开状态' }), {
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
