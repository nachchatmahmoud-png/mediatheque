// Source de l’interface publique ; assemblée par scripts/build-interface.mjs.
function af() {
  let [e, a] = (0, No.useState)(ar),
    [t, l] = (0, No.useState)(!1),
    [imageFailed, setImageFailed] = (0, No.useState)(false);
  ((0, No.useEffect)(() => {
    let i = new AbortController(),
      u = () =>
        fetch(je("/latest-video.json"), {
          cache: "no-cache",
          signal: i.signal,
        })
          .then((r) => {
            if (!r.ok) throw new Error("Vidéo indisponible");
            return r.json();
          })
          .then((r) => {
            xL(r) && a(r);
          })
          .catch(() => {});
    u();
    let n = setInterval(u, 300 * 1e3);
    return () => {
      (clearInterval(n), i.abort());
    };
  }, []),
    (0, No.useEffect)(() => { l(!1); setImageFailed(false); }, [e.videoId]));
  let o = "https://www.youtube.com/watch?v=" + e.videoId;
  const presentation=mxLatestPresentation(e),displayTitle=presentation.title;
  const localThumbnail=typeof e.thumbnailUrl==='string'&&e.thumbnailUrl==='/images/youtube-'+e.videoId+'.jpg'?je(e.thumbnailUrl):'';
  return (0, ge.jsxs)("div", {
    className: "hero-visual ministry-video",
    "aria-label":
      "Dernière vidéo de la chaîne officielle du Ministère",
    children: [
      (0, ge.jsxs)("div", {
        className: "ministry-video-heading",
        children: [
          (0, ge.jsxs)("span", {
            className: "hero-top-label",
            children: [
              (0, ge.jsx)("span", { className: "live-dot" }),
              "DERNIÈRE VIDÉO",
            ],
          }),
          (0, ge.jsxs)("a", {
            href: e.channelUrl,
            dir: "ltr",
            target: "_blank",
            rel: "noreferrer",
            children: ["@Matnuhpv", (0, ge.jsx)(Oe, { size: 15 })],
          }),
        ],
      }),
      (0, ge.jsx)("div", {
        className: "ministry-video-screen",
        children: t
          ? (0, ge.jsx)("iframe", {
                src:
                mxVideoEmbedUrl(presentation.item,"https://www.youtube-nocookie.com/embed/"+e.videoId)+"&autoplay=1&rel=0&playsinline=1",
              title: mxT("Vidéo du Ministère : ") + displayTitle,
              allow:
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
              referrerPolicy: "strict-origin-when-cross-origin",
              allowFullScreen: !0,
            })
          : (0, ge.jsxs)("button", {
              className: "ministry-video-cover",
              onClick: () => l(!0),
              "aria-label":
                mxT("Lire la dernière vidéo du Ministère : ") + displayTitle,
              children: [
                (0, ge.jsx)("img", {
                  src:
                    imageFailed ? je(MX_LOCALE==='ar'?'/images/cover-ar.svg':'/images/cover.svg') : localThumbnail || "https://i.ytimg.com/vi/" + e.videoId + "/hqdefault.jpg",
                  onError: () => setImageFailed(true),
                  alt: "",
                  width: 480,
                  height: 360,
                  decoding: "async",
                }),
                (0, ge.jsx)("span", {
                  className: "ministry-video-play",
                  children: (0, ge.jsx)(Tl, {
                    size: 29,
                    fill: "currentColor",
                  }),
                }),
                (0, ge.jsx)("span", {
                  className: "ministry-video-caption",
                  children: "Lire la vidéo",
                }),
              ],
            }),
      }),
      (0, ge.jsxs)("div", {
        className: "ministry-video-meta",
        children: [
          (0, ge.jsx)("h2", { dir: "auto", children: displayTitle }),
          mxElement(MxVideoLanguage,{item:presentation.item,compact:true}),
          presentation.description&&(0,ge.jsx)('p',{className:'mx-latest-summary',children:presentation.description}),
          (0, ge.jsxs)("div", {
            children: [
              (0, ge.jsxs)("time", {
                dateTime: e.publishedAt,
                children: ["Publié le ", Ya(e.publishedAt.slice(0, 10))],
              }),
              (0, ge.jsxs)("a", {
                href: o,
                target: "_blank",
                rel: "noreferrer",
                children: [
                  "Regarder sur YouTube",
                  (0, ge.jsx)(Oe, { size: 15 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
