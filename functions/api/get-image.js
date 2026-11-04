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

        // 后端通道 1
        try {
            const res1 = await fetch(`https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`);
            if (res1.ok) {
                const data1 = await res1.json();
                if (data1.author) authorName = data1.author;
                else if (data1.username) authorName = data1.username;
                if (Array.isArray(data1.urls) && data1.urls.length > 0) {
                    imageUrls.push(...data1.urls);
                } else if (data1.url) {
                    imageUrls.push(data1.url);
                }
            }
        } catch (e) {}

        // 后端通道 2 备用
        if (imageUrls.length === 0) {
            try {
                const res2 = await fetch(`https://api.vkrproject.com/v1/instagram?url=${encodeURIComponent(postUrl)}`);
                if (res2.ok) {
                    const data2 = await res2.json();
                    if (data2 && data2.result) {
                        if (data2.result.author) authorName = data2.result.author;
                        if (Array.isArray(data2.result.images)) {
                            imageUrls.push(...data2.result.images);
                        }
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

        // 过滤博主名中的非法文件夹字符，防止新建文件夹失败
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
