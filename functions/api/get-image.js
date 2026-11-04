export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const postUrl = url.searchParams.get('url');

    if (!postUrl) {
        return new Response(JSON.stringify({ success: false, error: '缺少 Instagram 链接' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    // 已填入你的真实 RapidAPI Key
    const RAPID_API_KEY = 'c0d1ab2c0mshb4a51333f13f661p115c8ajsn564f93e255cf'; 

    try {
        const apiRes = await fetch(`https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?url_or_shortcode=${encodeURIComponent(postUrl)}`, {
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
            }
        });

        const data = await apiRes.json();
        let imageUrls = [];
        let authorName = 'Instagram_Media';

        if (data && data.data) {
            const post = data.data;
            if (post.owner && post.owner.username) {
                authorName = post.owner.username;
            }

            // 多图轮播 (sidecar) 提取
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
            throw new Error('未解析到图片，请检查链接或确保 API 额度正常');
        }

        return new Response(JSON.stringify({
            success: true,
            authorName: authorName,
            imageUrls: imageUrls
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
