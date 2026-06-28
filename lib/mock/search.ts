// 통합 검색(목) — 기사·나눔마켓·게시판·상권·단체 제목/이름에서 질의어를 찾는다.
// 후속: 각 테이블 ilike 또는 전문검색으로 교체.

import { getArticlesPage } from "@/lib/mock/articles";
import { getMarketPosts, getBoardPosts } from "@/lib/mock/community";
import { getBusinesses, BIZ_CAT_NAME } from "@/lib/mock/district";
import { getOrgs, ORG_CAT_NAME } from "@/lib/mock/orgs";

export interface SearchHit {
  title: string;
  sub: string;
  href: string;
}

export interface SearchGroup {
  key: string;
  label: string;
  hits: SearchHit[];
}

export async function searchAll(query: string): Promise<SearchGroup[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const has = (s: string) => s.toLowerCase().includes(q);

  const articlesPage = await getArticlesPage(null, 0, 100);
  const articles = articlesPage.items
    .filter((a) => has(a.title))
    .map((a) => ({ title: a.title, sub: a.meta, href: `/article/${a.slug}` }));

  const market = (await getMarketPosts("all"))
    .filter((p) => has(p.title) || has(p.body))
    .map((p) => ({
      title: p.title,
      sub: `${p.neighborhood} · 💬 ${p.commentCount}`,
      href: `/market/${p.id}`,
    }));

  const board = (await getBoardPosts("all"))
    .filter((p) => has(p.title) || has(p.body))
    .map((p) => ({
      title: p.title,
      sub: `${p.author} · 👍 ${p.likeCount}`,
      href: `/board/${p.id}`,
    }));

  const stores = (await getBusinesses("all"))
    .filter((b) => has(b.name) || has(b.intro))
    .map((b) => ({
      title: b.name,
      sub: `${BIZ_CAT_NAME[b.category]} · ${b.neighborhood}`,
      href: `/district/${b.id}`,
    }));

  const orgs = (await getOrgs("all"))
    .filter((o) => has(o.name) || has(o.intro))
    .map((o) => ({
      title: o.name,
      sub: `${ORG_CAT_NAME[o.category]} · 회원 ${o.memberCount}명`,
      href: `/orgs/${o.id}`,
    }));

  return [
    { key: "article", label: "기사", hits: articles },
    { key: "market", label: "나눔마켓", hits: market },
    { key: "board", label: "자유게시판", hits: board },
    { key: "district", label: "신대상권", hits: stores },
    { key: "orgs", label: "지역단체", hits: orgs },
  ].filter((g) => g.hits.length > 0);
}
