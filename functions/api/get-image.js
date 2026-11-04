export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        let postUrl = url.searchParams.get('url');

        if (!postUrl) {
            return new Response(JSON.stringify({ success: false, error: '缺少 Instagram 链接' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 清理链接中的追踪参数
        if (postUrl.includes('?')) {
            postUrl = postUrl.split('?')[0];
        }

        let imageUrls = [];
        let authorName = 'Instagram_Media';

        // 使用稳定支持多图和博主名称的公开解析接口
        const apiRes = await fetch(`https://logos-api.vercel.app/api/ig?url=${encodeURIComponent(postUrl)}`);
        
        if (apiRes.ok) {
            const data = await apiRes.json();
            
            // 提取博主名
            if (data && data.author) {
                authorName = data.author;
            } else if (data && data.username) {
                authorName = data.username;
            }

            // 提取多张图片链接
            if (data && Array.isArray(data.urls) && data.urls.length > 0) {
                imageUrls.push(...data.urls);
            } else if (data && data.url) {
                imageUrls.push(data.url);
            }
        }

        // 备用通道：如果上面没取到多图，尝试通用解析通道
        if (imageUrls.length === 0) {
            const altRes = await fetch(`https://instagramapi.io/v1/details?url=${encodeURIComponent(postUrl)}`);
            if (altRes.ok) {
                const altData = await altRes.json();
                if (altData && altData.author) authorName = altData.author;
                if (altData && Array.isArray(altData.images)) {
                    imageUrls.push(...altData.images);
                }
            }
        }

        // 兜底：如果还是只有1张，尝试从主页抓取
        if (imageUrls.length === 0) {
            const embedRes = await fetch(postUrl + (postUrl.endsWith('/') ? '' : '/') + 'embed/captioned/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
                }
            });
            if (embedRes.ok) {
                const html = await embedRes.text();
                const cdnMatches = html.match(/https:\/\/scontent[^"']+\.cdninstagram\.com\/[^"'\s]+/g);
                if (cdnMatches) {
                    imageUrls.push(...cdnMatches);
                }
            }
        }

        // 数组去重并过滤
        imageUrls = [...new Set(imageUrls)].filter(u => typeof u === 'string' && u.startsWith('http'));

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未能解析到图片，请确认该帖子为公开状态' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            authorName: authorName.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_'), // 过滤非法文件夹字符
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
