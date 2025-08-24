import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || !url.includes("mp.weixin.qq.com")) {
      return NextResponse.json({ error: "请提供有效的微信公众号文章链接" }, { status: 400 })
    }

    // 设置请求头模拟浏览器访问
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    }

    const response = await fetch(url, {
      headers,
      redirect: "follow",
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()

    // 提取文章内容区域
    const contentMatch = html.match(/<div[^>]*class="rich_media_content"[^>]*>([\s\S]*?)<\/div>/i)
    let articleContent = contentMatch ? contentMatch[1] : html

    // 如果没有找到内容区域，尝试其他选择器
    if (!contentMatch) {
      const altMatch = html.match(/<div[^>]*id="js_content"[^>]*>([\s\S]*?)<\/div>/i)
      articleContent = altMatch ? altMatch[1] : html
    }

    // 提取标题
    const titleMatch =
      html.match(/<h1[^>]*class="rich_media_title"[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : ""

    return NextResponse.json({
      success: true,
      content: articleContent,
      title: title,
    })
  } catch (error) {
    console.error("获取文章失败:", error)
    return NextResponse.json({ error: "获取文章内容失败，请检查链接是否正确或尝试手动复制HTML内容" }, { status: 500 })
  }
}
