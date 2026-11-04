export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        let postUrl = url.searchParams.get('url');

        if (!postUrl) {
            return new Response(JSON.stringify({ success: false, error: '缺少 Instagram 链接' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 自动清理链接中的追踪参数
        if (postUrl.includes('?')) {
            postUrl = postUrl.split('?')[0];
        }

        const RAPID_API_KEY = 'c0d1ab2c0mshb4a51333f13f661p115c8ajsn564f93e255cf'; 

        // 使用你之前在 RapidAPI 测试成功的那个稳定 Host 和 /scraper 路径
        const apiUrl = `https://instagram-downloader-scraper-reels-igtv-posts-stories.p.rapidapi.com/scraper?url=${encodeURIComponent(postUrl)}`;
        
        const apiRes = await fetch(apiUrl, {
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': 'instagram-downloader-scraper-reels-igtv-posts-stories.p.rapidapi.com'
            }
        });

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

        // 深度兼容该接口的返回结构（支持多图列表和单图）
        const result = json.data || json.result || json;
        
        if (result) {
            if (result.owner?.username) authorName = result.owner.username;

            const mediaList = result.images || result.carousel_media || result.edge_sidecar_to_children?.edges || result;
            if (Array.isArray(mediaList)) {
                for (let item of mediaList) {
                    const img = item.url || item.node?.display_url || item.download_url || (typeof item === 'string' ? item : null);
                    if (typeof img === 'string' && img.startsWith('http')) {
                        imageUrls.push(img);
                    }
                }
            }

            if (imageUrls.length === 0) {
                const single = result.url || result.thumbnail || result.display_url;
                if (single) imageUrls.push(single);
            }
        }

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: `未找到图片，解析结构不匹配` }), {
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
