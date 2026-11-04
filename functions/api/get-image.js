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
        let authorName = 'Instagram_User';

        // 使用高可用、专门针对 Cloudflare 优化的公开解析通道
        const targetApi = `https://instagram-dl.chinup.workers.dev/?url=${encodeURIComponent(postUrl)}`;
        
        try {
            const apiRes = await fetch(targetApi, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            if (apiRes.ok) {
                const data = await apiRes.json();
                if (data) {
                    if (data.author) authorName = data.author;
                    if (data.username) authorName = data.username;
                    if (Array.isArray(data.urls)) imageUrls.push(...data.urls);
                    if (data.url) imageUrls.push(data.url);
                    if (Array.isArray(data.images)) imageUrls.push(...data.images);
                }
            }
        } catch (e) {}

        // 备用通道
        if (imageUrls.length === 0) {
            try {
                const altRes = await fetch(`https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`);
                if (altRes.ok) {
                    const altData = await altRes.json();
                    if (altData) {
                        if (altData.author) authorName = altData.author;
                        if (Array.isArray(altData.urls)) imageUrls.push(...altData.urls);
                    }
                }
            } catch (e) {}
        }

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
