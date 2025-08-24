"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Download, FileText, Link } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function WechatToMarkdown() {
  const [inputUrl, setInputUrl] = useState("")
  const [inputHtml, setInputHtml] = useState("")
  const [markdown, setMarkdown] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // 将HTML转换为Markdown
  const htmlToMarkdown = (html: string): string => {
    let markdown = html;

    // 1. Pre-processing: Handle WeChat multimedia components FIRST (before any cleanup)
    // Extract and replace audio components
    let audioMatches = html.match(/<mp-common-mpaudio[^>]*>/gi);
    if (audioMatches) {
      audioMatches.forEach(match => {
        const nameMatch = match.match(/name=["']([^"']+)["']/i);
        const lengthMatch = match.match(/play_length=["']([^"']+)["']/i);
        const durationMatch = match.match(/duration=["']([^"']+)["']/i);
        
        let name = nameMatch ? nameMatch[1] : '音频';
        let duration = '';
        
        // Handle different duration formats
        if (lengthMatch) {
          const lengthValue = lengthMatch[1];
          // Convert milliseconds to time format if needed
          if (lengthValue.match(/^\d+$/)) {
            const seconds = Math.floor(parseInt(lengthValue) / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            duration = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
          } else {
            duration = lengthValue;
          }
        } else if (durationMatch) {
          duration = durationMatch[1];
        }
        
        // Clean up technical names
        if (name === 'insertaudio' || name.includes('plugin')) {
          name = '音频内容';
        }
        
        const replacement = duration ? 
          `\n\n🎵 **音频**：${name} (${duration})\n\n> ⚠️ 注意：微信音频无法在Markdown中播放，需要在原文中收听\n\n` : 
          `\n\n🎵 **音频**：${name}\n\n> ⚠️ 注意：微信音频无法在Markdown中播放，需要在原文中收听\n\n`;
        markdown = markdown.replace(match, replacement);
      });
    } else {
      // Fallback: look for any mention of mp-common-mpaudio
      if (html.includes('mp-common-mpaudio')) {
        markdown = markdown.replace(/mp-common-mpaudio[^>]*>/gi, '\n\n🎵 **检测到音频组件**\n\n');
      }
    }
    
    // Extract and replace video components
    let videoMatches = html.match(/<iframe[^>]*src=["'][^"']*v\.qq\.com[^"']*["'][^>]*>/gi);
    if (videoMatches) {
      videoMatches.forEach(match => {
        const srcMatch = match.match(/src=["']([^"']+)["']/i);
        const vidMatch = match.match(/vid=([^&"']+)/i);
        const src = srcMatch ? srcMatch[1] : '';
        const videoId = vidMatch ? vidMatch[1] : '';
        
        const videoInfo = videoId ? 
          `\n\n📹 **腾讯视频**：${videoId}\n\n[🔗 点击播放视频](${src})\n\n> 💡 提示：点击上方链接在浏览器中播放视频\n\n` :
          `\n\n📹 **视频**\n\n[🔗 点击播放视频](${src})\n\n> 💡 提示：点击上方链接在浏览器中播放视频\n\n`;
        
        markdown = markdown.replace(match, videoInfo);
      });
    }
    
    // Handle video containers
    markdown = markdown.replace(/<span[^>]*class="js_tx_video_container"[^>]*>.*?<\/span>/gi, '\n\n📹 **视频播放器**\n\n');
    
    // Remove any remaining multimedia tags
    markdown = markdown.replace(/<\/?mp-common-mpaudio[^>]*>/gi, '');
    markdown = markdown.replace(/点击边框调出视频工具条/gi, '');

    // 1.5. Sanitization
    // Remove script and style tags completely
    markdown = markdown.replace(/<script[^>]*>.*?<\/script>/gis, "");
    markdown = markdown.replace(/<style[^>]*>.*?<\/style>/gis, "");
    // Remove unwanted attributes (but keep some for multimedia detection)
    markdown = markdown.replace(/\s(style|id)="[^"]*"/gi, "");

    // Additional iframe handling (fallback)
    markdown = markdown.replace(
      /<iframe[^>]*src=["']([^"']+)["'][^>]*><\/iframe>/gi,
      '\n\n📹 **视频**：$1\n\n'
    );

    // Handle WeChat profile components
    markdown = markdown.replace(
      /<mp-common-profile[^>]*data-nickname=["']([^"']+)["'][^>]*>/gi,
      '\n\n👤 **微信号**：$1\n\n'
    );

    // Remove decorative elements (dots, spans used for styling)
    markdown = markdown.replace(
      /<span[^>]*width:\s*\d+px[^>]*height:\s*\d+px[^>]*border-radius:\s*50%[^>]*><\/span>/gi,
      ''
    );

    // Handle WeChat layout containers and remove empty containers
    markdown = markdown.replace(/<section[^>]*powered-by="xiumi\.us"[^>]*><\/section>/gi, "");
    markdown = markdown.replace(/<section[^>]*><svg[^>]*><\/svg><\/section>/gi, "");
    
    // Handle text decoration spans (underline, strikethrough)
    markdown = markdown.replace(/<span[^>]*text-decoration:\s*underline[^>]*>(.*?)<\/span>/gi, "$1");
    markdown = markdown.replace(/<span[^>]*text-decoration:\s*line-through[^>]*>(.*?)<\/span>/gi, "~~$1~~");
    
    // Clean up excessive nesting in WeChat articles
    markdown = markdown.replace(/<p[^>]*><span[^>]*><span[^>]*>(.*?)<\/span><\/span><\/p>/gi, "$1\n\n");

    // 2. Structural Tag Conversion (Normalize common container tags)
    // Handle complex nested sections with inline-block layout
    markdown = markdown.replace(
      /<section[^>]*display:\s*inline-block[^>]*width:\s*\d+%[^>]*>(.*?)<\/section>/gis,
      '$1\n\n'
    );
    
    // Convert divs and sections used for structure into paragraphs
    markdown = markdown.replace(/<(div|section)[^>]*>/gi, "<p>");
    markdown = markdown.replace(/<\/(div|section)>/gi, "</p>");

    // 3. Block-Level Element Conversion
    // Headings (h1-h6) - Preserve inner formatting by converting it later
    markdown = markdown.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
      return "\n\n" + "#".repeat(Number.parseInt(level)) + " " + content.trim() + "\n\n";
    });

    // Paragraphs - Ensure they are separated by newlines
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gis, (match, content) => {
      // Only add newlines if the paragraph is not empty
      return content.trim() ? "\n\n" + content.trim() + "\n\n" : "";
    });

    // Blockquotes
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, content) => {
        // Process each line inside the blockquote
        const lines = content.trim().split('\n');
        return "\n\n" + lines.map(line => `> ${line}`).join('\n') + "\n\n";
    });

    // Unordered Lists
    markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
        const items = content.replace(/<li[^>]*>(.*?)<\/li>/gis, (liMatch, liContent) => {
            return `\n- ${liContent.trim()}`;
        });
        return items + "\n\n";
    });

    // Ordered Lists
    markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
        let counter = 1;
        const items = content.replace(/<li[^>]*>(.*?)<\/li>/gis, (liMatch, liContent) => {
            return `\n${counter++}. ${liContent.trim()}`;
        });
        return items + "\n\n";
    });

    // Code Blocks
    markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, (match, content) => {
      const cleanContent = content.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
      return "\n\n```\n" + cleanContent.trim() + "\n```\n\n";
    });
    
    // Tables
    markdown = markdown.replace(/<table[^>]*>(.*?)<\/table>/gis, (match, content) => {
      let tableMarkdown = "\n";
      const rows = content.match(/<tr[^>]*>(.*?)<\/tr>/gis) || [];
      rows.forEach((row, index) => {
        const cells = row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis) || [];
        const cellContents = cells.map(cell =>
          cell.replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/i, "$1").trim()
        );
        tableMarkdown += "| " + cellContents.join(" | ") + " |\n";
        if (index === 0) {
          tableMarkdown += "| " + cellContents.map(() => "---").join(" | ") + " |\n";
        }
      });
      return tableMarkdown + "\n";
    });

    // Horizontal Rules
    markdown = markdown.replace(/<hr[^>]*>/gi, "\n\n---\n\n");
    
    // Line breaks
    markdown = markdown.replace(/<br\s*\/?>/gi, "\n");

    // 4. Inline Element Conversion (Done after blocks to preserve them)
    // Images with proxy
    markdown = markdown.replace(
      /<img[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi,
      (match, src, alt) => {
        if (src.includes("image.baidu.com")) {
          return `![${alt || ""}](${src})`;
        }
        const proxyUrl = `https://image.baidu.com/search/down?thumburl=${encodeURIComponent(src)}`;
        return `![${alt || ""}](${proxyUrl})`;
      },
    );

    // Links
    markdown = markdown.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)");

    // Bold and Strong
    markdown = markdown.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, "**$2**");
    
    // Italic and Emphasis
    markdown = markdown.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, "*$2*");
    
    // Inline Code
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, (match, content) => {
      return `\`${content.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")}\``;
    });

    // 5. Final Cleanup
    // Remove any remaining HTML tags
    markdown = markdown.replace(/<[^>]+>/g, "");

    // Clean up WeChat-specific artifacts
    // Remove powered-by attributes and other WeChat artifacts
    markdown = markdown.replace(/powered-by="[^"]*"/gi, "");
    markdown = markdown.replace(/nodeleaf="[^"]*"/gi, "");
    markdown = markdown.replace(/leaf="[^"]*"/gi, "");
    
    // Remove excessive whitespace and empty lines from complex layouts
    markdown = markdown.replace(/^\s*$/gm, ""); // Remove empty lines
    markdown = markdown.replace(/\n\s*\n\s*\n/g, "\n\n"); // Collapse multiple newlines

    // Decode HTML entities
    const htmlEntities: { [key: string]: string } = {
      "&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"',
      "&#39;": "'", "&ldquo;": '"', "&rdquo;": '"', "&lsquo;": "'", "&rsquo;": "'",
      "&mdash;": "—", "&ndash;": "–", "&hellip;": "…", "&copy;": "©",
      "&reg;": "®", "&trade;": "™",
    };
    Object.entries(htmlEntities).forEach(([entity, char]) => {
      markdown = markdown.replace(new RegExp(entity, "g"), char);
    });

    // Normalize whitespace
    // Replace multiple newlines with a maximum of two
    markdown = markdown.replace(/\n{3,}/g, "\n\n");
    // Trim leading/trailing whitespace from the entire string
    markdown = markdown.trim();

    // Post-processing: Clean up artifacts from complex WeChat layouts
    // Remove standalone symbols and decorative text
    markdown = markdown.replace(/^\s*[•·▪▫◦‣⁃]\s*$/gm, ""); // Remove bullet points on their own lines
    markdown = markdown.replace(/^\s*["""'']\s*$/gm, ""); // Remove standalone quotes
    markdown = markdown.replace(/^\s*[～〜~]\s*$/gm, ""); // Remove decorative tildes
    
    // Clean up excessive asterisks and formatting artifacts
    // Remove standalone asterisks on their own lines
    markdown = markdown.replace(/^\s*\*+\s*$/gm, "");
    
    // Remove excessive asterisks in text (more than 4 consecutive)
    markdown = markdown.replace(/\*{5,}/g, "**");
    
    // Clean up malformed bold formatting
    markdown = markdown.replace(/\*\*\*\*([^*]+)\*\*\*\*/g, "**$1**");
    markdown = markdown.replace(/\*\*\*([^*]+)\*\*\*/g, "**$1**");
    
    // Remove asterisks that are just decorative (not formatting)
    // But preserve meaningful formatting like **text**
    markdown = markdown.replace(/\*{6,}/g, ""); // Remove 6+ consecutive asterisks
    
    // Clean up specific patterns from your example
    markdown = markdown.replace(/\*\*\*\*([^*\n]+)\*\*\*\*/g, "**$1**"); // ****text**** -> **text**
    markdown = markdown.replace(/\*\*([^*\n]*?)\*\*\*\*([^*\n]*?)\*\*\*\*([^*\n]*?)\*\*/g, "**$1$2$3**"); // Complex patterns
    
    // Clean up empty bold/italic tags
    markdown = markdown.replace(/\*\*\s*\*\*/g, "");
    markdown = markdown.replace(/\*\s*\*/g, "");
    
    // Handle the specific pattern from your example: **text****other****text**
    // Convert to proper bold formatting
    markdown = markdown.replace(/\*\*([^*]+?)\*\*\*\*([^*]+?)\*\*\*\*([^*]+?)\*\*/g, "**$1** **$2** **$3**");
    markdown = markdown.replace(/\*\*([^*]+?)\*\*\*\*([^*]+?)\*\*/g, "**$1** **$2**");
    
    // Remove standalone asterisks that are not part of markdown formatting
    markdown = markdown.replace(/^(\s*)\*+(\s*)$/gm, "$1$2");
    
    // Clean up patterns like "****" at the beginning of lines
    markdown = markdown.replace(/^\*{2,}/gm, "");
    
    // Final cleanup of excessive newlines
    markdown = markdown.replace(/\n{3,}/g, "\n\n");

    return markdown;
  }

  // 从URL获取文章内容
  const fetchFromUrl = async () => {
    if (!inputUrl.trim()) {
      toast({
        title: "错误",
        description: "请输入有效的微信公众号文章链接",
        variant: "destructive",
      })
      return
    }

    if (!inputUrl.includes("mp.weixin.qq.com")) {
      toast({
        title: "错误",
        description: "请输入有效的微信公众号文章链接",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/fetch-article", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: inputUrl }),
      })

      const data = await response.json()

      if (data.success) {
        // 自动转换获取到的内容，并添加原文链接
        const result = htmlToMarkdown(data.content)
        const titleText = data.title ? `# ${data.title}\n\n` : ''
        const sourceLink = `> 📖 **原文链接**：[点击查看原文](${inputUrl})\n\n> 💡 **提示**：音频、视频等多媒体内容请在原文中查看\n\n---\n\n`
        setMarkdown(titleText + sourceLink + result)
        toast({
          title: "成功",
          description: `文章"${data.title}"获取并转换完成！`,
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("获取文章失败:", error)
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "获取文章内容失败，请尝试手动复制HTML内容",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 转换HTML内容
  const convertHtml = () => {
    if (!inputHtml.trim()) {
      toast({
        title: "错误",
        description: "请输入HTML内容",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = htmlToMarkdown(inputHtml)
      const sourceHint = `> 💡 **提示**：如需添加原文链接，请手动编辑Markdown内容\n\n> 📝 **格式**：\`> 📖 **原文链接**：[点击查看原文](原文URL)\`\n\n---\n\n`
      setMarkdown(sourceHint + result)
      toast({
        title: "成功",
        description: "转换完成！",
      })
    } catch (error) {
      toast({
        title: "错误",
        description: "转换失败，请检查HTML格式",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 复制到剪贴板
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      toast({
        title: "成功",
        description: "已复制到剪贴板",
      })
    } catch (error) {
      toast({
        title: "错误",
        description: "复制失败",
        variant: "destructive",
      })
    }
  }

  // 下载Markdown文件
  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "article.md"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "成功",
      description: "文件下载已开始",
    })
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 标题 */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <a 
              href="https://github.com/1143520/wechat-markdown" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img 
                src="https://jsd.chatbtc.cn.eu.org/gh/manji1143/picx-images-hosting@master/paste/picx-%E6%B0%B4%E5%A2%A8%E7%94%BB-logo-%E8%AE%BE%E8%AE%A1.41ye3jxic1.webp" 
                alt="微信转Markdown Logo" 
                className="w-16 h-16 object-contain"
              />
            </a>
          <h1 className="text-3xl font-bold text-foreground">微信公众号文章转Markdown</h1>
          </div>
          <p className="text-muted-foreground">将微信公众号文章转换为Markdown格式，图片自动使用代理链接</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 输入区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                输入内容
              </CardTitle>
              <CardDescription>输入微信公众号文章链接或直接粘贴HTML内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="url" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url" className="flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    URL链接
                  </TabsTrigger>
                  <TabsTrigger value="html" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    HTML内容
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">微信公众号文章链接</Label>
                    <Input
                      id="url"
                      placeholder="https://mp.weixin.qq.com/s/..."
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                    />
                  </div>
                  <Button onClick={fetchFromUrl} disabled={isLoading} className="w-full">
                    {isLoading ? "获取中..." : "获取并转换文章"}
                  </Button>
                  <p className="text-sm text-muted-foreground">支持直接从微信公众号链接获取文章内容并自动转换</p>
                </TabsContent>

                <TabsContent value="html" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="html">HTML内容</Label>
                    <Textarea
                      id="html"
                      placeholder="粘贴微信公众号文章的HTML内容..."
                      value={inputHtml}
                      onChange={(e) => setInputHtml(e.target.value)}
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button onClick={convertHtml} disabled={isLoading} className="w-full">
                    {isLoading ? "转换中..." : "转换为Markdown"}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 输出区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Markdown输出
                </span>
                {markdown && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 bg-transparent"
                    >
                      <Copy className="w-4 h-4" />
                      复制
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadMarkdown}
                      className="flex items-center gap-2 bg-transparent"
                    >
                      <Download className="w-4 h-4" />
                      下载
                    </Button>
                  </div>
                )}
              </CardTitle>
              <CardDescription>转换后的Markdown格式内容，图片已使用代理链接，音频/视频转换为文本标记</CardDescription>
            </CardHeader>
            <CardContent>
              {markdown ? (
                <Textarea value={markdown} readOnly rows={20} className="font-mono text-sm" />
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground border border-dashed rounded-md">
                  转换后的Markdown内容将显示在这里
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">方法一：URL链接转换（推荐）</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>复制微信公众号文章链接</li>
                  <li>粘贴到URL输入框中</li>
                  <li>点击"获取并转换文章"按钮</li>
                  <li>等待自动获取并转换完成</li>
                </ol>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">方法二：HTML内容转换</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>打开微信公众号文章页面</li>
                  <li>按F12打开开发者工具</li>
                  <li>找到文章内容的HTML代码</li>
                  <li>复制HTML内容到文本框</li>
                  <li>点击"转换为Markdown"按钮</li>
                </ol>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">功能特点</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>支持直接从微信公众号链接获取文章内容</li>
                <li>自动添加原文链接和标题（URL模式）</li>
                <li>自动转换标题、段落、列表等格式</li>
                <li>图片链接自动使用代理，确保显示正常</li>
                <li>音频/视频转换为文本标记和播放链接</li>
                <li>保留文章的基本结构和格式</li>
                <li>支持复制到剪贴板和下载文件</li>
                <li>支持粗体、斜体、链接等样式</li>
                <li>支持表格和水平分割线的转换</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  )
}
