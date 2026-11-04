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

        // 规范化链接，确保带 https://
        let targetUrl = postUrl.trim();
        if (!targetUrl.startsWith('http')) {
            targetUrl = 'https://' + targetUrl;
        }

        const apiRes = await fetch(`https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?url_or_shortcode=${encodeURIComponent(targetUrl)}`, {
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
            }
        });

        const textBody = await apiRes.text();

        let data;
        try {
            data = JSON.parse(textBody);
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: `API返回非JSON: ${textBody.slice(0, 150)}` }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 如果上游 API 返回了错误信息（比如配额用完或参数错误）
        if (data.message || data.error) {
            return new Response(JSON.stringify({ success: false, error: `API提示: ${data.message || data.error}` }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        let imageUrls = [];
        let authorName = 'Instagram_Media';

        // 递归或多重路径查找图片，适配该接口的所有可能结构
        const item = data.data || data.result || data;
        
        if (item) {
            if (item.owner?.username) authorName = item.owner.username;

            // 查找多图轮播
            const sidecar = item.carousel_media || item.edge_sidecar_to_children?.edges || item.images;
            if (Array.isArray(sidecar)) {
                for (let sub of sidecar) {
                    const img = sub.node?.display_url || sub.image_versions2?.candidates?.[0]?.url || sub.url;
                    if (img) imageUrls.push(img);
                }
            }

            // 查找单图
            if (imageUrls.length === 0) {
                const single = item.image_versions2?.candidates?.[0]?.url || item.display_url || item.url;
                if (single) imageUrls.push(single);
            }
        }

        // 如果还是找不到，把整个 JSON 的前 200 个字符打印出来用于调试
        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: `调试数据: ${JSON.stringify(data).slice(0, 200)}` }), {
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
