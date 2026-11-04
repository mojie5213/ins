export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const postUrl = url.searchParams.get('url');

        if (!postUrl || postUrl === 'https://www.instagram.com/' || postUrl === 'https://www.instagram.com') {
            return new Response(JSON.stringify({ success: false, error: '请输入有效的 Instagram 帖子或视频链接，而不是首页' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const RAPID_API_KEY = 'c0d1ab2c0mshb4a51333f13f661p115c8ajsn564f93e255cf'; 

        // 同时尝试兼容 url 和 url_or_shortcode 两个常见参数
        const apiRes = await fetch(`https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?url_or_shortcode=${encodeURIComponent(postUrl)}`, {
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
            return new Response(JSON.stringify({ success: false, error: `API 返回异常: ${textBody.slice(0, 100)}` }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        let imageUrls = [];
        let authorName = 'Instagram_Media';

        // 深度兼容各种返回字段结构
        const post = data.data || data.result || data;

        if (post) {
            if (post.owner?.username) {
                authorName = post.owner.username;
            }

            // 1. 检查多图轮播 (carousel_media / sidecar / images 等)
            const carousel = post.carousel_media || post.edge_sidecar_to_children?.edges || post.images;
            if (Array.isArray(carousel)) {
                for (let item of carousel) {
                    const imgUrl = item.node?.display_url || item.image_versions2?.candidates?.[0]?.url || item.url;
                    if (imgUrl) imageUrls.push(imgUrl);
                }
            }

            // 2. 如果没找到多图，检查单图字段
            if (imageUrls.length === 0) {
                const singleUrl = post.image_versions2?.candidates?.[0]?.url || post.display_url || post.url;
                if (singleUrl) {
                    imageUrls.push(singleUrl);
                }
            }
        }

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: `解析失败：未在返回数据中找到图片。请确认链接是公开的帖子` }), {
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
        return new Response(JSON.stringify({ success: false, error: `后端异常: ${err.message}` }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
