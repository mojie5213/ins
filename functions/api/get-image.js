export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const targetUrl = url.searchParams.get('url');
    const rapidApiKey = context.env.RAPIDAPI_KEY;

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
        const apiHost = 'instagram-downloader-download-instagram-stories-videos4.p.rapidapi.com';
        const apiPath = '/convert'; // 确认使用 /convert 路径
        const apiRequestUrl = `https://${apiHost}${apiPath}?url=${encodeURIComponent(targetUrl)}`;

        const apiRes = await fetch(apiRequestUrl, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': rapidApiKey,
                'X-RapidAPI-Host': apiHost
            }
        });

        if (!apiRes.ok) {
            const errText = await apiRes.text();
            throw new Error(`API 拒绝响应 (状态码 ${apiRes.status}): ${errText}`);
        }

        const data = await apiRes.json();
        
        // 兼容处理该 API 的返回格式
        let imageUrl = '';
        if (data.media && Array.isArray(data.media) && data.media.length > 0) {
            imageUrl = data.media[0].u || data.media[0].th;
        } else if (data.url) {
            imageUrl = data.url;
        } else if (data.download_url) {
            imageUrl = data.download_url;
        }

        const authorName = data.owner || data.username || data.author || 'instagram_user';

        if (imageUrl) {
            return new Response(JSON.stringify({ 
                success: true, 
                imageUrl: imageUrl,
                authorName: authorName
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ success: false, error: `未找到图片，返回数据: ${JSON.stringify(data)}` }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: `解析异常: ${err.message}` }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
