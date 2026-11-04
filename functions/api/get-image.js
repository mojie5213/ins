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

        // 尝试直接抓取公开页面的 og:image
        const res = await fetch(postUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (res.ok) {
            const html = await res.text();
            
            // 提取 og:image 作为保底封面
            const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
            if (ogMatch && ogMatch[1]) {
                imageUrls.push(ogMatch[1].replace(/&amp;/g, '&'));
            }

            // 提取标题中的博主名
            const titleMatch = html.match(/<meta property="og:title" content="([^"]+?)\s*\(/);
            if (titleMatch && titleMatch[1]) {
                authorName = titleMatch[1].trim();
            }
        }

        // 如果上面被拦截，使用一个稳定的公开解析后端镜像
        if (imageUrls.length === 0) {
            const mirrorRes = await fetch(`https://api.vkrproject.com/v1/instagram?url=${encodeURIComponent(postUrl)}`);
            if (mirrorRes.ok) {
                const mirrorData = await mirrorRes.json();
                if (mirrorData && mirrorData.result) {
                    if (mirrorData.result.author) authorName = mirrorData.result.author;
                    if (Array.isArray(mirrorData.result.images)) {
                        imageUrls.push(...mirrorData.result.images);
                    }
                }
            }
        }

        imageUrls = [...new Set(imageUrls)].filter(u => typeof u === 'string' && u.startsWith('http'));

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '解析失败，请确保链接正确且帖子为公开状态' }), {
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
