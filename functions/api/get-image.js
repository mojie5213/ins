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

        let imageUrls = [];
        let authorName = 'Instagram_User';

        // 使用目前对多图支持最好、最精准的稳定解析通道
        const apiRes = await fetch(`https://api.vkrproject.com/v1/instagram?url=${encodeURIComponent(postUrl)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (apiRes.ok) {
            const textBody = await apiRes.text();
            try {
                const data = JSON.parse(textBody);
                if (data && data.status && data.result) {
                    // 1. 精准提取博主真实名字
                    if (data.result.author) {
                        authorName = data.result.author;
                    } else if (data.result.username) {
                        authorName = data.result.username;
                    }

                    // 2. 精准提取多图数组
                    if (Array.isArray(data.result.images) && data.result.images.length > 0) {
                        imageUrls.push(...data.result.images);
                    } else if (data.result.url) {
                        imageUrls.push(data.result.url);
                    }
                }
            } catch (e) {}
        }

        // 备用兜底通道：如果主通道没拿到，使用备用接口
        if (imageUrls.length === 0) {
            const altRes = await fetch(`https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`);
            if (altRes.ok) {
                const altData = await altRes.json();
                if (altData && altData.author) authorName = altData.author;
                if (altData && Array.isArray(altData.urls)) {
                    imageUrls.push(...altData.urls);
                }
            }
        }

        // 严格去重并过滤出合法的 CDN 图片直链
        imageUrls = [...new Set(imageUrls)].filter(u => typeof u === 'string' && u.startsWith('http') && (u.includes('cdninstagram.com') || u.includes('fbcdn.net') || u.includes('scontent')));

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未能解析到图片，请确认该帖子为公开状态' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 过滤博主名中的非法文件夹字符（保留中英文、数字、下划线）
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
