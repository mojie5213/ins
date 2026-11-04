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

        let imageUrls = [];
        let authorName = 'Instagram_Media';

        // 线路 1：使用 SaveInsta / SnapInsta 类的公开轻量解析通道
        try {
            const res1 = await fetch(`https://instagramapi.io/v1/details?url=${encodeURIComponent(postUrl)}`);
            const text1 = await res1.text();
            const data1 = JSON.parse(text1);
            if (data1 && data1.images) {
                imageUrls.push(...data1.images);
            }
        } catch (e) {}

        // 线路 2：如果线路1没拿到，使用备用解析通道 A
        if (imageUrls.length === 0) {
            try {
                const res2 = await fetch(`https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`);
                const text2 = await res2.text();
                const data2 = JSON.parse(text2);
                if (data2 && Array.isArray(data2.urls)) {
                    imageUrls.push(...data2.urls);
                }
            } catch (e) {}
        }

        // 线路 3：万能兜底网页直连解析（直接提取 Instagram 官方 Open Graph 标签）
        if (imageUrls.length === 0) {
            try {
                const res3 = await fetch(postUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept-Language': 'en-US,en;q=0.9'
                    }
                });
                const html = res3.ok ? await res3.text() : '';
                const match = html.match(/<meta property="og:image" content="([^"]+)"/);
                if (match && match[1]) {
                    imageUrls.push(match[1].replace(/&amp;/g, '&'));
                }
            } catch (e) {}
        }

        // 去重
        imageUrls = [...new Set(imageUrls)];

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '所有解析线路均未获取到图片，请确认该帖子为公开状态' }), {
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
