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

    // 1. Pre-processing and Sanitization
    // Remove script and style tags completely
    markdown = markdown.replace(/<script[^>]*>.*?<\/script>/gis, "");
    markdown = markdown.replace(/<style[^>]*>.*?<\/style>/gis, "");
    
    // Handle WeChat-specific components
    // Remove WeChat profile components but keep a placeholder
    markdown = markdown.replace(/<mp-common-profile[^>]*data-nickname=["']([^"']*)["'][^>]*><\/mp-common-profile>/gi, "\n\n---\n**关注公众号：$1**\n---\n\n");
    markdown = markdown.replace(/<section[^>]*class="mp_profile_iframe_wrp"[^>]*>.*?<\/section>/gis, "");
    
    // Remove unwanted attributes but preserve some useful ones temporarily
    markdown = markdown.replace(/\s(style|id|data-[^=]*|class(?!="list-paddingleft-[12]"))="[^"]*"/gi, "");
    
    // Handle WeChat dark mode classes
    markdown = markdown.replace(/\sclass="js_darkmode__\d+"/gi, "");

    // 2. Structural Tag Conversion
    // Handle WeChat's nested list structure first (preserve list classes temporarily)
    // Convert divs and sections used for structure into paragraphs, but preserve list containers
    markdown = markdown.replace(/<(div|section)(?![^>]*class="list-paddingleft-[12]")[^>]*>/gi, "<p>");
    markdown = markdown.replace(/<\/(div|section)>/gi, "</p>");

    // 3. Block-Level Element Conversion
    // Headings with better content cleaning
    markdown = markdown.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
      // Clean inner HTML but preserve text formatting
      const cleanContent = content
        .replace(/<span[^>]*>(.*?)<\/span>/gi, "$1")
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
        .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
        .replace(/<[^>]+>/g, "")
        .trim();
      return "\n\n" + "#".repeat(Number.parseInt(level)) + " " + cleanContent + "\n\n";
    });

    // Enhanced List Processing with proper nesting support
    // Process nested lists by handling the structure more carefully
    const processNestedLists = (content: string): string => {
      // First pass: convert nested ul/ol inside li elements
      content = content.replace(/<li[^>]*>(.*?)<\/li>/gis, (liMatch, liContent) => {
        // Check if this li contains nested lists
        const hasNestedList = /<[ou]l[^>]*>/i.test(liContent);
        if (hasNestedList) {
          // Split content before and after nested list
          const parts = liContent.split(/(<[ou]l[^>]*>.*?<\/[ou]l>)/gis);
          let result = "";
          parts.forEach((part, index) => {
            if (/<[ou]l[^>]*>/i.test(part)) {
              // This is a nested list, process it with indentation
              const nestedList = part.replace(/<li[^>]*>(.*?)<\/li>/gis, (nestedLi, nestedContent) => {
                return `\n  - ${nestedContent.replace(/<[^>]+>/g, "").trim()}`;
              });
              result += nestedList.replace(/<[^>]+>/g, "");
            } else {
              // Regular content
              result += part.replace(/<[^>]+>/g, "").trim();
            }
          });
          return `\n- ${result}`;
        } else {
          // Simple list item
          return `\n- ${liContent.replace(/<[^>]+>/g, "").trim()}`;
        }
      });
      return content;
    };

    // Unordered Lists with nesting support
    markdown = markdown.replace(/<ul[^>]*class="list-paddingleft-[12]"[^>]*>(.*?)<\/ul>/gis, (match, content) => {
      const processedContent = processNestedLists(content);
      return processedContent + "\n\n";
    });

    // Regular unordered lists
    markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
      const items = content.replace(/<li[^>]*>(.*?)<\/li>/gis, (liMatch, liContent) => {
        return `\n- ${liContent.replace(/<[^>]+>/g, "").trim()}`;
      });
      return items + "\n\n";
    });

    // Ordered Lists with nesting support
    markdown = markdown.replace(/<ol[^>]*class="list-paddingleft-[12]"[^>]*>(.*?)<\/ol>/gis, (match, content) => {
      let counter = 1;
      const items = content.replace(/<li[^>]*>(.*?)<\/li>/gis, (liMatch, liContent) => {
        // Check for nested lists in ordered lists too
        const hasNestedList = /<[ou]l[^>]*>/i.test(liContent);
        if (hasNestedList) {
          const parts = liContent.split(/(<[ou]l[^>]*>.*?<\/[ou]l>)/gis);
          let result = "";
          parts.forEach((part) => {
            if (/<[ou]l[^>]*>/i.test(part)) {
              const nestedList = part.replace(/<li[^>]*>(.*?)<\/li>/gis, (nestedLi, nestedContent) => {
                return `\n   - ${nestedContent.replace(/<[^>]+>/g, "").trim()}`;
              });
              result += nestedList.replace(/<[^>]+>/g, "");
            } else {
              result += part.replace(/<[^>]+>/g, "").trim();
            }
          });
          return `\n${counter++}. ${result}`;
        } else {
          return `\n${counter++}. ${liContent.replace(/<[^>]+>/g, "").trim()}`;
        }
      });
      return items + "\n\n";
    });

    // Regular ordered lists
    markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
      let counter = 1;
      const items = content.replace(/<li[^>]*>(.*?)<\/li>/gis, (liMatch, liContent) => {
        return `\n${counter++}. ${liContent.replace(/<[^>]+>/g, "").trim()}`;
      });
      return items + "\n\n";
    });

    // Paragraphs with better content handling
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gis, (match, content) => {
      // Skip empty paragraphs and those that only contain images
      const textContent = content.replace(/<img[^>]*>/gi, "").replace(/<[^>]+>/g, "").trim();
      if (!textContent) return content.includes("<img") ? "\n\n" + content + "\n\n" : "";
      
      // Clean content but preserve some formatting
      const cleanContent = content
        .replace(/<span[^>]*>(.*?)<\/span>/gi, "$1")
        .replace(/<font[^>]*>(.*?)<\/font>/gi, "$1")
        .trim();
      
      return cleanContent ? "\n\n" + cleanContent + "\n\n" : "";
    });

    // Enhanced Blockquotes
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, content) => {
      const cleanContent = content.replace(/<[^>]+>/g, "").trim();
      if (!cleanContent) return "";
      
      const lines = cleanContent.split('\n').filter(line => line.trim());
      return "\n\n" + lines.map(line => `> ${line.trim()}`).join('\n') + "\n\n";
    });

    // Code Blocks
    markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, (match, content) => {
      const cleanContent = content
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .trim();
      return "\n\n```\n" + cleanContent + "\n```\n\n";
    });
    
    // Enhanced Tables
    markdown = markdown.replace(/<table[^>]*>(.*?)<\/table>/gis, (match, content) => {
      let tableMarkdown = "\n";
      const rows = content.match(/<tr[^>]*>(.*?)<\/tr>/gis) || [];
      
      if (rows.length === 0) return "";
      
      rows.forEach((row, index) => {
        const cells = row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis) || [];
        const cellContents = cells.map(cell => {
          const cellContent = cell
            .replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/i, "$1")
            .replace(/<[^>]+>/g, "")
            .trim();
          return cellContent || " ";
        });
        
        if (cellContents.length > 0) {
          tableMarkdown += "| " + cellContents.join(" | ") + " |\n";
          if (index === 0) {
            tableMarkdown += "| " + cellContents.map(() => "---").join(" | ") + " |\n";
          }
        }
      });
      return tableMarkdown + "\n";
    });

    // Horizontal Rules
    markdown = markdown.replace(/<hr[^>]*>/gi, "\n\n---\n\n");
    
    // Line breaks
    markdown = markdown.replace(/<br\s*\/?>/gi, "\n");

    // 4. Inline Element Conversion
    // Enhanced Images with better alt text handling
    markdown = markdown.replace(
      /<img[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi,
      (match, src, alt) => {
        // Skip placeholder images and data URIs
        if (src.includes("data:image/svg+xml") || src.includes("placeholder")) {
          return "";
        }
        
        if (src.includes("image.baidu.com")) {
          return `![${alt || "图片"}](${src})`;
        }
        const proxyUrl = `https://image.baidu.com/search/down?thumburl=${encodeURIComponent(src)}`;
        return `![${alt || "图片"}](${proxyUrl})`;
      },
    );

    // Links with better text handling
    markdown = markdown.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (match, href, text) => {
      const cleanText = text.replace(/<[^>]+>/g, "").trim();
      return cleanText ? `[${cleanText}](${href})` : "";
    });

    // Bold and Strong
    markdown = markdown.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, "**$2**");
    
    // Italic and Emphasis  
    markdown = markdown.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, "*$2*");
    
    // Inline Code
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, (match, content) => {
      const cleanContent = content
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
      return `\`${cleanContent}\``;
    });

    // 5. Final Cleanup
    // Remove any remaining HTML tags
    markdown = markdown.replace(/<[^>]+>/g, "");

    // Enhanced HTML entities decoding
    const htmlEntities: { [key: string]: string } = {
      "&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"',
      "&#39;": "'", "&ldquo;": '"', "&rdquo;": '"', "&lsquo;": "'", "&rsquo;": "'",
      "&mdash;": "—", "&ndash;": "–", "&hellip;": "…", "&copy;": "©", "&reg;": "®", 
      "&trade;": "™", "&bull;": "•", "&middot;": "·", "&sect;": "§", "&para;": "¶",
      "&dagger;": "†", "&Dagger;": "‡", "&permil;": "‰", "&lsaquo;": "‹", "&rsaquo;": "›",
      "&#8203;": "", // Zero-width space
    };
    
    Object.entries(htmlEntities).forEach(([entity, char]) => {
      markdown = markdown.replace(new RegExp(entity, "g"), char);
    });

    // Advanced whitespace normalization
    // Remove excessive spaces
    markdown = markdown.replace(/[ \t]+/g, " ");
    
    // Fix spacing around formatting
    markdown = markdown.replace(/\*\*\s+/g, "**");
    markdown = markdown.replace(/\s+\*\*/g, "**");
    markdown = markdown.replace(/\*\s+/g, "*");
    markdown = markdown.replace(/\s+\*/g, "*");
    
    // Normalize newlines
    markdown = markdown.replace(/\n{4,}/g, "\n\n\n");
    markdown = markdown.replace(/\n{3}/g, "\n\n");
    
    // Ensure proper spacing around headers
    markdown = markdown.replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2");
    markdown = markdown.replace(/(#{1,6}\s[^\n]+)\n([^\n#])/g, "$1\n\n$2");
    
    // Ensure proper spacing around lists
    markdown = markdown.replace(/([^\n])\n([*\-+]|\d+\.)\s/g, "$1\n\n$2 ");
    markdown = markdown.replace(/([*\-+]|\d+\.)\s[^\n]+\n([^\n*\-+\d\s])/g, "$&\n$2");
    
    // Clean up multiple consecutive formatting marks
    markdown = markdown.replace(/\*{3,}/g, "**");
    markdown = markdown.replace(/_{3,}/g, "__");
    
    // Remove trailing spaces
    markdown = markdown.replace(/[ \t]+$/gm, "");
    
    // Final trim
    markdown = markdown.trim();

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
        // 自动转换获取到的内容
        const result = htmlToMarkdown(data.content)
        setMarkdown(result)
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
      setMarkdown(result)
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
              <CardDescription>转换后的Markdown格式内容，图片已使用百度代理</CardDescription>
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
                <li>自动转换标题、段落、列表等格式</li>
                <li>图片链接自动使用百度代理</li>
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
