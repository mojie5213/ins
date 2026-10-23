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
            return new Response(JSON.stringify({ success: false, error: `API请求失败 (${apiRes.status}): ${errText}` }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await apiRes.json();
        
        let imageUrls = [];
        
        // 兼容所有可能的字段组合（兼容图片数组、单图url、视频url等）
        if (data.media && Array.isArray(data.media)) {
            imageUrls = data.media.map(item => item.url || item.thumbnail || item.u || item.th).filter(Boolean);
        } else if (data.url) {
            imageUrls = [data.url];
        } else if (data.download_url) {
            imageUrls = [data.download_url];
        } else if (data.video_url) {
            imageUrls = [data.video_url];
        }

        const authorName = data.owner || data.username || data.author || 'instagram_user';

        if (imageUrls.length > 0) {
            return new Response(JSON.stringify({ 
                success: true, 
                imageUrls: imageUrls,
                authorName: authorName
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            // 如果还是找不到，把返回的 JSON 完整打印出来方便排查
            return new Response(JSON.stringify({ success: false, error: `未找到媒体直链，返回内容: ${JSON.stringify(data)}` }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: `解析异常: ${err.message}` }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
