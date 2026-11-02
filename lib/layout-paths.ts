// PC·태블릿에서 넓은 지면을 쓰는 주소. 나머지는 읽기 좋은 폭의 가운데 단이다.
// 폼과 게시판은 480px 기준으로 짜여 있어 무작정 넓히면 입력칸만 길어진다.
export function isWidePath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/info") return true;
  if (pathname === "/articles" || pathname.startsWith("/articles/")) return true;
  return pathname.startsWith("/article/");
}
