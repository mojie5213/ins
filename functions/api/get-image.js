export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const postUrl = url.searchParams.get('url');

    if (!postUrl) {
        return new Response(JSON.stringify({ success: false, error: '缺少 Instagram 链接' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    try {
        // 伪装成手机端浏览器访问 Instagram 帖子
        const res = await fetch(postUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        const html = await res.text();
        const imageUrls = [];

        // 核心提取：通过正则匹配页面中的 og:image（Open Graph 封面图或大图）
        const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (ogImageMatch && ogImageMatch[1]) {
            // 将 HTML 实体转义字符（如 &amp;）还原为 &
            let decodedUrl = ogImageMatch[1].replace(/&amp;/g, '&');
            imageUrls.push(decodedUrl);
        }

        // 尝试匹配多图轮播中的其他图片
        const allOgImages = html.matchAll(/<meta property="og:image" content="([^"]+)"/g);
        for (const match of allOgImages) {
            let decodedUrl = match[1].replace(/&amp;/g, '&');
            if (!imageUrls.includes(decodedUrl)) {
                imageUrls.push(decodedUrl);
            }
        }

        if (imageUrls.length === 0) {
            throw new Error('未能从该链接解析出图片，请确保链接公开且正确');
        }

        // 提取作者名字作为文件夹名（默认为 Instagram）
        let authorName = 'Instagram_User';
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        if (titleMatch && titleMatch[1]) {
            const matchAuthor = titleMatch[1].match(/\((.*?)\)/);
            if (matchAuthor && matchAuthor[1]) {
                authorName = matchAuthor[1].replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
            }
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
