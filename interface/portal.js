// Source de l’interface publique ; assemblée par scripts/build-interface.mjs.
function rf() {
  let [e, a] = (0, O.useState)($n),
    [t, l] = (0, O.useState)([]),
    [o, i] = (0, O.useState)(null),
    [u, n] = (0, O.useState)(null),
    [r, f] = (0, O.useState)(null),
    [x, h] = (0, O.useState)(!1),
    [s, p] = (0, O.useState)(""),
    [S, C] = (0, O.useState)([]),
    [T, m] = (0, O.useState)(Ws),
    [c, g] = (0, O.useState)(!1),
    [L, z] = (0, O.useState)(!1),
    [R, I] = (0, O.useState)(!0),
    [M, H] = (0, O.useState)(""),
    [k, _e] = (0, O.useState)("all"),
    [te, tl] = (0, O.useState)(""),
    [ke, ql] = (0, O.useState)(""),
    [ye, El] = (0, O.useState)(""),
    [Ae, Ol] = (0, O.useState)(""),
    [Ja, yt] = (0, O.useState)("newest"),
    [Oa, ll] = (0, O.useState)("grid"),
    [Ze, He] = (0, O.useState)(6),
    [Wa, Ha] = (0, O.useState)(null),
    [cu, Fo] = (0, O.useState)(""),
    [ol, B] = (0, O.useState)(!1),
    [P, Ne] = (0, O.useState)(""),
    Qe = (0, O.useRef)(null),
    Na = (0, O.useRef)(null),
    St = (0, O.useCallback)((b) => {
      (Fo(b),
        Qe.current && clearTimeout(Qe.current),
        (Qe.current = setTimeout(() => Fo(""), 4500)));
    }, []),
    Da = (0, O.useCallback)(async (b = !1) => {
      (I(!0), H(""));
      try {
        let D = await Ho("/api/auth/session");
        a(D);
        let j = await Ho(
          "/api/library" + (b && D.authenticated && !D.requiresPasswordChange ? "?manage=1" : ""),
        );
        (C(j.items), l(j.events || []), m(j.settings), g(j.isAdmin));
      } catch (D) {
        H(D instanceof Error ? D.message : "Le chargement a échoué.");
      } finally {
        I(!1);
      }
    }, []);
  ((0, O.useEffect)(() => {
    let b = new URLSearchParams(window.location.search),
      D = b.get("view") === "manage";
    if(D&&!MX_ON_SERVICE){window.location.replace(new URL('/?view=manage',MX_SERVICE.origin));return;}
    return (
      z(D),
      ["video", "photo", "press", "event"].includes(b.get("type") || "") &&
        _e(b.get("type")),
      tl((b.get("q") || "").slice(0, 240)),
      ll(mxStorage.get("media-view") === "list" ? "list" : "grid"),
      ql(/^\d{4}$/.test(b.get("year") || "") ? b.get("year") : ""),
      El(el.includes(b.get("topic")) ? b.get("topic") : ""),
      Ol(["fr", "ar"].includes(b.get("lang")) ? b.get("lang") : ""),
      yt(["oldest", "title"].includes(b.get("sort")) ? b.get("sort") : "newest"),
      Da(D),
      () => {
        Qe.current && clearTimeout(Qe.current);
      }
    );
  }, [Da]),
    (0, O.useEffect)(() => {
      let b = () => {
        (Ha(null),
          i(null),
          C([]),
          g(!1),
          a((D) => ({ ...D, authenticated: !1 })),
          Da(!0));
      };
      return (
        window.addEventListener("management-session-expired", b),
        () => window.removeEventListener("management-session-expired", b)
      );
    }, [Da]));
  O.useEffect(() => {
    if (R || L) return;
    const url = new URL(window.location.href);
    const values = {type: k === 'all' ? '' : k, q: te, year: ke, topic: ye, lang: Ae, sort: Ja === 'newest' ? '' : Ja};
    for (const [name, value] of Object.entries(values)) value ? url.searchParams.set(name, value) : url.searchParams.delete(name);
    url.searchParams.delete('view');
    history.replaceState(null, '', url);
  }, [R, L, k, te, ke, ye, Ae, Ja]);
  let tr = async () => {
      (await Ho("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
        Ha(null),
        i(null),
        C([]),
        g(!1),
        a((b) => ({ ...b, authenticated: !1 })),
        await Da(!0),
        St("Vous êtes déconnecté de l’espace de gestion."));
    },
    pu = (0, O.useMemo)(() => S.filter((b) => b.status === "published"), [S]),
    mu = !1,
    Se = pu,
    ga = (0, O.useMemo)(
      () => t.filter((b) => Se.some((D) => D.eventId === b.id)),
      [t, Se],
    );
  (0, O.useEffect)(() => {
    if ((n(null), f(null), p(""), !te.trim() || L)) {
      h(!1);
      return;
    }
    let b = new AbortController();
    h(!0);
    let D = setTimeout(async () => {
      try {
        let j = await Ho("/api/search?q=" + encodeURIComponent(te), {
          signal: b.signal,
        });
        (n(j.ids), f(j.eventIds));
      } catch (j) {
        b.signal.aborted || p(j.message);
      } finally {
        b.signal.aborted || h(!1);
      }
    }, 250);
    return () => {
      (clearTimeout(D), b.abort());
    };
  }, [te, L]);
  let Ce = (0, O.useMemo)(() => {
      let b = gg(Se, {
        type: k === "event" ? "all" : k,
        query: u === null ? te : "",
        year: ke,
        topic: ye,
        language: Ae,
        sort: Ja,
      });
      return te.trim() && u !== null ? b.filter((D) => u.includes(D.id)) : b;
    }, [Se, k, te, ke, ye, Ae, Ja, u]),
    ha = (0, O.useMemo)(() => {
      let b = Ea(te).match(/[\p{L}\p{N}]+/gu) || [];
      return ga
        .filter((D) => {
          let j = Se.filter(($a) => $a.eventId === D.id);
          if (
            (ke && !D.date.startsWith(ke)) ||
            (ye && D.topic !== ye && !j.some(($a) => $a.topic === ye)) ||
            (Ae && !j.some(($a) => $a.language === Ae))
          )
            return !1;
          if (te.trim() && r !== null) return r.includes(D.id);
          let _o = Ea(
            [
              D.title,
              D.description,
              D.topic,
              D.location,
              ...D.keywords,
              ...j.map(($a) => Eo($a)),
            ].join(" "),
          );
          return b.every(($a) => _o.includes($a));
        })
        .sort((D, j) =>
          Ja === "oldest"
            ? D.date.localeCompare(j.date)
            : Ja === "title"
              ? D.title.localeCompare(j.title, "fr")
              : j.date.localeCompare(D.date),
        );
    }, [ga, Se, ke, ye, Ae, te, r, Ja]),
    lr = (0, O.useMemo)(
      () =>
        Array.from(
          new Set([
            ...Se.map((b) => b.date.slice(0, 4)),
            ...ga.map((b) => b.date.slice(0, 4)),
          ]),
        )
          .sort()
          .reverse(),
      [Se, ga],
    ),
    or = el;
  (0, O.useEffect)(() => {
    if (R) return;
    let b = new URLSearchParams(window.location.search).get("media");
    if (b) {
      let j = Se.find((_o) => _o.id === b);
      j ? Ha(j) : St("Cette publication n’est pas disponible.");
    }
    let D = new URLSearchParams(window.location.search).get("event");
    if (D) {
      let j = ga.find((_o) => _o.id === D);
      j && i(j);
    }
  }, [R, Se, ga, St]);
  let Fe = (b, D = !0) => {
      (_e(b), He(6), B(!1));
      let j = new URL(window.location.href);
      (j.searchParams.delete("view"),
        b === "all"
          ? j.searchParams.delete("type")
          : j.searchParams.set("type", b),
        history.replaceState(null, "", j),
        L && (z(!1), Da(!1)),
        D &&
          setTimeout(
            () =>
              document
                .getElementById("publications")
                ?.scrollIntoView({ behavior: "smooth", block: "start" }),
            30,
          ));
    },
    Po = (b) => {
      (i(null), Ha(b));
      let D = new URL(window.location.href);
      (D.searchParams.delete("event"),
        D.searchParams.set("media", b.id),
        history.replaceState(null, "", D));
    },
    df = (b) => {
      (Ha(null), i(b));
      let D = new URL(window.location.href);
      (D.searchParams.delete("media"),
        D.searchParams.set("event", b.id),
        history.replaceState(null, "", D));
    },
    sf = () => {
      (Ha(null), i(null));
      let b = new URL(window.location.href);
      (b.searchParams.delete("media"),
        b.searchParams.delete("event"),
        history.replaceState(null, "", b));
    },
    Mg = () => {
      if(!MX_ON_SERVICE){window.location.assign(new URL('/?view=manage',MX_SERVICE.origin));return;}
      (z(!0), B(!1), Ha(null), i(null));
      let b = new URL(window.location.href);
      ((b.search = "?view=manage"),
        history.replaceState(null, "", b),
        window.scrollTo({ top: 0, behavior: "smooth" }),
        Da(!0));
    },
    ff = () => {
      (_e("all"), tl(""), ql(""), El(""), Ol(""), yt("newest"), He(6));
    },
    xu = !!(te || ke || ye || Ae),
    cf = {
      video: Se.filter((b) => b.type === "video").length,
      photo: Se.filter((b) => b.type === "photo").length,
      press: Se.filter((b) => b.type === "press").length,
    };
  return (0, d.jsxs)(d.Fragment, {
    children: [
      (0, d.jsx)("a", {
        className: "skip-link",
        href: "#main",
        children: "Aller au contenu",
      }),
      (0, d.jsx)("div", {
        className: "top-strip",
        children: (0, d.jsxs)("div", {
          className: "container top-inner",
          children: [
            (0, d.jsx)("span", { children: "Royaume du Maroc" }),
            (0, d.jsxs)("div", {
              children: [
                (0, d.jsx)("span", {
                  className: "portal-caption",
                  children: T.subtitle,
                }),
                (0, d.jsx)("span", { className: "top-divider" }),
                (0, d.jsxs)("button", {
                  onClick: Mg,
                  children: [
                    (0, d.jsx)(Wi, { size: 12 }),
                    "Espace de gestion",
                  ],
                }),
              ],
            }),
          ],
        }),
      }),
      (0, d.jsx)("header", {
        className: "site-header",
        children: (0, d.jsxs)("div", {
          className: "container header-inner",
          children: [
            (0, d.jsxs)("button", {
              className: "brand institution",
              onClick: () => {
                (Fe("all", !1),
                  window.scrollTo({ top: 0, behavior: "smooth" }));
              },
              "aria-label": "Accueil de la médiathèque",
              children: [
                (0, d.jsx)(du, {}),
                (0, d.jsx)("span", {
                  children: (0, d.jsx)("strong", {
                    children: T.ministryName,
                  }),
                }),
              ],
            }),
            (0, d.jsxs)("nav", {
              className: ol ? "main-nav open" : "main-nav",
              "aria-label": "Navigation principale",
              children: [
                (0, d.jsx)("button", {
                  className: !L && k === "all" ? "active" : "",
                  onClick: () => Fe("all", !1),
                  children: "Accueil",
                }),
                ["video", "photo", "press", "event"].map((b) =>
                  (0, d.jsx)(
                    "button",
                    {
                      className: !L && k === b ? "active" : "",
                      onClick: () => Fe(b),
                      children: b === 'event' ? 'Événements' : nu[b],
                    },
                    b,
                  ),
                ),
              ],
            }),
            (0, d.jsxs)("div", {
              className: "header-actions",
              children: [
                (0, d.jsx)("button", {
                  className: "header-search icon-button",
                  "aria-label": "Rechercher dans la médiathèque",
                  onClick: () => {
                    (Fe("all"), setTimeout(() => Na.current?.focus(), 100));
                  },
                  children: (0, d.jsx)($t, { size: 20 }),
                }),
                (0, d.jsxs)("button", {
                  className: "button header-press",
                  onClick: () => Fe("press"),
                  children: ["Espace presse", (0, d.jsx)(Oe, { size: 16 })],
                }),
                (0, d.jsx)("button", {
                  className: "mobile-menu icon-button",
                  onClick: () => B(!ol),
                  "aria-label": ol ? "Fermer le menu" : "Ouvrir le menu",
                  "aria-expanded": ol,
                  children: ol ? (0, d.jsx)(xa, {}) : (0, d.jsx)($i, {}),
                }),
              ],
            }),
          ],
        }),
      }),
      (0, d.jsx)("main", {
        id: "main",
        children: L
          ? (0, d.jsx)(
              nf,
              {
                auth: e,
                onLogout: tr,
                items: S,
                events: t,
                settings: T,
                isAdmin: c,
                loading: R,
                error: M,
                onRefresh: () => Da(!0),
                onBack: () => Fe("all", !1),
                onToast: St,
                onPreview: Ha,
                onSettings: m,
                onPublished: async () => { er=undefined; await Da(false); ff(); Fe('all',false); window.scrollTo({top:0,behavior:'smooth'}); },
              },
              e.authenticated ? "connected" : "disconnected",
            )
          : (0, d.jsxs)(d.Fragment, {
              children: [
                (0, d.jsx)("section", {
                  className: "intro-section",
                  children: (0, d.jsxs)("div", {
                    className: "container",
                    children: [
                      (0, d.jsxs)("div", {
                        className: "breadcrumb",
                        children: [
                          (0, d.jsx)("button", {
                            onClick: () => Fe("all", !1),
                            children: "Accueil",
                          }),
                          (0, d.jsx)(kl, { size: 12 }),
                          (0, d.jsx)("span", {
                            children: "Médiathèque",
                          }),
                        ],
                      }),
                      (0, d.jsxs)("div", {
                        className: "hero-grid",
                        children: [
                          (0, d.jsxs)("div", {
                            className: "hero-copy",
                            children: [
                              (0, d.jsxs)("div", {
                                className: "eyebrow",
                                children: [
                                  (0, d.jsx)("span", {}),
                                  "INFORMER. PARTAGER. DONNER À VOIR.",
                                ],
                              }),
                              (0, d.jsxs)("h1", {
                                children: [
                                  "L’actualité du Ministère,",
                                  (0, d.jsx)("br", {}),
                                  (0, d.jsx)("em", {
                                    children: "en images et en mots.",
                                  }),
                                ],
                              }),
                              (0, d.jsx)("p", {
                                children:
                                  "Un espace pour découvrir les vidéos, parcourir les albums photo et consulter les communiqués de presse du Ministère.",
                              }),
                              mxElement(MxHeroSearch, { value: te, onChange: value => { tl(value); He(6); }, onSubmit: () => Fe('all') }),
                              (0, d.jsxs)("div", {
                                className: "hero-footnote",
                                children: [
                                  (0, d.jsx)("span", {
                                    className: "little-line",
                                  }),
                                  "Trois espaces. Une même source d’information.",
                                ],
                              }),
                            ],
                          }),
                          (0, d.jsx)(af, {}),
                        ],
                      }),
                    ],
                  }),
                }),
                (0, d.jsx)("div", {
                  className: "container collection-links",
                  children: ["video", "photo", "press"].map((b, D) =>
                    (0, d.jsxs)(
                      "button",
                      {
                        className: "collection-link " + b,
                        onClick: () => Fe(b),
                        children: [
                          (0, d.jsx)("span", {
                            className: "collection-icon",
                            children: (0, d.jsx)(Oo, { type: b, size: 23 }),
                          }),
                          (0, d.jsxs)("span", {
                            className: "collection-label",
                            children: [
                              (0, d.jsx)("strong", { children: nu[b] }),
                              (0, d.jsx)("span", {
                                children: R
                                  ? "Découvrir les contenus"
                                  : cf[b] ? mxPlural(cf[b], b === 'video' ? 'vidéo' : b === 'photo' ? 'album photo' : 'communiqué', b === 'photo' ? 'albums photo' : undefined) : 'À découvrir prochainement' ,
                              }),
                            ],
                          }),
                          (0, d.jsx)(Oe, { size: 21 }),
                          (0, d.jsxs)("span", {
                            className: "collection-number",
                            children: ["0", D + 1],
                          }),
                        ],
                      },
                      b,
                    ),
                  ),
                }),
                !R && !M && k === 'all' && !xu && mxElement(MxLatestPublications, {items: Se, events: ga, onOpen: Po, onEvent: df, onExplore: () => Fe('all')}),
                (0, d.jsxs)("section", {
                  className: "catalog-section container",
                  id: "publications",
                  children: [
                    (0, d.jsxs)("div", {
                      className: "section-heading",
                      children: [
                        (0, d.jsxs)("div", {
                          children: [
                            (0, d.jsx)("div", {
                              className: "eyebrow",
                              children: "LA MÉDIATHÈQUE",
                            }),
                            (0, d.jsx)("h2", {
                              children:
                                k === "all"
                                  ? "Toutes nos publications"
                                  : k === "event"
                                    ? "Événements"
                                    : nu[k],
                            }),
                            (0, d.jsx)("p", {
                              children:
                                k === "all"
                                  ? "Retrouvez un contenu ou tous les supports d’un même événement."
                                  : k === "event"
                                    ? "Vidéos, albums photo et communiqués réunis par événement."
                                    : CL[k],
                            }),
                          ],
                        }),
                        mu &&
                          (0, d.jsxs)("span", {
                            className: "demo-badge",
                            children: [
                              (0, d.jsx)("span", {}),
                              "Contenus de démonstration",
                            ],
                          }),
                      ],
                    }),
                    (0, d.jsx)("div", {
                      className: "catalog-tabs",
                      role: "group",
                      "aria-label": "Type de publication",
                      children: [
                        { id: "all", label: "Tous les contenus", Icon: Bo },
                        { id: "video", label: "Vidéothèque", Icon: Ta },
                        { id: "photo", label: "Photothèque", Icon: pa },
                        { id: "press", label: "Espace médias", Icon: ma },
                        { id: "event", label: "Événements", Icon: Ma },
                      ].map(({ id: b, label: D, Icon: j }) =>
                        (0, d.jsxs)(
                          "button",
                          {
                            className: k === b ? "active" : "",
                            onClick: () => Fe(b, !1),
                            "aria-pressed": k === b,
                            children: [
                              (0, d.jsx)(j, { size: 17 }),
                              D,
                              (0, d.jsx)("span", {
                                children:
                                  b === "all"
                                    ? Se.length
                                    : b === "event"
                                      ? ga.length
                                      : cf[b],
                              }),
                            ],
                          },
                          b,
                        ),
                      ),
                    }),
                    mxElement(MxCatalogueFilters, {
                      query: te, onQuery: value => {tl(value); He(6);},
                      topic: ye, onTopic: value => {El(value); He(6);},
                      year: ke, onYear: value => {ql(value); He(6);},
                      language: Ae, onLanguage: value => {Ol(value); He(6);},
                      years: lr, inputRef: Na,
                    }),
                    xu &&
                      (0, d.jsxs)("div", {
                        className: "filter-chips",
                        children: [
                          te &&
                            (0, d.jsxs)("button", {
                              onClick: () => tl(""),
                              children: [
                                "« ",
                                te,
                                " »",
                                (0, d.jsx)(xa, { size: 12 }),
                              ],
                            }),
                          ye &&
                            (0, d.jsxs)("button", {
                              onClick: () => El(""),
                              children: [ye, (0, d.jsx)(xa, { size: 12 })],
                            }),
                          ke &&
                            (0, d.jsxs)("button", {
                              onClick: () => ql(""),
                              children: [ke, (0, d.jsx)(xa, { size: 12 })],
                            }),
                          Ae &&
                            (0, d.jsxs)("button", {
                              onClick: () => Ol(""),
                              children: [
                                Ae === "ar"
                                  ? "العربية"
                                  : "Français",
                                (0, d.jsx)(xa, { size: 12 }),
                              ],
                            }),
                          (0, d.jsx)("button", {
                            className: "clear-filters",
                            onClick: ff,
                            children: "Tout effacer",
                          }),
                        ],
                      }),
                    s &&
                      (0, d.jsx)("p", {
                        className: "form-error",
                        role: "alert",
                        children: s,
                      }),
                    (0, d.jsxs)("div", {
                      className: "results-toolbar",
                      children: [
                        (0, d.jsx)("span", {
                          role: "status",
                          "aria-live": "polite",
                          children: R
                            ? "Chargement des publications…"
                            : x
                              ? "Recherche dans l’index…"
                              : k === "event"
                                ? (0, d.jsxs)(d.Fragment, {
                                    children: [
                                      (0, d.jsx)("strong", {
                                        children: ha.length,
                                      }),
                                      ha.length > 1 ? " événements" : " événement",
                                    ],
                                  })
                                : (0, d.jsxs)(d.Fragment, {
                                    children: [
                                      (0, d.jsx)("strong", {
                                        children: Ce.length,
                                      }),
                                      Ce.length > 1 ? " publications" : " publication",
                                      te.trim() &&
                                        k === "all" &&
                                        (0, d.jsxs)(d.Fragment, {
                                          children: [
                                            " · ",
                                            (0, d.jsx)("strong", {
                                              children: ha.length,
                                            }),
                                            ha.length > 1 ? " événements" : " événement",
                                          ],
                                        }),
                                    ],
                                  }),
                        }),
                        (0, d.jsxs)("div", {
                          children: [
                            mxElement('button', {className: 'mx-share-search', onClick: () => mxCopyLink(St)}, mxElement(tu, {size: 15}), 'Partager la recherche'),
                            (0, d.jsxs)("label", {
                              className: "sort-label",
                              children: [
                                "Trier par ",
                                (0, d.jsxs)("select", {
                                  "aria-label": "Trier les publications",
                                  value: Ja,
                                  onChange: (b) => yt(b.target.value),
                                  children: [
                                    (0, d.jsx)("option", {
                                      value: "newest",
                                      children: "Les plus récentes",
                                    }),
                                    (0, d.jsx)("option", {
                                      value: "oldest",
                                      children: "Les plus anciennes",
                                    }),
                                    (0, d.jsx)("option", {
                                      value: "title",
                                      children: "Titre A → Z",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            (0, d.jsxs)("div", {
                              className: "view-switch",
                              children: [
                                (0, d.jsx)("button", {
                                  "aria-label": "Affichage en grille",
                                  "aria-pressed": Oa === "grid",
                                  className: Oa === "grid" ? "active" : "",
                                  onClick: () => {
                                    (ll("grid"),
                                      mxStorage.set(
                                        "media-view",
                                        "grid",
                                      ));
                                  },
                                  children: (0, d.jsx)(Bo, { size: 17 }),
                                }),
                                (0, d.jsx)("button", {
                                  "aria-label": "Affichage en liste",
                                  "aria-pressed": Oa === "list",
                                  className: Oa === "list" ? "active" : "",
                                  onClick: () => {
                                    (ll("list"),
                                      mxStorage.set(
                                        "media-view",
                                        "list",
                                      ));
                                  },
                                  children: (0, d.jsx)(Ji, { size: 19 }),
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                    R
                      ? (0, d.jsx)("div", {
                          className: "media-grid",
                          children: [1, 2, 3].map((b) =>
                            (0, d.jsxs)(
                              "div",
                              {
                                className: "card-skeleton",
                                children: [
                                  (0, d.jsx)("span", {}),
                                  (0, d.jsx)("i", {}),
                                  (0, d.jsx)("i", {}),
                                  (0, d.jsx)("i", {}),
                                ],
                              },
                              b,
                            ),
                          ),
                        })
                      : M
                        ? (0, d.jsxs)("div", {
                            className: "empty-state error-state",
                            children: [
                              (0, d.jsx)(vt, { size: 30 }),
                              (0, d.jsx)("h3", {
                                children: "Le chargement n’a pas abouti",
                              }),
                              (0, d.jsx)("p", { children: M }),
                              (0, d.jsxs)("button", {
                                className: "button primary",
                                onClick: () => Da(!1),
                                children: [
                                  (0, d.jsx)(Dl, { size: 16 }),
                                  "Réessayer",
                                ],
                              }),
                            ],
                          })
                        : (0, d.jsxs)(d.Fragment, {
                            children: [
                              (k === "event" ||
                                (k === "all" && !!te.trim())) &&
                                ha.length > 0 &&
                                (0, d.jsxs)("div", {
                                  className: "event-results",
                                  children: [
                                    k !== "event" &&
                                      (0, d.jsx)("h3", {
                                        children:
                                          "Événements associés à votre recherche",
                                      }),
                                    (0, d.jsx)("div", {
                                      className:
                                        "event-grid" +
                                        (Oa === "list" ? " event-list" : ""),
                                      children: ha
                                        .slice(0, Ze)
                                        .map((b) =>
                                          (0, d.jsx)(
                                            yg,
                                            {
                                              event: b,
                                              items: Se,
                                              onOpen: df,
                                            },
                                            b.id,
                                          ),
                                        ),
                                    }),
                                    k === "event" &&
                                      ha.length > Ze &&
                                      (0, d.jsx)("div", {
                                        className: "load-more",
                                        children: (0, d.jsxs)("button", {
                                          className: "button secondary",
                                          onClick: () => He((b) => b + 6),
                                          children: [
                                            "Voir plus d’événements",
                                            (0, d.jsx)(wl, { size: 17 }),
                                          ],
                                        }),
                                      }),
                                  ],
                                }),
                              k !== "event" &&
                                Ce.length > 0 &&
                                (0, d.jsxs)(d.Fragment, {
                                  children: [
                                    te.trim() &&
                                      ha.length > 0 &&
                                      k === "all" &&
                                      (0, d.jsx)("h3", {
                                        className: "matching-heading",
                                        children:
                                          "Publications correspondantes",
                                      }),
                                    (0, d.jsx)("div", {
                                      className:
                                        Oa === "grid"
                                          ? "media-grid"
                                          : "media-list",
                                      children: Ce.slice(0, Ze).map((b) =>
                                        (0, d.jsx)(
                                          su,
                                          {
                                            item: b,
                                            onOpen: Po,
                                            list: Oa === "list",
                                          },
                                          b.id,
                                        ),
                                      ),
                                    }),
                                    Ze < Ce.length &&
                                      (0, d.jsxs)("div", {
                                        className: "load-more",
                                        children: [
                                          (0, d.jsxs)("span", {
                                            children: [
                                              Math.min(Ze, Ce.length),
                                              " publications sur ",
                                              Ce.length,
                                            ],
                                          }),
                                          (0, d.jsxs)("button", {
                                            className: "button secondary",
                                            onClick: () => He((b) => b + 6),
                                            children: [
                                              "Voir plus de publications",
                                              (0, d.jsx)(wl, { size: 17 }),
                                            ],
                                          }),
                                        ],
                                      }),
                                  ],
                                }),
                              (k === "event"
                                ? ha.length === 0
                                : Ce.length === 0 &&
                                  !(k === "all" && te.trim() && ha.length)) &&
                                (0, d.jsxs)("div", {
                                  className: "empty-state",
                                  children: [
                                    (0, d.jsx)(au, { size: 35 }),
                                    (0, d.jsx)("h3", {
                                      children: xu
                                        ? "Aucun résultat ne correspond à votre recherche"
                                        : k === "event"
                                          ? "Aucun événement publié pour le moment"
                                          : "Les publications seront bientôt disponibles",
                                    }),
                                    (0, d.jsx)("p", {
                                      children: xu
                                        ? "Modifiez les mots-clés ou élargissez les filtres pour poursuivre votre consultation."
                                        : "La médiathèque est prête à accueillir les contenus du Ministère.",
                                    }),
                                    xu &&
                                      (0, d.jsx)("button", {
                                        className: "button primary",
                                        onClick: ff,
                                        children:
                                          "Réinitialiser la recherche",
                                      }),
                                  ],
                                }),
                            ],
                          }),
                    mu &&
                      !R &&
                      !M &&
                      (0, d.jsxs)("p", {
                        className: "catalog-demo-note",
                        children: [
                          (0, d.jsx)(vt, { size: 14 }),
                          "Les titres, dates et visuels présentés sont des exemples destinés à illustrer l’application.",
                        ],
                      }),
                  ],
                }),
                (0, d.jsxs)("section", {
                  className: "press-band container",
                  children: [
                    (0, d.jsx)("div", {
                      className: "press-band-icon",
                      children: (0, d.jsx)(ma, { size: 32 }),
                    }),
                    (0, d.jsxs)("div", {
                      children: [
                        (0, d.jsx)("div", {
                          className: "eyebrow",
                          children: "À L’ATTENTION DES MÉDIAS",
                        }),
                        (0, d.jsx)("h2", {
                          children: "L’information à la source.",
                        }),
                        (0, d.jsx)("p", {
                          children:
                            "Consultez les communiqués et retrouvez les publications destinées à la presse.",
                        }),
                      ],
                    }),
                    (0, d.jsxs)("button", {
                      className: "button cream",
                      onClick: () => Fe("press"),
                      children: [
                        "Accéder à l’espace médias",
                        (0, d.jsx)(Oe, { size: 17 }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
      }),
      (0, d.jsxs)("footer", {
        className: "site-footer",
        children: [
          (0, d.jsxs)("div", {
            className: "container footer-main",
            children: [
              mxElement('div',{className:'footer-brand mx-footer-wordmark'},mxElement('span',{className:'eyebrow'},'PORTAIL INSTITUTIONNEL'),mxElement('strong',null,'Médiathèque')),
              (0, d.jsxs)("div", {
                className: "footer-links",
                children: [
                  (0, d.jsx)("strong", {
                    children: "Explorer la médiathèque",
                  }),
                  ["video", "photo", "press"].map((b) =>
                    (0, d.jsxs)(
                      "button",
                      {
                        onClick: () => Fe(b),
                        children: [nu[b], (0, d.jsx)(Oe, { size: 13 })],
                      },
                      b,
                    ),
                  ),
                ],
              }),
              (0, d.jsxs)("div", {
                className: "footer-contact",
                children: [
                  (0, d.jsx)("strong", {
                    children: "Communication institutionnelle",
                  }),
                  (0, d.jsx)("p", {
                    children:
                      "Un espace au service de l’information du public.",
                  }),
                  T.contactEmail
                    ? (0, d.jsxs)("a", {
                        href: "mailto:" + T.contactEmail,
                        children: [
                          (0, d.jsx)(Uo, { size: 15 }),
                          "Contacter le service de communication",
                        ],
                      })
                    : (0, d.jsxs)("button", {
                        onClick: () => Ne("contact"),
                        children: [
                          (0, d.jsx)(Uo, { size: 15 }),
                          "Informations de contact",
                        ],
                      }),
                ],
              }),
            ],
          }),
          (0, d.jsxs)("div", {
            className: "container footer-bottom",
            children: [
              (0, d.jsxs)("span", {
                children: [
                  "© ",
                  new Date().getFullYear(),
                  " · Médiathèque",
                ],
              }),
              (0, d.jsxs)("div", {
                children: [
                  (0, d.jsx)("button", {
                    onClick: () => Ne("usage"),
                    children: "Conditions d’utilisation",
                  }),
                  (0, d.jsx)("button", {
                    onClick: () => Ne("accessibility"),
                    children: "Accessibilité",
                  }),
                  (0, d.jsx)("button", {
                    className: "back-top",
                    "aria-label": "Revenir en haut de page",
                    onClick: () =>
                      window.scrollTo({ top: 0, behavior: "smooth" }),
                    children: (0, d.jsx)(ji, { size: 17 }),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      Wa &&
        (0, d.jsx)(ef, {
          item: Wa,
          onClose: sf,
          onToast: St,
          onEvent: (b) => {
            let D = ga.find((j) => j.id === b) || t.find((j) => j.id === b);
            D && df(D);
          },
        }),
      o &&
        (0, d.jsx)(Sg, {
          event: o,
          items: L ? S : Se,
          onClose: sf,
          onOpenMedia: Po,
        }),
      P &&
        (0, d.jsx)(Ul, {
          label:
            P === "usage"
              ? "Conditions d’utilisation"
              : P === "contact"
                ? "Contact"
                : "Accessibilité",
          onClose: () => Ne(""),
          children: (0, d.jsxs)("div", {
            className: "info-content",
            children: [
              (0, d.jsx)(vt, { size: 26 }),
              (0, d.jsx)("h2", {
                children:
                  P === "usage"
                    ? "Conditions d’utilisation"
                    : P === "contact"
                      ? "Contacter le Ministère"
                      : "Accessibilité",
              }),
              P === "usage"
                ? (0, d.jsxs)(d.Fragment, {
                    children: [
                      (0, d.jsx)("p", {
                        children:
                          "Les publications de cette médiathèque sont mises en ligne par le service habilité du Ministère.",
                      }),
                      (0, d.jsx)("p", {
                        children:
                          "Pour les publications définitives, les conditions de réutilisation et les crédits sont précisés par le Ministère. Toute réutilisation doit respecter les mentions accompagnant chaque contenu.",
                      }),
                      (0, d.jsx)("p", {
                        children:
                          "Les préférences d’affichage en grille ou en liste sont conservées uniquement dans votre navigateur. Aucun outil de mesure d’audience tiers n’a été ajouté à cette application.",
                      }),
                    ],
                  })
                : P === "contact"
                  ? (0, d.jsx)("p", {
                      children:
                        "Les coordonnées du service chargé de la communication seront renseignées par le gestionnaire du portail.",
                    })
                  : (0, d.jsxs)(d.Fragment, {
                      children: [
                        (0, d.jsx)("p", {
                          children:
                            "La médiathèque prévoit une navigation au clavier, des libellés explicites, une mise en page adaptée aux écrans mobiles et la prise en charge des sous-titres vidéo.",
                        }),
                        (0, d.jsx)("p", {
                          children:
                            "L’accessibilité des contenus publiés dépend également des légendes, des transcriptions et des documents joints fournis par le service chargé de la communication.",
                        }),
                        (0, d.jsx)("p", {
                          children:
                            "Les fenêtres de consultation se ferment avec la touche Échap. Dans un album, les flèches gauche et droite permettent de parcourir les photographies.",
                        }),
                      ],
                    }),
            ],
          }),
        }),
      cu &&
        (0, d.jsxs)("div", {
          className: "toast",
          role: "status",
          children: [
            (0, d.jsx)("span", { className: "toast-dot" }),
            cu,
            (0, d.jsx)("button", {
              onClick: () => Fo(""),
              "aria-label": "Fermer la notification",
              children: (0, d.jsx)(xa, { size: 15 }),
            }),
          ],
        }),
    ],
  });
}
