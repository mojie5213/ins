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
        if (!postUrl.endsWith('/')) {
            postUrl += '/';
        }

        let imageUrls = [];
        let authorName = 'Instagram_Media';

        // 核心：抓取移动端嵌入页（embed/captioned/），它包含了多图轮播的所有图片
        const embedUrl = postUrl + 'embed/captioned/';
        const res = await fetch(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        });

        if (res.ok) {
            const html = await res.text();
            
            // 1. 提取博主真实用户名作为文件夹名
            const authorMatch = html.match(/"owner":\s*\{[^}]*"username":\s*"([^"]+)"/);
            if (authorMatch && authorMatch[1]) {
                authorName = authorMatch[1];
            } else {
                const altAuthor = html.match(/class="[^"]*UsernameText[^"]*">([^<]+)</);
                if (altAuthor && altAuthor[1]) authorName = altAuthor[1].trim();
            }

            // 2. 提取多图轮播中的所有高清图片链接
            const imgRegex = /srcset="([^"]+)"/g;
            let match;
            while ((match = imgRegex.exec(html)) !== null) {
                const srcset = match[1];
                // srcset 里面通常包含多个分辨率，取最后一个（最高清的）
                const parts = srcset.split(',');
                if (parts.length > 0) {
                    const bestPart = parts[parts.length - 1].trim().split(' ')[0];
                    if (bestPart && bestPart.startsWith('http')) {
                        imageUrls.push(bestPart.replace(/&amp;/g, '&'));
                    }
                }
            }

            // 如果上面没抓到，尝试匹配所有 cdninstagram 图片链接
            if (imageUrls.length === 0) {
                const cdnRegex = /https:\/\/scontent[^"']+\.cdninstagram\.com\/[^"'\s]+/g;
                const cdnMatches = html.match(cdnRegex);
                if (cdnMatches) {
                    imageUrls.push(...cdnMatches);
                }
            }
        }

        // 3. 兜底：如果嵌入页没拿到，抓取主页的 og:image 和标题
        if (imageUrls.length === 0) {
            const mainRes = await fetch(postUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (mainRes.ok) {
                const mainHtml = await mainRes.text();
                
                const ogImageMatch = mainHtml.match(/<meta property="og:image" content="([^"]+)"/);
                if (ogImageMatch && ogImageMatch[1]) {
                    imageUrls.push(ogImageMatch[1].replace(/&amp;/g, '&'));
                }

                const titleMatch = mainHtml.match(/<meta property="og:title" content="([^"]+?)\s*\(/);
                if (titleMatch && titleMatch[1]) {
                    authorName = titleMatch[1].trim();
                }
            }
        }

        // 数组去重并清洗无效链接
        imageUrls = [...new Set(imageUrls)].filter(url => url.includes('cdninstagram.com') || url.includes('fbcdn.net') || url.startsWith('http'));

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未能解析到图片，请确认该帖子为公开状态' }), {
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
