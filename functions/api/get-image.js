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
        const apiPath = '/convert';
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
            throw new Error(`API 响应错误 (${apiRes.status}): ${errText}`);
        }

        const data = await apiRes.json();
        
        // 精准匹配当前 API 返回的 JSON 结构：从数组 media 中获取第一个元素的 url
        let imageUrl = '';
        if (data.media && Array.isArray(data.media) && data.media.length > 0) {
            imageUrl = data.media[0].url || data.media[0].thumbnail;
        } else if (data.url) {
            imageUrl = data.url;
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
            return new Response(JSON.stringify({ success: false, error: `未找到图片直链` }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: `解析异常: ${err.message}` }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
