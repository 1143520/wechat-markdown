import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: '微信公众号文章转Markdown',
  description: '将微信公众号文章转换为Markdown格式，图片自动使用代理链接',
  generator: 'Next.js',
  icons: {
    icon: 'https://jsd.chatbtc.cn.eu.org/gh/manji1143/picx-images-hosting@master/paste/picx-%E6%B0%B4%E5%A2%A8%E7%94%BB-logo-%E8%AE%BE%E8%AE%A1.41ye3jxic1.webp',
    shortcut: 'https://jsd.chatbtc.cn.eu.org/gh/manji1143/picx-images-hosting@master/paste/picx-%E6%B0%B4%E5%A2%A8%E7%94%BB-logo-%E8%AE%BE%E8%AE%A1.41ye3jxic1.webp',
    apple: 'https://jsd.chatbtc.cn.eu.org/gh/manji1143/picx-images-hosting@master/paste/picx-%E6%B0%B4%E5%A2%A8%E7%94%BB-logo-%E8%AE%BE%E8%AE%A1.41ye3jxic1.webp',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="https://jsd.chatbtc.cn.eu.org/gh/manji1143/picx-images-hosting@master/paste/picx-%E6%B0%B4%E5%A2%A8%E7%94%BB-logo-%E8%AE%BE%E8%AE%A1.41ye3jxic1.webp" />
        <link rel="shortcut icon" href="https://jsd.chatbtc.cn.eu.org/gh/manji1143/picx-images-hosting@master/paste/picx-%E6%B0%B4%E5%A2%A8%E7%94%BB-logo-%E8%AE%BE%E8%AE%A1.41ye3jxic1.webp" />
        <link rel="apple-touch-icon" href="https://jsd.chatbtc.cn.eu.org/gh/manji1143/picx-images-hosting@master/paste/picx-%E6%B0%B4%E5%A2%A8%E7%94%BB-logo-%E8%AE%BE%E8%AE%A1.41ye3jxic1.webp" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
