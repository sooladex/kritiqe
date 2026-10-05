// kritiq-api — Vercel Function (Node, région fra1) + Neon Postgres (eu-central-1).
// Mêmes routes et mêmes réponses que l'ancienne version Railway (base JSON).
import { neon } from "@neondatabase/serverless";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const sql = neon(process.env.DATABASE_URL);
const SECRET = process.env.JWT_SECRET;
const TMDB_KEY = process.env.TMDB_API_KEY || "";
const TMDB_IMG = "https://image.tmdb.org/t/p/";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Content-Type": "application/json",
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: CORS });

// ---------- JWT (HS256, identique à l'ancienne API) ----------
const enc = new TextEncoder();
function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmac(data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
async function signToken(payload) {
  const head = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(enc.encode(JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 3600 * 1000 })));
  return head + "." + body + "." + (await hmac(head + "." + body));
}
async function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  if ((await hmac(parts[0] + "." + parts[1])) !== parts[2]) return null;
  try {
    const p = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}

// ---------- mots de passe (scrypt) ----------
async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}
async function verifyPassword(pw, stored) {
  const [algo, s, h] = String(stored || "").split("$");
  if (algo !== "scrypt" || !s || !h) return false;
  const expected = Buffer.from(h, "base64");
  const key = await scrypt(pw, Buffer.from(s, "base64"), expected.length);
  return timingSafeEqual(key, expected);
}

const uid = () => randomBytes(9).toString("base64url").slice(0, 12);
const LEVELS = [["Novice", 0], ["Amateur éclairé", 200], ["Critique confirmé", 1000], ["Expert", 3000], ["Légende", 10000]];
function levelFor(p) {
  let l = LEVELS[0][0];
  for (const [n, m] of LEVELS) if (p >= m) l = n;
  return l;
}
async function addPoints(userId, amount) {
  const rows = await sql`UPDATE users SET points = GREATEST(0, points + ${amount}) WHERE id = ${userId} RETURNING points`;
  if (rows[0]) await sql`UPDATE users SET level = ${levelFor(rows[0].points)} WHERE id = ${userId}`;
}

// ---------- mise en forme ----------
const iso = (d) => (d instanceof Date ? d.toISOString() : d);
function workOut(r) {
  const avg = r.avg != null ? Math.round(Number(r.avg) * 10) / 10 : null;
  return {
    id: r.id, title: r.title, type: r.type, subtitle: r.subtitle, coverIcon: r.cover_icon, verified: r.verified,
    createdAt: iso(r.created_at),
    ...(r.created_by ? { createdBy: r.created_by } : {}),
    ...(r.tmdb_id != null ? { tmdbId: r.tmdb_id, tmdbType: r.tmdb_type } : {}),
    ...(r.tmdb_checked_at ? { posterUrl: r.poster_url, backdropUrl: r.backdrop_url, year: r.year, overview: r.overview, cast: r.cast_list ?? [] } : {}),
    ...("ratings_count" in r ? { avg: avg || null, ratingsCount: Number(r.ratings_count) } : {}),
  };
}
function postOut(r) {
  return {
    id: r.id, userId: r.user_id, workId: r.work_id, episodeId: r.episode_id, communityId: r.community_id,
    body: r.body, spoiler: r.spoiler, score: r.score, createdAt: iso(r.created_at),
    author: r.a_id ? { id: r.a_id, username: r.a_username, level: r.a_level } : null,
    work: r.w_id ? { id: r.w_id, title: r.w_title, type: r.w_type, coverIcon: r.w_cover_icon, tmdbId: r.w_tmdb_id ?? undefined, posterUrl: r.w_poster_url ?? undefined } : null,
  };
}
const userSafe = (u) => ({ id: u.id, username: u.username, email: u.email, bio: u.bio, points: u.points, level: u.level, createdAt: iso(u.created_at) });

const WORK_WITH_AVG = `
  SELECT w.*, a.avg, COALESCE(a.n, 0) AS ratings_count
  FROM works w
  LEFT JOIN (SELECT work_id, avg(value) AS avg, count(*) AS n FROM ratings WHERE episode_id IS NULL GROUP BY work_id) a
    ON a.work_id = w.id`;
const POST_ENRICHED = `
  SELECT p.*, u.id AS a_id, u.username AS a_username, u.level AS a_level,
         w.id AS w_id, w.title AS w_title, w.type AS w_type, w.cover_icon AS w_cover_icon,
         w.tmdb_id AS w_tmdb_id, w.poster_url AS w_poster_url
  FROM posts p
  LEFT JOIN users u ON u.id = p.user_id
  LEFT JOIN works w ON w.id = p.work_id`;

// ---------- TMDB ----------
async function tmdb(path, params = {}) {
  if (!TMDB_KEY) return null;
  const u = new URL("https://api.themoviedb.org/3" + path);
  u.searchParams.set("language", "fr-FR");
  for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, String(v));
  const headers = {};
  if (TMDB_KEY.length > 40) headers.Authorization = `Bearer ${TMDB_KEY}`;
  else u.searchParams.set("api_key", TMDB_KEY);
  try {
    const r = await fetch(u, { headers });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
const cleanTitle = (t) => t.replace(/\s+[—-]\s+S\d+.*$/i, "").trim();
function yearOf(w) {
  const m = (w.subtitle || "").match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : undefined;
}
// Rattache une œuvre film/série à TMDB ; résultat mis en cache 7 jours en base.
async function enrichWork(w) {
  if (!TMDB_KEY || (w.type !== "films" && w.type !== "series")) return w;
  if (w.tmdb_checked_at && Date.now() - new Date(w.tmdb_checked_at).getTime() < 7 * 24 * 3600 * 1000) return w;
  const kind = w.type === "films" ? "movie" : "tv";
  let id = w.tmdb_id;
  if (!id) {
    const year = yearOf(w);
    const s = await tmdb(`/search/${kind}`, { query: cleanTitle(w.title), ...(year ? (kind === "movie" ? { year } : { first_air_date_year: year }) : {}) });
    id = s?.results?.[0]?.id;
  }
  const now = new Date().toISOString();
  if (!id) {
    await sql`UPDATE works SET tmdb_checked_at = ${now} WHERE id = ${w.id}`;
    return { ...w, tmdb_checked_at: now };
  }
  const d = await tmdb(`/${kind}/${id}`, { append_to_response: "credits" });
  if (!d) {
    await sql`UPDATE works SET tmdb_checked_at = ${now} WHERE id = ${w.id}`;
    return { ...w, tmdb_checked_at: now };
  }
  const upd = {
    tmdb_id: id, tmdb_type: kind,
    poster_url: d.poster_path ? TMDB_IMG + "w500" + d.poster_path : null,
    backdrop_url: d.backdrop_path ? TMDB_IMG + "w1280" + d.backdrop_path : null,
    year: Number((d.release_date || d.first_air_date || "").slice(0, 4)) || null,
    overview: d.overview || null,
    cast_list: (d.credits?.cast || []).slice(0, 8).map((c) => ({ id: c.id, name: c.name, character: c.character, profileUrl: c.profile_path ? TMDB_IMG + "w342" + c.profile_path : null })),
    tmdb_checked_at: now,
  };
  await sql`UPDATE works SET tmdb_id = ${upd.tmdb_id}, tmdb_type = ${upd.tmdb_type}, poster_url = ${upd.poster_url},
    backdrop_url = ${upd.backdrop_url}, year = ${upd.year}, overview = ${upd.overview},
    cast_list = ${JSON.stringify(upd.cast_list)}::jsonb, tmdb_checked_at = ${now} WHERE id = ${w.id}`;
  return { ...w, ...upd };
}

// ---------- routes ----------
async function route(req) {
  const url = new URL(req.url);
  // vercel.json réécrit /api/<chemin> vers /api?__path=<chemin>
  const rewritten = url.searchParams.get("__path");
  const path = rewritten != null ? "/api/" + rewritten : url.pathname;
  url.searchParams.delete("__path");
  const method = req.method;
  if (method === "OPTIONS") return new Response(null, { headers: CORS });
  if (!SECRET || !process.env.DATABASE_URL) return json({ error: "Serveur mal configuré." }, 500);

  const auth = await verifyToken((req.headers.get("authorization") || "").replace("Bearer ", ""));
  const body = ["POST", "PUT", "PATCH"].includes(method) ? await req.json().catch(() => ({})) : {};
  let m;

  if (path === "/api/health") return json({ ok: true, name: "kritiq-api", tmdb: !!TMDB_KEY });

  if (path === "/api/auth/register" && method === "POST") {
    const { username, email, password } = body;
    if (!username || !email || !password) return json({ error: "Nom d'utilisateur, email et mot de passe requis." }, 400);
    if (password.length < 8) return json({ error: "Le mot de passe doit faire au moins 8 caractères." }, 400);
    if ((await sql`SELECT 1 FROM users WHERE lower(username) = lower(${username})`).length) return json({ error: "Ce nom d'utilisateur est déjà pris." }, 409);
    if ((await sql`SELECT 1 FROM users WHERE lower(email) = lower(${email})`).length) return json({ error: "Un compte existe déjà avec cet email." }, 409);
    const id = uid();
    const rows = await sql`INSERT INTO users (id, username, email, password_hash) VALUES (${id}, ${username}, ${email}, ${await hashPassword(password)}) RETURNING *`;
    return json({ token: await signToken({ id, username }), user: userSafe(rows[0]) }, 201);
  }

  if (path === "/api/auth/login" && method === "POST") {
    const rows = await sql`SELECT * FROM users WHERE lower(username) = lower(${body.username || ""})`;
    const user = rows[0];
    if (!user || !(await verifyPassword(body.password || "", user.password_hash))) return json({ error: "Identifiants invalides." }, 401);
    return json({ token: await signToken({ id: user.id, username: user.username }), user: userSafe(user) });
  }

  if (path === "/api/works" && method === "GET") {
    const type = url.searchParams.get("type"), q = url.searchParams.get("q");
    const rows = await sql.query(
      `${WORK_WITH_AVG} WHERE ($1::text IS NULL OR w.type = $1) AND ($2::text IS NULL OR lower(w.title) LIKE '%' || lower($2) || '%') ORDER BY w.created_at`,
      [type, q],
    );
    return json(rows.map(workOut));
  }

  if (path === "/api/works" && method === "POST") {
    if (!auth) return json({ error: "Connecte-toi pour continuer." }, 401);
    if (!body.title || !body.type) return json({ error: "Titre et type requis." }, 400);
    const rows = await sql`INSERT INTO works (id, title, type, subtitle, cover_icon, verified, created_by)
      VALUES (${uid()}, ${body.title}, ${body.type}, ${body.subtitle || ""}, ${body.coverIcon || "🎨"}, false, ${auth.id}) RETURNING *`;
    const w = await enrichWork(rows[0]);
    return json(workOut(w), 201);
  }

  if ((m = path.match(/^\/api\/works\/([^/]+)\/rate$/)) && method === "POST") {
    if (!auth) return json({ error: "Connecte-toi pour continuer." }, 401);
    const v = Number(body.value);
    if (!v || v < 1 || v > 10) return json({ error: "La note doit être entre 1 et 10." }, 400);
    if (!(await sql`SELECT 1 FROM works WHERE id = ${m[1]}`).length) return json({ error: "Œuvre introuvable." }, 404);
    const epId = body.episodeId || null;
    const ex = await sql`SELECT id FROM ratings WHERE user_id = ${auth.id} AND work_id = ${m[1]} AND coalesce(episode_id, '') = coalesce(${epId}::text, '')`;
    if (ex.length) await sql`UPDATE ratings SET value = ${v} WHERE id = ${ex[0].id}`;
    else {
      await sql`INSERT INTO ratings (id, user_id, work_id, episode_id, value) VALUES (${uid()}, ${auth.id}, ${m[1]}, ${epId}, ${v})`;
      await addPoints(auth.id, 5);
    }
    return json({ ok: true });
  }

  if ((m = path.match(/^\/api\/works\/([^/]+)$/)) && method === "GET") {
    const rows = await sql.query(`${WORK_WITH_AVG} WHERE w.id = $1`, [m[1]]);
    if (!rows[0]) return json({ error: "Œuvre introuvable." }, 404);
    const w = await enrichWork(rows[0]);
    const mine = auth ? await sql`SELECT value FROM ratings WHERE user_id = ${auth.id} AND work_id = ${m[1]} AND episode_id IS NULL` : [];
    const eps = await sql`SELECT id, work_id, title, ord FROM episodes WHERE work_id = ${m[1]} ORDER BY ord`;
    return json({
      ...workOut(w),
      myRating: mine[0]?.value ?? null,
      episodes: eps.map((e) => ({ id: e.id, workId: e.work_id, title: e.title, order: e.ord })),
    });
  }

  if (path === "/api/posts" && method === "GET") {
    const type = url.searchParams.get("type"), cid = url.searchParams.get("communityId");
    const sort = url.searchParams.get("sort") === "top" ? "p.score DESC, p.created_at DESC" : "p.created_at DESC";
    const rows = await sql.query(
      `${POST_ENRICHED} WHERE ($1::text IS NULL OR w.type = $1) AND ($2::text IS NULL OR p.community_id = $2) ORDER BY ${sort} LIMIT 200`,
      [type, cid],
    );
    return json(rows.map(postOut));
  }

  if (path === "/api/posts" && method === "POST") {
    if (!auth) return json({ error: "Connecte-toi pour continuer." }, 401);
    if (!body.workId || !body.body || !String(body.body).trim()) return json({ error: "Choisis une œuvre et écris ton texte." }, 400);
    if (!(await sql`SELECT 1 FROM works WHERE id = ${body.workId}`).length) return json({ error: "Œuvre introuvable." }, 404);
    const id = uid();
    await sql`INSERT INTO posts (id, user_id, work_id, episode_id, community_id, body, spoiler)
      VALUES (${id}, ${auth.id}, ${body.workId}, ${body.episodeId || null}, ${body.communityId || null}, ${String(body.body).trim().slice(0, 2000)}, ${!!body.spoiler})`;
    await addPoints(auth.id, 10);
    const rows = await sql.query(`${POST_ENRICHED} WHERE p.id = $1`, [id]);
    return json(postOut(rows[0]), 201);
  }

  if ((m = path.match(/^\/api\/posts\/([^/]+)\/vote$/)) && method === "POST") {
    if (!auth) return json({ error: "Connecte-toi pour continuer." }, 401);
    const value = Number(body.value);
    if (value !== 1 && value !== -1) return json({ error: "Vote invalide." }, 400);
    const posts = await sql`SELECT id, user_id, score FROM posts WHERE id = ${m[1]}`;
    const post = posts[0];
    if (!post) return json({ error: "Post introuvable." }, 404);
    if (post.user_id === auth.id) return json({ error: "Tu ne peux pas voter sur ton propre post." }, 403);
    const ex = (await sql`SELECT value FROM votes WHERE user_id = ${auth.id} AND post_id = ${post.id}`)[0];
    let delta;
    if (ex && ex.value === value) {
      delta = -value;
      await sql`DELETE FROM votes WHERE user_id = ${auth.id} AND post_id = ${post.id}`;
    } else if (ex) {
      delta = value - ex.value;
      await sql`UPDATE votes SET value = ${value} WHERE user_id = ${auth.id} AND post_id = ${post.id}`;
    } else {
      delta = value;
      await sql`INSERT INTO votes (user_id, post_id, value) VALUES (${auth.id}, ${post.id}, ${value})`;
    }
    const upd = await sql`UPDATE posts SET score = score + ${delta} WHERE id = ${post.id} RETURNING score`;
    await addPoints(post.user_id, delta > 0 ? delta : Math.round(delta * 0.5));
    return json({ score: upd[0].score });
  }

  if (path === "/api/communities" && method === "GET") {
    const rows = await sql`SELECT c.*, (SELECT count(*) FROM memberships x WHERE x.community_id = c.id) AS member_count,
      EXISTS (SELECT 1 FROM memberships x WHERE x.community_id = c.id AND x.user_id = ${auth?.id ?? null}) AS joined
      FROM communities c ORDER BY c.created_at`;
    return json(rows.map((c) => ({ id: c.id, slug: c.slug, name: c.name, description: c.description, createdAt: iso(c.created_at), memberCount: Number(c.member_count), joined: !!auth && c.joined })));
  }

  if (path === "/api/communities" && method === "POST") {
    if (!auth) return json({ error: "Connecte-toi pour continuer." }, 401);
    if (!body.slug || !body.name) return json({ error: "Slug (ex. k/nom) et nom requis." }, 400);
    if ((await sql`SELECT 1 FROM communities WHERE slug = ${body.slug}`).length) return json({ error: "Ce slug existe déjà." }, 409);
    const rows = await sql`INSERT INTO communities (id, slug, name, description) VALUES (${uid()}, ${body.slug}, ${body.name}, ${body.description || ""}) RETURNING *`;
    await sql`INSERT INTO memberships (user_id, community_id, starred) VALUES (${auth.id}, ${rows[0].id}, true)`;
    const c = rows[0];
    return json({ id: c.id, slug: c.slug, name: c.name, description: c.description, createdAt: iso(c.created_at) }, 201);
  }

  if ((m = path.match(/^\/api\/communities\/([^/]+)\/join$/)) && method === "POST") {
    if (!auth) return json({ error: "Connecte-toi pour continuer." }, 401);
    const del = await sql`DELETE FROM memberships WHERE user_id = ${auth.id} AND community_id = ${m[1]} RETURNING 1`;
    if (del.length) return json({ joined: false });
    if (!(await sql`SELECT 1 FROM communities WHERE id = ${m[1]}`).length) return json({ error: "Communauté introuvable." }, 404);
    await sql`INSERT INTO memberships (user_id, community_id, starred) VALUES (${auth.id}, ${m[1]}, false)`;
    return json({ joined: true });
  }

  // ---------- Easter eggs ----------
  if (path === "/api/tmdb/resolve" && method === "GET") {
    if (!TMDB_KEY) return json({ error: "TMDB non configuré." }, 503);
    const kind = url.searchParams.get("kind") === "tv" ? "tv" : "movie";
    const q = url.searchParams.get("q"), year = url.searchParams.get("year");
    if (!q) return json({ error: "Paramètre q requis." }, 400);
    const s = await tmdb(`/search/${kind}`, { query: q, ...(year ? (kind === "movie" ? { year } : { first_air_date_year: year }) : {}) });
    const r = s?.results?.[0];
    return json(r ? { tmdbId: r.id, kind, title: r.title || r.name, date: r.release_date || r.first_air_date || null } : { tmdbId: null });
  }

  if (path === "/api/eggs/state" && method === "GET") {
    if (!auth) return json({ surprises: true, seen: {} });
    const seenRows = await sql`SELECT egg_id, count, last_at FROM egg_seen WHERE user_id = ${auth.id}`;
    const pref = (await sql`SELECT surprises FROM prefs WHERE user_id = ${auth.id}`)[0];
    const seen = {};
    for (const e of seenRows) seen[e.egg_id] = { count: e.count, lastAt: iso(e.last_at) };
    return json({ surprises: pref ? pref.surprises !== false : true, seen });
  }

  if ((m = path.match(/^\/api\/eggs\/([a-z0-9-]{1,48})\/seen$/)) && method === "POST") {
    if (!auth) return json({ ok: true, stored: false });
    await sql`INSERT INTO egg_seen (user_id, egg_id) VALUES (${auth.id}, ${m[1]})
      ON CONFLICT (user_id, egg_id) DO UPDATE SET count = egg_seen.count + 1, last_at = now()`;
    return json({ ok: true, stored: true });
  }

  if (path === "/api/users/me/prefs" && method === "PATCH") {
    if (!auth) return json({ error: "Connecte-toi pour continuer." }, 401);
    const val = typeof body.surprises === "boolean" ? body.surprises : null;
    const rows = await sql`INSERT INTO prefs (user_id, surprises) VALUES (${auth.id}, ${val ?? true})
      ON CONFLICT (user_id) DO UPDATE SET surprises = COALESCE(${val}::boolean, prefs.surprises) RETURNING surprises`;
    return json({ ok: true, surprises: rows[0].surprises });
  }

  // ---------- membres ----------
  if (path === "/api/users/leaderboard" && method === "GET") {
    const rows = await sql`SELECT id, username, level, points FROM users ORDER BY points DESC, created_at LIMIT 50`;
    return json(rows.map((u, i) => ({ rank: i + 1, id: u.id, username: u.username, level: u.level, points: u.points })));
  }

  if (path === "/api/users/me" && method === "PATCH") {
    if (!auth) return json({ error: "Connecte-toi pour continuer." }, 401);
    if (typeof body.bio === "string") await sql`UPDATE users SET bio = ${body.bio.slice(0, 160)} WHERE id = ${auth.id}`;
    const u = (await sql`SELECT bio FROM users WHERE id = ${auth.id}`)[0];
    return json({ ok: true, bio: u?.bio ?? "" });
  }

  if (path === "/api/users/me/favorites" && method === "PUT") {
    if (!auth) return json({ error: "Connecte-toi pour continuer." }, 401);
    if (!Array.isArray(body.workIds) || body.workIds.length > 4) return json({ error: "4 favoris maximum." }, 400);
    await sql`DELETE FROM favorites WHERE user_id = ${auth.id}`;
    for (const [i, workId] of body.workIds.entries()) {
      await sql`INSERT INTO favorites (user_id, work_id, position) SELECT ${auth.id}, ${workId}, ${i + 1} WHERE EXISTS (SELECT 1 FROM works WHERE id = ${workId})`;
    }
    return json({ ok: true });
  }

  if (path === "/api/users/me/links" && method === "PUT") {
    if (!auth) return json({ error: "Connecte-toi pour continuer." }, 401);
    if (!Array.isArray(body.links)) return json({ error: "Format invalide." }, 400);
    await sql`DELETE FROM links WHERE user_id = ${auth.id}`;
    for (const l of body.links.slice(0, 10)) {
      if (l && l.handle) await sql`INSERT INTO links (user_id, platform, handle) VALUES (${auth.id}, ${String(l.platform || "").slice(0, 40)}, ${String(l.handle).slice(0, 80)})`;
    }
    return json({ ok: true });
  }

  if ((m = path.match(/^\/api\/users\/([^/]+)$/)) && method === "GET") {
    const name = decodeURIComponent(m[1]);
    const u = (await sql`SELECT * FROM users WHERE lower(username) = lower(${name})`)[0];
    if (!u) return json({ error: "Membre introuvable." }, 404);
    const rank = (await sql`SELECT count(*) + 1 AS r FROM users WHERE points > ${u.points}`)[0].r;
    const favs = await sql`SELECT w.* FROM favorites f JOIN works w ON w.id = f.work_id WHERE f.user_id = ${u.id} ORDER BY f.position`;
    const links = await sql`SELECT platform, handle FROM links WHERE user_id = ${u.id}`;
    return json({
      id: u.id, username: u.username, bio: u.bio, points: u.points, level: u.level, rank: Number(rank),
      favorites: favs.map(workOut),
      links: links.map((l) => ({ userId: u.id, platform: l.platform, handle: l.handle })),
    });
  }

  return json({ error: "Route introuvable." }, 404);
}

async function handle(req) {
  try {
    return await route(req);
  } catch (e) {
    console.error(e);
    return json({ error: "Erreur serveur. Réessaie dans un instant." }, 500);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
