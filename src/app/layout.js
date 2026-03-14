import "./globals.css";

export const metadata = {
  title: "Vito 的相册 - 博文 Photography",
  description: "个人照片收藏与展示",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
