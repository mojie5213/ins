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

        const apiRes = await fetch(`https://instagram-downloader-download-instagram-stories-videos1.p.rapidapi.com/index?url=${encodeURIComponent(postUrl)}`, {
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': 'instagram-downloader-download-instagram-stories-videos1.p.rapidapi.com'
            }
        });

        const textBody = await apiRes.text();
        let json;
        try {
            json = JSON.parse(textBody);
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: `API 返回异常` }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        let imageUrls = [];
        let authorName = 'Instagram_Media';

        // 完美匹配你截图中的返回结构：data 是一个直达图片链接的数组
        const rawData = json.data || json.result || json;
        if (Array.isArray(rawData)) {
            for (let item of rawData) {
                // 如果 item 本身就是链接字符串
                if (typeof item === 'string' && item.startsWith('http')) {
                    imageUrls.push(item);
                } 
                // 如果 item 是对象，尝试提取里面的 url 字段
                else if (item && typeof item === 'object') {
                    const link = item.url || item.download_url || item.thumbnail;
                    if (typeof link === 'string' && link.startsWith('http')) {
                        imageUrls.push(link);
                    }
                }
            }
        }

        if (imageUrls.length === 0) {
            return new Response(JSON.stringify({ success: false, error: '未解析到图片链接' }), {
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
