export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const targetUrl = url.searchParams.get('url');
    const rapidApiKey = context.env.RAPIDAPI_KEY; // 从 Cloudflare 环境变量获取密钥

    if (!targetUrl) {
        return new Response(JSON.stringify({ success: false, error: '缺少目标链接' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!rapidApiKey) {
        return new Response(JSON.stringify({ success: false, error: '未配置 API 密钥' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 以 RapidAPI 某主流 Instagram 下载接口为例（请根据你实际订阅的 API 文档调整请求头和 URL）
        const apiHost = 'instagram-downloader-download-instagram-videos-stories.p.rapidapi.com'; // 示例 Host
        const apiRequestUrl = `https://${apiHost}/index?url=${encodeURIComponent(targetUrl)}`;

        const apiRes = await fetch(apiRequestUrl, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': rapidApiKey,
                'X-RapidAPI-Host': apiHost
            }
        });

        if (!apiRes.ok) {
            throw new Error('第三方解析服务响应失败');
        }

        const data = await apiRes.json();
        
        // 兼容处理：获取解析出的图片直链和作者名（不同 API 返回格式略有不同，按需调整）
        const imageUrl = data.media || data.imageUrl || (data.data && data.data[0]);
        const authorName = data.owner || data.username || 'instagram_user';

        if (imageUrl) {
            return new Response(JSON.stringify({ 
                success: true, 
                imageUrl: imageUrl,
                authorName: authorName
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ success: false, error: '未能从返回数据中找到图片' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: `解析异常: ${err.message}` }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
