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
        if (data.media && Array.isArray(data.media)) {
            imageUrls = data.media.map(item => item.url || item.thumbnail || item.u || item.th).filter(Boolean);
        } else if (data.url) {
            imageUrls = [data.url];
        } else if (data.download_url) {
            imageUrls = [data.download_url];
        }

        // 1. 尝试从链接中提取 Instagram 帖子的唯一短码 (例如 DeuULbPE9q4) 作为保底文件夹名
        let postCode = 'post';
        const match = targetUrl.match(/\/p\/([a-zA-Z0-9_-]+)/) || targetUrl.match(/\/reel\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            postCode = `ins_${match[1]}`;
        }

        // 2. 优先使用 API 返回的作者名，如果没有则使用提取出的帖子短码文件夹名
        const authorName = data.owner || data.username || data.author || postCode;

        if (imageUrls.length > 0) {
            return new Response(JSON.stringify({ 
                success: true, 
                imageUrls: imageUrls,
                authorName: authorName
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ success: false, error: `未找到媒体直链` }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: `解析异常: ${err.message}` }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
