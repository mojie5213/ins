export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        let postUrl = url.searchParams.get('url');

        if (!postUrl) {
            return new Response(JSON.stringify({ success: false, error: '缺少 Instagram 链接' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 自动清理链接中的追踪参数（如 ?utm_source=...），只保留核心网址
        if (postUrl.includes('?')) {
            postUrl = postUrl.split('?')[0];
        }

        const RAPID_API_KEY = 'c0d1ab2c0mshb4a51333f13f661p115c8ajsn564f93e255cf'; 

        const apiUrl = `https://instagram-downloader-download-instagram-stories-videos1.p.rapidapi.com/index?url=${encodeURIComponent(postUrl)}`;
        
        let apiRes;
        try {
            apiRes = await fetch(apiUrl, {
                headers: {
                    'x-rapidapi-key': RAPID_API_KEY,
                    'x-rapidapi-host': 'instagram-downloader-download-instagram-stories-videos1.p.rapidapi.com'
                }
            });
        } catch (fetchErr) {
            return new Response(JSON.stringify({ success: false, error: `网络请求失败: ${fetchErr.message}` }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const textBody = await apiRes.text();
        
        let json;
        try {
            json = JSON.parse(textBody);
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: `API非JSON返回: ${textBody.slice(0, 100)}` }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (json.message || json.error) {
            return new Response(JSON.stringify({ success: false, error: `API提示: ${json.message || json.error}` }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        let imageUrls = [];
        let authorName = 'Instagram_Media';

        const rawData = json.data || json.result || json;
        if (Array.isArray(rawData)) {
            for (let item of rawData) {
                if (typeof item === 'string' && item.startsWith('http')) {
                    imageUrls.push(item);
                } else if (item && typeof item === 'object') {
                    const link = item.url || item.download_url || item.thumbnail;
                    if (typeof link === 'string' && link.startsWith('http')) {
                        imageUrls.push(link);
                    }
                }
            }
        }

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: `未找到图片，原始内容: ${textBody.slice(0, 120)}` }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            authorName: authorName,
            imageUrls: imageUrls
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: `系统异常捕获: ${err.message}` }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
