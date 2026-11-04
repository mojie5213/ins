export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        let postUrl = url.searchParams.get('url');

        if (!postUrl) {
            return new Response(JSON.stringify({ success: false, error: '缺少 Instagram 链接' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 清理追踪参数
        if (postUrl.includes('?')) {
            postUrl = postUrl.split('?')[0];
        }

        let imageUrls = [];
        let authorName = 'Instagram_Media';

        // 核心方案：直接抓取官方嵌入页（embed/captioned/），它完美支持多图且无需任何 Key
        const embedUrl = postUrl + (postUrl.endsWith('/') ? '' : '/') + 'embed/captioned/';
        const res = await fetch(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        });

        if (res.ok) {
            const html = await res.text();
            
            // 1. 提取真实博主用户名
            const authorMatch = html.match(/"owner":\s*\{[^}]*"username":\s*"([^"]+)"/);
            if (authorMatch && authorMatch[1]) {
                authorName = authorMatch[1];
            }

            // 2. 提取多图轮播中的所有高清图片直链
            const srcsetRegex = /srcset="([^"]+)"/g;
            let match;
            while ((match = srcsetRegex.exec(html)) !== null) {
                const srcset = match[1];
                const parts = srcset.split(',');
                if (parts.length > 0) {
                    const bestPart = parts[parts.length - 1].trim().split(' ')[0];
                    if (bestPart && bestPart.startsWith('http')) {
                        imageUrls.push(bestPart.replace(/&amp;/g, '&'));
                    }
                }
            }

            // 3. 备用：直接匹配页面中的 cdninstagram 链接
            if (imageUrls.length === 0) {
                const cdnRegex = /https:\/\/scontent[^"']+\.cdninstagram\.com\/[^"'\s]+/g;
                const cdnMatches = html.match(cdnRegex);
                if (cdnMatches) {
                    imageUrls.push(...cdnMatches);
                }
            }
        }

        // 4. 兜底：尝试通过官方 oEmbed 获取基本信息
        if (imageUrls.length === 0) {
            const oembedRes = await fetch(`https://graph.facebook.com/v15.0/instagram_oembed?url=${encodeURIComponent(postUrl)}&omitscript=true&access_token=17843844621462089|123456`);
            // 如果 oembed 不行，直接尝试抓取主页 og:image
            const mainRes = await fetch(postUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            if (mainRes.ok) {
                const mainHtml = await mainRes.text();
                const ogMatch = mainHtml.match(/<meta property="og:image" content="([^"]+)"/);
                if (ogMatch && ogMatch[1]) {
                    imageUrls.push(ogMatch[1].replace(/&amp;/g, '&'));
                }
                const titleMatch = mainHtml.match(/<meta property="og:title" content="([^"]+?)\s*\(/);
                if (titleMatch && titleMatch[1]) {
                    authorName = titleMatch[1].trim();
                }
            }
        }

        // 去重并过滤
        imageUrls = [...new Set(imageUrls)].filter(u => typeof u === 'string' && u.startsWith('http'));

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未能解析到图片，请确认该帖子为公开状态' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const safeAuthorName = authorName.replace(/[\/\\?%*:|"<>]/g, '_').trim() || 'Instagram_Media';

        return new Response(JSON.stringify({
            success: true,
            authorName: safeAuthorName,
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
