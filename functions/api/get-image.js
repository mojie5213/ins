export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response(JSON.stringify({ success: false, error: '缺少目标链接' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 调用 Instagram 官方公开的 oEmbed 接口解析图片及作者名
        const oembedApi = `https://api.instagram.com/oembed/?url=${encodeURIComponent(targetUrl)}`;
        const oembedRes = await fetch(oembedApi, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        if (!oembedRes.ok) {
            throw new Error('无法获取该帖子的公开数据');
        }

        const data = await oembedRes.json();
        
        if (data.thumbnail_url) {
            return new Response(JSON.stringify({ 
                success: true, 
                imageUrl: data.thumbnail_url,
                authorName: data.author_name || 'instagram_user' // 返回作者名用于建子文件夹
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ success: false, error: '未找到有效图片' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: '解析异常，可能受目标账户隐私限制' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}