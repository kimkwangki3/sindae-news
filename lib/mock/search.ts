// 통합 검색(목) — 기사·나눔마켓·게시판·상권·단체 제목/이름에서 질의어를 찾는다.
// 후속: 각 테이블 ilike 또는 전문검색으로 교체.

import { getArticlesPage, getTopTags } from "@/lib/mock/articles";
import { tagHref } from "@/lib/tags";
import { getMarketPosts, getBoardPosts } from "@/lib/mock/community";
import { getBusinesses, BIZ_CAT_NAME } from "@/lib/mock/district";
import { getOrgs, ORG_CAT_NAME } from "@/lib/mock/orgs";
import { FEATURES } from "@/lib/features";

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

  // 태그를 먼저 보여준다. "폭염"처럼 여러 기사에 걸친 말을 검색했을 때
  // 기사 몇 건보다 태그 묶음 하나가 더 빠른 길이다.
  const tags = (await getTopTags(50))
    .filter((t) => has(t.tag))
    .map((t) => ({
      title: `#${t.tag}`,
      sub: `기사 ${t.count}건`,
      href: tagHref(t.tag),
    }));

  // 내려둔 섹션은 검색 결과로도 새어 나오지 않게 한다.
  const market = (FEATURES.market ? await getMarketPosts("all") : [])
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
    { key: "tag", label: "태그", hits: tags },
    { key: "article", label: "기사", hits: articles },
    { key: "market", label: "나눔마켓", hits: market },
    { key: "board", label: "자유게시판", hits: board },
    { key: "district", label: "해룡상권", hits: stores },
    { key: "orgs", label: "지역단체", hits: orgs },
  ].filter((g) => g.hits.length > 0);
}
