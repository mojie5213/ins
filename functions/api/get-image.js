export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const postUrl = url.searchParams.get('url');

        if (!postUrl) {
            return new Response(JSON.stringify({ success: false, error: '缺少 Instagram 链接' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const RAPID_API_KEY = 'c0d1ab2c0mshb4a51333f13f661p115c8ajsn564f93e255cf'; 

        let targetUrl = postUrl.trim();
        if (!targetUrl.startsWith('http')) {
            targetUrl = 'https://' + targetUrl;
        }

        // 使用当前 RapidAPI 页面中对应的正确 Host 和路径
        const apiRes = await fetch(`https://instagram-downloader-scraper-reels-igtv-posts-stories.p.rapidapi.com/scraper?url=${encodeURIComponent(targetUrl)}`, {
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': 'instagram-downloader-scraper-reels-igtv-posts-stories.p.rapidapi.com'
            }
        });

        const textBody = await apiRes.text();
        let data;
        try {
            data = JSON.parse(textBody);
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: `API返回异常: ${textBody.slice(0, 150)}` }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (data.message || data.error) {
            return new Response(JSON.stringify({ success: false, error: `API提示: ${data.message || data.error}` }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        let imageUrls = [];
        let authorName = 'Instagram_Media';

        // 适配该接口常见的数据返回结构
        const result = data.data || data.result || data;
        
        if (result) {
            if (result.owner?.username) authorName = result.owner.username;

            // 提取多图或单图
            const mediaList = result.images || result.carousel_media || result.edge_sidecar_to_children?.edges;
            if (Array.isArray(mediaList)) {
                for (let item of mediaList) {
                    const img = item.url || item.node?.display_url || item;
                    if (typeof img === 'string' && img.startsWith('http')) {
                        imageUrls.push(img);
                    }
                }
            }

            // 如果上面没提取到，尝试直接读取单图字段
            if (imageUrls.length === 0) {
                const single = result.url || result.thumbnail || result.display_url;
                if (single) imageUrls.push(single);
            }
        }

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: `未能解析出图片，原始返回: ${textBody.slice(0, 100)}` }), {
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
        return new Response(JSON.stringify({ success: false, error: `系统异常: ${err.message}` }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
