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

        const apiRes = await fetch(`https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?url_or_shortcode=${encodeURIComponent(postUrl)}`, {
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
            }
        });

        const textBody = await apiRes.text();
        
        // 尝试解析 JSON，如果失败说明上游 API 报错或返回了非 JSON 格式
        let data;
        try {
            data = JSON.parse(textBody);
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: `上游 API 返回数据格式错误: ${textBody.slice(0, 100)}` }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        let imageUrls = [];
        let authorName = 'Instagram_Media';

        if (data && data.data) {
            const post = data.data;
            if (post.owner && post.owner.username) {
                authorName = post.owner.username;
            }

            // 多图轮播提取
            if (post.carousel_media && Array.isArray(post.carousel_media)) {
                for (let item of post.carousel_media) {
                    const imgUrl = item.image_versions2?.candidates?.[0]?.url || item.url;
                    if (imgUrl) imageUrls.push(imgUrl);
                }
            } 
            // 单图提取
            else if (post.image_versions2?.candidates?.[0]?.url) {
                imageUrls.push(post.image_versions2.candidates[0].url);
            } else if (post.url) {
                imageUrls.push(post.url);
            }
        }

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未解析到图片，请检查链接是否正确或公开' }), {
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
        return new Response(JSON.stringify({ success: false, error: `后端运行异常: ${err.message}` }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
