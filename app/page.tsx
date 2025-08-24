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

  // 将HTML转换为Markdown - 改进版
  const htmlToMarkdown = (html: string): string => {
    try {
      // 创建临时DOM解析器
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      
      // 预处理：清理和标准化
      const cleanedHtml = preprocessHtml(html)
      const cleanedDoc = parser.parseFromString(cleanedHtml, 'text/html')
      
      // 使用递归方式转换DOM节点
      const result = convertNodeToMarkdown(cleanedDoc.body).trim()
      
      // 后处理：格式化和优化
      return postprocessMarkdown(result)
      
    } catch (error) {
      console.warn('HTML转换失败，使用备用方案:', error)
      // 备用方案：使用简化的正则处理
      return fallbackHtmlToMarkdown(html)
    }
  }

  // 预处理HTML：清理和标准化
  const preprocessHtml = (html: string): string => {
    let cleaned = html
    
    // 移除不需要的元素
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '') // HTML注释
    cleaned = cleaned.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '') // CDATA
    
    // 清理属性但保留重要的
    cleaned = cleaned.replace(/\s(style|class|id)="[^"]*"/gi, '')
    cleaned = cleaned.replace(/\s(width|height|border|cellpadding|cellspacing)="[^"]*"/gi, '')
    
    // 处理微信特有标签
    cleaned = cleaned.replace(/<\/?section[^>]*>/gi, '<div>')
    cleaned = cleaned.replace(/<mpvoice[^>]*>[\s\S]*?<\/mpvoice>/gi, '[语音消息]')
    cleaned = cleaned.replace(/<mpvideo[^>]*>[\s\S]*?<\/mpvideo>/gi, '[视频消息]')
    cleaned = cleaned.replace(/<mp-miniprogram[^>]*>[\s\S]*?<\/mp-miniprogram>/gi, '[小程序]')
    
    // 标准化自闭合标签
    cleaned = cleaned.replace(/<(br|hr|img)([^>]*?)(?:\s*\/?)>/gi, '<$1$2/>')
    
    return cleaned
  }

  // 递归转换DOM节点为Markdown
  const convertNodeToMarkdown = (node: Node, depth = 0): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeMarkdownChars(node.textContent || '')
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return ''
    }
    
    const element = node as Element
    const tagName = element.tagName.toLowerCase()
    const children = Array.from(element.childNodes)
    const childContent = children.map(child => convertNodeToMarkdown(child, depth + 1)).join('')
    
    switch (tagName) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        const level = parseInt(tagName[1])
        return `\n${'#'.repeat(level)} ${childContent.trim()}\n\n`
        
      case 'p':
        return childContent.trim() ? `${childContent.trim()}\n\n` : ''
        
      case 'br':
        return '\n'
        
      case 'hr':
        return '\n---\n\n'
        
      case 'strong': case 'b':
        return `**${childContent}**`
        
      case 'em': case 'i':
        return `*${childContent}*`
        
      case 'code':
        return element.parentElement?.tagName.toLowerCase() === 'pre' ? 
          childContent : `\`${childContent}\``
        
      case 'pre':
        const codeElement = element.querySelector('code')
        const codeContent = codeElement ? codeElement.textContent || '' : childContent
        const language = codeElement?.className.match(/language-(\w+)/)?.[1] || ''
        return `\n\`\`\`${language}\n${codeContent.trim()}\n\`\`\`\n\n`
        
      case 'blockquote':
        return childContent.split('\n').map(line => 
          line.trim() ? `> ${line.trim()}` : '>'
        ).join('\n') + '\n\n'
        
      case 'a':
        const href = element.getAttribute('href') || ''
        return `[${childContent}](${href})`
        
      case 'img':
        const src = element.getAttribute('src') || ''
        const alt = element.getAttribute('alt') || '图片'
        const proxyUrl = getImageProxy(src)
        return `![${alt}](${proxyUrl})`
        
      case 'ul':
        return convertList(element, false, depth)
        
      case 'ol':
        return convertList(element, true, depth)
        
      case 'table':
        return convertTable(element)
        
      case 'div': case 'span': case 'font':
        // 保持内容，添加适当间距
        return tagName === 'div' ? `${childContent}\n\n` : childContent
        
      default:
        return childContent
    }
  }

  // 转换列表（支持嵌套）
  const convertList = (element: Element, ordered: boolean, depth: number): string => {
    const items = Array.from(element.children).filter(child => 
      child.tagName.toLowerCase() === 'li'
    )
    
    let result = '\n'
    const indent = '  '.repeat(depth)
    
    items.forEach((item, index) => {
      const content = convertNodeToMarkdown(item, depth + 1).trim()
      const marker = ordered ? `${index + 1}.` : '-'
      
      // 处理多行内容
      const lines = content.split('\n')
      result += `${indent}${marker} ${lines[0]}\n`
      
      // 处理额外行（保持缩进）
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          result += `${indent}   ${lines[i]}\n`
        }
      }
    })
    
    return result + '\n'
  }

  // 转换表格（改进版）
  const convertTable = (table: Element): string => {
    const rows = Array.from(table.querySelectorAll('tr'))
    if (rows.length === 0) return ''
    
    let result = '\n'
    let isHeader = true
    
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td, th'))
      const cellContents = cells.map(cell => {
        const content = convertNodeToMarkdown(cell).replace(/\n/g, ' ').trim()
        return content || ' '
      })
      
      result += `| ${cellContents.join(' | ')} |\n`
      
      // 添加表头分隔线
      if (isHeader && cellContents.length > 0) {
        result += `| ${cellContents.map(() => '---').join(' | ')} |\n`
        isHeader = false
      }
    })
    
    return result + '\n'
  }

  // 图片代理（多重备用方案）
  const getImageProxy = (src: string): string => {
    if (!src) return ''
    
    // 如果已经是代理链接，直接返回
    if (src.includes('image.baidu.com') || src.includes('proxy') || src.startsWith('data:')) {
      return src
    }
    
    // 多重代理策略
    const proxies = [
      `https://image.baidu.com/search/down?thumburl=${encodeURIComponent(src)}`,
      `https://images.weserv.nl/?url=${encodeURIComponent(src)}`,
      src // 原链接作为最后备用
    ]
    
    return proxies[0] // 默认使用第一个代理
  }

  // 转义Markdown特殊字符
  const escapeMarkdownChars = (text: string): string => {
    // 只转义在当前上下文中会产生冲突的字符
    return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1')
  }

  // 后处理：格式化和优化Markdown
  const postprocessMarkdown = (markdown: string): string => {
    let result = markdown
    
    // HTML实体解码（扩展版）
    const entities: { [key: string]: string } = {
      '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&amp;': '&',
      '&quot;': '"', '&#39;': "'", '&ldquo;': '"', '&rdquo;': '"',
      '&lsquo;': "'", '&rsquo;': "'", '&mdash;': '—', '&ndash;': '–',
      '&hellip;': '…', '&copy;': '©', '&reg;': '®', '&trade;': '™',
      '&yen;': '¥', '&pound;': '£', '&euro;': '€', '&deg;': '°'
    }
    
    Object.entries(entities).forEach(([entity, char]) => {
      result = result.replace(new RegExp(entity, 'g'), char)
    })
    
    // 数字实体解码
    result = result.replace(/&#(\d+);/g, (match, num) => {
      return String.fromCharCode(parseInt(num))
    })
    
    // 清理多余空白
    result = result.replace(/^[ \t]+|[ \t]+$/gm, '') // 行首行尾空白
    result = result.replace(/\n{4,}/g, '\n\n\n') // 最多3个连续换行
    result = result.replace(/\n{3}/g, '\n\n') // 标准化为2个换行
    
    // 优化标题间距
    result = result.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')
    result = result.replace(/(#{1,6}\s[^\n]+)\n([^\n#])/g, '$1\n\n$2')
    
    // 优化列表间距
    result = result.replace(/([^\n])\n(\s*[-*+]|\s*\d+\.)\s/g, '$1\n\n$2 ')
    
    // 修复格式化冲突
    result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '***$1***') // 粗斜体
    result = result.replace(/\*\*([^*]*)\*([^*]*)\*([^*]*)\*\*/g, '**$1*$2*$3**') // 嵌套格式
    
    return result.trim()
  }

  // 备用方案：简化的正则处理
  const fallbackHtmlToMarkdown = (html: string): string => {
    let result = html
    
    // 基础清理
    result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    result = result.replace(/<[^>]+>/g, ' ')
    result = result.replace(/&nbsp;/g, ' ')
    result = result.replace(/&lt;/g, '<')
    result = result.replace(/&gt;/g, '>')
    result = result.replace(/&amp;/g, '&')
    
    // 清理多余空白
    result = result.replace(/\s+/g, ' ')
    result = result.replace(/^\s+|\s+$/g, '')
    
    return result || '[转换失败，请尝试手动处理]'
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
