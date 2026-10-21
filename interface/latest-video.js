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
                "https://www.youtube-nocookie.com/embed/" +
                e.videoId +
                "?autoplay=1&rel=0&playsinline=1",
              title: "Vidéo du Ministère : " + e.title,
              allow:
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
              referrerPolicy: "strict-origin-when-cross-origin",
              allowFullScreen: !0,
            })
          : (0, ge.jsxs)("button", {
              className: "ministry-video-cover",
              onClick: () => l(!0),
              "aria-label":
                "Lire la dernière vidéo du Ministère : " + e.title,
              children: [
                (0, ge.jsx)("img", {
                  src:
                    imageFailed ? je('/images/cover.svg') : "https://i.ytimg.com/vi/" + e.videoId + "/hqdefault.jpg",
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
          (0, ge.jsx)("h2", { dir: "auto", children: e.title }),
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
