export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        let postUrl = url.searchParams.get('url');

        if (!postUrl) {
            return new Response(JSON.stringify({ success: false, error: '缺少 Instagram 链接' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (postUrl.includes('?')) {
            postUrl = postUrl.split('?')[0];
        }

        // 使用稳定、免 Key、公开且支持多图的解析通道
        const apiRes = await fetch(`https://api.vkrproject.com/v1/instagram?url=${encodeURIComponent(postUrl)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const textBody = await apiRes.text();
        let json;
        try {
            json = JSON.parse(textBody);
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: `解析服务响应异常` }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        let imageUrls = [];
        let authorName = 'Instagram_Media';

        if (json && json.status && json.result) {
            const resData = json.result;
            if (resData.author) authorName = resData.author;

            if (Array.isArray(resData.images)) {
                imageUrls.push(...resData.images);
            } else if (resData.url) {
                imageUrls.push(resData.url);
            }
        }

        // 备用兜底解析通道
        if (imageUrls.length === 0) {
            const altRes = await fetch(`https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`);
            const altData = await altRes.json();
            if (altData && Array.isArray(altData.urls)) {
                imageUrls.push(...altData.urls);
            }
        }

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未解析到图片，请确保帖子是公开的' }), {
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
