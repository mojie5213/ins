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

        // 使用目前海外最稳定的公开多图解析通道
        const apiRes = await fetch(`https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`);
        
        if (apiRes.ok) {
            const data = await apiRes.json();
            
            // 提取博主名
            if (data && data.author) {
                authorName = data.author;
            } else if (data && data.username) {
                authorName = data.username;
            }

            // 提取所有图片直链
            if (data && Array.isArray(data.urls) && data.urls.length > 0) {
                imageUrls.push(...data.urls);
            } else if (data && data.url) {
                imageUrls.push(data.url);
            }
        }

        // 备用通道 2
        if (imageUrls.length === 0) {
            const altRes = await fetch(`https://api.vkrproject.com/v1/instagram?url=${encodeURIComponent(postUrl)}`);
            if (altRes.ok) {
                const altData = await altRes.json();
                if (altData && altData.result) {
                    if (altData.result.author) authorName = altData.result.author;
                    if (Array.isArray(altData.result.images)) {
                        imageUrls.push(...altData.result.images);
                    }
                }
            }
        }

        // 严格去重并过滤合法的图片直链
        imageUrls = [...new Set(imageUrls)].filter(u => typeof u === 'string' && u.startsWith('http') && (u.includes('cdninstagram.com') || u.includes('fbcdn.net') || u.includes('scontent')));

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未能解析到图片，请确认该帖子为公开状态' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 过滤博主名中的非法文件夹字符
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
